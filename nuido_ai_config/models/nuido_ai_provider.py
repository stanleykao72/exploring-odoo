# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, UserError
import requests
import json
import logging

_logger = logging.getLogger(__name__)


class NuidoAiProvider(models.Model):
    """AI 供應商模型 - 管理各種 AI API 供應商的連接配置"""
    
    _name = 'nuido.ai.provider'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _description = 'AI Provider Configuration'
    _order = 'sequence, name'
    _rec_name = 'display_name'

    # 基本資訊
    name = fields.Char(
        string='Provider Name',
        required=True,
        help='AI 供應商的名稱，例如：OpenAI, Qwen, Gemma'
    )
    
    display_name = fields.Char(
        string='Display Name',
        compute='_compute_display_name',
        store=True,
        help='在界面中顯示的名稱'
    )
    
    description = fields.Text(
        string='Description',
        help='供應商的詳細描述'
    )
    
    sequence = fields.Integer(
        string='Sequence',
        default=10,
        help='在列表中的顯示順序'
    )
    
    # API 配置
    api_base_url = fields.Char(
        string='API Base URL',
        required=True,
        help='API 的基礎 URL，例如：https://api.openai.com'
    )
    
    api_key = fields.Char(
        string='API Key',
        required=True,
        help='用於認證的 API 密鑰'
    )
    
    api_type = fields.Selection([
        ('openai', 'OpenAI Official'),
        ('openai_compatible', 'OpenAI Compatible'),
        ('custom', 'Custom Format')
    ], string='API Type', default='openai_compatible', required=True)
    
    # 狀態管理
    active = fields.Boolean(
        string='Active',
        default=True,
        help='是否啟用此供應商'
    )
    
    connection_status = fields.Selection([
        ('not_tested', '未測試'),
        ('connected', '連接成功'),
        ('failed', '連接失敗'),
        ('testing', '測試中')
    ], string='Connection Status', default='not_tested', readonly=True)
    
    last_test_date = fields.Datetime(
        string='Last Test Date',
        readonly=True
    )
    
    error_message = fields.Text(
        string='Error Message',
        readonly=True,
        help='連接失敗時的詳細錯誤訊息'
    )
    
    # 模型關聯
    model_ids = fields.One2many(
        'nuido.ai.model',
        'provider_id',
        string='Available Models'
    )
    
    model_count = fields.Integer(
        string='Model Count',
        compute='_compute_model_count'
    )

    @api.depends('name', 'api_type')
    def _compute_display_name(self):
        """計算顯示名稱"""
        for record in self:
            type_label = dict(self._fields['api_type'].selection).get(record.api_type, '')
            record.display_name = f"{record.name} ({type_label})"

    @api.depends('model_ids')
    def _compute_model_count(self):
        """計算模型數量"""
        for record in self:
            record.model_count = len(record.model_ids)

    @api.constrains('api_base_url')
    def _check_api_base_url(self):
        """驗證 API URL 格式"""
        for record in self:
            if record.api_base_url and not record.api_base_url.startswith(('http://', 'https://')):
                raise ValidationError(_('API URL 必須以 http:// 或 https:// 開頭'))

    def test_connection(self):
        """測試 API 連接"""
        self.ensure_one()
        
        try:
            # 更新狀態為測試中
            self.write({
                'connection_status': 'testing',
                'error_message': False
            })
            
            # 執行連接測試
            success, message, models = self._perform_connection_test()
            
            if success:
                # 連接成功，更新模型列表
                self._update_models_from_api(models)
                self.write({
                    'connection_status': 'connected',
                    'last_test_date': fields.Datetime.now(),
                    'error_message': False
                })
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('連接成功'),
                        'message': message,
                        'type': 'success'
                    }
                }
            else:
                # 連接失敗
                self.write({
                    'connection_status': 'failed',
                    'last_test_date': fields.Datetime.now(),
                    'error_message': message
                })
                raise UserError(message)
                
        except Exception as e:
            _logger.error(f"Provider {self.name} connection test failed: {str(e)}")
            self.write({
                'connection_status': 'failed',
                'last_test_date': fields.Datetime.now(),
                'error_message': str(e)
            })
            raise UserError(_('連接測試失敗：%s') % str(e))

    def _perform_connection_test(self):
        """執行實際的連接測試"""
        try:
            # 構建測試 URL
            test_url = f"{self.api_base_url.rstrip('/')}/models"
            
            # 設置請求頭
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            # 發送請求
            response = requests.get(test_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                models = data.get('data', [])
                return True, f'成功連接，發現 {len(models)} 個模型', models
            else:
                return False, f'API 返回錯誤：{response.status_code} - {response.text}', []
                
        except requests.exceptions.Timeout:
            return False, '連接超時，請檢查網絡或 API URL', []
        except requests.exceptions.ConnectionError:
            return False, '無法連接到 API 端點，請檢查 URL 是否正確', []
        except Exception as e:
            return False, f'未知錯誤：{str(e)}', []

    def _update_models_from_api(self, models_data):
        """從 API 回應更新模型列表"""
        # 先清除現有模型
        self.model_ids.unlink()
        
        # 創建新的模型記錄
        for model_data in models_data:
            self.env['nuido.ai.model'].create({
                'provider_id': self.id,
                'model_id': model_data.get('id', ''),
                'name': model_data.get('id', ''),
                'created_timestamp': model_data.get('created'),
                'owned_by': model_data.get('owned_by', ''),
                'active': True
            })

    def action_view_models(self):
        """查看此供應商的模型"""
        return {
            'type': 'ir.actions.act_window',
            'name': _('模型列表'),
            'res_model': 'nuido.ai.model',
            'view_mode': 'list,form',
            'domain': [('provider_id', '=', self.id)],
            'context': {'default_provider_id': self.id}
        }