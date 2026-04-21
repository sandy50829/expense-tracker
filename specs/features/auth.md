# 認證（Auth）功能規格

## 1. Overview

本功能提供 Splitwise 風格記帳 PWA 的使用者身分驗證與個人資料管理。後端採 **Supabase Auth** 管理 Session，並以 PostgreSQL trigger 在使用者註冊成功後自動建立 `profiles` 列。前端以 **React** 實作 `AuthProvider` 與 `useAuth` 統一管理認證狀態，並透過受保護路由將未登入使用者導向登入頁。

**範圍摘要**

- Email + 密碼註冊與登入  
- Google OAuth 登入  
- Session 生命週期（初始化、刷新、登出）  
- 註冊後自動建立個人資料（profile）  
- 編輯顯示名稱與頭像 URL  
- 密碼重設流程  
- 受保護路由與四種 UI 狀態：載入中、已登入、未登入、錯誤  

---

## 2. User stories

| 編號 | 身為… | 我想要… | 以便… |
|------|--------|---------|--------|
| A-01 | 新使用者 | 用 Email 與密碼註冊 | 建立帳號並開始使用 App |
| A-02 | 使用者 | 用 Email 與密碼登入 | 存取我的帳簿與支出 |
| A-03 | 使用者 | 用 Google 帳號一鍵登入 | 省去記密碼、加快登入 |
| A-04 | 使用者 | 登出 | 在共用裝置上保護隱私 |
| A-05 | 新使用者 | 註冊後自動有個人資料列 | 不必手動初始化 profile |
| A-06 | 已登入使用者 | 修改顯示名稱與頭像 | 在成員列表與支出中顯示正確身分 |
| A-07 | 忘記密碼的使用者 | 透過 Email 重設密碼 | 恢復帳號存取 |
| A-08 | 未登入訪客 | 無法進入需登入的頁面 | 資料受保護 |
| A-09 | 使用者 | 看到清楚的載入與錯誤狀態 | 知道系統是否在處理或發生問題 |

---

## 3. Data model（參考 db-schema.md）

與認證直接相關的持久化資料請以專案根目錄相對路徑 **`../db-schema.md`** 為準，重點如下：

- **`auth.users`**（Supabase 託管）：Email、OAuth 身分、密碼雜湊等；為真實身分來源。  
- **`profiles`**（§2.1）：與 `auth.users.id` 一對一；欄位含 `display_name`、`avatar_url`、`created_at`、`updated_at`。  
- **Trigger（§4.1）**：於 `auth.users` 新增列時自動 `INSERT` 對應 `profiles`（註冊即建立 profile 的單一真實來源應在資料庫層完成，避免僅依賴前端）。

OAuth 首次登入若無法在 trigger 內取得理想顯示名稱，規格允許以預設值寫入 `profiles`，再由使用者於「編輯個人資料」補齊（細節見 §6、§7）。

---

## 4. API contracts（參考 api-contracts.md）

所有 Supabase Client 呼叫的命名、參數與預期行為以 **`../api-contracts.md`** 為準，對應段落如下：

| 行為 | 參考章節 |
|------|-----------|
| Email 註冊 | §2.1 |
| Email 登入 | §2.2 |
| Google OAuth 登入 | §2.3 |
| 登出 | §2.4 |
| 取得當前使用者 | §2.5 |
| 讀取／更新個人資料 | §3.1、§3.2 |

**密碼重設**：若 `api-contracts.md` 尚未單獨成節，實作應使用 Supabase Auth 標準流程（與 Dashboard 中 Site URL / Redirect URLs 設定一致），建議在合約文件中補上與下列對等的說明：

- 請求重設連結：`supabase.auth.resetPasswordForEmail(email, { redirectTo })`  
- 使用者自 Email 開啟連結後，於應用程式內呼叫：`supabase.auth.updateUser({ password })`（或依 Supabase 版本與路由設計使用 `exchangeCodeForSession` 等步驟）

---

## 5. UI flow / wireframes（行動版 ASCII）

### 5.1 登入／註冊（分頁或切換）

