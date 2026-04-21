---
description: Git commit 訊息格式規範，適用於所有 git commit 操作
globs: ["**"]
---

# Commit 訊息規範

## 格式

```
<type>(<scope>): <subject in English>

<body in Traditional Chinese>

<footer>
```

## 規則

### 標題 (Subject Line)
- **語言**: 必須英文
- **開頭**: 小寫字母
- **結尾**: 不加句號
- **長度**: 不超過 50 字元
- **語氣**: 祈使句 (imperative mood)，如 "add" 而非 "added"

### 內文 (Body)
- **語言**: 繁體中文
- **用途**: 詳細描述變更原因與內容
- **格式**: 每行不超過 72 字元
- **間隔**: body 與 subject 之間空一行

### Footer
- **Spec 引用**: `Refs: specs/features/xxx.md#section`
- **Breaking Change**: `BREAKING CHANGE: 描述`

## Type 類型

| Type | 說明 | 範例 scope |
|------|------|-----------|
| `feat` | 新功能 | expense, notebook |
| `fix` | 修復 bug | auth, settlement |
| `docs` | 文件變更 | readme |
| `style` | 格式調整（不影響邏輯） | ui |
| `refactor` | 重構 | db, hooks |
| `test` | 測試相關 | expense, auth |
| `chore` | 建構工具、設定 | config, deps |
| `spec` | Spec 文件新增/修改 (SDD) | notebook, expense |

## Scope 範圍

`auth`, `notebook`, `expense`, `currency`, `settlement`, `realtime`, `pwa`, `ui`, `db`, `config`, `deps`

## 範例

### 功能新增
```
feat(expense): add split type selector component

實作分帳方式選擇器，支援均分、自訂比例、自訂金額三種模式。
依據 specs/features/expense.md §5 的 UI 流程實作。
- 新增 SplitTypeSelector 元件
- 均分模式自動計算各人金額
- 自訂模式顯示金額輸入欄位

Refs: specs/features/expense.md#5
```

### Bug 修復
```
fix(settlement): correct minimum transaction calculation

修正當多人淨餘額相同時，結算演算法產生多餘交易的問題。
- 加入排序穩定性處理
- 修正浮點數精度比較邏輯

Refs: specs/features/settlement.md#6
```

### Spec 變更
```
spec(currency): add offline fallback strategy

新增匯率 API 離線備援策略規格。
- 定義 stale cache 使用條件（最多 7 天）
- 定義 API 失敗時的預設匯率處理
```

## 分支命名

- 功能: `feat/<feature-name>` (e.g. `feat/notebook-crud`)
- 修復: `fix/<bug-description>` (e.g. `fix/split-rounding`)
- Spec: `spec/<spec-name>` (e.g. `spec/initial-specs`)
