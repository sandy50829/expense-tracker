# 多幣別與匯率功能規格

## 1. Overview

本文件描述 PWA 在 **多幣別顯示、匯率取得、快取與換算** 上的行為。資料庫仍由 **Supabase** 保存支出原幣金額；匯率來源為 **Frankfurter API**。帳簿層級的基準幣別見 **`notebooks.default_currency`**（`../db-schema.md`）。

**目標**：

- 支援固定清單內之幣別選擇與格式化顯示。
- 以 Frankfurter 最新匯率將「支出幣別」換算為「帳簿預設幣別」，供摘要與統計一致呈現。
- 透過 **localStorage** 降低 API 呼叫頻率並處理離線／失敗情境。

---

## 2. User stories

| ID | 身為… | 我想要… | 以便… |
|----|--------|---------|--------|
| C-01 | 使用者 | 從支援清單選擇支出幣別 | 與實際付款幣別一致 |
| C-02 | 使用者 | 看到正確符號與小數位 | 閱讀金額不混淆 |
| C-03 | 使用者 | 在帳簿預設幣別下看到換算後金額 | 快速比較總花費 |
| C-04 | 使用者 | 在網路不穩時仍看到上次成功的匯率 | 大致可用的換算 |
| C-05 | 開發者 | 以單一 `CurrencySelector` 重用選幣邏輯 | UI 一致、驗證集中 |

---

## 3. Data model（參考 `../db-schema.md`）

| 實體 | 欄位 | 說明 |
|------|------|------|
| 帳簿 | `notebooks.default_currency` | 帳簿 **顯示／匯總基準幣別**（ISO 4217） |
| 支出 | `expenses.currency` | 該筆支出 **記帳原幣** |
| 支出 | `expenses.amount` | 原幣金額；分攤 `expense_splits.amount` 同原幣 |

換算結果 **不必** 持久化於 DB（除非產品另開欄位）；前端或報表即時計算即可。

---

## 4. API contracts（參考 `../api-contracts.md`）

### 4.1 Supabase

帳簿預設幣別之讀寫見 **`../api-contracts.md`** § 4.1～4.3（`notebooks.default_currency`）。

### 4.2 Frankfurter（匯率）

與 **`../api-contracts.md`** § 8 一致：

**請求**

```http
GET https://api.frankfurter.dev/latest?base={baseCurrency}
```

- `baseCurrency`：ISO 4217，必須為本文件 **支援清單** 之一（作為 base 時）。

**回應（範例結構）**

```json
{
  "base": "TWD",
  "date": "2026-04-21",
  "rates": {
    "USD": 0.031,
    "JPY": 4.67
  }
}
```

- `rates`：對 **其他貨幣** 之相對匯率（1 `base` = `rates[X]` 單位之 `X`，定義以 Frankfurter 文件為準；實作換算公式見第 6 節）。
- `date`：Frankfurter 對該批次匯率標示之日期（**快取 key 與「是否當日」判斷必須使用此欄位或與本地「換算基準日」策略一致**）。

---

## 5. UI flow / wireframes（手機版面 ASCII）

### 5.1 幣別選擇器（表單內）

```
┌─────────────────────────────┐
│  金額  [ 1200.50 ]          │
│  幣別  [ TWD 新台幣      ▼] │
│         ┌─────────────────┐ │
│         │ 🔍 搜尋…        │ │
│         │ TWD 新台幣 NT$  │ │
│         │ USD 美元    $   │ │
│         │ JPY 日圓    ¥   │ │
│         │ ...             │ │
│         └─────────────────┘ │
└─────────────────────────────┘
```

### 5.2 列表顯示原幣 + 基準幣換算（選用呈現）

```
┌─────────────────────────────┐
│  🍜 午餐                    │
│  NT$ 320                    │
│  ≈ $10.25 USD（帳簿幣別）   │
└─────────────────────────────┘
```

實際文案「帳簿幣別」應顯示為使用者設定之 `default_currency` 符號與代碼。

---

## 6. Business logic（公式與演算法）

### 6.1 支援幣別清單

| 代碼 | 常用顯示名稱（可本地化） |
|------|---------------------------|
| TWD | 新台幣 |
| USD | 美元 |
| JPY | 日圓 |
| EUR | 歐元 |
| KRW | 韓元 |
| THB | 泰銖 |
| GBP | 英鎊 |
| CNY | 人民幣 |
| HKD | 港幣 |
| SGD | 新加坡幣 |

僅允許以上代碼進入 `CurrencySelector` 與寫入 `expenses.currency`／`notebooks.default_currency`（與產品政策一致；若 API 不支援某幣別作為 base，見 7 節）。

### 6.2 顯示格式（符號與小數位）

| 幣別 | 小數位數 | 符號（建議） |
|------|-----------|----------------|
| JPY, KRW | **0** | ¥, ₩（或產品統一圖示） |
| 其餘 | **2** | NT$、$、€、฿、£、¥／CN￥、HK$、S$ 等（與在地化文案一致） |

格式化函式應 **先依幣別決定刻度**，再四捨五入；**換算結果** 與 **原幣** 使用相同規則對應到「帳簿幣別」之刻度。

### 6.3 localStorage 快取策略

- **Key**：`exchange_rates_{base}_{date}`
  - `base`：本次請求的基準幣別（例如帳簿 `default_currency`）。
  - `date`：API 回傳之 `date`（`YYYY-MM-DD`），表示該匯率批次對應日期。
