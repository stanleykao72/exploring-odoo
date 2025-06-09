# 動態模型選擇器使用範例

## 在 Odoo 視圖中的實際應用

### 1. 基本表單整合

在現有的 Odoo 表單視圖中添加動態模型選擇器：

```xml
<!-- views/ai_task_views.xml -->
<field name="arch" type="xml">
    <form string="AI 任務配置">
        <sheet>
            <group>
                <field name="name" required="1"/>
                <field name="description"/>
                
                <!-- 使用動態模型選擇器 -->
                <field name="ai_provider_id" invisible="1"/>
                <field name="ai_model_id" invisible="1"/>
                
                <widget name="dynamic_model_selector"
                        provider_field="ai_provider_id"
                        model_field="ai_model_id"
                        required="1"
                        label="AI 模型配置"/>
            </group>
        </sheet>
    </form>
</field>
```

### 2. 在設定頁面中使用

```xml
<!-- views/res_config_settings_views.xml -->
<record id="res_config_settings_view_form" model="ir.ui.view">
    <field name="name">res.config.settings.view.form.inherit.ai</field>
    <field name="model">res.config.settings</field>
    <field name="inherit_id" ref="base.res_config_settings_view_form"/>
    <field name="arch" type="xml">
        <xpath expr="//div[hasclass('settings')]" position="inside">
            <div class="app_settings_block" data-string="AI 配置" data-key="ai_settings">
                <h2>AI 模型設定</h2>
                
                <div class="row mt16 o_settings_container">
                    <div class="col-12 col-lg-6 o_setting_box">
                        <div class="o_setting_left_pane">
                            <field name="default_ai_provider_id" invisible="1"/>
                            <field name="default_ai_model_id" invisible="1"/>
                        </div>
                        <div class="o_setting_right_pane">
                            <label for="default_ai_model_selector" string="預設 AI 模型"/>
                            <div class="text-muted">
                                選擇系統預設使用的 AI 模型
                            </div>
                            <widget name="dynamic_model_selector"
                                    id="default_ai_model_selector"
                                    provider_field="default_ai_provider_id"
                                    model_field="default_ai_model_id"
                                    size="lg"/>
                        </div>
                    </div>
                </div>
            </div>
        </xpath>
    </field>
</record>
```

### 3. 在嚮導中使用

```xml
<!-- wizard/ai_setup_wizard_views.xml -->
<record id="ai_setup_wizard_form" model="ir.ui.view">
    <field name="name">ai.setup.wizard.form</field>
    <field name="model">ai.setup.wizard</field>
    <field name="arch" type="xml">
        <form string="AI 設定精靈">
            <sheet>
                <div class="oe_title">
                    <h1>設定您的 AI 模型</h1>
                    <p>請選擇要使用的 AI 供應商和模型</p>
                </div>
                
                <group>
                    <field name="provider_id" invisible="1"/>
                    <field name="model_id" invisible="1"/>
                    
                    <widget name="dynamic_model_selector"
                            provider_field="provider_id"
                            model_field="model_id"
                            required="1"
                            size="lg"
                            class="mb-3"/>
                </group>
                
                <group string="測試配置" attrs="{'invisible': [('model_id', '=', False)]}">
                    <field name="test_prompt" placeholder="輸入測試提示詞..."/>
                    <button name="test_model_connection"
                            string="測試連接"
                            type="object"
                            class="btn btn-primary"/>
                </group>
            </sheet>
            
            <footer>
                <button string="下一步" name="action_next" type="object" class="btn-primary"/>
                <button string="取消" class="btn-secondary" special="cancel"/>
            </footer>
        </form>
    </field>
</record>
```

### 4. 在清單視圖中顯示

```xml
<!-- views/ai_task_views.xml -->
<record id="ai_task_tree" model="ir.ui.view">
    <field name="name">ai.task.tree</field>
    <field name="model">ai.task</field>
    <field name="arch" type="xml">
        <tree string="AI 任務">
            <field name="name"/>
            <field name="ai_provider_name" string="AI 供應商"/>
            <field name="ai_model_name" string="AI 模型"/>
            <field name="state"/>
            <field name="create_date"/>
        </tree>
    </field>
</record>
```

## JavaScript 客製化範例

### 1. 自定義組件行為

```javascript
// static/src/js/custom_ai_selector.js
import { DynamicModelSelector } from "@nuido_flow_ai_option_model/components/ai/dynamic_model_selector";
import { patch } from "@web/core/utils/patch";

// 擴展原有組件功能
patch(DynamicModelSelector.prototype, "custom_ai_selector", {
    
    // 添加自定義驗證邏輯
    async onModelChanged(value) {
        await this._super(...arguments);
        
        // 自定義邏輯：檢查模型兼容性
        if (value.model_id) {
            const compatible = await this.checkModelCompatibility(value.model_id);
            if (!compatible) {
                this.displayWarning('所選模型可能與當前任務不兼容');
            }
        }
    },
    
    async checkModelCompatibility(modelId) {
        try {
            const result = await this.rpc('/custom/check_model_compatibility', {
                model_id: modelId,
                task_type: this.props.taskType
            });
            return result.compatible;
        } catch (error) {
            console.error('檢查模型兼容性失敗:', error);
            return true; // 預設兼容
        }
    },
    
    displayWarning(message) {
        this.notification.add(message, { type: 'warning' });
    }
});
```

