/**
 * 動態模型選擇器使用範例
 * 展示如何在不同場景中使用 DynamicModelSelector 組件
 */

import { Component, useState } from "@odoo/owl";
import { DynamicModelSelector } from "./dynamic_model_selector";

/**
 * 基本使用範例
 */
export class BasicUsageExample extends Component {
    static template = "nuido_flow_ai_option_model.BasicUsageExample";
    static components = { DynamicModelSelector };

    setup() {
        this.state = useState({
            selectedModel: { provider_id: null, model_id: null }
        });
    }

    onModelChanged(value) {
        this.state.selectedModel = value;
        console.log('選中的模型配置:', value);
    }
}

/**
 * 表單整合範例
 */
export class FormIntegrationExample extends Component {
    static template = "nuido_flow_ai_option_model.FormIntegrationExample";
    static components = { DynamicModelSelector };

    setup() {
        this.state = useState({
            formData: {
                name: '',
                description: '',
                aiModel: { provider_id: null, model_id: null }
            },
            errors: {}
        });
    }

    onModelChanged(value) {
        this.state.formData.aiModel = value;
        this.validateForm();
    }

    validateForm() {
        const errors = {};
        
        if (!this.state.formData.name) {
            errors.name = '名稱為必填欄位';
        }
        
        if (!this.state.formData.aiModel.provider_id || !this.state.formData.aiModel.model_id) {
            errors.aiModel = '請選擇 AI 模型';
        }
        
        this.state.errors = errors;
        return Object.keys(errors).length === 0;
    }

    async onSubmit() {
        if (this.validateForm()) {
            try {
                console.log('提交表單數據:', this.state.formData);
                // 這裡可以調用 API 提交數據
            } catch (error) {
                console.error('提交失敗:', error);
            }
        }
    }
}

/**
 * 自定義樣式範例
 */
export class CustomStyleExample extends Component {
    static template = "nuido_flow_ai_option_model.CustomStyleExample";
    static components = { DynamicModelSelector };

    setup() {
        this.state = useState({
            smallModel: { provider_id: null, model_id: null },
            mediumModel: { provider_id: null, model_id: null },
            largeModel: { provider_id: null, model_id: null }
        });
    }

    onSmallModelChanged(value) {
        this.state.smallModel = value;
    }

    onMediumModelChanged(value) {
        this.state.mediumModel = value;
    }

    onLargeModelChanged(value) {
        this.state.largeModel = value;
    }
}

/**
 * 批量管理範例
 */
export class BatchManagementExample extends Component {
    static template = "nuido_flow_ai_option_model.BatchManagementExample";
    static components = { DynamicModelSelector };

    setup() {
        this.state = useState({
            modelConfigs: [
                { id: 1, name: '文本生成', model: { provider_id: null, model_id: null }, enabled: true },
                { id: 2, name: '程式碼生成', model: { provider_id: null, model_id: null }, enabled: true },
                { id: 3, name: '圖像分析', model: { provider_id: null, model_id: null }, enabled: false }
            ]
        });
    }

    onModelChanged(configId, value) {
        const config = this.state.modelConfigs.find(c => c.id === configId);
        if (config) {
            config.model = value;
        }
    }

    addConfig() {
        const newId = Math.max(...this.state.modelConfigs.map(c => c.id)) + 1;
        this.state.modelConfigs.push({
            id: newId,
            name: `新配置 ${newId}`,
            model: { provider_id: null, model_id: null },
            enabled: true
        });
    }

    removeConfig(configId) {
        const index = this.state.modelConfigs.findIndex(c => c.id === configId);
        if (index > -1) {
            this.state.modelConfigs.splice(index, 1);
        }
    }

    toggleConfig(configId) {
        const config = this.state.modelConfigs.find(c => c.id === configId);
        if (config) {
            config.enabled = !config.enabled;
        }
    }
}

/**
 * 進階功能範例
 */
export class AdvancedFeaturesExample extends Component {
    static template = "nuido_flow_ai_option_model.AdvancedFeaturesExample";
    static components = { DynamicModelSelector };

    setup() {
        this.state = useState({
            currentModel: { provider_id: null, model_id: null },
            modelHistory: [],
            showAdvanced: false
        });
    }

    onModelChanged(value) {
        // 記錄歷史
        if (this.state.currentModel.provider_id || this.state.currentModel.model_id) {
            this.state.modelHistory.unshift({
                ...this.state.currentModel,
                timestamp: new Date()
            });
            
            // 只保留最近 10 個記錄
            if (this.state.modelHistory.length > 10) {
                this.state.modelHistory.pop();
            }
        }
        
        this.state.currentModel = value;
        console.log('模型變更:', value);
        console.log('變更歷史:', this.state.modelHistory);
    }

    restoreFromHistory(historyItem) {
        this.state.currentModel = {
            provider_id: historyItem.provider_id,
            model_id: historyItem.model_id
        };
    }

    clearHistory() {
        this.state.modelHistory = [];
    }

    toggleAdvanced() {
        this.state.showAdvanced = !this.state.showAdvanced;
    }
}