- **Value**：序列化之完整 JSON 回應（或至少 `{ base, date, rates }`）。
- **刷新規則**：
  1. 當需要某 `base` 之匯率時，先讀本地 **「今日」** 快取：若存在 key 為 `exchange_rates_{base}_{todayLocal}` 或與產品定義之「當日基準」一致且內容未過期，則 **不呼叫 API**。
  2. 若無有效當日快取，呼叫 Frankfurter；成功後以回傳之 `date` 寫入 `exchange_rates_{base}_{date}`。
  3. **每日最多刷新**：同一 `base` 在 **同一自然日（使用者時區）** 內僅一次網路請求；其餘時刻使用當日已快取之資料。

**與 API `date` 的關係**：Frankfurter 回傳的 `date` 可能早於「今天」（例：假日延用前一日）；仍以回應為準儲存，並在 UI 可選顯示「匯率日期：YYYY-MM-DD」以避免誤解。

### 6.4 金額換算邏輯

定義：

- `E`：支出原幣金額（`expenses.amount`）。
- `from`：支出幣別（`expenses.currency`）。
- `to`：帳簿預設幣別（`notebooks.default_currency`）。

**情況 A：`from === to`**：`converted = E`，無需匯率。

**情況 B：`from !== to`**：取得以 `to` 為 `base` 之 `rates`（來自快取或 API）。

Frankfurter 語意（標準）：回傳 `rates[X]` 表示 **1 `base` = `rates[X]` 單位的 X**。

因此 **1 `to` = `rates[from]` 單位的 `from`**，即 **1 `from` = `1 / rates[from]` 單位的 `to`**（當 `rates[from]` 存在且大於 0）。

\[
\text{converted} = E \times \frac{1}{\text{rates}[\text{from}]}
\]

- 若 `from` 未出現在 `rates`（例如 base 與 target 相同導致省略），改用 **反查**：以 `from` 為 base 再請求一次，或使用 `rates[to]` 關係做交叉換算（實作需保證單調與單位一致）。
- 計算過程使用 **高精度浮點**，輸出前依 **`to` 幣別小數位** 四捨五入；分母 `rates[from]` 必須大於 0。

**交叉換算（備援）**：若僅能取得 `(base=A)` 之表，欲換算 `from → to`，可透過先換成同一中介（例如先換 USD）— 以 Frankfurter 支援之貨幣為限；**優先** 仍為直接以 `to` 或 `from` 為 base 之單次回應。

### 6.5 `CurrencySelector` 元件行為

**Props（建議）**

- `value: string`（ISO 代碼）
- `onChange: (code: string) => void`
- `disabled?: boolean`
- `size?: 'sm' | 'md'`（選配）

**行為**

1. 下拉／抽屜僅列出 **6.1 十種幣別**；支援搜尋過濾（代碼或中文名）。
2. 變更時觸發 `onChange`，父層更新表單 state 與驗證。
3. 顯示選中項：**符號 + 代碼 + 簡短名稱**（例如 `NT$ TWD`）。
4. 鍵盤／無障礙：`listbox` 或可聚焦之原生 `select` 替代方案。
5. 與帳簿預設幣別無強制綁定：使用者可選與 `default_currency` 不同之支出幣別。

---

## 7. Edge cases

| 情境 | 建議行為 |
|------|-----------|
| API 失敗（網路、4xx/5xx） | 讀取 **最近一次成功** 之 localStorage 快取（任意可用 `date`）；若無，顯示僅原幣、換算區塊顯示「匯率暫不可用」 |
| 快取過舊（非當日） | 仍可使用並標示 **匯率日期**；背景於下次開啟或跨日時再刷新 |
| `rates[from]` 缺失 | 改以 `from` 為 base 請求，或第二次 Frankfurter 呼叫；仍失敗則同 API 失敗流程 |
| `rates[from]` 為零或非數值 | 視為錯誤，不使用該筆；fallback 快取或提示錯誤 |
| base 幣別不被 Frankfurter 支援 | 阻擋選用該幣別作為帳簿預設或改用人手維護匯率表（產品決策）；**目前十種幣別應事先驗證 API 可用性** |
| 使用者變更時區／午夜跨日 | 以「本地自然日」決定是否重新請求；快取 key 之 `date` 仍以 API 回傳為準 |
| 同時多分頁 | 各分頁獨立 localStorage；可能重複請求；可接受或藉由 `BroadcastChannel` 最佳化（非本階段必須） |

---

## 8. Acceptance criteria

- [ ] 十種幣別（TWD, USD, JPY, EUR, KRW, THB, GBP, CNY, HKD, SGD）均可透過 `CurrencySelector` 選取並寫入資料模型允許之欄位。
- [ ] **JPY、KRW** 顯示 **0** 位小數；**其餘** 顯示 **2** 位小數；符號與規格表一致或可設定之在地化表。
- [ ] 應用程式以 `GET https://api.frankfurter.dev/latest?base={currency}` 取得匯率，並正確解析 `base`、`date`、`rates`。
- [ ] localStorage key 為 `exchange_rates_{base}_{date}`，且 **同一 base 於同一使用者本地日** 不重複頻繁打 API（符合「每日刷新」策略）。
- [ ] 支出金額可從 **支出幣別** 換算為 **`notebooks.default_currency`**，公式與第 6.4 節一致；`from === to` 時不呼叫匯率。
- [ ] API 失敗時，優先使用快取；無快取時優雅降級（顯示原幣 + 錯誤／提示）。
- [ ] UI 可辨識匯率資料之 **日期**（避免使用者誤以為即時盤中價）。
- [ ] `CurrencySelector` 之列表、搜尋、選取與 `onChange` 行為符合第 6.5 節。

---

*文件版本：與 `../db-schema.md`、`../api-contracts.md` § 8 同步維護。*