### 2. 表單欄位整合

```javascript
// static/src/js/ai_task_form.js
import { FormController } from "@web/views/form/form_controller";
import { patch } from "@web/core/utils/patch";

patch(FormController.prototype, "ai_task_form", {
    
    setup() {
        this._super(...arguments);
        this.aiModelSelector = null;
    },
    
    // 當 AI 模型選擇變更時觸發
    onAiModelChange(value) {
        // 更新相關欄位
        if (value.provider_id && value.model_id) {
            this.model.update({
                ai_provider_id: value.provider_id,
                ai_model_id: value.model_id
            });
            
            // 載入模型的預設參數
            this.loadModelDefaults(value.model_id);
        }
    },
    
    async loadModelDefaults(modelId) {
        try {
            const config = await this.rpc('/web/dataset/call_kw', {
                model: 'nuido.ai.config.service',
                method: 'get_model_config',
                args: [modelId],
                kwargs: {}
            });
            
            // 更新表單中的相關欄位
            const updates = {
                temperature: config.temperature,
                max_tokens: config.max_tokens,
                top_p: config.top_p
            };
            
            this.model.update(updates);
        } catch (error) {
            console.error('載入模型預設值失敗:', error);
        }
    }
});
```

## Python 後端整合

### 1. 模型類別定義

```python
# models/ai_task.py
from odoo import models, fields, api

class AiTask(models.Model):
    _name = 'ai.task'
    _description = 'AI 任務'
    
    name = fields.Char('任務名稱', required=True)
    description = fields.Text('描述')
    
    # AI 模型配置欄位
    ai_provider_id = fields.Many2one('nuido.ai.provider', string='AI 供應商')
    ai_model_id = fields.Many2one('nuido.ai.model', string='AI 模型')
    
    # 計算欄位用於顯示
    ai_provider_name = fields.Char(
        string='AI 供應商名稱',
        compute='_compute_ai_names',
        store=True
    )
    ai_model_name = fields.Char(
        string='AI 模型名稱', 
        compute='_compute_ai_names',
        store=True
    )
    
    state = fields.Selection([
        ('draft', '草稿'),
        ('configured', '已配置'),
        ('running', '執行中'),
        ('done', '完成'),
        ('error', '錯誤')
    ], default='draft')
    
    @api.depends('ai_provider_id', 'ai_model_id')
    def _compute_ai_names(self):
        for record in self:
            record.ai_provider_name = record.ai_provider_id.name if record.ai_provider_id else ''
            record.ai_model_name = record.ai_model_id.name if record.ai_model_id else ''
    
    @api.onchange('ai_model_id')
    def _onchange_ai_model_id(self):
        """當 AI 模型變更時，自動更新相關配置"""
        if self.ai_model_id:
            self.ai_provider_id = self.ai_model_id.provider_id
            # 載入模型的預設參數
            self.temperature = self.ai_model_id.temperature
            self.max_tokens = self.ai_model_id.max_tokens
    
    def action_test_model(self):
        """測試 AI 模型連接"""
        if not self.ai_model_id:
            raise UserError('請先選擇 AI 模型')
        
        # 執行連接測試
        test_result = self.ai_provider_id.test_connection()
        
        if test_result['success']:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'message': '模型連接測試成功！',
                    'type': 'success',
                    'sticky': False,
                }
            }
        else:
            raise UserError(f'模型連接測試失敗: {test_result["message"]}')
```

### 2. 設定管理

```python
# models/res_config_settings.py
from odoo import models, fields, api

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'
    
    default_ai_provider_id = fields.Many2one(
        'nuido.ai.provider',
        string='預設 AI 供應商',
        config_parameter='ai.default_provider_id'
    )
    default_ai_model_id = fields.Many2one(
        'nuido.ai.model',
        string='預設 AI 模型',
        config_parameter='ai.default_model_id'
    )
    
    @api.onchange('default_ai_model_id')
    def _onchange_default_ai_model_id(self):
        if self.default_ai_model_id:
            self.default_ai_provider_id = self.default_ai_model_id.provider_id
```

## 進階功能範例

### 1. 批量模型管理

```python
# wizard/batch_model_setup.py
class BatchModelSetup(models.TransientModel):
    _name = 'batch.model.setup'
    _description = '批量模型設定'
    
    line_ids = fields.One2many('batch.model.setup.line', 'wizard_id', string='模型配置')
    
    def action_apply_settings(self):
        """批量套用設定"""
        for line in self.line_ids:
            if line.task_ids:
                line.task_ids.write({
                    'ai_provider_id': line.provider_id.id,
                    'ai_model_id': line.model_id.id
                })
        
        return {'type': 'ir.actions.act_window_close'}

class BatchModelSetupLine(models.TransientModel):
    _name = 'batch.model.setup.line'
    _description = '批量模型設定行'
    
    wizard_id = fields.Many2one('batch.model.setup', required=True, ondelete='cascade')
    task_ids = fields.Many2many('ai.task', string='任務')
    provider_id = fields.Many2one('nuido.ai.provider', string='AI 供應商')
    model_id = fields.Many2one('nuido.ai.model', string='AI 模型')
```

這些範例展示了如何在實際的 Odoo 專案中有效使用動態模型選擇器組件，涵蓋從基本的表單整合到進階的批量管理功能。