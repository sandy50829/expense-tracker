# 共用 UI 元件規格

本文件定義分帳記帳本 PWA 之共用元件。**全站視覺採莫蘭迪色板**：

| 代稱 | 色碼 | 用途提示 |
|------|------|----------|
| rose（玫瑰） | `#C9B1A1` | 主色、強調、主按鈕 |
| sage（鼠尾草） | `#A7B5A0` | 次要肯定、分類輔助 |
| dusty（灰紫） | `#B8A9C9` | 次要資訊、標籤 |
| cream（奶油） | `#F5F0EB` | 背景、卡片底 |
| warm（暖灰褐） | `#D4C5B9` | 邊框、分隔 |
| stone（石色） | `#8B8178` | 次要文字、圖示 |
| deep（深褐） | `#6B5E54` | 主文字、標題 |

**無障礙通則**：對比度符合 WCAG 2.1 AA（一般文字建議 ≥ 4.5:1）；可聚焦元件需可見 **focus ring**；圖示按鈕需 **`aria-label`**；表單控制項需 **label** 關聯；錯誤需 **`aria-invalid`** 與 **`aria-describedby`** 指向說明文字。

---

## Button

### Props 介面（概念）

| 屬性 | 型別 | 說明 |
|------|------|------|
| `children` | `ReactNode` | 按鈕文字或內容 |
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger'` | 視覺變體 |
| `size` | `'sm' \| 'md' \| 'lg'` | 尺寸 |
| `loading` | `boolean` | 載入中狀態 |
| `disabled` | `boolean` | 停用 |
| `type` | `'button' \| 'submit' \| 'reset'` | 表單語意 |
| `onClick` | 事件處理 | 點擊（`loading`/`disabled` 時不觸發） |
| `className` | `string` | 選配延伸樣式 |

### Variants

- **primary**：背景 `rose`，文字淺色或 `deep`（依對比選定）。
- **secondary**：背景 `sage` 或 `dusty` 淺調。
- **outline**：邊框 `warm` / `rose`，背景透明或 `cream`。
- **ghost**：無邊框，hover 時淺底。
- **danger**：語意刪除／破壞性操作，紅系需與莫蘭迪調和或使用足夠對比之深紅。

### States

- **default / hover / active / focus-visible / disabled**。
- **loading**：顯示 spinner、`aria-busy="true"`、可選 `aria-disabled`；不建議同時顯示與點擊並行的文字以避免重複語意。

### 無障礙

- 實際使用 `<button>`；若為連結導向則使用 `<a>` 並保留鍵盤操作。
- `danger` 仍須有明確文案，不可僅依賴顏色傳達危險。

---

## Input

### Props 介面（概念）

| 屬性 | 型別 | 說明 |
|------|------|------|
| `type` | `'text' \| 'number' \| 'date'` | 輸入類型 |
| `id` | `string` | 與 label 關聯 |
| `name` | `string` | 表單欄位名 |
| `value` / `defaultValue` | 依受控與否 | 值 |
| `onChange` | 事件 | 變更 |
| `label` | `string` | 標籤 |
| `error` | `string \| undefined` | 錯誤訊息 |
| `helperText` | `string \| undefined` | 輔助說明 |
| `disabled` | `boolean` | 停用 |
| `required` | `boolean` | 必填 |
| `placeholder` | `string` | 選填提示 |

### Variants

- **text**：單行文字；邊框 `warm`，focus ring 使用 `rose`。
- **number**：數字鍵盤於行動裝置適配；可與 `AmountDisplay` 搭配。
- **date**：原生或自訂日期選擇器；需行動裝置可點擊區域足夠大（≥ 44×44 CSS px）。

### States

- **一般、focus、error、disabled**；`error` 時邊框與說明文字使用足夠對比之色（可深紅或 `deep` + 圖示）。

### 無障礙

- `label` 使用 `htmlFor` 對應 `id`。
- `error`：`aria-invalid="true"`，說明區塊 `id` 以 `aria-describedby` 綁定。
- `helperText` 與 `error` 並存時，讀屏應能讀到兩者（優先順序：錯誤優先）。

---

## Card

### Props 介面（概念）

| 屬性 | 型別 | 說明 |
|------|------|------|
| `children` | `ReactNode` | 內容 |
| `variant` | `'default' \| 'interactive'` | 預設或可點擊 |
| `onClick` | 事件（僅 interactive） | 整卡點擊 |
| `className` | `string` | 選配 |

