# 資料庫 Schema 規格

## 1. 概述

使用 Supabase 託管的 PostgreSQL，搭配 Row Level Security (RLS) 進行資料存取控制。
所有表格均使用 UUID 作為主鍵，時間戳記使用 `timestamptz`。

## 2. 表格定義

### 2.1 profiles

使用者個人資料，與 `auth.users` 一對一關聯。透過 trigger 在使用者註冊時自動建立。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | uuid | PK, FK → auth.users.id | 使用者 ID |
| display_name | text | NOT NULL | 顯示名稱 |
| avatar_url | text | NULLABLE | 頭像 URL |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 建立時間 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新時間 |

### 2.2 notebooks

帳簿，每個帳簿可有多位成員。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | 帳簿 ID |
| name | text | NOT NULL | 帳簿名稱 |
| description | text | NULLABLE | 帳簿描述 |
| default_currency | text | NOT NULL, DEFAULT 'TWD' | 預設幣別 (ISO 4217) |
| icon | text | NOT NULL, DEFAULT 'book' | 圖示識別碼 |
| invite_code | text | UNIQUE, NOT NULL | 邀請代碼 (8 字元隨機碼) |
| created_by | uuid | NOT NULL, FK → profiles.id | 建立者 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 建立時間 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新時間 |

### 2.3 notebook_members

帳簿成員關聯表。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | 成員記錄 ID |
| notebook_id | uuid | NOT NULL, FK → notebooks.id ON DELETE CASCADE | 帳簿 ID |
| user_id | uuid | NOT NULL, FK → profiles.id | 使用者 ID |
| role | text | NOT NULL, DEFAULT 'member', CHECK (role IN ('owner', 'member')) | 角色 |
| joined_at | timestamptz | NOT NULL, DEFAULT now() | 加入時間 |

**唯一約束**: `UNIQUE (notebook_id, user_id)`

### 2.4 expenses

支出記錄。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | 支出 ID |
| notebook_id | uuid | NOT NULL, FK → notebooks.id ON DELETE CASCADE | 所屬帳簿 |
| description | text | NOT NULL | 支出描述 |
| amount | numeric(12,2) | NOT NULL, CHECK (amount > 0) | 金額 |
| currency | text | NOT NULL, DEFAULT 'TWD' | 幣別 (ISO 4217) |
| category | text | NOT NULL, DEFAULT 'other' | 分類 |
| split_type | text | NOT NULL, DEFAULT 'equal', CHECK (split_type IN ('equal', 'percentage', 'exact')) | 分帳方式 |
| paid_by | uuid | NOT NULL, FK → profiles.id | 付款人 |
| expense_date | date | NOT NULL, DEFAULT CURRENT_DATE | 消費日期 |
| note | text | NULLABLE | 備註 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 建立時間 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新時間 |

**分類 CHECK**: `category IN ('food', 'transport', 'lodging', 'shopping', 'entertainment', 'other')`

### 2.5 expense_splits

支出分攤明細。每筆支出會對應多筆分攤記錄。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | 分攤記錄 ID |
| expense_id | uuid | NOT NULL, FK → expenses.id ON DELETE CASCADE | 支出 ID |
| user_id | uuid | NOT NULL, FK → profiles.id | 分攤人 |
| amount | numeric(12,2) | NOT NULL, CHECK (amount >= 0) | 分攤金額 |
| is_settled | boolean | NOT NULL, DEFAULT false | 是否已結清 |

**唯一約束**: `UNIQUE (expense_id, user_id)`

### 2.6 settlements

結算記錄。記錄兩人之間的結算行為。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | 結算 ID |
| notebook_id | uuid | NOT NULL, FK → notebooks.id ON DELETE CASCADE | 所屬帳簿 |
| from_user | uuid | NOT NULL, FK → profiles.id | 付款方 |
| to_user | uuid | NOT NULL, FK → profiles.id | 收款方 |
| amount | numeric(12,2) | NOT NULL, CHECK (amount > 0) | 結算金額 |
| currency | text | NOT NULL | 幣別 |
| settled_at | timestamptz | NOT NULL, DEFAULT now() | 結算時間 |

**CHECK**: `from_user != to_user`

## 3. 索引

```sql
CREATE INDEX idx_notebook_members_notebook ON notebook_members(notebook_id);
CREATE INDEX idx_notebook_members_user ON notebook_members(user_id);
CREATE INDEX idx_expenses_notebook ON expenses(notebook_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX idx_settlements_notebook ON settlements(notebook_id);
```

## 4. Trigger

### 4.1 自動建立 profile
```
ON auth.users INSERT → INSERT INTO profiles (id, display_name)
display_name 預設取 email 的 @ 前半段
```

### 4.2 自動更新 updated_at
```
ON profiles/notebooks/expenses UPDATE → SET updated_at = now()
```

### 4.3 建立帳簿時自動加入成員
```
ON notebooks INSERT → INSERT INTO notebook_members (notebook_id, user_id, role='owner')
```

## 5. RLS 規則

### 5.1 profiles
- **SELECT**: 所有已登入用戶可讀取（用於顯示成員姓名/頭像）
- **UPDATE**: 只能更新自己的 profile (`auth.uid() = id`)

### 5.2 notebooks
- **SELECT**: 必須是該帳簿的成員
- **INSERT**: 任何已登入用戶
- **UPDATE**: 僅限 owner (`role = 'owner'`)
- **DELETE**: 僅限 owner

### 5.3 notebook_members
- **SELECT**: 必須是該帳簿的成員
- **INSERT**: 任何已登入用戶（透過邀請代碼加入）
- **DELETE**: owner 可移除成員，或成員自行離開

### 5.4 expenses
- **SELECT**: 必須是該帳簿的成員
- **INSERT**: 必須是該帳簿的成員
- **UPDATE**: 僅限支出建立者 或 owner
- **DELETE**: 僅限支出建立者 或 owner

### 5.5 expense_splits
- **SELECT**: 必須是該帳簿的成員
- **INSERT**: 必須是該帳簿的成員（伴隨 expense 建立）
- **UPDATE**: 僅限相關支出的建立者 或 owner
- **DELETE**: 僅限相關支出的建立者 或 owner

### 5.6 settlements
- **SELECT**: 必須是該帳簿的成員
- **INSERT**: 必須是該帳簿的成員 且 (from_user 或 to_user 為自己)
- **DELETE**: 僅限 from_user 或 to_user

## 6. ER 圖

```
profiles 1──┬──N notebook_members N──┬──1 notebooks
             │                        │
             ├──N expenses ───────────┘
             │      │
             │      └──N expense_splits
             │
             └──N settlements ────────── notebooks
```
