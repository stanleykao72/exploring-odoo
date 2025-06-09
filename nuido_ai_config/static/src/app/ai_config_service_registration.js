/**
 * AI 配置服務註冊
 * 
 * 此檔案負責將 AI 配置服務註冊到 Odoo 的服務系統中，
 * 確保服務可以被其他組件正確注入和使用。
 */

// 導入 AI 配置服務
import "@nuido_flow_ai_option_model/components/services/ai_config_service";

/**
 * 服務註冊完成
 * 
 * AI 配置服務已透過以下方式註冊：
 * - 服務名稱: "ai_config"
 * - 註冊位置: @web/core/registry 的 "services" 類別
 * - 服務實例: aiConfigService
 * 
 * 使用方式：
 * 在其他組件中可透過以下方式注入使用：
 * 
 * ```javascript
 * import { useService } from "@web/core/utils/hooks";
 * 
 * // 在組件中
 * const aiConfigService = useService("ai_config");
 * 
 * // 使用服務方法
 * const providers = await aiConfigService.getProviders();
 * const models = await aiConfigService.getModels(providerId);
 * const defaultModel = await aiConfigService.getDefaultModel();
 * const validation = await aiConfigService.validateProvider(providerId);
 * ```
 */

console.log('AI Configuration Service registered successfully');