### Variants

- **default**：背景 `cream` 或白半透明疊於 `cream` 頁面，陰影輕、圓角一致。
- **interactive**：同上 + `cursor: pointer`、hover 微抬升；整卡為一個可操作單元。

### States（interactive）

- hover、active、focus-visible（若為 `div` 模擬按鈕需 `tabIndex={0}` 與 Enter/Space 處理，**建議改為內層 `<button>` 或 `<a>` 結構**）。

### 無障礙

- **interactive** 時必須鍵盤可操作與可聚焦；若有導向，優先語意化連結。

---

## Modal

### Props 介面（概念）

| 屬性 | 型別 | 說明 |
|------|------|------|
| `open` | `boolean` | 是否開啟 |
| `onClose` | `() => void` | 關閉回呼 |
| `title` | `string \| ReactNode` | 標題 |
| `children` | `ReactNode` | 內容 |
| `actions` | `ReactNode` | 底部操作（按鈕列） |
| `closeOnBackdrop` | `boolean` | 預設 `true`：點遮罩關閉 |

### Variants

- 單一標準對話框樣式；尺寸可選 `sm / md / lg`（選配 prop）。

### States

- 開啟時鎖捲動；關閉後還原。
- 點擊 **backdrop** 若 `closeOnBackdrop` 為 true 則觸發 `onClose`。

### 無障礙

- 使用 `role="dialog"`、`aria-modal="true"`、`aria-labelledby` 指向標題。
- **焦點陷阱（focus trap）**；開啟時焦點移至第一個可聚焦控制項或關閉鈕。
- **Escape** 關閉（與產品確認流程一致時可關閉）。

---

## BottomNav

### Props 介面（概念）

| 屬性 | 型別 | 說明 |
|------|------|------|
| `items` | `Array<{ icon: ReactNode; label: string; path: string }>` | 導覽項目 |
| `activePath` | `string` | 目前路由路徑 |

### Variants

- 固定底部、背景 `cream` 或白，頂邊 `warm` 細線。

### States

- **active**：當前 `path` 與路由匹配；圖示與文字使用 `rose` 或 `deep`。
- **inactive**：`stone` 色。

### 無障礙

- 使用 `nav` + `aria-label="主要導覽"`（或等效繁中文案）。
- 每個項目為連結，`aria-current="page"` 標記當前頁。

---

## Header

### Props 介面（概念）

| 屬性 | 型別 | 說明 |
|------|------|------|
| `title` | `string \| ReactNode` | 標題 |
| `leftAction` | `ReactNode` | 左側（常為返回） |
| `rightAction` | `ReactNode` | 右側（常為設定、更多） |

### Variants

- 預設頂欄：高度一致、安全區 `padding-top`（iOS notch）。

### States

- 無特別狀態；子元件自帶 loading 等。

### 無障礙

- 標題使用 `h1`（若每頁僅一個主標題）或 `aria-level` 與頁面結構一致。
- `leftAction` 為圖示時提供 **`aria-label`**（例如「返回」）。

---

## Toast

### Props 介面（概念）

| 屬性 | 型別 | 說明 |
|------|------|------|
| `message` | `string` | 訊息 |
| `variant` | `'success' \| 'error' \| 'info' \| 'warning'` | 類型 |
| `duration` | `number` | 預設 **3000** ms |
| `onDismiss` | `() => void` | 關閉後回呼 |

### Variants

- **success**：`sage` 調。
- **error**：可見對比之錯誤色 + `deep` 文字。
- **info**：`dusty` 調。
- **warning**：`warm` / 琥珀調與莫蘭迪調和。

### States

- 進入／離開動畫；**auto-dismiss 3s**；可選手動關閉按鈕。

### 無障礙

- 使用 **`role="status"`**（一般）或 **`role="alert"`**（緊急錯誤，慎用避免打斷）。
- 不搶奪焦點；若需操作，提供聚焦管理策略。

---

## Avatar

### Props 介面（概念）

| 屬性 | 型別 | 說明 |
|------|------|------|
| `src` | `string \| undefined` | 圖片 URL |
| `alt` | `string` | 圖片替代文字；若僅裝飾可為空字串與 `aria-hidden` 策略 |
| `name` | `string` | 用於產生 **字首** fallback |
| `size` | `'sm' \| 'md' \| 'lg'` | 尺寸 |

