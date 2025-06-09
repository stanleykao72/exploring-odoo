# 動態 AI 模型選擇器組件

## 概述

`DynamicModelSelector` 是一個可重用的 Owl 組件，提供動態的 AI 供應商和模型選擇界面。該組件整合了 AI 配置服務，能夠自動載入可用的供應商和模型，並提供完整的用戶體驗。

## 功能特色

- ✅ 動態載入供應商列表
- ✅ 根據選中的供應商動態載入模型列表
- ✅ 支援預設值設定和狀態管理
- ✅ 完整的載入狀態和錯誤處理界面
- ✅ 事件回調支援（選擇變更時通知父組件）
- ✅ 響應式設計和無障礙功能支援
- ✅ 多種尺寸變體（sm、md、lg）
- ✅ 與 Odoo 18 風格一致的界面設計

## 快速開始

### 基本用法

```javascript
import { DynamicModelSelector } from "./dynamic_model_selector";

export class MyComponent extends Component {
    static template = "my_module.MyComponent";
    static components = { DynamicModelSelector };

    setup() {
        this.state = useState({
            selectedModel: { provider_id: null, model_id: null }
        });
    }

    onModelChanged(value) {
        this.state.selectedModel = value;
        console.log('選中的模型配置:', value);
    }
}
```

```xml
<DynamicModelSelector 
    label="選擇 AI 模型"
    value="state.selectedModel"
    onChanged="onModelChanged"
    required="true" />
```

### 表單整合

```javascript
onModelChanged(value) {
    this.state.formData.aiModel = value;
    this.validateForm();
}

validateForm() {
    const errors = {};
    if (!this.state.formData.aiModel.provider_id || !this.state.formData.aiModel.model_id) {
        errors.aiModel = '請選擇 AI 模型';
    }
    this.state.errors = errors;
    return Object.keys(errors).length === 0;
}
```

## 組件屬性 (Props)

| 屬性名 | 類型 | 必填 | 預設值 | 說明 |
|--------|------|------|--------|------|
| `value` | Object | 否 | `{ provider_id: null, model_id: null }` | 當前選中的值 |
| `onChanged` | Function | 否 | - | 選擇變更回調函數 |
| `label` | String | 否 | "AI 模型選擇" | 選擇器標籤 |
| `required` | Boolean | 否 | false | 是否必填 |
| `disabled` | Boolean | 否 | false | 是否禁用 |
| `class` | String | 否 | "" | 自定義 CSS 類名 |
| `size` | String | 否 | "md" | 選擇器大小（sm、md、lg） |

## 事件回調

### onChanged(value)

當用戶選擇不同的供應商或模型時觸發。

**參數：**
- `value`: Object - 包含 `provider_id` 和 `model_id` 的對象

**範例：**
```javascript
onModelChanged(value) {
    console.log('供應商 ID:', value.provider_id);
    console.log('模型 ID:', value.model_id);
    
    // 更新狀態
    this.state.selectedModel = value;
    
    // 通知其他組件
    this.trigger('model-changed', value);
}
```

## 樣式定制

組件提供了多種 CSS 類名用於自定義樣式：

### 尺寸變體

```xml
<!-- 小尺寸 -->
<DynamicModelSelector size="sm" />

<!-- 中等尺寸（預設） -->
<DynamicModelSelector size="md" />

<!-- 大尺寸 -->
<DynamicModelSelector size="lg" />
```

### 自定義類名

```xml
<DynamicModelSelector class="my-custom-selector border-primary" />
```

### SCSS 變數覆蓋

```scss
.my-component {
    .dynamic-model-selector {
        --bs-primary: #your-primary-color;
        --bs-gray-100: #your-gray-color;
        
        &__header {
            background-color: var(--bs-gray-50);
        }
    }
}
```

## 狀態管理

組件內部管理以下狀態：

