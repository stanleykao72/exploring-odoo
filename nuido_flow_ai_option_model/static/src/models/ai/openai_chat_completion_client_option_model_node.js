// THIS FILE IS A PART OF PUBLIC REPOSITORY https://github.com/yonitjio/exploring-odoo
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
// 
// THIS SOFTWARE IS EXPERIMENTAL AND FOR EDUCATIONAL PURPOSE ONLY.
// DO NOT USE IT IN PRODUCTION.
import { NodeModel } from "@nuido/models/node";
import { AiChatCompletionPort } from "@nuido_flow_ai/components/ports/ai_chat_completion_port";
import { reactive } from "@odoo/owl";

export class OpenAiChatCompletionClientOptionModelNodeModel extends NodeModel {
    setup() {
        const auxOutId = "aux-out-" + this.id + "-ai-chat-completion";
        this.addAuxOutPort(auxOutId, AiChatCompletionPort.name, Number.MAX_SAFE_INTEGER, {
            role: "ai-chat-completion"
        });
        
        // 使用 reactive 包裝配置物件以確保 UI 反應性
        this.config = reactive({
            model: "qwen2.5-7b-instruct",
            api_key: "__NOT_USED__",
            base_url: "http://localhost:1234/v1"
        });
        
        // AI 模型選擇狀態
        this.aiModelState = reactive({
            selectedAiModelId: null,
            selectedAiModelName: "",
            aiModelTags: []
        });
        
        // 用於強制重新渲染的版本計數器
        this.renderVersion = reactive({ count: 0 });
    }

    // 為了向後相容性，提供 getter/setter
    get model() {
        return this.config.model;
    }
    
    set model(value) {
        this.config.model = value;
    }
    
    get api_key() {
        return this.config.api_key;
    }
    
    set api_key(value) {
        this.config.api_key = value;
    }
    
    get base_url() {
        return this.config.base_url;
    }
    
    set base_url(value) {
        this.config.base_url = value;
    }
    
    get selectedAiModelId() {
        return this.aiModelState.selectedAiModelId;
    }
    
    get selectedAiModelName() {
        return this.aiModelState.selectedAiModelName;
    }
    
    get aiModelTags() {
        return this.aiModelState.aiModelTags;
    }
    
    /**
     * 從選中的模型記錄設定配置（由組件調用）
     */
    setAiModelFromRecord(modelData, providerData) {
        // 檢查資料完整性
        if (!modelData || !providerData) {
            console.error('NodeModel: 模型資料或供應商資料不完整');
            return;
        }
        
        // 更新節點配置（使用 reactive 物件）
        this.config.model = modelData.model_id || this.config.model;
        this.config.api_key = providerData.api_key || this.config.api_key;
        this.config.base_url = providerData.api_base_url || this.config.base_url;
        
        // 更新選中的模型資訊
        this.aiModelState.selectedAiModelId = modelData.id;
        this.aiModelState.selectedAiModelName = modelData.display_name;
        this.aiModelState.aiModelTags = [{
            id: modelData.id,
            name: modelData.display_name
        }];
        
        // 增加版本計數器強制重新渲染
        this.renderVersion.count++;
    }
    
    /**
     * 當移除 AI 模型時的回調函式
     */
    onAiModelDeleted(modelId) {
        // 清除選中的模型
        this.aiModelState.selectedAiModelId = null;
        this.aiModelState.selectedAiModelName = "";
        this.aiModelState.aiModelTags = this.aiModelState.aiModelTags.filter(tag => tag.id !== modelId);
        
        // 重置為預設值
        this.config.model = "qwen2.5-7b-instruct";
        this.config.api_key = "__NOT_USED__";
        this.config.base_url = "http://localhost:1234/v1";
    }
}
