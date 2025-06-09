# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import UserError
import logging
import json
from datetime import datetime, timedelta

_logger = logging.getLogger(__name__)


class ConnectionTestWizard(models.TransientModel):
    """AI 連接測試嚮導"""
    
    _name = 'nuido.ai.connection.test.wizard'
    _description = 'AI Connection Test Wizard'

    # 測試選項
    test_mode = fields.Selection([
        ('single', 'Single Provider Test'),
        ('batch', 'Batch Test All Providers'),
        ('selected', 'Test Selected Providers')
    ], string='Test Mode', default='single', required=True)
    
    provider_id = fields.Many2one(
        'nuido.ai.provider',
        string='Select Provider',
        help='選擇要測試的單一供應商'
    )
    
    provider_ids = fields.Many2many(
        'nuido.ai.provider',
        string='Select Providers',
        help='選擇要測試的多個供應商'
    )
    
    # 測試深度
    test_depth = fields.Selection([
        ('basic', 'Basic Connection Test'),
        ('full', 'Full Functionality Test')
    ], string='Test Depth', default='basic', required=True)
    
    # 測試配置
    timeout = fields.Integer(
        string='Timeout (seconds)',
        default=30,
        help='每個供應商的連接超時時間'
    )
    
    retry_count = fields.Integer(
        string='Retry Count',
        default=3,
        help='連接失敗時的重試次數'
    )
    
    include_inactive = fields.Boolean(
        string='Include Inactive Providers',
        default=False,
        help='是否測試未啟用的供應商'
    )
    
    # 測試結果
    test_results = fields.Text(
        string='Test Results',
        readonly=True,
        help='詳細的測試結果報告'
    )
    
    test_status = fields.Selection([
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ], string='Test Status', default='pending', readonly=True)
    
    test_summary = fields.Html(
        string='Test Summary',
        readonly=True,
        help='測試結果的 HTML 摘要'
    )
    
    # 統計數據
    total_providers = fields.Integer(
        string='Total Providers',
        readonly=True
    )
    
    successful_providers = fields.Integer(
        string='Successful Providers',
        readonly=True
    )
    
    failed_providers = fields.Integer(
        string='Failed Providers',
        readonly=True
    )
    
    test_start_time = fields.Datetime(
        string='Test Start Time',
        readonly=True
    )
    
    test_end_time = fields.Datetime(
        string='Test End Time',
        readonly=True
    )
    
    test_duration = fields.Float(
        string='Test Duration (seconds)',
        readonly=True,
        compute='_compute_test_duration'
    )

    @api.depends('test_start_time', 'test_end_time')
    def _compute_test_duration(self):
        """計算測試耗時"""
        for record in self:
            if record.test_start_time and record.test_end_time:
                delta = record.test_end_time - record.test_start_time
                record.test_duration = delta.total_seconds()
            else:
                record.test_duration = 0.0

    @api.onchange('test_mode')
    def _onchange_test_mode(self):
        """當測試模式改變時，清空選擇的供應商"""
        if self.test_mode == 'single':
            self.provider_ids = [(5, 0, 0)]  # 清空 many2many
        elif self.test_mode in ['batch', 'selected']:
            self.provider_id = False

    def _get_providers_to_test(self):
        """根據測試模式獲取要測試的供應商列表"""
        domain = []
        if not self.include_inactive:
            domain.append(('active', '=', True))
            
        if self.test_mode == 'single':
            if not self.provider_id:
                raise UserError(_('請選擇要測試的供應商'))
            return self.provider_id
        elif self.test_mode == 'batch':
            return self.env['nuido.ai.provider'].search(domain)
        elif self.test_mode == 'selected':
            if not self.provider_ids:
                raise UserError(_('請選擇要測試的供應商'))
            if not self.include_inactive:
                return self.provider_ids.filtered('active')
            return self.provider_ids
        else:
            raise UserError(_('無效的測試模式'))

    def action_start_test(self):
        """開始測試"""
        self.ensure_one()
        
        # 獲取要測試的供應商
        providers = self._get_providers_to_test()
        
        # 更新測試狀態
        self.write({
            'test_status': 'running',
            'test_start_time': fields.Datetime.now(),
            'total_providers': len(providers),
            'successful_providers': 0,
            'failed_providers': 0,
            'test_results': '',
            'test_summary': ''
        })
        
        # 執行測試
        try:
            results = self._execute_tests(providers)
            self._process_test_results(results)
            
            # 完成測試
            self.write({
                'test_status': 'completed',
                'test_end_time': fields.Datetime.now()
            })
            
            return self._show_results_view()
            
        except Exception as e:
            _logger.error(f"Connection test failed: {str(e)}")
            self.write({
                'test_status': 'failed',
                'test_end_time': fields.Datetime.now(),
                'test_results': f'測試過程中發生錯誤：{str(e)}'
            })
            raise UserError(_('測試過程中發生錯誤：%s') % str(e))

    def _execute_tests(self, providers):
        """執行實際的連接測試"""
        results = []
        
        for provider in providers:
            _logger.info(f"Testing provider: {provider.name}")
            
            # 記錄測試開始
            provider_result = {
                'provider': provider,
                'start_time': datetime.now(),
                'success': False,
                'message': '',
                'error_details': '',
                'models_count': 0,
                'response_time': 0,
                'retry_attempts': 0
            }
            
            # 執行連接測試（帶重試機制）
            for attempt in range(self.retry_count + 1):
                provider_result['retry_attempts'] = attempt
                
                try:
                    if self.test_depth == 'basic':
                        success, message, models = provider._perform_connection_test()
                    else:
                        success, message, models = self._perform_full_test(provider)
                    
                    provider_result['end_time'] = datetime.now()
                    provider_result['response_time'] = (
                        provider_result['end_time'] - provider_result['start_time']
                    ).total_seconds()
                    
                    if success:
                        provider_result['success'] = True
                        provider_result['message'] = message
                        provider_result['models_count'] = len(models) if models else 0
                        
                        # 更新供應商狀態
                        provider.write({
                            'connection_status': 'connected',
                            'last_test_date': fields.Datetime.now(),
                            'error_message': False
                        })
                        break
                    else:
                        provider_result['error_details'] = message
                        if attempt == self.retry_count:
                            # 最後一次嘗試失敗
                            provider_result['message'] = f'連接失敗（重試 {attempt} 次）：{message}'
                            provider.write({
                                'connection_status': 'failed',
                                'last_test_date': fields.Datetime.now(),
                                'error_message': message
                            })
                
                except Exception as e:
                    provider_result['error_details'] = str(e)
                    if attempt == self.retry_count:
                        provider_result['message'] = f'測試異常（重試 {attempt} 次）：{str(e)}'
                        provider.write({
                            'connection_status': 'failed',
                            'last_test_date': fields.Datetime.now(),
                            'error_message': str(e)
                        })
            
            results.append(provider_result)
        
        return results

    def _perform_full_test(self, provider):
        """執行完整功能測試"""
        try:
            # 首先執行基本連接測試
            success, message, models = provider._perform_connection_test()
            
            if not success:
                return success, message, models
            
            # 如果基本測試成功，執行更深入的測試
            # 測試簡單的 API 調用
            test_success, test_message = self._test_api_call(provider)
            
            if test_success:
                return True, f'完整測試成功：{message}，API 調用測試通過', models
            else:
                return False, f'基本連接成功但 API 調用失敗：{test_message}', models
                
        except Exception as e:
            return False, f'完整測試異常：{str(e)}', []

    def _test_api_call(self, provider):
        """測試簡單的 API 調用"""
        try:
            import requests
            
            # 構建測試 completion API 的 URL
            test_url = f"{provider.api_base_url.rstrip('/')}/v1/chat/completions"
            
            headers = {
                'Authorization': f'Bearer {provider.api_key}',
                'Content-Type': 'application/json'
            }
            
            # 簡單的測試請求
            data = {
                'model': 'gpt-3.5-turbo',  # 使用通用模型名稱
                'messages': [{'role': 'user', 'content': 'Hello'}],
                'max_tokens': 5
            }
            
            response = requests.post(
                test_url, 
                headers=headers, 
                json=data, 
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                return True, 'API 調用測試成功'
            else:
                return False, f'API 調用失敗：{response.status_code} - {response.text[:200]}'
                
        except Exception as e:
            return False, f'API 調用測試異常：{str(e)}'

    def _process_test_results(self, results):
        """處理測試結果"""
        successful_count = sum(1 for r in results if r['success'])
        failed_count = len(results) - successful_count
        
        # 更新統計
        self.write({
            'successful_providers': successful_count,
            'failed_providers': failed_count
        })
        
        # 生成詳細結果文本
        result_lines = [
            f"=== AI 供應商連接測試報告 ===",
            f"測試時間：{self.test_start_time}",
            f"測試模式：{dict(self._fields['test_mode'].selection)[self.test_mode]}",
            f"測試深度：{dict(self._fields['test_depth'].selection)[self.test_depth]}",
            f"",
            f"=== 測試統計 ===",
            f"總計：{len(results)} 個供應商",
            f"成功：{successful_count} 個",
            f"失敗：{failed_count} 個",
            f"成功率：{(successful_count/len(results)*100):.1f}%",
            f"",
            f"=== 詳細結果 ==="
        ]
        
        for result in results:
            provider = result['provider']
            status = "✓ 成功" if result['success'] else "✗ 失敗"
            
            result_lines.extend([
                f"",
                f"供應商：{provider.name} ({provider.api_type})",
                f"狀態：{status}",
                f"回應時間：{result['response_time']:.2f} 秒",
                f"重試次數：{result['retry_attempts']}",
                f"訊息：{result['message']}"
            ])
            
            if result['success'] and result['models_count'] > 0:
                result_lines.append(f"發現模型：{result['models_count']} 個")
        
        self.test_results = '\n'.join(result_lines)
        
        # 生成 HTML 摘要
        self._generate_html_summary(results)

    def _generate_html_summary(self, results):
        """生成 HTML 格式的測試摘要"""
        successful_count = sum(1 for r in results if r['success'])
        failed_count = len(results) - successful_count
        
        # 狀態顏色
        success_color = "#28a745"
        failure_color = "#dc3545"
        warning_color = "#ffc107"
        
        html_parts = [
            '<div style="font-family: Arial, sans-serif;">',
            f'<h3 style="color: #007bff;">連接測試結果摘要</h3>',
            
            # 統計卡片
            '<div style="display: flex; gap: 20px; margin-bottom: 20px;">',
            f'<div style="background: {success_color}; color: white; padding: 15px; border-radius: 5px; flex: 1; text-align: center;">',
            f'<h4 style="margin: 0;">成功</h4>',
            f'<p style="margin: 5px 0; font-size: 24px; font-weight: bold;">{successful_count}</p>',
            '</div>',
            f'<div style="background: {failure_color}; color: white; padding: 15px; border-radius: 5px; flex: 1; text-align: center;">',
            f'<h4 style="margin: 0;">失敗</h4>',
            f'<p style="margin: 5px 0; font-size: 24px; font-weight: bold;">{failed_count}</p>',
            '</div>',
            f'<div style="background: #6c757d; color: white; padding: 15px; border-radius: 5px; flex: 1; text-align: center;">',
            f'<h4 style="margin: 0;">成功率</h4>',
            f'<p style="margin: 5px 0; font-size: 24px; font-weight: bold;">{(successful_count/len(results)*100):.1f}%</p>',
            '</div>',
            '</div>',
            
            # 供應商列表
            '<h4>供應商測試詳情</h4>',
            '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">',
            '<thead>',
            '<tr style="background: #f8f9fa;">',
            '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">供應商</th>',
            '<th style="border: 1px solid #ddd; padding: 8px; text-align: center;">狀態</th>',
            '<th style="border: 1px solid #ddd; padding: 8px; text-align: center;">回應時間</th>',
            '<th style="border: 1px solid #ddd; padding: 8px; text-align: center;">模型數</th>',
            '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">訊息</th>',
            '</tr>',
            '</thead>',
            '<tbody>'
        ]
        
        for result in results:
            provider = result['provider']
            status_color = success_color if result['success'] else failure_color
            status_text = "成功" if result['success'] else "失敗"
            status_icon = "✓" if result['success'] else "✗"
            
            html_parts.extend([
                '<tr>',
                f'<td style="border: 1px solid #ddd; padding: 8px;">{provider.name}</td>',
                f'<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">',
                f'<span style="color: {status_color}; font-weight: bold;">{status_icon} {status_text}</span>',
                '</td>',
                f'<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">{result["response_time"]:.2f}s</td>',
                f'<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">{result.get("models_count", 0)}</td>',
                f'<td style="border: 1px solid #ddd; padding: 8px;">{result["message"][:100]}{"..." if len(result["message"]) > 100 else ""}</td>',
                '</tr>'
            ])
        
        html_parts.extend([
            '</tbody>',
            '</table>',
            '</div>'
        ])
        
        self.test_summary = ''.join(html_parts)

    def _show_results_view(self):
        """顯示測試結果視圖"""
        return {
            'type': 'ir.actions.act_window',
            'name': _('連接測試結果'),
            'res_model': 'nuido.ai.connection.test.wizard',
            'res_id': self.id,
            'view_mode': 'form',
            'view_id': self.env.ref('nuido_flow_ai_option_model.view_connection_test_wizard_result').id,
            'target': 'new',
            'context': self.env.context
        }

    def action_retry_failed(self):
        """重新測試失敗的供應商"""
        if self.test_status != 'completed':
            raise UserError(_('請先完成初始測試'))
        
        # 獲取失敗的供應商
        failed_providers = self.env['nuido.ai.provider'].search([
            ('connection_status', '=', 'failed')
        ])
        
        if not failed_providers:
            raise UserError(_('沒有失敗的供應商需要重新測試'))
        
        # 重置狀態並重新測試
        self.write({
            'test_status': 'running',
            'test_start_time': fields.Datetime.now(),
            'test_end_time': False
        })
        
        results = self._execute_tests(failed_providers)
        self._process_test_results(results)
        
        self.write({
            'test_status': 'completed',
            'test_end_time': fields.Datetime.now()
        })
        
        return self._show_results_view()

    def action_export_results(self):
        """匯出測試結果"""
        if not self.test_results:
            raise UserError(_('沒有測試結果可以匯出'))
        
        # 這裡可以實現匯出為 CSV 或 PDF 的功能
        # 暫時先返回文本內容
        return {
            'type': 'ir.actions.act_url',
            'url': f'/web/content?model={self._name}&id={self.id}&field=test_results&download=true&filename=connection_test_results.txt',
            'target': 'self'
        }