---
description: TypeScript/React 程式碼風格規範，適用於所有前端原始碼
globs: ["src/**/*.{ts,tsx}"]
---

# 程式碼風格規範

## TypeScript

### 命名慣例
- **元件**: PascalCase (e.g. `ExpenseForm`, `BottomNav`)
- **Hook**: camelCase，以 `use` 開頭 (e.g. `useAuth`, `useExpenses`)
- **工具函式**: camelCase (e.g. `calculateSplits`, `formatCurrency`)
- **常數**: UPPER_SNAKE_CASE (e.g. `SUPPORTED_CURRENCIES`, `CATEGORY_MAP`)
- **型別/介面**: PascalCase (e.g. `Expense`, `NotebookMember`)
- **檔案名稱**: 元件用 PascalCase (e.g. `ExpenseForm.tsx`)，其餘用 kebab-case (e.g. `settle.ts`)

### 型別定義
- 優先使用 `interface` 定義物件形狀
- 使用 `type` 定義聯合型別、交叉型別
- 所有 Supabase 表格對應的型別放在 `src/types/database.ts`
- 禁止使用 `any`，必要時使用 `unknown` 並做型別收窄

### Import 順序
1. React / 第三方套件
2. 內部模組 (hooks, stores, lib)
3. 元件
4. 型別 (使用 `import type`)
5. 樣式 / 資源

## React

### 元件結構
- 使用函式元件 + hooks，不使用 class 元件
- Props 使用 interface 定義，命名為 `{ComponentName}Props`
- 每個元件一個檔案
- 元件內部順序：型別定義 → hooks → handlers → render

### 狀態管理
- 區域狀態：`useState`
- 跨元件共享：Zustand store (`src/stores/`)
- 伺服器狀態：Supabase query + Realtime subscription

### 效能
- 大型列表使用虛擬捲軸
- 回呼函式用 `useCallback` 包裝（傳遞給子元件時）
- 昂貴計算用 `useMemo`
- 避免在 render 中建立新物件/陣列作為 props

## Tailwind CSS

### 類別順序
1. Layout (display, position, overflow)
2. Sizing (w, h, min, max)
3. Spacing (p, m, gap)
4. Typography (font, text, leading)
5. Visual (bg, border, rounded, shadow)
6. Interactive (cursor, hover, focus)
7. Animation (transition, animate)

### 自訂色彩
- 使用 `morandi-*` 前綴 (e.g. `bg-morandi-cream`, `text-morandi-deep`)
- 不使用 Tailwind 預設色彩 (gray, blue 等)，統一使用莫蘭迪色系

## 目錄結構

```
src/
├── components/
│   ├── ui/          # 通用 UI 元件（Button, Card, Modal, Input...）
│   ├── layout/      # 佈局元件（Header, BottomNav, PageContainer）
│   ├── notebook/    # 筆記本相關元件
│   ├── expense/     # 支出相關元件
│   └── settle/      # 結算相關元件
├── pages/           # 頁面元件（對應路由）
├── hooks/           # Custom hooks
├── lib/             # 工具函式（supabase client, currency, settle algorithm）
├── stores/          # Zustand stores
├── types/           # TypeScript 型別定義
├── App.tsx          # 路由設定
└── main.tsx         # 進入點
```

## 錯誤處理

- Supabase query 必須檢查 `error` 回傳值
- 使用 Toast 元件顯示使用者可理解的錯誤訊息（繁體中文）
- 非預期錯誤記錄到 console.error

## 國際化

- 本專案僅支援繁體中文
- 所有使用者可見的文字直接寫在元件中（不需 i18n 框架）
- 使用者可見文字一律繁體中文
- 程式碼內部（變數名、註解）使用英文
