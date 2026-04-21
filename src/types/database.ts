export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Notebook {
  id: string
  name: string
  description: string | null
  default_currency: string
  icon: string
  invite_code: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface NotebookMember {
  id: string
  notebook_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
}

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'lodging'
  | 'shopping'
  | 'entertainment'
  | 'other'

export type SplitType = 'equal' | 'percentage' | 'exact'

export interface Expense {
  id: string
  notebook_id: string
  description: string
  amount: number
  currency: string
  category: ExpenseCategory
  split_type: SplitType
  paid_by: string
  expense_date: string
  note: string | null
  created_at: string
  updated_at: string
}

export interface ExpenseSplit {
  id: string
  expense_id: string
  user_id: string
  amount: number
  is_settled: boolean
}

export interface Settlement {
  id: string
  notebook_id: string
  from_user: string
  to_user: string
  amount: number
  currency: string
  settled_at: string
}

export interface ExpenseWithRelations extends Expense {
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
  expense_splits: ExpenseSplit[]
}

export interface NotebookMemberWithProfile extends NotebookMember {
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
}

export interface SettlementWithProfiles extends Settlement {
  from_profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
  to_profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
}

export interface NotebookWithDetails {
  notebook_id: string
  role: 'owner' | 'member'
  notebooks: Notebook
}
