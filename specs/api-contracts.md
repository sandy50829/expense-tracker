# API 合約規格

## 1. 概述

本專案不使用自建 API server，所有資料操作均透過 Supabase Client SDK 直接存取 PostgreSQL，
搭配 RLS 進行權限控制。本文件定義所有 Supabase query 的合約。

## 2. 認證 (Auth)

### 2.1 Email 註冊
```typescript
supabase.auth.signUp({
  email: string,
  password: string,
  options: {
    data: { display_name: string }
  }
})
```
- **成功**: 回傳 user object，自動建立 profile (trigger)
- **失敗**: 回傳 error（email 重複、密碼太短等）

### 2.2 Email 登入
```typescript
supabase.auth.signInWithPassword({
  email: string,
  password: string
})
```

### 2.3 Google OAuth 登入
```typescript
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.origin }
})
```

### 2.4 登出
```typescript
supabase.auth.signOut()
```

### 2.5 取得當前用戶
```typescript
supabase.auth.getUser()
```

## 3. Profiles

### 3.1 取得個人資料
```typescript
supabase.from('profiles').select('*').eq('id', userId).single()
```

### 3.2 更新個人資料
```typescript
supabase.from('profiles').update({
  display_name: string,
  avatar_url?: string
}).eq('id', userId)
```

### 3.3 批次取得多個用戶資料
```typescript
supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds)
```

## 4. Notebooks

### 4.1 取得用戶的所有帳簿
```typescript
supabase
  .from('notebook_members')
  .select(`
    notebook_id,
    role,
    notebooks (
      id, name, description, default_currency, icon, created_by, created_at
    )
  `)
  .eq('user_id', userId)
  .order('joined_at', { ascending: false })
```

### 4.2 建立帳簿
```typescript
supabase.from('notebooks').insert({
  name: string,
  description?: string,
  default_currency: string,  // ISO 4217
  icon?: string,
  invite_code: string,       // 前端產生 8 字元隨機碼
  created_by: userId
}).select().single()
```
- trigger 自動建立 notebook_members (role='owner')

### 4.3 更新帳簿
```typescript
supabase.from('notebooks').update({
  name?: string,
  description?: string,
  default_currency?: string,
  icon?: string
}).eq('id', notebookId)
```

### 4.4 刪除帳簿
```typescript
supabase.from('notebooks').delete().eq('id', notebookId)
```
- CASCADE 自動刪除相關 members, expenses, splits, settlements

### 4.5 透過邀請代碼加入帳簿
```typescript
// Step 1: 查詢帳簿
supabase.from('notebooks').select('id').eq('invite_code', code).single()

// Step 2: 加入成員
supabase.from('notebook_members').insert({
  notebook_id: notebookId,
  user_id: userId,
  role: 'member'
})
```

### 4.6 取得帳簿成員
```typescript
supabase
  .from('notebook_members')
  .select(`
    user_id,
    role,
    joined_at,
    profiles ( id, display_name, avatar_url )
  `)
  .eq('notebook_id', notebookId)
```

### 4.7 移除成員 / 離開帳簿
```typescript
supabase.from('notebook_members')
  .delete()
  .eq('notebook_id', notebookId)
  .eq('user_id', targetUserId)
```

## 5. Expenses

### 5.1 取得帳簿的所有支出
```typescript
supabase
  .from('expenses')
  .select(`
    *,
    profiles:paid_by ( id, display_name, avatar_url ),
    expense_splits ( id, user_id, amount, is_settled )
  `)
  .eq('notebook_id', notebookId)
  .order('expense_date', { ascending: false })
```

### 5.2 新增支出（含分攤）
```typescript
// Step 1: 新增 expense
const { data: expense } = await supabase.from('expenses').insert({
  notebook_id: string,
  description: string,
  amount: number,
  currency: string,
  category: 'food' | 'transport' | 'lodging' | 'shopping' | 'entertainment' | 'other',
  split_type: 'equal' | 'percentage' | 'exact',
  paid_by: userId,
  expense_date: string,  // YYYY-MM-DD
  note?: string
}).select().single()

// Step 2: 新增 splits
const splits = members.map(m => ({
  expense_id: expense.id,
  user_id: m.user_id,
  amount: calculateSplitAmount(expense.amount, splitType, m)
}))
await supabase.from('expense_splits').insert(splits)
```

### 5.3 更新支出
```typescript
await supabase.from('expenses').update({
  description?: string,
  amount?: number,
  currency?: string,
  category?: string,
  split_type?: string,
  expense_date?: string,
  note?: string
}).eq('id', expenseId)

// 同時更新 splits (先刪後建)
await supabase.from('expense_splits').delete().eq('expense_id', expenseId)
await supabase.from('expense_splits').insert(newSplits)
```

### 5.4 刪除支出
```typescript
supabase.from('expenses').delete().eq('id', expenseId)
```
- CASCADE 自動刪除相關 splits

## 6. Settlements

### 6.1 取得帳簿的結算記錄
```typescript
supabase
  .from('settlements')
  .select(`
    *,
    from_profile:from_user ( id, display_name, avatar_url ),
    to_profile:to_user ( id, display_name, avatar_url )
  `)
  .eq('notebook_id', notebookId)
  .order('settled_at', { ascending: false })
```

### 6.2 新增結算
```typescript
supabase.from('settlements').insert({
  notebook_id: string,
  from_user: userId,
  to_user: userId,
  amount: number,
  currency: string
})
```

### 6.3 刪除結算
```typescript
supabase.from('settlements').delete().eq('id', settlementId)
```

## 7. Realtime 訂閱

### 7.1 訂閱帳簿支出變更
```typescript
supabase
  .channel(`notebook:${notebookId}:expenses`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'expenses',
    filter: `notebook_id=eq.${notebookId}`
  }, handleExpenseChange)
  .subscribe()
```

### 7.2 訂閱結算變更
```typescript
supabase
  .channel(`notebook:${notebookId}:settlements`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'settlements',
    filter: `notebook_id=eq.${notebookId}`
  }, handleSettlementChange)
  .subscribe()
```

## 8. 匯率 API

### 8.1 取得最新匯率
```
GET https://api.frankfurter.dev/latest?base={baseCurrency}
```

**回應格式**:
```json
{
  "base": "TWD",
  "date": "2026-04-21",
  "rates": {
    "USD": 0.031,
    "JPY": 4.67,
    "EUR": 0.028
  }
}
```

### 8.2 快取策略
- 以 `localStorage` 快取匯率資料
- Key: `exchange_rates_{base}_{date}`
- 每日最多呼叫一次 API，之後從快取讀取
