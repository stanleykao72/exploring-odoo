{
    "name": "Nuido Flow AI Option Model",
    "summary": """Nudio Flow: AI 動態配置管理模組""",
    "description": """
        Nuido Flow AI Option Model
        
        功能特色：
        - 無縫整合現有 nuido_flow_ai 功能
        - 動態模型選擇器組件

    """,
    "author": "Stanley Kao",
    "category": "Productivity/AI",
    "version": "18.0.1.0.0",
    "depends": [
        "nuido_flow",
        "nuido_flow_trigger",
        "nuido_flow_data",
        "nuido_flow_ai",
        "nuido_ai_config",
    ],
    "data": [
        "data/nuido_flow_registry.xml",
        "views/menu.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "nuido_flow_ai_option_model/static/src/components/**/*",
            "nuido_flow_ai_option_model/static/src/models/**/*",
            "nuido_flow_ai_option_model/static/src/app/**/*",
        ],
    },
    "external_dependencies": {
        "python": [
            "autogen_core",
            "autogen_ext",
            "autogen_agentchat",
            "tiktoken",
        ]
    },
    "license": "Other proprietary",
    "application": False,
    "installable": True,
    "auto_install": False,
}