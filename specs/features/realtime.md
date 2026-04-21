# 即時同步（Supabase Realtime）規格

## 1. 概述

本文件定義帳簿內**支出**與**結算**資料透過 **Supabase Realtime**（`postgres_changes`）與前端 PWA 同步的行為：頻道命名、過濾條件、事件對應、`useRealtime` Hook 設計、生命週期、樂觀更新、衝突處理、連線狀態，以及 **Free 方案配額**提醒。

資料表與 RLS 見 [../db-schema.md](../db-schema.md)；訂閱範例見 [../api-contracts.md](../api-contracts.md) §7。

---

## 2. 使用者故事

| ID | 身為… | 我希望… | 以便… |
|----|--------|---------|--------|
| R-01 | 帳簿成員 | 在開著帳簿頁面時，他人新增支出立刻出現 | 無需手動重新整理 |
| R-02 | 帳簿成員 | 他人修改或刪除支出時，我的列表同步更新 | 避免過期資料 |
| R-03 | 帳簿成員 | 他人記錄或撤銷結算時即時反映 | 餘額與歷史一致 |
| R-04 | 使用者 | 離線或斷線時看到連線狀態 | 理解資料可能不是最新 |
| R-05 | 開發者 | 在頁面卸載時自動取消訂閱 | 避免洩漏連線與重複監聽 |

---

## 3. 資料模型（參考 [../db-schema.md](../db-schema.md)）

| 表格 | 即時關注欄位（示例） | 過濾鍵 |
|------|----------------------|--------|
| `expenses` | `id`, `notebook_id`, 其餘業務欄位、`updated_at` | `notebook_id=eq.{uuid}` |
| `settlements` | `id`, `notebook_id`, `from_user`, `to_user`, `amount`, `currency`, `settled_at` | `notebook_id=eq.{uuid}` |

**前提：** Supabase 專案中已對上述資料表啟用 Realtime publication（`supabase_realtime` 納入 `public.expenses`、`public.settlements`）。

---

## 4. API 合約（參考 [../api-contracts.md](../api-contracts.md)）

| 項目 | 說明 |
|------|------|
| 支出訂閱 | §7.1：`postgres_changes`，`schema: 'public'`，`table: 'expenses'`，`filter: notebook_id=eq.{notebookId}` |
| 結算訂閱 | §7.2：同上，`table: 'settlements'` |
| 頻道名稱 | `notebook:{notebookId}:expenses`、`notebook:{notebookId}:settlements`（與 §7 一致） |
| 初次載入 | 仍依 REST/RPC 查詢（§5.1、§6.1）；Realtime 負責**增量**變更 |

---

## 5. UI 流程／線框（行動版 ASCII）

### 5.1 帳簿頁（訂閱中）

```
┌─────────────────────────────┐
│  週末旅遊帳簿        ●連線中 │
├─────────────────────────────┤
│  [ 支出列表… ]               │
│  [ 結算／餘額… ]             │
└─────────────────────────────┘
   ● 綠色：已連線
   ○ 灰色：斷線
   ⟳ 黃色：重新連線中
```

### 5.2 斷線橫幅（可選）

```
┌─────────────────────────────┐
│ ⚠ 無法連線，變更可能延遲   │
└─────────────────────────────┘
```

---

## 6. 業務邏輯

### 6.1 事件對應（postgres_changes）

對**支出**與**結算**兩張表，事件處理一致：

| 事件 | 前端列表行為 |
|------|----------------|
| `INSERT` | 將 `new` 記錄插入對應列表（依日期或 `settled_at` 排序規則插入） |
| `UPDATE` | 以 `new.id` 尋找項目並整筆替換為 `new` |
| `DELETE` | 以 `old.id` 從列表移除 |

**注意：** `UPDATE` 若變更 `notebook_id`（正常業務不應發生），應從目前帳簿列表移除該筆。

### 6.2 `useRealtime` Hook 設計（概念）

**職責：**

- 接收 `notebookId`、`supabase` client、以及可選的 `onExpenseChange` / `onSettlementChange` 或集中式 `dispatch`。  
- 在 **notebook 頁 mount** 時建立兩個頻道並 `subscribe()`。  
- 在 **unmount** 時對兩頻道執行 `removeChannel` 或 `unsubscribe()`，避免重複訂閱。  
- 對外暴露 `connectionState`: `'connected' | 'disconnected' | 'reconnecting'`（見 6.4）。  
- （可選）暴露 `lastError` 供 UI 顯示。

**虛擬碼：**

```text
function useRealtime(notebookId, options):
  state = { expensesVersion, settlementsVersion, connectionState, ... }

  onMount:
    if !notebookId: return
    chExp = supabase.channel(`notebook:${notebookId}:expenses`)
    chSet = supabase.channel(`notebook:${notebookId}:settlements`)

    chExp.on('postgres_changes', { event: '*', schema, table: 'expenses', filter }, handlerExpense)
    chSet.on('postgres_changes', { event: '*', schema, table: 'settlements', filter }, handlerSettlement)

    chExp.subscribe((status) => updateConnFromStatus(status))
    chSet.subscribe((status) => updateConnFromStatus(status))

  onUnmount:
    supabase.removeChannel(chExp)
    supabase.removeChannel(chSet)

  handlerExpense(payload):
    switch payload.eventType:
      INSERT: options.upsertExpense(payload.new)
      UPDATE: options.upsertExpense(payload.new)
      DELETE: options.removeExpense(payload.old.id)

  handlerSettlement(payload):
    類推 settlements
```

