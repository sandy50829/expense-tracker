# 結算與債務簡化規格

## 1. 概述

本文件定義類 Splitwise 的「帳簿結算」功能：依支出與分攤計算每位成員的淨餘額（誰該收、誰該付），以**貪婪式最小交易演算法**產生建議轉帳清單，並支援**結算紀錄**寫入、**標記分攤已結清**、**歷史查閱**、**多幣別換算至帳簿預設幣別**，以及**撤銷結算**。

詳見資料結構：[../db-schema.md](../db-schema.md)；Supabase 操作合約：[../api-contracts.md](../api-contracts.md)。

---

## 2. 使用者故事

| ID | 身為… | 我希望… | 以便… |
|----|--------|---------|--------|
| S-01 | 帳簿成員 | 看到每位成員的淨餘額（以帳簿預設幣別顯示） | 一眼知道誰欠誰、欠多少 |
| S-02 | 帳簿成員 | 看到系統建議的最少筆數轉帳清單 | 實際轉帳時步驟最少 |
| S-03 | 付款方／收款方 | 在完成實際轉帳後記錄一筆結算（from → to、金額、幣別） | 帳務與現金流一致 |
| S-04 | 帳簿成員 | 將已透過結算涵蓋的分攤標記為「已結清」 | 餘額計算與 UI 狀態一致 |
| S-05 | 帳簿成員 | 查看結算歷史（時間、雙方、金額） | 稽核與對帳 |
| S-06 | 帳簿成員 | 在誤記時撤銷某筆結算 | 還原錯誤而不改動原始支出 |
| S-07 | 帳簿成員 | 帳簿內有多種幣別支出時，仍以單一「帳簿預設幣別」統一計算餘額 | 決策與顯示一致 |

---

## 3. 資料模型（參考 [../db-schema.md](../db-schema.md)）

與本功能直接相關的表格：

| 表格 | 用途 |
|------|------|
| `notebooks` | `default_currency` 為餘額與簡化演算法的**統一幣別** |
| `notebook_members` | 界定帳簿成員集合 |
| `expenses` | `paid_by` 為「已代墊金額」歸屬；`amount`、`currency` 為該筆支出總額與幣別 |
| `expense_splits` | 每位成員的 `amount` 為應分攤額；`is_settled` 表示該分攤是否已視為結清 |
| `settlements` | `from_user`、`to_user`、`amount`、`currency`、`settled_at` 記錄實際結算行為 |

**餘額語意（統一幣別後）：**

- 對成員 \(u\)：`net[u] = sum(代墊) - sum(分攤應付)`  
- 「代墊」：該成員作為 `expenses.paid_by` 的支出，將**整筆** `expenses.amount`（換算後）計入 `paid`。  
- 「分攤應付」：該成員在 `expense_splits` 的 `amount`（換算後）計入 `split`，**可選**僅納入 `is_settled = false` 的分攤（見「業務邏輯」）。

**結算紀錄：** 與 schema 一致，一筆列表示「`from_user` 付給 `to_user` 金額 `amount`（`currency`）」。

---

## 4. API 合約（參考 [../api-contracts.md](../api-contracts.md)）

| 操作 | 合約章節 | 說明 |
|------|----------|------|
| 讀取帳簿預設幣別 | §4 Notebooks | `notebooks.default_currency` |
| 列出支出與分攤 | §5.1 | `expenses` + `expense_splits` 供餘額計算 |
| 更新分攤 `is_settled` | （於 api-contracts 可擴充為 `expense_splits.update`） | 標記已結清流程 |
| 列出結算 | §6.1 | 歷史列表 |
| 新增結算 | §6.2 | 寫入 `settlements` |
| 刪除結算 | §6.3 | 撤銷結算 |
| 匯率 | §8 | `frankfurter` 將非預設幣別換算至 `default_currency` |

---

## 5. UI 流程／線框（行動版 ASCII）

### 5.1 結算總覽（帳簿內分頁或區塊）

```
┌─────────────────────────────┐
│  ←  週末旅遊帳簿            │
├─────────────────────────────┤
│  餘額（TWD）                 │
│  ┌─────────────────────┐    │
│  │ 小安   +1200  應收   │    │
│  │ 小陳   -500   應付   │    │
│  │ 小林   -700   應付   │    │
│  └─────────────────────┘    │
│                             │
│  [ 建議轉帳（最少筆數） ]    │
│  ┌─────────────────────┐    │
│  │ 小林 → 小安  700    │    │
│  │ 小陳 → 小安  500    │    │
│  └─────────────────────┘    │
│                             │
│  [ 記錄結算 ]  [ 結算歷史 ]  │
└─────────────────────────────┘
```

