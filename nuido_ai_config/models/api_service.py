# -*- coding: utf-8 -*-

from odoo import models, api, _
from odoo.exceptions import UserError
import logging

_logger = logging.getLogger(__name__)


class NuidoAiConfigService(models.TransientModel):
    """AI 配置服務 - 提供動態配置獲取功能"""
    
    _name = 'nuido.ai.config.service'
    _description = 'AI Configuration Service'

    @api.model
    def get_available_providers(self):
        """獲取所有可用的 AI 供應商"""
        providers = self.env['nuido.ai.provider'].search([
            ('active', '=', True),
            ('connection_status', '=', 'connected')
        ])
        
        return [{
            'id': provider.id,
            'name': provider.name,
            'display_name': provider.display_name,
            'api_type': provider.api_type,
            'model_count': provider.model_count
        } for provider in providers]

    @api.model
    def get_provider_models(self, provider_id):
        """獲取指定供應商的模型列表"""
        models = self.env['nuido.ai.model'].search([
            ('provider_id', '=', provider_id),
            ('active', '=', True)
        ])
        
        return [{
            'id': model.id,
            'name': model.name,
            'model_id': model.model_id,
            'display_name': model.display_name,
            'model_type': model.model_type,
            'is_default': model.is_default,
            'context_length': model.context_length
        } for model in models]

    @api.model
    def get_model_config(self, model_id):
        """獲取指定模型的完整配置"""
        model = self.env['nuido.ai.model'].browse(model_id)
        if not model.exists():
            raise UserError(_('指定的模型不存在'))
        
        provider = model.provider_id
        if not provider.active or provider.connection_status != 'connected':
            raise UserError(_('模型的供應商未啟用或連接失敗'))
        
        return {
            'provider': {
                'id': provider.id,
                'name': provider.name,
                'api_base_url': provider.api_base_url,
                'api_key': provider.api_key,
                'api_type': provider.api_type
            },
            'model': {
                'id': model.id,
                'name': model.name,
                'model_id': model.model_id,
                'model_type': model.model_type,
                'context_length': model.context_length
            },
            'config': model.get_api_config()
        }

    @api.model
    def get_default_model_for_provider(self, provider_id):
        """獲取指定供應商的預設模型"""
        default_model = self.env['nuido.ai.model'].search([
            ('provider_id', '=', provider_id),
            ('active', '=', True),
            ('is_default', '=', True)
        ], limit=1)
        
        if not default_model:
            # 如果沒有設定預設模型，返回第一個可用模型
            default_model = self.env['nuido.ai.model'].search([
                ('provider_id', '=', provider_id),
                ('active', '=', True)
            ], limit=1)
        
        return default_model.id if default_model else False