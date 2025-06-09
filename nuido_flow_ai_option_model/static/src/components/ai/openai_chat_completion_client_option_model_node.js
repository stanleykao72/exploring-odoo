// THIS FILE IS A PART OF PUBLIC REPOSITORY https://github.com/yonitjio/exploring-odoo
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
// 
// THIS SOFTWARE IS EXPERIMENTAL AND FOR EDUCATIONAL PURPOSE ONLY.
// DO NOT USE IT IN PRODUCTION.
import { Node } from "@nuido/components/node";
import { TextInputDialogInput } from "@nuido_base/components/dialogs/text_input_dialog_input";
import { RecordLookupTags } from "@nuido_flow/components/ui/record_lookup_tags";
import { useService } from "@web/core/utils/hooks";

export class OpenAiChatCompletionClientOptionModelNode extends Node {
    setup() {
        super.setup();
        
        // 初始化 ORM 服務
        this.orm = useService("orm");
        
        // 只有在沒有已儲存的模型時才載入預設 AI 模型
        this._loadDefaultAiModelIfNeeded();
    }
    
    /**
     * 只有在沒有已儲存的模型配置時才載入預設 AI 模型
     */
    async _loadDefaultAiModelIfNeeded() {
        try {
            // 檢查是否已經有儲存的模型配置
            const hasExistingConfig = this._hasExistingModelConfig();
            
            if (!hasExistingConfig) {
                console.log('沒有找到已儲存的模型配置，載入預設模型');
                await this._loadDefaultAiModel();
            } else {
                console.log('已找到儲存的模型配置，跳過載入預設模型');
            }
        } catch (error) {
            console.error('檢查模型配置時發生錯誤:', error);
            // 如果檢查出錯，安全起見還是載入預設模型
            await this._loadDefaultAiModel();
        }
    }
    
    /**
     * 檢查是否已經有儲存的模型配置
     */
    _hasExistingModelConfig() {
        // 檢查是否有已選中的 AI 模型 ID
        if (this.props.node.selectedAiModelId) {
            return true;
        }
        
        // 檢查是否有非預設的 API 配置
        const defaultConfig = {
            model: "qwen2.5-7b-instruct",
            api_key: "__NOT_USED__",
            base_url: "http://localhost:1234/v1"
        };
        
        const currentConfig = {
            model: this.props.node.model,
            api_key: this.props.node.api_key,
            base_url: this.props.node.base_url
        };
        
        // 如果任何配置與預設值不同，表示使用者已經設定過
        const hasCustomModel = currentConfig.model && currentConfig.model !== defaultConfig.model;
        const hasCustomApiKey = currentConfig.api_key && currentConfig.api_key !== defaultConfig.api_key;
        const hasCustomBaseUrl = currentConfig.base_url && currentConfig.base_url !== defaultConfig.base_url;
        
        return hasCustomModel || hasCustomApiKey || hasCustomBaseUrl;
    }
    
    /**
     * 載入預設的 AI 模型配置
     */
    async _loadDefaultAiModel() {
        try {
            // 查找 is_default = True 的第一筆記錄
            const defaultModels = await this.orm.searchRead(
                'nuido.ai.model',
                [['is_default', '=', true], ['active', '=', true]],
                ['id', 'display_name', 'model_id', 'provider_id'],
                { limit: 1 }
            );
            
            if (defaultModels.length > 0) {
                const defaultModel = defaultModels[0];
                await this._setAiModelFromRecord(defaultModel);
            }
        } catch (error) {
            console.error('載入預設 AI 模型時發生錯誤:', error);
        }
    }
    
    /**
     * 從選中的模型記錄設定配置
     */
    async _setAiModelFromRecord(modelRecord) {
        try {
            // 取得完整的模型資訊（包含關聯的供應商資訊）
            const modelData = await this.orm.read(
                'nuido.ai.model',
                [modelRecord.id],
                ['model_id', 'provider_id', 'display_name'],
                {}
            );
            
            if (modelData.length > 0) {
                const model = modelData[0];
                
                if (model.provider_id && model.provider_id[0]) {
                    // 取得供應商資訊
                    const providerData = await this.orm.read(
                        'nuido.ai.provider',
                        [model.provider_id[0]],
                        ['api_key', 'api_base_url'],
                        {}
                    );
                    
                    if (providerData.length > 0) {
                        const provider = providerData[0];
                        
                        // 檢查供應商資料是否有效
                        if (!provider.api_key || !provider.api_base_url) {
                            console.warn('供應商資料不完整，API Key 或 Base URL 為空');
                        }
                        
                        // 更新節點配置
                        this.props.node.setAiModelFromRecord(model, provider);
                        
                        // 給一個短暫的延遲確保狀態更新完成，然後強制重新渲染
                        await new Promise(resolve => setTimeout(resolve, 100));
                        this.render();
                        
                    } else {
                        console.error('找不到供應商資料，供應商 ID:', model.provider_id[0]);
                    }
                } else {
                    console.error('模型沒有關聯的供應商，模型資料:', model);
                }
            } else {
                console.error('找不到模型資料，模型 ID:', modelRecord.id);
            }
        } catch (error) {
            console.error('設定 AI 模型配置時發生錯誤:', error);
        }
    }
    
    /**
     * 當透過下拉選單選擇 AI 模型時的處理函式（保留向後相容性）
     */
    onAiModelChanged(event) {
        this.props.node.model = event.target.value;
    }
    
    /**
     * 當 API 金鑰變更時的處理函式
     */
    onApiKeyChanged(value) {
        this.props.node.api_key = value;
    }
    
    /**
     * 當基礎 URL 變更時的處理函式
     */
    onBaseUrlChanged(value) {
        this.props.node.base_url = value;
    }
    
    /**
     * 當透過 RecordLookupTags 添加 AI 模型時的處理函式
     */
    async onAiModelTagAdded(modelId, modelName) {
        try {
            const modelRecord = { id: modelId, display_name: modelName };
            await this._setAiModelFromRecord(modelRecord);
            // 強制重新渲染以確保 UI 更新
            this.render();
        } catch (error) {
            console.error('添加 AI 模型時發生錯誤:', error);
        }
    }
    
    /**
     * 當透過 RecordLookupTags 移除 AI 模型時的處理函式
     */
    onAiModelTagDeleted(modelId) {
        this.props.node.onAiModelDeleted(modelId);
    }
    
    /**
     * 取得 AI 模型選擇器的屬性
     */
    get aiModelSelectorProps() {
        return {
            model: 'nuido.ai.model',
            string: 'AI 模型',
            domain: [['active', '=', true]],
            placeholder: '選擇 AI 模型...',
            tags: this.props.node.aiModelTags,
            onTagAdded: this.onAiModelTagAdded.bind(this),
            onTagDeleted: this.onAiModelTagDeleted.bind(this)
        };
    }
    
    /**
     * 取得下拉選單的 input ID（向後相容性）
     */
    get aiModelInputId() {
        return `input-${this.props.node.id}-ai-model`;
    }
    
    /**
     * 取得當前選中的模型值
     */
    get selectedModelValue() {
        return this.props.node.model;
    }
}

OpenAiChatCompletionClientOptionModelNode.template = "nuido_flow_ai_option_model.openai-chat-completion-client-option-model-node";
OpenAiChatCompletionClientOptionModelNode.components = {
    ...Node.components,
    TextInputDialogInput,
    RecordLookupTags
};