```javascript
{
    providers: [],           // 供應商列表
    models: [],             // 當前供應商的模型列表
    loading: {
        providers: false,    // 供應商載入狀態
        models: false,      // 模型載入狀態
        initial: true       // 初始載入狀態
    },
    error: {
        providers: null,    // 供應商錯誤訊息
        models: null       // 模型錯誤訊息
    },
    selectedProvider: null, // 當前選中的供應商
    selectedModel: null    // 當前選中的模型
}
```

## 錯誤處理

組件提供完整的錯誤處理機制：

### 自動重試

當載入失敗時，用戶可以點擊重試按鈕：

```javascript
async retryLoadProviders() {
    await this.loadProviders();
}

async retryLoadModels() {
    if (this.state.selectedProvider) {
        await this.loadModels(this.state.selectedProvider);
    }
}
```

### 手動刷新

用戶可以通過刷新按鈕清除快取並重新載入：

```javascript
async refreshData() {
    this.aiConfigService.refreshCache();
    this.state.selectedProvider = null;
    this.state.selectedModel = null;
    await this.loadProviders();
}
```

## 無障礙功能

組件遵循 WCAG 指南，提供完整的無障礙支援：

- ✅ 鍵盤導航支援
- ✅ 螢幕閱讀器相容
- ✅ 高對比度模式支援
- ✅ 減少動畫偏好支援
- ✅ 適當的 ARIA 標籤

## 性能優化

### 快取機制

組件使用 AI 配置服務的內建快取機制：

```javascript
// 服務層自動快取 5 分鐘
this.aiConfigService.setCacheTimeout(5 * 60 * 1000);

// 手動刷新快取
this.aiConfigService.refreshCache();
```

### 防抖載入

組件使用防抖機制避免重複請求：

```javascript
// 避免重複的後端請求
if (this.pendingRequests.has('providers')) {
    return await this.pendingRequests.get('providers');
}
```

## 進階用法

### 批量管理

```javascript
// 管理多個模型配置
this.state.modelConfigs = [
    { id: 1, name: '文本生成', model: { provider_id: null, model_id: null } },
    { id: 2, name: '程式碼生成', model: { provider_id: null, model_id: null } }
];

onModelChanged(configId, value) {
    const config = this.state.modelConfigs.find(c => c.id === configId);
    if (config) {
        config.model = value;
    }
}
```

### 歷史記錄

```javascript
// 記錄選擇歷史
onModelChanged(value) {
    this.state.modelHistory.unshift({
        ...value,
        timestamp: new Date()
    });
}

// 從歷史恢復
restoreFromHistory(historyItem) {
    this.state.currentModel = {
        provider_id: historyItem.provider_id,
        model_id: historyItem.model_id
    };
}
```

## 測試

### 單元測試範例

```javascript
import { expect } from '@odoo/hoot';
import { DynamicModelSelector } from './dynamic_model_selector';

test('should load providers on mount', async () => {
    const selector = new DynamicModelSelector();
    await selector.setup();
    
    expect(selector.state.providers).toBeInstanceOf(Array);
    expect(selector.state.loading.initial).toBe(false);
});
```

## 故障排除

### 常見問題

1. **供應商列表為空**
   - 檢查後端 API 是否正常運行
   - 確認模組依賴關係正確安裝

2. **模型列表載入失敗**
   - 檢查選中的供應商 ID 是否有效
   - 確認供應商連接狀態正常

3. **樣式不正確**
   - 確認 SCSS 文件已正確載入
   - 檢查 CSS 類名衝突

### 除錯模式

```javascript
// 開啟除錯日誌
window.debugAiSelector = true;

// 組件會輸出詳細日誌
console.log('Provider changed:', providerId);
console.log('Models loaded:', models);
```

## 版本歷史

- **v1.0.0** - 初始版本
  - 基本的供應商和模型選擇功能
  - 錯誤處理和載入狀態
  - 響應式設計支援

## 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 授權

此組件是 Nuido Flow AI Option Model 模組的一部分，遵循專有授權條款。