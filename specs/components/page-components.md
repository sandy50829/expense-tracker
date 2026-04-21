# 頁面級元件規格

本文件描述主要畫面之**版面結構**、**資料依賴**、**載入／空狀態／錯誤**，與**導覽流程**。技術前提：Vite + React + `vite-plugin-pwa`，部署於 Cloudflare Pages。

---

## LoginPage（登入頁）

### 版面結構

- **全螢幕置中卡片**：品牌區（應用名稱、短標語）、表單區、第三方登入區、註冊切換連結。
- **表單**：電子郵件、密碼、主要「登入」按鈕。
- **第三方**：「使用 Google 登入」按鈕（獨立於表單或視覺分組）。
- **底部**：「還沒有帳號？改為註冊」類 **註冊切換**（toggle 或連結至註冊模式／路由）。

### 資料依賴

- **輸入**：`email`、`password`。
- **API**：`POST /auth/login`（或等效）；Google OAuth 導向／callback URL。
- **全域**：認證 token 儲存、使用者基本資料快取。

### 載入／空狀態／錯誤

| 狀態 | 行為 |
|------|------|
| **載入** | 登入與 Google 按鈕顯示 loading，表單禁用，避免重複提交。 |
| **空狀態** | 初始即為空白表單；無需 EmptyState。 |
| **錯誤** | 欄位驗證（格式、必填）；API 錯誤以 **Toast** 或表單頂部摘要顯示（401/帳密錯誤等）。 |

### 導覽流程

- 登入成功 → 導向 **NotebookListPage**（或上次離開之記帳本）。
- 註冊切換 → **註冊表單**（同頁切換或 `/register`）。
- 已登入使用者進入 `/login` → 導向記帳本列表。

---

## NotebookListPage（記帳本列表頁）

### 版面結構

- **Header**：標題「我的記帳本」；右側可選「設定」或「加入記帳本」捷徑。
- **主內容**：**記帳本卡片**網格或垂直列表（名稱、成員數、最近更新、餘額摘要選配）。
- **FAB**：右下浮動「新增記帳本」。
- **BottomNav**（若為主架構）：與其他主分頁切換。

### 資料依賴

- **API**：`GET /notebooks`（目前使用者可見列表）。
- **快取／離線**：PWA 快取最後一次列表；離線顯示快取並標示離線。

### 載入／空狀態／錯誤

| 狀態 | 行為 |
|------|------|
| **載入** | 卡片 **skeleton** 或 **LoadingSpinner** 置中。 |
| **空狀態** | **EmptyState**：尚無記帳本，說明與「建立記帳本」action。 |
| **錯誤** | 網路或伺服器錯誤：錯誤訊息 + **重試**；離線且無快取時提示連線。 |

### 導覽流程

- 點卡片 → **NotebookDetailPage**（`/notebooks/:id`）。
- FAB → 建立記帳本流程（Modal 或專頁）。
- 「加入記帳本」→ **JoinNotebookPage**。

---

## NotebookDetailPage（記帳本詳情頁）

### 版面結構

- **Header**：**記帳本名稱**；左返回；右側「設定／成員／更多」。
- **餘額摘要卡片**：顯示與你相關的 **淨額** 或簡要統計（依產品定義）。
- **支出列表**：依 **日期分組**（例如「今天」「昨天」「4 月 18 日」），每筆含描述、金額、分攤摘要、分類 **Badge**。
- **FAB**：「新增支出」。
- 次要入口：**結算** 連結至 **SettlementPage**。

### 資料依賴

- **路由參數**：`notebookId`。
- **API**：`GET /notebooks/:id`、`GET /notebooks/:id/expenses`（支援分頁或日期游標）。
- **即時性**：可選 WebSocket／輪詢；離線以快取 + 佇列為準。

### 載入／空狀態／錯誤

| 狀態 | 行為 |
|------|------|
| **載入** | 摘要與列表區塊 skeleton；FAB 可延後顯示或灰階。 |
| **空狀態** | 無支出：**EmptyState**「開始記一筆」，導向 **AddExpensePage**。 |
| **錯誤** | 404 記帳本／無權限：專用錯誤畫面 + 返回列表；一般錯誤 Toast + 重試。 |

### 導覽流程

- FAB / EmptyState action → **AddExpensePage**（帶 `notebookId`）。
- 點單筆支出 → 支出詳情或編輯（若規格有）。
- Header／列表入口 → **SettlementPage**。

---

## AddExpensePage（新增支出頁）

### 版面結構

- **Header**：標題「新增支出」；左返回。
- **表單區**（建議單欄、行動優先）：
  - **金額** + **幣別**（**AmountDisplay** 預覽選配；輸入用 **Input number** + **CurrencySelector**）。
  - **描述**（文字 **Input**）。
  - **付款人**（**Select** 或成員 **Avatar** 列表單選）。
  - **日期**（**Input date**）。
  - **分類**（**Select** 或 chip + **Badge**）。
  - **分攤方式**（**split type toggle**：例如「平均分攤」「自訂比例」「僅選成員」等，依 API 模型）。
  - **成員勾選**（checkbox 清單，聯動分攤方式）。
- **底部固定列**：**儲存** 主按鈕（**Button primary**）。

### 資料依賴

