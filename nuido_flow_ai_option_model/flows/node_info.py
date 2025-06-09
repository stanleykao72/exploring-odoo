
from odoo.addons.nuido_flow.flows.node_info import getDefaultInfo
from ..flows.ai.openai_chat_completion_client_option_model_node import OpenAiChatCompletionClientOptionModelNode
import logging

_logger = logging.getLogger(__name__)


# Open AI Chat Completion
def build_openai_chat_completion_client_option_model_node(node, edges):
    
    _logger.info("Building OpenAI Chat Completion Client Option Model Node: %s", node)
    info = getDefaultInfo(node, edges)
    _logger.info("Node Info: %s", info)
    info["model"] = node["config"]["model"]
    info["api_key"] = node["config"]["api_key"]
    info["base_url"] = node["config"]["base_url"]

    return info

def create_openai_chat_completion_client_option_model_node(environment, create_function_registry, definitions, definition):
    return OpenAiChatCompletionClientOptionModelNode(environment, create_function_registry, definitions, definition)