```
┌─────────────────────────┐
│  ≡            記帳 PWA   │
├─────────────────────────┤
│                         │
│   [ 登入 ]  [ 註冊 ]    │
│                         │
│   Email                 │
│   ┌───────────────────┐ │
│   │ you@example.com   │ │
│   └───────────────────┘ │
│   密碼                  │
│   ┌───────────────────┐ │
│   │ ••••••••          │ │
│   └───────────────────┘ │
│   忘記密碼？            │
│                         │
│   ┌───────────────────┐ │
│   │      登入         │ │
│   └───────────────────┘ │
│   ─────── 或 ───────    │
│   ┌───────────────────┐ │
│   │  G  使用 Google   │ │
│   └───────────────────┘ │
│                         │
│   (錯誤時紅色提示列)    │
└─────────────────────────┘
```

### 5.2 註冊（含顯示名稱）

```
┌─────────────────────────┐
│  ← 返回                 │
├─────────────────────────┤
│   顯示名稱 *            │
│   ┌───────────────────┐ │
│   │ 王小明            │ │
│   └───────────────────┘ │
│   Email                 │
│   ┌───────────────────┐ │
│   │                   │ │
│   └───────────────────┘ │
│   密碼（≥ 政策下限）    │
│   ┌───────────────────┐ │
│   │                   │ │
│   └───────────────────┘ │
│   ┌───────────────────┐ │
│   │      建立帳號     │ │
│   └───────────────────┘ │
└─────────────────────────┘
```

### 5.3 個人資料編輯

```
┌─────────────────────────┐
│  ← 個人資料             │
├─────────────────────────┤
│        ┌─────┐          │
│        │ avatar        │
│        └─────┘          │
│   [ 變更頭像連結 ]      │
│                         │
│   顯示名稱              │
│   ┌───────────────────┐ │
│   │                   │ │
│   └───────────────────┘ │
│   頭像 URL（選填）      │
│   ┌───────────────────┐ │
│   │ https://...       │ │
│   └───────────────────┘ │
│   ┌───────────────────┐ │
│   │      儲存         │ │
│   └───────────────────┘ │
└─────────────────────────┘
```

### 5.4 全域載入（Session 還原中）

```
┌─────────────────────────┐
│                         │
│         ⌛              │
│     載入中…             │
│                         │
└─────────────────────────┘
```

### 5.5 受保護內容被攔截時（導向登入前可短暫全屏 loading）

流程：使用者開啟 `/notebooks` 等受保護路徑 → `AuthProvider` 尚未判定 Session → 顯示載入 → 判定未登入 → `Navigate` 至 `/login?next=/notebooks`。

---

## 6. Business logic

### 6.1 Session 與 Supabase Auth

- App 啟動時呼叫 `getSession`（或 `getUser`）還原 Session；並訂閱 `onAuthStateChange` 以同步登入、登出、token 刷新。  
- **AuthProvider** 應暴露：`user`（或 `session`）、`profile`、`status`（loading | authenticated | unauthenticated）、`error`，以及 `signIn`、`signUp`、`signInWithGoogle`、`signOut`、`refreshProfile` 等方法（實際介面可依專案慣例微調）。  
- **useAuth** 從 Context 讀取上述狀態；若在未包裹 Provider 的樹中使用，應拋出明確錯誤（開發階段）或回傳安全預設（依團隊規範擇一並貫徹）。

### 6.2 Email／密碼註冊與登入

- 註冊：`signUp` 時於 `options.data` 傳入 `display_name`，供 trigger 或後續 RPC 寫入 `profiles`（與 `../api-contracts.md` §2.1 一致）。  
- 若專案啟用「Email 確認」，註冊成功後 UI 應提示使用者至信箱點擊連結，而非直接當作已完全登入（依 Supabase 專案設定）。  
- 登入失敗時不洩漏「帳號是否存在」的細節（通用錯誤訊息）。

### 6.3 Google OAuth

- 使用 `signInWithOAuth`，`redirectTo` 須與 Supabase 後台允許的 URL 一致。  
- 回調後由 `onAuthStateChange` 取得 Session；若為首次 Google 使用者，資料庫 trigger 仍應建立 `profiles`（顯示名稱可取自 Google metadata 或預設字串）。

### 6.4 Profile 自動建立與編輯