### 5.2 標記「已結清」流程（分攤層級）

```
支出詳情
┌─────────────────────────────┐
│  晚餐  USD 60               │
│  分攤：                      │
│  ☑ 小安  20  已結清         │
│  ☐ 小陳  20                 │
│  ☐ 小林  20                 │
│                             │
│  [ 儲存 ]                   │
└─────────────────────────────┘
```

### 5.3 記錄結算

```
┌─────────────────────────────┐
│  記錄結算                    │
│  付款人 [ 小林 ▼ ]           │
│  收款人 [ 小安 ▼ ]           │
│  金額   [ 700    ]           │
│  幣別   [ TWD   ▼ ]          │
│  [ 確認 ]                    │
└─────────────────────────────┘
```

### 5.4 結算歷史

```
┌─────────────────────────────┐
│  結算歷史                    │
│  4/20 小林→小安  TWD 700     │
│  4/19 小陳→小安  TWD 500     │
│        [ 撤銷 ]（若可刪）    │
└─────────────────────────────┘
```

---

## 6. 業務邏輯

### 6.1 餘額計算（統一幣別）

**輸入：** 帳簿 `notebook_id`、預設幣別 `base = notebooks.default_currency`、支出列表（含 splits）。

**換算：** 對每筆支出的 `currency`，若不等於 `base`，依 [../api-contracts.md](../api-contracts.md) §8 取得匯率，將 `expenses.amount` 與各 `expense_splits.amount` 換算為 `base` 後再相加。  
（實作應快取匯率；顯示時可另註明「依某日匯率」。）

**公式（每位成員 \(u\)）：**

```
net[u] = Σ 換算後(paid_by = u 的 expense.amount)
       - Σ 換算後(屬於 u 的 split.amount，且計入規則見下)
```

**是否納入已結清分攤：**

- **模式 A（推薦顯示「未結清餘額」）**：僅 `is_settled = false` 的分攤列入 `split` 項；已標記結清者不再增加應付。  
- **模式 B（對帳用「總餘額」）**：所有分攤皆列入；與 `settlements` 並列時需避免雙重扣減——產品應擇一為主顯示，本規格以**模式 A + 結算紀錄獨立列表**為預設 UX。

代墊項：一律依支出總額計入付款人（除非未來擴充「部分代墊」schema）。

### 6.2 最小交易演算法（貪婪配對）

在已得 `net[u]`（債權為正、債務為負）之後：

1. 計算每位成員的 `net`（已為帳簿預設幣別）。  
2. 分兩群：**債權人** `net > 0`、**債務人** `net < 0`（忽略 `net == 0`）。  
3. 債權人依餘額**由大到小**排序；債務人依絕對值**由大到小**排序（同號內排序穩定即可）。  
4. 取目前最大債權人 `c` 與最大債務人 `d`，轉帳金額 `t = min(net[c], abs(net[d]))`。  
5. 產生一筆建議：「`d` → `c`，金額 `t`」（方向：債務人付給債權人）。  
6. `net[c] -= t`，`net[d] += t`（代數上兩者往 0 靠近）。若某方 `net` 變為 0，自列表移除。  
7. 重複步驟 4–6 直到無債權人或無債務人。

**性質：** 可將總轉帳筆數壓在至多 \(n-1\) 筆（\(n\) 為有非零餘額人數）。本演算法為常見貪婪解，與最小現金流問題的典型作法一致。

### 6.3 虛擬碼

```text
function convertToBase(amount, currency, base, rates):
  if currency == base: return amount
  return amount * rates[currency]  // 實作依 API：可能需經由 base 間接換算

function computeNetBalances(notebook, expenses, splitsFilter):
  base = notebook.default_currency
  rates = loadExchangeRates(base)  // 見 api-contracts §8，含快取

  net = map user_id -> 0

  for each expense in expenses:
    totalBase = convertToBase(expense.amount, expense.currency, base, rates)
    net[expense.paid_by] += totalBase
    for each split in expense.splits:
      if splitsFilter(split):  // 例如：not split.is_settled
        net[split.user_id] -= convertToBase(split.amount, expense.currency, base, rates)
        // 註：若 split 幣別未來獨立於 expense，則改以 split.currency 換算

  return net, base

function greedyMinTransactions(net):
  creditors = [ (u, net[u]) for u in net if net[u] > 0 ]
  debtors   = [ (u, -net[u]) for u in net if net[u] < 0 ]
  sort creditors by balance descending
  sort debtors   by balance descending

  transactions = []
  i, j = 0, 0
  while i < len(creditors) and j < len(debtors):
    (cu, cBal) = creditors[i]
    (du, dBal) = debtors[j]
    t = min(cBal, dBal)
    transactions.append({ from: du, to: cu, amount: t, currency: base })
    cBal -= t
    dBal -= t
    if cBal == 0: i += 1
    else: creditors[i] = (cu, cBal)
    if dBal == 0: j += 1
    else: debtors[j] = (du, dBal)

  return transactions
```

