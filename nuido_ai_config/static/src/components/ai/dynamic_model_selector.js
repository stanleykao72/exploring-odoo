/**
 * 動態 AI 模型選擇器組件
 * 提供動態的 AI 供應商和模型選擇界面
 */

import { Component, useState, useService, onWillStart, onMounted } from "@odoo/owl";

/**
 * 動態模型選擇器組件類
 * 支援動態載入供應商列表和模型列表，提供完整的用戶體驗
 */
export class DynamicModelSelector extends Component {
    static template = "nuido_flow_ai_option_model.DynamicModelSelector";
    static props = {
        // 當前選中的值 {provider_id, model_id}
        value: { type: Object, optional: true },
        // 選擇變更回調函數
        onChanged: { type: Function, optional: true },
        // 選擇器標籤
        label: { type: String, optional: true },
        // 是否必填
        required: { type: Boolean, optional: true },
        // 是否禁用
        disabled: { type: Boolean, optional: true },
        // 自定義 CSS 類名
        class: { type: String, optional: true },
        // 選擇器大小
        size: { type: String, optional: true }, // 'sm', 'md', 'lg'
    };

    static defaultProps = {
        value: { provider_id: null, model_id: null },
        label: "AI 模型選擇",
        required: false,
        disabled: false,
        class: "",
        size: "md",
    };

    setup() {
        // 注入 AI 配置服務
        this.aiConfigService = useService("ai_config");
        
        // 組件狀態管理
        this.state = useState({
            // 供應商列表
            providers: [],
            // 當前供應商的模型列表
            models: [],
            // 載入狀態
            loading: {
                providers: false,
                models: false,
                initial: true,
            },
            // 錯誤訊息
            error: {
                providers: null,
                models: null,
            },
            // 當前選中的值
            selectedProvider: this.props.value?.provider_id || null,
            selectedModel: this.props.value?.model_id || null,
        });

        // 組件初始化時載入供應商列表
        onWillStart(async () => {
            await this.loadProviders();
            
            // 如果有預設值，載入對應的模型列表
            if (this.state.selectedProvider) {
                await this.loadModels(this.state.selectedProvider);
            }
            
            this.state.loading.initial = false;
        });

        // 組件掛載後的處理
        onMounted(() => {
            this._validateCurrentSelection();
        });
    }

    /**
     * 載入供應商列表
     */
    async loadProviders() {
        this.state.loading.providers = true;
        this.state.error.providers = null;
        
        try {
            const providers = await this.aiConfigService.getProviders();
            this.state.providers = providers || [];
            
            // 如果沒有預設選中的供應商，自動選擇第一個
            if (!this.state.selectedProvider && this.state.providers.length > 0) {
                this.state.selectedProvider = this.state.providers[0].id;
                await this.loadModels(this.state.selectedProvider);
            }
        } catch (error) {
            console.error('載入供應商列表失敗:', error);
            this.state.error.providers = error.message || '載入供應商列表失敗';
            this.state.providers = [];
        } finally {
            this.state.loading.providers = false;
        }
    }

    /**
     * 載入指定供應商的模型列表
     */
    async loadModels(providerId) {
        if (!providerId) {
            this.state.models = [];
            return;
        }

        this.state.loading.models = true;
        this.state.error.models = null;
        
        try {
            const models = await this.aiConfigService.getModels(providerId);
            this.state.models = models || [];
            
            // 如果當前選中的模型不在新的模型列表中，清除選擇
            if (this.state.selectedModel) {
                const modelExists = this.state.models.some(
                    model => model.id === this.state.selectedModel
                );
                if (!modelExists) {
                    this.state.selectedModel = null;
                }
            }
            
            // 如果沒有選中的模型且有可用模型，自動選擇第一個
            if (!this.state.selectedModel && this.state.models.length > 0) {
                this.state.selectedModel = this.state.models[0].id;
            }
            
            // 通知父組件值已變更
            this._notifyChange();
        } catch (error) {
            console.error('載入模型列表失敗:', error);
            this.state.error.models = error.message || '載入模型列表失敗';
            this.state.models = [];
        } finally {
            this.state.loading.models = false;
        }
    }

    /**
     * 處理供應商選擇變更
     */
    async onProviderChange(event) {
        const providerId = event.target.value;
        this.state.selectedProvider = providerId;
        this.state.selectedModel = null; // 清除之前的模型選擇
        
        if (providerId) {
            await this.loadModels(providerId);
        } else {
            this.state.models = [];
            this._notifyChange();
        }
    }

    /**
     * 處理模型選擇變更
     */
    onModelChange(event) {
        this.state.selectedModel = event.target.value;
        this._notifyChange();
    }

    /**
     * 重試載入供應商列表
     */
    async retryLoadProviders() {
        await this.loadProviders();
    }

    /**
     * 重試載入模型列表
     */
    async retryLoadModels() {
        if (this.state.selectedProvider) {
            await this.loadModels(this.state.selectedProvider);
        }
    }

    /**
     * 手動刷新快取並重新載入
     */
    async refreshData() {
        this.aiConfigService.refreshCache();
        this.state.selectedProvider = null;
        this.state.selectedModel = null;
        await this.loadProviders();
    }

    /**
     * 通知父組件值已變更
     */
    _notifyChange() {
        if (this.props.onChanged) {
            const value = {
                provider_id: this.state.selectedProvider,
                model_id: this.state.selectedModel,
            };
            this.props.onChanged(value);
        }
    }

    /**
     * 驗證當前選擇的有效性
     */
    _validateCurrentSelection() {
        // 如果必填但沒有選擇，顯示警告
        if (this.props.required && (!this.state.selectedProvider || !this.state.selectedModel)) {
            console.warn('DynamicModelSelector: 必填欄位未完成選擇');
        }
    }

    /**
     * 獲取當前選中的供應商資訊
     */
    get selectedProviderInfo() {
        if (!this.state.selectedProvider) return null;
        return this.state.providers.find(p => p.id === this.state.selectedProvider);
    }

    /**
     * 獲取當前選中的模型資訊
     */
    get selectedModelInfo() {
        if (!this.state.selectedModel) return null;
        return this.state.models.find(m => m.id === this.state.selectedModel);
    }

    /**
     * 檢查是否有錯誤
     */
    get hasError() {
        return !!(this.state.error.providers || this.state.error.models);
    }

    /**
     * 檢查是否正在載入
     */
    get isLoading() {
        return this.state.loading.initial || 
               this.state.loading.providers || 
               this.state.loading.models;
    }

    /**
     * 獲取組件的 CSS 類名
     */
    get componentClass() {
        const baseClass = 'dynamic-model-selector';
        const sizeClass = `${baseClass}--${this.props.size}`;
        const stateClasses = [];
        
        if (this.isLoading) stateClasses.push(`${baseClass}--loading`);
        if (this.hasError) stateClasses.push(`${baseClass}--error`);
        if (this.props.disabled) stateClasses.push(`${baseClass}--disabled`);
        if (this.props.required) stateClasses.push(`${baseClass}--required`);
        
        return [baseClass, sizeClass, ...stateClasses, this.props.class]
            .filter(Boolean)
            .join(' ');
    }
}