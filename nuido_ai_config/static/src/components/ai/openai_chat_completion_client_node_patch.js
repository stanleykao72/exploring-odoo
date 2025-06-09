/**
 * OpenAI Chat Completion Client Node Patch
 * 擴展原始的 OpenAI 節點，整合動態模型選擇器
 * 
 * 採用非侵入式 Patch 機制，透過繼承和覆寫來整合新功能
 */

import { OpenAiChatCompletionClientNode } from "@nuido_flow_ai/components/ai/openai_chat_completion_client_node";
import { DynamicModelSelector } from "./dynamic_model_selector";
import { useService } from "@odoo/owl";

/**
 * OpenAI 節點 Patch 類
 * 擴展原有功能，添加動態模型選擇支援
 */
export class OpenAiChatCompletionClientNodePatch extends OpenAiChatCompletionClientNode {
    
    setup() {
        super.setup();
        
        // 注入 AI 配置服務
        this.aiConfigService = useService("ai_config");
    }

    /**
     * 處理動態模型選擇器的變更事件
     * @param {Object} value - 選中的值 {provider_id, model_id}
     */
    onDynamicModelChanged(value) {
        // 更新節點資料結構
        if (value && value.provider_id && value.model_id) {
            this.props.node.provider_id = value.provider_id;
            this.props.node.model_id = value.model_id;
            
            // 向後相容：同步更新原有的 model 欄位
            this._syncLegacyModelField(value);
        } else {
            // 清除選擇
            this.props.node.provider_id = null;
            this.props.node.model_id = null;
            this.props.node.model = null;
        }
    }

    /**
     * 原有的模型變更處理方法（保持相容性）
     * @param {Event} event - 選擇事件
     */
    onAiModelChanged(event) {
        const modelValue = event.target.value;
        this.props.node.model = modelValue;
        
        // 嘗試將硬編碼模型值轉換為新的結構
        this._migrateLegacyModel(modelValue);
    }

    /**
     * 同步舊版 model 欄位（向後相容）
     * @param {Object} value - 動態選擇的值
     */
    async _syncLegacyModelField(value) {
        try {
            // 從 AI 配置服務獲取模型詳細資訊
            const models = await this.aiConfigService.getModels(value.provider_id);
            const modelInfo = models.find(m => m.id === value.model_id);
            
            if (modelInfo) {
                // 使用模型的 code 或 name 作為 legacy model 值
                this.props.node.model = modelInfo.code || modelInfo.name || value.model_id;
            } else {
                this.props.node.model = value.model_id;
            }
        } catch (error) {
            console.warn('同步 legacy model 欄位失敗:', error);
            this.props.node.model = value.model_id;
        }
    }

    /**
     * 將舊版硬編碼模型值遷移到新結構
     * @param {string} modelValue - 硬編碼的模型值
     */
    async _migrateLegacyModel(modelValue) {
        if (!modelValue) return;
        
        try {
            // 從所有供應商中搜索匹配的模型
            const providers = await this.aiConfigService.getProviders();
            
            for (const provider of providers) {
                const models = await this.aiConfigService.getModels(provider.id);
                const matchedModel = models.find(m => 
                    m.code === modelValue || 
                    m.name === modelValue || 
                    m.id === modelValue
                );
                
                if (matchedModel) {
                    this.props.node.provider_id = provider.id;
                    this.props.node.model_id = matchedModel.id;
                    break;
                }
            }
        } catch (error) {
            console.warn('遷移 legacy model 失敗:', error);
        }
    }

    /**
     * 獲取當前動態模型選擇器的值
     */
    get dynamicModelValue() {
        // 優先使用新的結構
        if (this.props.node.provider_id && this.props.node.model_id) {
            return {
                provider_id: this.props.node.provider_id,
                model_id: this.props.node.model_id
            };
        }
        
        // 如果有舊的 model 值，嘗試自動遷移
        if (this.props.node.model && !this.props.node.provider_id) {
            // 觸發異步遷移
            this._migrateLegacyModel(this.props.node.model);
        }
        
        return {
            provider_id: this.props.node.provider_id || null,
            model_id: this.props.node.model_id || null
        };
    }

    /**
     * 檢查是否需要顯示舊版選擇器（向後相容）
     */
    get shouldShowLegacySelector() {
        // 如果有舊的 model 值但沒有新的結構，顯示舊版選擇器
        return this.props.node.model && 
               (!this.props.node.provider_id || !this.props.node.model_id);
    }

    /**
     * 獲取節點資料的完整狀態摘要（用於除錯）
     */
    get nodeDataSummary() {
        return {
            legacy_model: this.props.node.model,
            provider_id: this.props.node.provider_id,
            model_id: this.props.node.model_id,
            api_key: this.props.node.api_key ? '[已設定]' : '[未設定]',
            base_url: this.props.node.base_url || '[預設]'
        };
    }
}

// 使用 Patch 版本的模板
OpenAiChatCompletionClientNodePatch.template = "nuido_flow_ai_option_model.openai-chat-completion-client-node-patch";

// 擴展組件列表，加入動態模型選擇器
OpenAiChatCompletionClientNodePatch.components = {
    ...OpenAiChatCompletionClientNode.components,
    DynamicModelSelector
};