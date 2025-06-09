# -*- coding: utf-8 -*-

from odoo import models, fields, api
from odoo.exceptions import UserError
import logging

_logger = logging.getLogger(__name__)


class NuidoAiConfigService(models.Model):
    """
    AI 配置服務模型
    提供前端動態模型選擇器組件所需的 API 介面
    """
    _name = 'nuido.ai.config.service'
    _description = 'AI Configuration Service'

    @api.model
    def get_available_providers(self):
        """
        獲取所有可用的 AI 供應商列表
        
        Returns:
            list: 供應商列表，每個項目包含 id, name, description 等欄位
        """
        try:
            providers = self.env['nuido.ai.provider'].search([
                ('active', '=', True)
            ])
            
            result = []
            for provider in providers:
                provider_data = {
                    'id': provider.id,
                    'name': provider.name,
                    'description': provider.description or '',
                    'provider_type': provider.provider_type,
                    'is_connected': provider.is_connected,
                }
                result.append(provider_data)
            
            _logger.info(f"獲取到 {len(result)} 個可用的 AI 供應商")
            return result
            
        except Exception as e:
            _logger.error(f"獲取 AI 供應商列表失敗: {str(e)}")
            raise UserError("無法獲取 AI 供應商列表，請稍後重試")

    @api.model
    def get_provider_models(self, provider_id):
        """
        獲取指定供應商的模型列表
        
        Args:
            provider_id (int): 供應商 ID
            
        Returns:
            list: 模型列表，每個項目包含 id, name, description 等欄位
        """
        if not provider_id:
            return []
            
        try:
            provider = self.env['nuido.ai.provider'].browse(provider_id)
            if not provider.exists():
                _logger.warning(f"供應商 ID {provider_id} 不存在")
                return []
            
            models = self.env['nuido.ai.model'].search([
                ('provider_id', '=', provider_id),
                ('active', '=', True)
            ])
            
            result = []
            for model in models:
                model_data = {
                    'id': model.id,
                    'name': model.name,
                    'description': model.description or '',
                    'model_name': model.model_name,
                    'version': model.version or '',
                    'is_available': model.is_available,
                    'context_window': model.context_window,
                    'max_tokens': model.max_tokens,
                }
                result.append(model_data)
            
            # 按名稱排序
            result.sort(key=lambda x: x['name'])
            
            _logger.info(f"供應商 {provider.name} 有 {len(result)} 個可用模型")
            return result
            
        except Exception as e:
            _logger.error(f"獲取供應商 {provider_id} 的模型列表失敗: {str(e)}")
            raise UserError(f"無法獲取模型列表，請稍後重試")

    @api.model
    def get_default_model_for_provider(self, provider_id):
        """
        獲取指定供應商的預設模型 ID
        
        Args:
            provider_id (int): 供應商 ID
            
        Returns:
            int|False: 預設模型的 ID，如果沒有則返回 False
        """
        if not provider_id:
            return False
            
        try:
            provider = self.env['nuido.ai.provider'].browse(provider_id)
            if not provider.exists():
                return False
            
            # 優先返回標記為預設的模型
            default_model = self.env['nuido.ai.model'].search([
                ('provider_id', '=', provider_id),
                ('active', '=', True),
                ('is_default', '=', True)
            ], limit=1)
            
            if default_model:
                return default_model.id
            
            # 如果沒有標記為預設的模型，返回第一個可用模型
            first_model = self.env['nuido.ai.model'].search([
                ('provider_id', '=', provider_id),
                ('active', '=', True),
                ('is_available', '=', True)
            ], limit=1, order='name')
            
            return first_model.id if first_model else False
            
        except Exception as e:
            _logger.error(f"獲取供應商 {provider_id} 的預設模型失敗: {str(e)}")
            return False

    @api.model
    def get_model_config(self, model_id):
        """
        獲取指定模型的完整配置資訊
        
        Args:
            model_id (int): 模型 ID
            
        Returns:
            dict: 模型的完整配置資訊
        """
        if not model_id:
            return {}
            
        try:
            model = self.env['nuido.ai.model'].browse(model_id)
            if not model.exists():
                _logger.warning(f"模型 ID {model_id} 不存在")
                return {}
            
            config = {
                'id': model.id,
                'name': model.name,
                'description': model.description or '',
                'model_name': model.model_name,
                'version': model.version or '',
                'provider_id': model.provider_id.id,
                'provider_name': model.provider_id.name,
                'provider_type': model.provider_id.provider_type,
                'is_available': model.is_available,
                'is_default': model.is_default,
                'context_window': model.context_window,
                'max_tokens': model.max_tokens,
                'temperature': model.temperature,
                'top_p': model.top_p,
                'frequency_penalty': model.frequency_penalty,
                'presence_penalty': model.presence_penalty,
                'api_endpoint': model.provider_id.api_endpoint,
                'created_date': model.create_date.isoformat() if model.create_date else None,
                'updated_date': model.write_date.isoformat() if model.write_date else None,
            }
            
            return config
            
        except Exception as e:
            _logger.error(f"獲取模型 {model_id} 的配置失敗: {str(e)}")
            raise UserError("無法獲取模型配置，請稍後重試")

    @api.model
    def validate_model_selection(self, provider_id, model_id):
        """
        驗證模型選擇的有效性
        
        Args:
            provider_id (int): 供應商 ID
            model_id (int): 模型 ID
            
        Returns:
            dict: 驗證結果，包含 valid, message 等欄位
        """
        try:
            if not provider_id or not model_id:
                return {
                    'valid': False,
                    'message': '供應商和模型都必須選擇'
                }
            
            provider = self.env['nuido.ai.provider'].browse(provider_id)
            if not provider.exists() or not provider.active:
                return {
                    'valid': False,
                    'message': '選擇的供應商不存在或已停用'
                }
            
            model = self.env['nuido.ai.model'].browse(model_id)
            if not model.exists() or not model.active:
                return {
                    'valid': False,
                    'message': '選擇的模型不存在或已停用'
                }
            
            if model.provider_id.id != provider_id:
                return {
                    'valid': False,
                    'message': '選擇的模型不屬於指定的供應商'
                }
            
            if not model.is_available:
                return {
                    'valid': False,
                    'message': '選擇的模型目前不可用'
                }
            
            # 檢查供應商連接狀態
            if not provider.is_connected:
                return {
                    'valid': False,
                    'message': f'供應商 {provider.name} 連接異常，請檢查配置'
                }
            
            return {
                'valid': True,
                'message': '模型選擇有效',
                'provider_name': provider.name,
                'model_name': model.name
            }
            
        except Exception as e:
            _logger.error(f"驗證模型選擇失敗: {str(e)}")
            return {
                'valid': False,
                'message': '驗證過程中發生錯誤'
            }

    @api.model
    def refresh_provider_models(self, provider_id):
        """
        刷新指定供應商的模型列表（從 API 重新獲取）
        
        Args:
            provider_id (int): 供應商 ID
            
        Returns:
            dict: 刷新結果
        """
        try:
            provider = self.env['nuido.ai.provider'].browse(provider_id)
            if not provider.exists():
                return {
                    'success': False,
                    'message': '供應商不存在'
                }
            
            # 調用供應商的刷新方法
            result = provider.refresh_available_models()
            
            if result.get('success'):
                _logger.info(f"成功刷新供應商 {provider.name} 的模型列表")
                return {
                    'success': True,
                    'message': f'成功刷新 {result.get("count", 0)} 個模型',
                    'model_count': result.get('count', 0)
                }
            else:
                return {
                    'success': False,
                    'message': result.get('message', '刷新失敗')
                }
                
        except Exception as e:
            _logger.error(f"刷新供應商 {provider_id} 模型列表失敗: {str(e)}")
            return {
                'success': False,
                'message': '刷新過程中發生錯誤'
            }

    @api.model
    def get_provider_statistics(self):
        """
        獲取供應商統計資訊
        
        Returns:
            dict: 統計資訊
        """
        try:
            total_providers = self.env['nuido.ai.provider'].search_count([])
            active_providers = self.env['nuido.ai.provider'].search_count([
                ('active', '=', True)
            ])
            connected_providers = self.env['nuido.ai.provider'].search_count([
                ('active', '=', True),
                ('is_connected', '=', True)
            ])
            
            total_models = self.env['nuido.ai.model'].search_count([])
            active_models = self.env['nuido.ai.model'].search_count([
                ('active', '=', True)
            ])
            available_models = self.env['nuido.ai.model'].search_count([
                ('active', '=', True),
                ('is_available', '=', True)
            ])
            
            return {
                'providers': {
                    'total': total_providers,
                    'active': active_providers,
                    'connected': connected_providers
                },
                'models': {
                    'total': total_models,
                    'active': active_models,
                    'available': available_models
                }
            }
            
        except Exception as e:
            _logger.error(f"獲取統計資訊失敗: {str(e)}")
            return {
                'providers': {'total': 0, 'active': 0, 'connected': 0},
                'models': {'total': 0, 'active': 0, 'available': 0}
            }