- **路由**：`notebookId`。
- **API**：`GET /notebooks/:id/members`、`GET /categories`；提交 `POST /notebooks/:id/expenses`。
- **驗證**：金額 > 0、至少一名分攤成員、分攤加總合理（若自訂）。

### 載入／空狀態／錯誤

| 狀態 | 行為 |
|------|------|
| **載入** | 成員與分類載入中顯示 spinner；表單欄位禁用或 skeleton。 |
| **空狀態** | 若記帳本無其他成員（僅自己）：仍允許記帳或引導邀請成員（依產品）。 |
| **錯誤** | 欄位級錯誤；提交失敗 Toast；離線時 **佇列儲存** 並提示「將在連線後同步」。 |

### 導覽流程

- 儲存成功 → 返回 **NotebookDetailPage** 並可捲動至新項目或顯示成功 Toast。
- 返回 → 若有未儲存變更，**確認離開** Modal。

---

## SettlementPage（結算頁）

### 版面結構

- **Header**：標題「結算」；左返回。
- **餘額總覽區**：每位成員 **淨額**（應收/應付），可使用 **AmountDisplay** + **colorBySign**。
- **建議轉帳列表**：由演算法產生最少筆數轉帳（付款方 → 收款方、金額）。
- **每筆轉帳列**：顯示雙方 **Avatar**、金額、**逐筆「標記為已結清」** 按鈕（或導向外部付款 app 僅標記，依產品）。

### 資料依賴

- **API**：`GET /notebooks/:id/balances`、`GET /notebooks/:id/settlements/suggestions`；`POST /settlements/confirm` 等。
- **重新計算**：新增支出後餘額應更新（返回本頁時 refetch）。

### 載入／空狀態／錯誤

| 狀態 | 行為 |
|------|------|
| **載入** | 總覽與列表 skeleton。 |
| **空狀態** | 所有人淨額為零：**EmptyState**「目前無需結算」。 |
| **錯誤** | 無法取得結算資料：錯誤區塊 + 重試；部分確認失敗：Toast + 保留未成功項目。 |

### 導覽流程

- 從 **NotebookDetailPage** 進入；完成後返回詳情並可顯示更新後摘要。

---

## SettingsPage（設定頁）

### 版面結構

- **Header**：標題「設定」；左返回（或主分頁之一則無返回）。
- **區塊一：個人資料** — 顯示 **Avatar**、暱稱、電子郵件；**編輯** 進入表單（或 inline 編輯）。
- **區塊二：應用程式資訊** — 版本號、隱私權／服務條款連結、開源聲明（選配）。
- **區塊三：帳號** — 登出、刪除帳號（危險操作使用 **Button danger** + 二次確認 **Modal**）。

### 資料依賴

- **API**：`GET /me`、`PATCH /me`；`POST /auth/logout`。
- **Client**：PWA 相關可顯示「清除快取」「加入主畫面說明」連結（選配）。

### 載入／空狀態／錯誤

| 狀態 | 行為 |
|------|------|
| **載入** | 個人區塊 skeleton。 |
| **空狀態** | 不適用；訪客應被導向登入。 |
| **錯誤** | 讀取失敗：錯誤 + 重試；更新失敗：Toast。 |

### 導覽流程

- 自 **Header** 或 **BottomNav** 進入；登出 → **LoginPage**。

---

## JoinNotebookPage（加入記帳本頁）

### 版面結構

- **Header**：標題「加入記帳本」；左返回。
- **邀請碼輸入**：**Input text** + 「預覽／查詢」按鈕。
- **預覽區**（驗證成功後）：記帳本名稱、建立者、成員數、簡短說明（依 API）。
- **主按鈕**：「加入」；禁用直至預覽成功。

### 資料依賴

- **API**：`GET /invites/:code` 或 `POST /invites/validate`；`POST /notebooks/join`。
- **權限**：已登入；未登入則先導向 **LoginPage** 並保留 invite code。

### 載入／空狀態／錯誤

| 狀態 | 行為 |
|------|------|
| **載入** | 查詢邀請碼時按鈕 loading；預覽區 skeleton。 |
| **空狀態** | 尚未輸入邀請碼：預覽區留白或提示文案。 |
| **錯誤** | 無效或過期邀請碼：內聯錯誤或 **Toast**；已為成員：提示並導向 **NotebookDetailPage**。 |

### 導覽流程

- 加入成功 → **NotebookDetailPage**（該記帳本）。
- 取消 → 返回 **NotebookListPage**。

---

## 跨頁導覽總覽（簡圖）

```text
LoginPage ──成功──► NotebookListPage ◄──► SettingsPage
                         │
                         ├──► JoinNotebookPage ──加入──► NotebookDetailPage
                         │
                         └──► NotebookDetailPage ◄── FAB ── AddExpensePage
                                    │
                                    └──► SettlementPage
```

---

## 共通實作備註

- 所有列表頁應統一處理 **Pull-to-refresh**（選配）與 **無限捲動／分頁**。
- **錯誤邊界**：嚴重錯誤時不白屏，提供返回首頁或重新載入。
- 與 **PWA 離線佇列** 連動之頁面：**AddExpensePage**、**SettlementPage**（確認結清）等寫入操作需有同步狀態指示。
