
import { registry } from "@web/core/registry";
import { NuidoNodeRegistryName } from "@nuido/utils/registry";
import { NuidoSidebarMenuItemRegistryName } from "@nuido_base/utils/registry";
import { OpenAiChatCompletionClientOptionModelNode } from "@nuido_flow_ai_option_model/components/ai/openai_chat_completion_client_option_model_node";
import { OpenAiChatCompletionClientOptionModelNodeModel } from "@nuido_flow_ai_option_model/models/ai/openai_chat_completion_client_option_model_node";

const nuidoNodeRegistry = registry.category(NuidoNodeRegistryName);
nuidoNodeRegistry.add(OpenAiChatCompletionClientOptionModelNode.name, {
    component: OpenAiChatCompletionClientOptionModelNode,
    model: OpenAiChatCompletionClientOptionModelNodeModel
});
// Menu items
// AI
const aiNodeMenuItemsReg = registry.category(NuidoSidebarMenuItemRegistryName);
const aiNodeMenuItems = aiNodeMenuItemsReg.get("AI");
aiNodeMenuItems.items.push({
    title: "OpenAI Chat Completion(Option Model)",
    icon: "/nuido_flow_ai_option_model/static/images/machine-learning.svg",
    type: OpenAiChatCompletionClientOptionModelNode.name
});