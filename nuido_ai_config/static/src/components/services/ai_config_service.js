/**
 * AI 配置服務 - 提供動態載入 AI 供應商和模型配置的服務
 */

import { registry } from "@web/core/registry";
import { rpc } from "@web/core/network/rpc";

/**
 * AI 配置服務類
 * 實現與後端 API 的通訊和本地快取機制
 */
class AiConfigService {
    constructor() {
        // 快取配置，避免重複的後端請求
        this.cache = {
            providers: null,
            models: new Map(),
            defaultModel: null,
            cacheTime: null,
            cacheTimeout: 5 * 60 * 1000 // 5 分鐘快取
        };
        
        // 正在進行的請求，避免重複請求
        this.pendingRequests = new Map();
    }

    /**
     * 檢查快取是否有效
     */
    _isCacheValid() {
        if (!this.cache.cacheTime) return false;
        return (Date.now() - this.cache.cacheTime) < this.cache.cacheTimeout;
    }

    /**
     * 清除快取
     */
    _clearCache() {
        this.cache.providers = null;
        this.cache.models.clear();
        this.cache.defaultModel = null;
        this.cache.cacheTime = null;
    }

    /**
     * 獲取所有可用的 AI 供應商列表
     */
    async getProviders() {
        try {
            // 檢查快取
            if (this._isCacheValid() && this.cache.providers) {
                return this.cache.providers;
            }

            // 檢查是否有正在進行的請求
            if (this.pendingRequests.has('providers')) {
                return await this.pendingRequests.get('providers');
            }

            // 建立新請求
            const requestPromise = rpc('/web/dataset/call_kw', {
                model: 'nuido.ai.config.service',
                method: 'get_available_providers',
                args: [],
                kwargs: {},
            });

            this.pendingRequests.set('providers', requestPromise);

            try {
                const result = await requestPromise;
                
                // 更新快取
                this.cache.providers = result;
                this.cache.cacheTime = Date.now();
                
                return result;
            } finally {
                this.pendingRequests.delete('providers');
            }
        } catch (error) {
            console.error('Failed to fetch AI providers:', error);
            throw new Error('無法獲取 AI 供應商列表');
        }
    }

    /**
     * 獲取指定供應商的模型列表
     */
    async getModels(providerId) {
        if (!providerId) {
            throw new Error('供應商 ID 不能為空');
        }

        try {
            // 檢查快取
            const cacheKey = `models_${providerId}`;
            if (this._isCacheValid() && this.cache.models.has(providerId)) {
                return this.cache.models.get(providerId);
            }

            // 檢查是否有正在進行的請求
            if (this.pendingRequests.has(cacheKey)) {
                return await this.pendingRequests.get(cacheKey);
            }

            // 建立新請求
            const requestPromise = rpc('/web/dataset/call_kw', {
                model: 'nuido.ai.config.service',
                method: 'get_provider_models',
                args: [providerId],
                kwargs: {},
            });

            this.pendingRequests.set(cacheKey, requestPromise);

            try {
                const result = await requestPromise;
                
                // 更新快取
                this.cache.models.set(providerId, result);
                this.cache.cacheTime = Date.now();
                
                return result;
            } finally {
                this.pendingRequests.delete(cacheKey);
            }
        } catch (error) {
            console.error(`Failed to fetch models for provider ${providerId}:`, error);
            throw new Error(`無法獲取供應商 ${providerId} 的模型列表`);
        }
    }

    /**
     * 獲取預設模型配置
     */
    async getDefaultModel() {
        try {
            // 檢查快取
            if (this._isCacheValid() && this.cache.defaultModel) {
                return this.cache.defaultModel;
            }

            // 檢查是否有正在進行的請求
            if (this.pendingRequests.has('defaultModel')) {
                return await this.pendingRequests.get('defaultModel');
            }

            // 首先獲取所有供應商
            const providers = await this.getProviders();
            
            if (!providers || providers.length === 0) {
                throw new Error('沒有可用的 AI 供應商');
            }

            // 獲取第一個供應商的預設模型
            const firstProvider = providers[0];
            const requestPromise = rpc('/web/dataset/call_kw', {
                model: 'nuido.ai.config.service',
                method: 'get_default_model_for_provider',
                args: [firstProvider.id],
                kwargs: {},
            });

            this.pendingRequests.set('defaultModel', requestPromise);

            try {
                const defaultModelId = await requestPromise;
                
                if (!defaultModelId) {
                    throw new Error('未找到預設模型');
                }

                const result = {
                    provider_id: firstProvider.id,
                    model_id: defaultModelId
                };
                
                // 更新快取
                this.cache.defaultModel = result;
                this.cache.cacheTime = Date.now();
                
                return result;
            } finally {
                this.pendingRequests.delete('defaultModel');
            }
        } catch (error) {
            console.error('Failed to fetch default model:', error);
            throw new Error('無法獲取預設模型配置');
        }
    }

    /**
     * 驗證供應商連接狀態
     */
    async validateProvider(providerId) {
        if (!providerId) {
            throw new Error('供應商 ID 不能為空');
        }

        try {
            const result = await rpc('/web/dataset/call_kw', {
                model: 'nuido.ai.provider',
                method: 'test_connection',
                args: [providerId],
                kwargs: {},
            });

            return {
                status: result.success ? 'connected' : 'failed',
                message: result.message || (result.success ? '連接成功' : '連接失敗')
            };
        } catch (error) {
            console.error(`Failed to validate provider ${providerId}:`, error);
            return {
                status: 'error',
                message: '驗證過程中發生錯誤'
            };
        }
    }

    /**
     * 獲取完整的模型配置
     */
    async getModelConfig(modelId) {
        if (!modelId) {
            throw new Error('模型 ID 不能為空');
        }

        try {
            const result = await rpc('/web/dataset/call_kw', {
                model: 'nuido.ai.config.service',
                method: 'get_model_config',
                args: [modelId],
                kwargs: {},
            });

            return result;
        } catch (error) {
            console.error(`Failed to fetch model config for model ${modelId}:`, error);
            throw new Error(`無法獲取模型 ${modelId} 的配置`);
        }
    }

    /**
     * 手動刷新快取
     */
    refreshCache() {
        this._clearCache();
    }

    /**
     * 設定快取超時時間
     */
    setCacheTimeout(timeout) {
        this.cache.cacheTimeout = timeout;
    }
}

// 建立並註冊服務
const aiConfigService = new AiConfigService();

export { aiConfigService };

// 註冊到 Odoo 服務系統
registry.category("services").add("ai_config", {
    start() {
        return aiConfigService;
    },
});