### 6.3 訂閱生命週期

- **進入帳簿詳情／筆記本工作區**：建立訂閱。  
- **離開頁面（unmount）**：解除訂閱。  
- **notebookId 變更**（路由切換）：先 unsubscribe 舊 `notebookId`，再 subscribe 新 id。  
- **使用者登出**：全域移除所有頻道或依實作重置 client。

### 6.4 樂觀更新（Optimistic UI）

| 動作 | 樂觀行為 | 回滾條件 |
|------|-----------|-----------|
| 本地新增支出 | 列表先插入暫時列（可帶 `client_temp_id`） | INSERT 回傳錯誤時移除 |
| 本地更新支出 | 先以表單值更新該列 | UPDATE 失敗則還原舊值或重抓 |
| 本地刪除支出 | 先自列表移除 | DELETE 失敗則插回 |
| 本地新增／刪除結算 | 同上 | 同上 |

**與 Realtime 併用：** 樂觀列應在收到自己觸發的 `INSERT`（`new`）時以伺服器 `id` 合併，避免重複。

### 6.5 衝突處理：**伺服器資料為準**

若本地樂觀狀態與遲到的 `postgres_changes` 不一致：

- 以 **Realtime 事件攜帶的 `new` / `old`**（即資料庫當前真相）覆寫本地該筆記錄。  
- 若同一資源同時有進行中 mutation，建議在收到伺服器事件後**取消等待中的樂觀遮罩**並以伺服器列為準。  
- 不實作複雜 OT/CRDT；PWA 以**最後寫入 DB 者**透過事件傳播為準。

### 6.6 連線狀態處理

| 狀態 | 觸發示例 | UI／行為 |
|------|-----------|-----------|
| `connected` | `subscribe` 回呼 `SUBSCRIBED` | 顯示已連線；隱藏斷線提示 |
| `disconnected` | 網路中斷、WS 關閉 | 顯示斷線；列表保留最後已知資料；考慮禁用需即時保證的操作提示 |
| `reconnecting` | SDK 自動重連中 | 顯示重新連線中；重連成功後可依需**選擇性 refetch** 列表以補漏網事件（實作建議） |

兩個頻道可採「**取較差狀態**」聚合（任一未連線則整體顯示未就緒），或分開顯示進階診斷。

### 6.7 Free 方案限制（參考 Supabase 定價）

以下為規格級提醒，實際數字以官方最新方案為準：

| 限制 | 代表意涵 |
|------|-----------|
| 約 **200** 個同時 **Realtime 連線** | 每位開啟帳簿頁的使用者可能佔 1～2 連線（兩頻道可能共用或分開，依 SDK）；需監控尖峰 |
| 約 **200 萬**則 **Realtime 訊息／月** | 高頻 `UPDATE` 或大量 INSERT 易耗盡配額；可批次寫入、減少無謂更新 |

**產品策略：** 監控儀表板外，可在管理文件註明：超量時降級為「僅手動重新整理」或合併頻道（若 SDK 支援單頻道多表監聽且仍符合過濾需求）。

---

## 7. 邊界情況

| 情況 | 行為 |
|------|------|
| Realtime 未啟用或表未加入 publication | 僅初始查詢有資料；應記錄錯誤並提示後台設定 |
| RLS 拒絕讀取某列 | 用戶不應收到該列事件；若收到應忽略或觸發 refetch |
| 短暫斷線造成事件遺漏 | 重連後執行增量 refetch（依 `updated_at` 或版本） |
| 同一頻道重複 subscribe | Hook 須 idempotent：unmount 務必清理 |
| 行動裝置背景化 | WebView 可能凍結 WS；恢復前景時進入 `reconnecting` 並 refetch |

---

## 8. 驗收條件

1. 帳簿頁載入時建立 `notebook:{id}:expenses` 與 `notebook:{id}:settlements` 兩個頻道，且 `filter` 含正確 `notebook_id`。  
2. 他端 `INSERT/UPDATE/DELETE` 支出時，本地列表於連線狀態下即時增刪改，無需整頁重新載入。  
3. 他端結算變更同理。  
4. 離開帳簿頁時兩頻道皆已移除，無記憶體洩漏或重複事件（可於 dev 工具驗證 subscribe 次數）。  
5. 樂觀更新失敗會回滾；成功時與後續 Realtime 事件不重複顯示。  
6. 與伺服器狀態衝突時，最終 UI 與**資料庫一致**（伺服器優先）。  
7. UI 可呈現 `connected` / `disconnected` / `reconnecting` 至少三態之一組合理行為。  
8. 文件或內部 README 記載 Free 層 **200 連線、200 萬訊息／月**之營運風險與降級策略。