- **自動建立**：以 `../db-schema.md` §4.1 trigger 為準；前端註冊路徑不得假設可略過資料庫自動建立。  
- **編輯**：僅允許更新自己的 `profiles` 列（RLS 應限制 `id = auth.uid()`）；可更新欄位：`display_name`、`avatar_url`。  
- 更新成功後應刷新 Context 中的 `profile`，使頭像與名稱立即反映於 UI。

### 6.5 密碼重設

- 「忘記密碼」頁：使用者輸入 Email → 呼叫 `resetPasswordForEmail` → 顯示「若信箱存在將收到信件」。  
- 使用者從信件開啟應用程式內「重設密碼」頁（hash 或 query 含 recovery 資訊，依 Supabase 與路由設計）→ 輸入新密碼兩次 → 驗證強度與一致性 → `updateUser({ password })` → 成功後導向登入或自動登入（依產品決策）。

### 6.6 受保護路由

- 定義需登入的路由集合（例如 `/notebooks`、`/notebook/:id`、設定頁等）。  
- 路由守衛邏輯：  
  - `status === loading`：顯示全域或區域載入，不閃爍登入表單。  
  - `status === unauthenticated`：導向 `/login`，並可附 `next` 查詢參數以便登入後返回。  
  - `status === authenticated`：渲染子路由。  
- 已登入使用者造訪 `/login`：可選擇自動導向首頁或帳簿列表（產品決策）。

### 6.7 UI 狀態對照

| 狀態 | 條件 | UI 行為 |
|------|------|---------|
| loading | Session 初始化中、或關鍵 Auth 呼叫進行中 | 顯示載入指示、主要按鈕 disabled |
| logged-in | 有效 Session 且（可選）profile 已載入 | 顯示主導航與受保護內容 |
| logged-out | 無有效 Session | 顯示登入／註冊與 OAuth |
| error | Auth 或 profile 載入失敗 | 可重試的錯誤訊息、不誤判為已登出 |

---

## 7. Edge cases

- **網路中斷**：`onAuthStateChange` 與 REST 呼叫失敗時，`error` 狀態與離線提示；避免無限 loading。  
- **Session 過期**：Supabase 自動刷新失敗時應退回 `unauthenticated` 並清除本地敏感快取。  
- **OAuth 取消或錯誤**：從 Google 返回但無 Session 時顯示可理解訊息。  
- **Email 已註冊再 signUp**：依 Supabase 回傳顯示合規訊息（避免與「密碼錯誤」混用若造成安全疑慮則統一文案）。  
- **Profile 延遲出現**：登入成功但 `profiles` 查詢短暫失敗 → 可重試 N 次或顯示「個人資料載入失敗」與重試鈕，不應讓 `useAuth` 永久卡在 loading。  
- **Google 與 Email 同 Email 合併**：若 Supabase 設定允許連結身分，UI 與錯誤處理需與官方行為一致；若未啟用，顯示後台設定的錯誤說明。  
- **密碼重設連結過期或已使用**：顯示錯誤並引導再次申請重設。  
- **多分頁登出**：一處登出後，其他分頁應透過 `onAuthStateChange` 同步為未登入。

---

## 8. Acceptance criteria

1. 使用者可用 Email／密碼完成註冊，且資料庫中存在對應 `profiles` 列（與 `../db-schema.md` 一致）。  
2. 使用者可用 Email／密碼登入並取得有效 Session，重新整理頁面後仍維持登入（在 Supabase 設定之 Session 有效期內）。  
3. 使用者可透過 Google OAuth 完成登入，且行為符合 `../api-contracts.md` §2.3。  
4. `AuthProvider` 提供 Session 與（若適用）profile；`useAuth` 可供任意子元件讀取認證狀態。  
5. 未登入使用者無法瀏覽受保護路由內容，會被導向登入頁；登入成功後可回到原欲造訪路徑（若實作 `next` 參數）。  
6. 使用者可編輯自己的 `display_name` 與 `avatar_url`，且更新後列表與詳情頁可見（與 `../api-contracts.md` §3.2 一致）。  
7. 忘記密碼流程可送出重設信，並可在合法連結上設定新密碼後再次登入。  
8. UI 必須區分並可測試：**loading**、**已登入**、**未登入**、**錯誤** 四種狀態，不得長時間空白或錯誤顯示內容。  
9. 登出後，受保護資料不得仍從記憶體快取中誤顯示；再次進入應要求登入。
