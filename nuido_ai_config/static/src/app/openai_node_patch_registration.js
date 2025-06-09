/**
 * OpenAI 節點 Patch 註冊
 * 將 Patch 版本的 OpenAI 節點註冊到組件註冊表中，覆蓋原始版本
 */

import { registry } from "@web/core/registry";
import { OpenAiChatCompletionClientNode } from "@nuido_flow_ai/components/ai/openai_chat_completion_client_node";
import { OpenAiChatCompletionClientNodePatch } from "../components/ai/openai_chat_completion_client_node_patch";

/**
 * 註冊 Patch 版本的 OpenAI 節點
 */
export function registerOpenAiNodePatch() {
    // 使用 Patch 版本替換原始組件
    registry.category("components").remove(OpenAiChatCompletionClientNode.name);
    registry.category("components").add(OpenAiChatCompletionClientNodePatch.name, OpenAiChatCompletionClientNodePatch);
}

// 在應用啟動時執行註冊
if (window.odoo && window.odoo.__DEBUG__) {
    console.log("[nuido_flow_ai_option_model] Registering OpenAI Node Patch");
}
registerOpenAiNodePatch();