### 6.4 範例演算（四人）

假設帳簿預設幣別 **TWD**，且本例無需換匯。

| 支出 | 金額 | 付款人 | 分攤（每人應付） |
|------|------|--------|------------------|
| 午餐 | 1200 | 小安 | 小安 300、小陳 300、小林 300、小黃 300 |
| 門票 | 800 | 小陳 | 每人 200 |
| 計程車 | 400 | 小林 | 每人 100 |

**代墊合計：** 小安 +1200、小陳 +800、小林 +400  
**分攤合計（每人）：** 300+200+100 = 600  

`net = 代墊 - 分攤`：

- 小安：1200 - 600 = **+600**
- 小陳：800 - 600 = **+200**
- 小林：400 - 600 = **-200**
- 小黃：0 - 600 = **-600**

**貪婪配對：**

1. 債權人：小安 600、小陳 200；債務人：小黃 600、小林 200  
2. 小安(600) + 小黃(600) → 小黃 → 小安 **600**（小黃結清）  
3. 小陳(200) + 小林(200) → 小林 → 小陳 **200**（全清）

**建議 2 筆轉帳**（最少筆數之一）。

### 6.5 範例演算（三人＋多幣別）

帳簿 `default_currency = TWD`。匯率（僅示意）：**1 USD = 32 TWD**。

| 支出 | 金額 | 幣別 | 付款人 | 分攤（equal） |
|------|------|------|--------|----------------|
| A | 96 USD | USD | 甲 | 三人各 32 USD（換算後各 1024 TWD） |
| B | 300 TWD | TWD | 乙 | 三人各 100 TWD |

換算後代墊（TWD）：甲 96×32 = 3072；乙 300；丙 0  
分攤（TWD）：每人 1024 + 100 = 1124  

`net`：

- 甲：3072 - 1124 = **1948**
- 乙：300 - 1124 = **-824**
- 丙：0 - 1124 = **-1124**

貪婪：**丙 → 甲 1124**、**乙 → 甲 824**（共 2 筆）。  
實際產品可將建議金額顯示為 TWD，轉帳紀錄仍可依使用者選擇幣別寫入 `settlements.currency`。

### 6.6 結算寫入與撤銷

- **新增：** `INSERT settlements(notebook_id, from_user, to_user, amount, currency)`，與 §6.2 API 一致。  
- **撤銷：** `DELETE settlements WHERE id = ?`，RLS 僅 `from_user` 或 `to_user` 可刪（見 schema）。  
- **與 `is_settled`：** 使用者可在記錄結算後，於相關支出的分攤上勾選已結清；撤銷結算時，應提示是否一併還原勾選（產品決策：建議提示，避免資料認知不一致）。

---

## 7. 邊界情況

| 情況 | 行為 |
|------|------|
| 僅一名成員 | 無轉帳建議；餘額應為 0 或單向（視支出是否含自己分攤） |
| 所有 `net` 皆為 0 | 顯示「已平衡」，建議清單為空 |
| 匯率 API 失敗 | 阻擋「統一幣別餘額」或使用最後快取並標示「匯率可能過期」 |
| 四捨五入累積誤差 | 使用 `numeric` 與固定小數位；最後一筆可調整 0.01 使總和誤差為 0（實作細節） |
| `from_user = to_user` | DB CHECK 禁止；UI 應防止選同一人 |
| 未登入／非成員 | RLS 拒絕讀寫 |
| 同時多人結算 | 即時同步見 [realtime.md](./realtime.md)；衝突時**以伺服器資料為準** |

---

## 8. 驗收條件

1. 餘額計算符合 `sum(代墊) - sum(分攤)`（分攤是否排除 `is_settled` 與產品設定一致且在 UI 說明）。  
2. 多幣別支出時，餘額與建議轉帳皆先換算至 `notebooks.default_currency` 再計算。  
3. 建議轉帳清單由貪婪演算法產生，筆數不多於「非零餘額人數 - 1」。  
4. 使用者可成功寫入結算（`from_user`, `to_user`, `amount`, `currency`），並於歷史列表看到該筆。  
5. 符合 RLS 者可刪除結算紀錄（撤銷），列表與餘額反映更新。  
6. 「標記已結清」可更新 `expense_splits.is_settled`，且儲存後餘額（模式 A）跟隨變化。  
7. 文件中的虛擬碼與四人、三人多幣別範例可作為手動驗算對照。