### Variants

- 圓形；背景 `warm` 或 `dusty` 淺色；字首 `deep`。

### States

- 圖片載入失敗時 fallback 至字首。

### 無障礙

- 若代表使用者，父層或 `alt` 應傳達意義；僅列表裝飾時可由父層統一語意。

---

## Badge

### Props 介面（概念）

| 屬性 | 型別 | 說明 |
|------|------|------|
| `children` | `ReactNode` | 標籤文字 |
| `variant` | 對應分類之色票 | 見下表 |

### Variants（與分類色對齊）

| 分類語意 | 建議色 |
|----------|--------|
| 餐飲 | `rose` |
| 交通 | `sage` |
| 娛樂 | `dusty` |
| 購物 | `warm` |
| 公用／其他 | `stone` |
| 自訂分類 | 可延伸色票，仍屬莫蘭迪低飽和 |

### States

- 預設、outline 選配。

### 無障礙

- 若只傳達狀態，需搭配文字而非僅顏色小圓點。

---

## Select

### Props 介面（概念）

| 屬性 | 型別 | 說明 |
|------|------|------|
| `options` | `Array<{ value: string; label: string }>` | 選項 |
| `value` | `string \| undefined` | 目前值 |
| `onChange` | `(value: string) => void` | 變更 |
| `placeholder` | `string` | 未選擇時顯示 |
| `label` | `string` | 標籤 |
| `disabled` | `boolean` | 停用 |
| `error` | `string \| undefined` | 錯誤 |

### Variants

- 原生 `<select>` 或自訂下拉（自訂需完整鍵盤與 `aria-expanded` / `listbox` 模式）。

### States

- 開啟／關閉、error、disabled。

### 無障礙

- 與 `Input` 相同之 label / `aria-invalid` / 錯誤描述關聯。

---

## AmountDisplay

### Props 介面（概念）

| 屬性 | 型別 | 說明 |
|------|------|------|
| `amount` | `number` | 金額（最小單位或主單位依專案慣例，需文件化） |
| `currency` | `string` | ISO 4217，例如 `TWD` |
| `colorBySign` | `boolean` | `true` 時正負零使用不同色（正：`sage` 或 `deep`；負：錯誤調；零：`stone`） |

### Variants

- **標準字重**；大額列表頁可選 `tabular-nums`。

### States

- 載入中可由父層 skeleton 處理。

### 無障礙

- 螢幕報讀需讀出正負與幣別；可加上 `aria-label` 組字。

---

## CurrencySelector

### Props 介面（概念）

| 屬性 | 型別 | 說明 |
|------|------|------|
| `currencies` | `Array<{ code: string; label: string }>` | 幣別清單 |
| `selected` | `string` | 目前幣別 code |
| `onChange` | `(code: string) => void` | 變更 |

### Variants

- 下拉或橫向 chip；風格與 `Select` / `Badge` 一致。

### States

- disabled、error（選配）。

### 無障礙

- 與表單標籤關聯；選項可朗讀 `label` + `code`。

---

## EmptyState

### Props 介面（概念）

| 屬性 | 型別 | 說明 |
|------|------|------|
| `icon` | `ReactNode` | 圖示或插圖 |
| `title` | `string` | 標題 |
| `description` | `string` | 說明 |
| `action` | `ReactNode` | 主要操作（如 Button） |

### Variants

- 置中區塊；寬度上限與卡片對齊。

### States

- 無。

### 無障礙

- `title` 為標題層級；`description` 與 `action` 順序符合閱讀順序。

---

## LoadingSpinner

### Props 介面（概念）

| 屬性 | 型別 | 說明 |
|------|------|------|
| `size` | `'sm' \| 'md' \| 'lg'` | 尺寸 |
| `label` | `string` | 載入說明（選配，供 `aria-label`） |

### Variants

- 旋轉圓弧，主色 `rose` 或 `stone` 低調版。

### States

- 無。

### 無障礙

- `role="status"` 與 **`aria-live="polite"`**；`label` 預設為「載入中」類繁中文案。

---

## 元件相依與重用

- **AmountDisplay** 與 **CurrencySelector** 常並用於記帳表單與列表。
- **Toast** 用於 PWA 更新提示、儲存成功/失敗、同步錯誤。
- **EmptyState** + **LoadingSpinner** 為各列表頁標準組合。
