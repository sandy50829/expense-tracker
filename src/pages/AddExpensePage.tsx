import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '../lib/currency'
import type { ExpenseCategory, Profile, SplitType } from '../types/database'
import PageContainer from '../components/layout/PageContainer'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import LoadingSpinner from '../components/ui/LoadingSpinner'

type MemberRow = {
  user_id: string
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
}

const CATEGORIES: { id: ExpenseCategory; label: string; icon: ReactNode }[] = [
  {
    id: 'food',
    label: '餐飲',
    icon: (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M8 3v9M12 3v5M16 3v7M6 21h12M6 11h12v4a4 4 0 01-4 4h-4a4 4 0 01-4-4v-4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'transport',
    label: '交通',
    icon: (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 16l2-10h12l2 10M6 16h12v2H6v-2zM7 20h2M15 20h2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'lodging',
    label: '住宿',
    icon: (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 21V8l7-5 7 5v13M9 21v-6h6v6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'shopping',
    label: '購物',
    icon: (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 6h15l-2 9H8L6 6zM6 6L5 3H2M9 20a1 1 0 100-2 1 1 0 000 2zM18 20a1 1 0 100-2 1 1 0 000 2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'entertainment',
    label: '娛樂',
    icon: (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M9 18V5l12-2v13M9 9l12-2M9 13l12-2M4 17a2 2 0 100-4 2 2 0 000 4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'other',
    label: '其他',
    icon: (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

function IconBack({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function AddExpensePage() {
  const { id: notebookId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [members, setMembers] = useState<MemberRow[]>([])
  const [defaultCurrency, setDefaultCurrency] = useState('TWD')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>('TWD')
  const [description, setDescription] = useState('')
  const [payerId, setPayerId] = useState<string>('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState<ExpenseCategory>('food')
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [percentByUser, setPercentByUser] = useState<Record<string, string>>({})
  const [exactByUser, setExactByUser] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!notebookId || !user) return
    setLoading(true)
    setLoadError(null)
    try {
      const { data: nb, error: e0 } = await supabase
        .from('notebooks')
        .select('default_currency')
        .eq('id', notebookId)
        .single()
      if (e0) throw e0
      setDefaultCurrency(nb.default_currency)
      setCurrency(nb.default_currency as CurrencyCode)

      const { data: mem, error: e1 } = await supabase
        .from('notebook_members')
        .select('user_id, profiles(id, display_name, avatar_url)')
        .eq('notebook_id', notebookId)

      if (e1) throw e1
      const list = (mem ?? []) as unknown as MemberRow[]
      setMembers(list)
      const all = new Set(list.map((m) => m.user_id))
      setSelectedIds(all)
      setPayerId(user.id)
      const pct: Record<string, string> = {}
      const ex: Record<string, string> = {}
      for (const m of list) {
        pct[m.user_id] = list.length > 0 ? (100 / list.length).toFixed(1) : '0'
        ex[m.user_id] = ''
      }
      setPercentByUser(pct)
      setExactByUser(ex)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '無法載入成員')
    } finally {
      setLoading(false)
    }
  }, [notebookId, user])

  useEffect(() => {
    void load()
  }, [load])

  const toggleMember = (uid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  const numericAmount = useMemo(() => {
    const n = Number.parseFloat(amount.replace(/,/g, ''))
    return Number.isFinite(n) ? n : NaN
  }, [amount])

  const buildSplits = (): { user_id: string; amount: number }[] | null => {
    const total = numericAmount
    if (!Number.isFinite(total) || total <= 0) return null
    const ids = members.filter((m) => selectedIds.has(m.user_id)).map((m) => m.user_id)
    if (ids.length === 0) return null

    if (splitType === 'equal') {
      const each = Math.round((total / ids.length) * 100) / 100
      const splits = ids.map((uid) => ({ user_id: uid, amount: each }))
      const sum = splits.reduce((s, x) => s + x.amount, 0)
      const drift = Math.round((total - sum) * 100) / 100
      if (splits.length > 0 && Math.abs(drift) > 0.001) {
        splits[0] = { ...splits[0], amount: Math.round((splits[0].amount + drift) * 100) / 100 }
      }
      return splits
    }

    if (splitType === 'percentage') {
      let sumPct = 0
      const weights: { user_id: string; w: number }[] = []
      for (const uid of ids) {
        const p = Number.parseFloat(percentByUser[uid] ?? '0')
        if (!Number.isFinite(p) || p < 0) return null
        sumPct += p
        weights.push({ user_id: uid, w: p })
      }
      if (Math.abs(sumPct - 100) > 0.05) return null
      return weights.map(({ user_id, w }) => ({
        user_id,
        amount: Math.round(total * (w / 100) * 100) / 100,
      }))
    }

    let sumExact = 0
    const splits: { user_id: string; amount: number }[] = []
    for (const uid of ids) {
      const v = Number.parseFloat(exactByUser[uid] ?? '0')
      if (!Number.isFinite(v) || v < 0) return null
      sumExact += v
      splits.push({ user_id: uid, amount: Math.round(v * 100) / 100 })
    }
    if (Math.abs(sumExact - total) > 0.05) return null
    return splits
  }

  const onSave = async () => {
    if (!notebookId || !user) return
    setFormError(null)
    const splits = buildSplits()
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError('請輸入有效金額')
      return
    }
    if (!payerId) {
      setFormError('請選擇付款人')
      return
    }
    if (!splits) {
      if (splitType === 'percentage') {
        setFormError('比例加總需為 100%')
      } else if (splitType === 'exact') {
        setFormError('自訂分攤金額加總須等於總金額')
      } else {
        setFormError('請至少選擇一位分攤成員')
      }
      return
    }

    setSubmitting(true)
    try {
      const { data: exp, error: e1 } = await supabase
        .from('expenses')
        .insert({
          notebook_id: notebookId,
          description: description.trim() || '支出',
          amount: numericAmount,
          currency,
          category,
          split_type: splitType,
          paid_by: payerId,
          expense_date: expenseDate,
          note: null,
        })
        .select()
        .single()

      if (e1) throw e1

      const rows = splits.map((s) => ({
        expense_id: exp.id,
        user_id: s.user_id,
        amount: s.amount,
        is_settled: false,
      }))

      const { error: e2 } = await supabase.from('expense_splits').insert(rows)
      if (e2) throw e2

      navigate(`/notebook/${notebookId}`, { replace: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSubmitting(false)
    }
  }

  if (!notebookId) {
    return (
      <PageContainer showBottomNav={false}>
        <p className="text-sm text-morandi-error">缺少帳簿編號</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      showBottomNav={false}
      header={
        <Header
          title="新增支出"
          leftAction={
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex size-10 items-center justify-center rounded-lg text-morandi-deep hover:bg-morandi-cream"
              aria-label="返回"
            >
              <IconBack className="size-6" />
            </button>
          }
        />
      }
    >
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : loadError ? (
        <Card className="border border-morandi-error/30 bg-morandi-error/10">
          <p className="text-sm text-morandi-error">{loadError}</p>
          <Button variant="outline" className="mt-4" onClick={() => void load()}>
            重新載入
          </Button>
        </Card>
      ) : (
        <div className="space-y-4 pb-28">
          <Card>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Input label="金額" type="text" value={amount} onChange={setAmount} placeholder="0" />
              </div>
              <div className="w-28 shrink-0">
                <label className="mb-1 block text-sm text-morandi-stone">幣別</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="h-11 w-full rounded-lg border border-morandi-warm bg-white px-2 text-sm text-morandi-deep outline-none focus:border-morandi-rose focus:ring-2 focus:ring-morandi-rose/20"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-1 text-xs text-morandi-stone">帳簿預設幣別：{defaultCurrency}</p>
          </Card>

          <Card>
            <Input
              label="說明"
              type="text"
              value={description}
              onChange={setDescription}
              placeholder="例如：晚餐、計程車"
            />
          </Card>

          <Card>
            <label className="mb-2 block text-sm text-morandi-stone">付款人</label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="h-11 w-full rounded-lg border border-morandi-warm bg-white px-3 text-morandi-deep outline-none focus:border-morandi-rose focus:ring-2 focus:ring-morandi-rose/20"
            >
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profiles.display_name}
                </option>
              ))}
            </select>
          </Card>

          <Card>
            <Input label="日期" type="date" value={expenseDate} onChange={setExpenseDate} />
          </Card>

          <Card>
            <p className="mb-3 text-sm font-medium text-morandi-deep">分類</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => {
                const active = category === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={[
                      'flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs transition',
                      active
                        ? 'border-morandi-rose bg-morandi-rose-light text-morandi-deep'
                        : 'border-morandi-warm text-morandi-stone hover:bg-morandi-cream',
                    ].join(' ')}
                  >
                    <span className={active ? 'text-morandi-rose-dark' : ''}>{c.icon}</span>
                    {c.label}
                  </button>
                )
              })}
            </div>
          </Card>

          <Card>
            <p className="mb-3 text-sm font-medium text-morandi-deep">分攤方式</p>
            <div className="flex rounded-xl bg-morandi-cream p-1">
              {(
                [
                  ['equal', '均分'],
                  ['percentage', '比例'],
                  ['exact', '自訂'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSplitType(key)}
                  className={[
                    'flex-1 rounded-lg py-2 text-xs font-medium transition',
                    splitType === key ? 'bg-white text-morandi-deep shadow-sm' : 'text-morandi-stone',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <p className="mb-3 text-sm font-medium text-morandi-deep">分攤成員</p>
            <ul className="space-y-2">
              {members.map((m) => {
                const checked = selectedIds.has(m.user_id)
                return (
                  <li key={m.user_id}>
                    <label className="flex items-center gap-3 rounded-lg border border-morandi-warm/80 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(m.user_id)}
                        className="size-4 accent-morandi-rose"
                      />
                      <span className="flex-1 text-sm text-morandi-deep">{m.profiles.display_name}</span>
                      {splitType === 'percentage' && checked ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={percentByUser[m.user_id] ?? ''}
                          onChange={(e) =>
                            setPercentByUser((prev) => ({ ...prev, [m.user_id]: e.target.value }))
                          }
                          className="w-16 rounded-md border border-morandi-warm px-2 py-1 text-right text-sm"
                        />
                      ) : null}
                      {splitType === 'exact' && checked ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={exactByUser[m.user_id] ?? ''}
                          onChange={(e) =>
                            setExactByUser((prev) => ({ ...prev, [m.user_id]: e.target.value }))
                          }
                          className="w-24 rounded-md border border-morandi-warm px-2 py-1 text-right text-sm"
                          placeholder="0"
                        />
                      ) : null}
                    </label>
                  </li>
                )
              })}
            </ul>
            {splitType === 'percentage' ? (
              <p className="mt-2 text-xs text-morandi-stone">各成員比例加總需為 100%。</p>
            ) : null}
            {splitType === 'exact' ? (
              <p className="mt-2 text-xs text-morandi-stone">各成員金額加總需等於上方總金額。</p>
            ) : null}
          </Card>

          {formError ? (
            <p className="rounded-lg bg-morandi-error/15 px-3 py-2 text-sm text-morandi-error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-morandi-warm bg-white/95 p-4 backdrop-blur safe-bottom">
            <div className="mx-auto w-full max-w-lg">
              <Button className="w-full" size="lg" loading={submitting} onClick={() => void onSave()}>
                儲存支出
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
