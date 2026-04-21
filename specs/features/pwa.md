# PWA 規格：分帳記帳本

## 技術堆疊與部署

- **建置工具**：Vite
- **前端框架**：React
- **PWA 外掛**：`vite-plugin-pwa`
- **部署**：Cloudflare Pages（靜態資產與 Service Worker 由 CDN 提供）

---

## vite-plugin-pwa 設定

### 核心設定

- **`registerType: 'autoUpdate'`**  
  新版本建置並部署後，Service Worker 應在背景更新；使用者下次載入或重新整理時自動切換至新版本，無需手動「略過等待」。

### 建議設定要點（概念層級）

- 啟用 **Workbox** 整合（`vite-plugin-pwa` 預設路徑）。
- `manifest` 與 `workbox` 策略與下文「Web Manifest」「Service Worker 策略」一致。
- 生產環境啟用 PWA；開發環境可依團隊慣例決定是否啟用（建議至少 staging 與 production 行為一致）。

---

## Web Manifest

| 欄位 | 值 |
|------|-----|
| `name` | 分帳記帳本 |
| `short_name` | 記帳本 |
| `theme_color` | `#C9B1A1` |
| `background_color` | `#F5F0EB` |
| `display` | `standalone` |
| `start_url` | `/` |

### 其他建議欄位

- `lang`：例如 `zh-Hant`（與產品語系一致）。
- `orientation`：預設 `portrait-primary` 或 `any`，依 UI 設計決定。
- `scope`：`/`（與 `start_url` 一致，避免離線路由異常）。

---

## 圖示（Icons）

- **格式**：PNG。
- **尺寸**：`192×192`、`512×512`（必填；可額外提供 `maskable` 以改善 Android 圓角裁切）。
- **視覺**：莫蘭迪玫瑰色（與 `theme_color` `#C9B1A1` 調性一致），背景可搭配奶油色 `#F5F0EB` 以保持品牌一致。
- **Manifest 引用**：`icons` 陣列中需包含上述尺寸與 `purpose`（一般圖示與可選 `maskable`）。

---

## Service Worker 策略

### 預先快取（Precache）

- **範圍**：建置產出的靜態資產，包含 **HTML、CSS、JS**、字型與主要圖示等。
- **目的**：首次或更新後能快速載入殼層（shell），並在離線時仍能開啟應用介面。

### 執行時快取（Runtime Caching）

- **API 請求**（REST/GraphQL 等後端資料）：採 **Stale-While-Revalidate（SWR）**。
  - 先回傳快取（若存在），同時在背景發起網路請求更新快取。
  - 網路成功後，後續請求可取得較新資料；失敗時仍可使用舊快取（在過期策略允許範圍內）。
- **靜態資源**（非 precache 的第三方或動態路徑）：可依路徑分別設定 `CacheFirst` 或 `StaleWhileRevalidate`，與產品需求對齊。

### 快取命名與版本

- 建置版本變更時透過外掛產生的 SW 更新 precache 清單，避免舊版資源殘留造成白屏。

---

## 離線支援

### 讀取行為

- **離線時**：優先顯示 **已快取資料**（列表、記帳本摘要、最後一次同步的餘額等）。
- UI 需明確標示「離線模式」或網路不可用（例如頂部橫幅或小圖示），避免使用者誤以為資料為即時最新。

### 寫入與同步

- **變更操作**（新增支出、修改分帳、結算確認等）：離線時 **寫入本機佇列**（IndexedDB 或等效持久化佇列）。
- 恢復連線後依序 **重放（replay）** 佇列；需處理 **衝突與重試**（429/5xx 指數退避）。
- 佇列項目應包含：操作類型、payload、時間戳、可選 idempotency key，以利後端去重。

---

## 安裝提示處理

### iOS（Safari）

- **無** 標準 `beforeinstallprompt`；需引導使用者 **手動「加入主畫面」**。
- 規格建議：
  - 首次造訪或從設定進入時顯示 **步驟說明**（分享按鈕 →「加入主畫面」）。
  - 可搭配插圖或簡短 GIF（選配），文案使用繁體中文。
  - 「不再顯示」選項寫入 `localStorage`，避免過度打擾。

### Android（Chrome 等）

- 監聽 **`beforeinstallprompt`** 事件，**`preventDefault()`** 延後預設提示，改以自訂「安裝 App」按鈕觸發。
- 使用者拒絕或關閉後，記錄狀態以免重複彈窗過於頻繁。

---

## 更新通知（新版本）

- 因 **`registerType: 'autoUpdate'`**，SW 更新後可在客戶端透過 `vite-plugin-pwa` / Workbox 相關 API 監聽 **waiting / activated** 等生命週期。
- **行為**：偵測到新版本可用時顯示 **Toast**（繁體中文），例如：「已準備好新版本，重新整理後套用」；可提供「立即重新整理」按鈕。
- 若採自動套用，仍建議在 **下一次導覽或閒置後** 再 `skipWaiting` + `clients.claim`，並提示使用者，避免編輯中表單遺失。

---

## 啟動畫面（Splash Screen）

### 來源

- **iOS**：依 `apple-mobile-web-app-capable`、`apple-mobile-web-app-status-bar-style` 與 **圖示 / manifest** 由系統產生啟動畫面；需準備合適的 **apple-touch-icon**（建議 180×180 等）。
- **Android**：依 **Web App Manifest** 的 `name`、`background_color`、`theme_color`、`icons`（含 512）產生。

### 規格對齊

- `background_color`：`#F5F0EB`（與品牌奶油底一致）。
- `theme_color`：`#C9B1A1`（狀態列 / 工具列色調與莫蘭迪玫瑰一致）。
- `display: standalone`：啟動後無瀏覽器網址列，體驗接近原生。

### HTML meta 建議

- `theme-color` content=`#C9B1A1`。
- `viewport`：`width=device-width, initial-scale=1, viewport-fit=cover`（適配瀏海機型）。

---

## Cloudflare Pages 注意事項

- **SPA 路由**：設定 **單頁應用** 導向（所有路徑 fallback 至 `index.html`），否則直接開啟深連結會 404。
- **Service Worker 範圍**：確保 SW 檔案路徑與 `scope` 涵蓋全站。
- **HTTPS**：PWA 與 SW 需安全來源；Pages 預設符合。

---

## 驗收檢查清單（摘要）

- [ ] Manifest 欄位與圖示尺寸符合上表。
- [ ] `registerType: 'autoUpdate'` 生效，新版本部署後可更新 SW。
- [ ] 離線可開啟殼層並顯示快取資料；變更進入佇列並於上線後同步。
- [ ] iOS 有「加入主畫面」引導；Android 有 `beforeinstallprompt` 流程。
- [ ] 新版本 Toast 提示與（可選）一鍵重新整理。
- [ ] 啟動畫面色與圖示與莫蘭迪色板一致。
