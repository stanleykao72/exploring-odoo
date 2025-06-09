{
    "name": "Nuido AI Config",
    "summary": """AI 模型配置 - 多供應商 AI 模型動態配置""",
    "description": """
        Nuido Flow AI Config
        
        功能特色：
        - 動態 AI 供應商管理
        - 自動模型探測和配置
        - 支援 OpenAI API 相容的所有供應商
        - 動態模型選擇器組件
        
        核心模型：
        - nuido.ai.provider: AI 供應商管理
        - nuido.ai.model: AI 模型配置
        - nuido.ai.config.service: AI 配置服務

    """,
    "author": "Stanley Kao",
    "category": "Productivity/AI",
    "version": "18.0.1.0.0",
    "depends": ["base", "mail"],
    "data": [
        "security/ir.model.access.csv",
        # "views/menu.xml",
        "wizard/connection_test_views.xml",
        "views/nuido_ai_provider_views.xml",
        "views/nuido_ai_model_views.xml",
    ],
    "license": "Other proprietary",
    "application": False,
    "installable": True,
    "auto_install": False,
}