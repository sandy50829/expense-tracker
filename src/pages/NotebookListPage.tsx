import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { calculateBalances } from '../lib/settle'
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '../lib/currency'
import type { Notebook } from '../types/database'
import PageContainer from '../components/layout/PageContainer'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import LoadingSpinner from '../components/ui/LoadingSpinner'

type MemberRow = { notebook_id: string; user_id: string }

type NotebookRow = {
  role: string
  notebook_id: string
  notebooks: Notebook | null
}

type ExpenseRow = {
  notebook_id: string
  paid_by: string
  expense_splits: { user_id: string; amount: number }[] | null
}

export default function NotebookListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [rows, setRows] = useState<NotebookRow[]>([])
  const [memberCountByNotebook, setMemberCountByNotebook] = useState<Record<string, number>>({})
  const [balanceByNotebook, setBalanceByNotebook] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createCurrency, setCreateCurrency] = useState<CurrencyCode>('TWD')
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data: memberRows, error: e1 } = await supabase
        .from('notebook_members')
        .select('role, notebook_id, notebooks(*)')
        .eq('user_id', user.id)

      if (e1) throw e1

      const list = (memberRows ?? []) as unknown as NotebookRow[]
      setRows(list)

      const ids = list.map((r) => r.notebook_id).filter(Boolean)
      if (ids.length === 0) {
        setMemberCountByNotebook({})
        setBalanceByNotebook({})
        setLoading(false)
        return
      }

      const { data: allMembers, error: e2 } = await supabase
        .from('notebook_members')
        .select('notebook_id, user_id')
        .in('notebook_id', ids)

      if (e2) throw e2

      const counts: Record<string, number> = {}
      for (const m of (allMembers ?? []) as MemberRow[]) {
        counts[m.notebook_id] = (counts[m.notebook_id] ?? 0) + 1
      }
      setMemberCountByNotebook(counts)

      const { data: expenseRows, error: e3 } = await supabase
        .from('expenses')
        .select('notebook_id, paid_by, expense_splits(user_id, amount)')
        .in('notebook_id', ids)

      if (e3) throw e3

      const byNotebook = new Map<string, ExpenseRow[]>()
      for (const row of (expenseRows ?? []) as ExpenseRow[]) {
        const arr = byNotebook.get(row.notebook_id) ?? []
        arr.push(row)
        byNotebook.set(row.notebook_id, arr)
      }

      const bal: Record<string, number> = {}
      for (const id of ids) {
        const ex = byNotebook.get(id) ?? []
        const balances = calculateBalances(
          ex.map((r) => ({
            paid_by: r.paid_by,
            splits: r.expense_splits ?? [],
          })),
        )
        const mine = balances.find((b) => b.userId === user.id)
        bal[id] = mine?.amount ?? 0
      }
      setBalanceByNotebook(bal)
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法載入帳簿')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const sortedRows = useMemo(() => {
    return [...rows].filter((r) => r.notebooks).sort((a, b) => {
      const na = a.notebooks?.name ?? ''
      const nb = b.notebooks?.name ?? ''
      return na.localeCompare(nb, 'zh-Hant')
    })
  }, [rows])

  const submitCreate = async () => {
    if (!user) return
    setCreateError(null)
    if (!createName.trim()) {
      setCreateError('請輸入帳簿名稱')
      return
    }
    setCreateSubmitting(true)
    try {
      const inviteCode =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()
          : Math.random().toString(36).slice(2, 14).toUpperCase()

      const { data: nb, error: e1 } = await supabase
        .from('notebooks')
        .insert({
          name: createName.trim(),
          description: createDesc.trim() || null,
          default_currency: createCurrency,
          icon: '📒',
          invite_code: inviteCode,
          created_by: user.id,
        })
        .select()
        .single()

      if (e1) throw e1

      const { error: e2 } = await supabase.from('notebook_members').insert({
        notebook_id: nb.id,
        user_id: user.id,
        role: 'owner',
      })

      if (e2) throw e2

      setCreateOpen(false)
      setCreateName('')
      setCreateDesc('')
      setCreateCurrency('TWD')
      await load()
      navigate(`/notebook/${nb.id}`)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '建立失敗')
    } finally {
      setCreateSubmitting(false)
    }
  }

  return (
    <PageContainer
      header={<Header title="分帳記帳本" />}
      showBottomNav
    >
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <Card className="border border-morandi-error/30 bg-morandi-error/10">
          <p className="text-sm text-morandi-error">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => void load()}>
            重新載入
          </Button>
        </Card>
      ) : sortedRows.length === 0 ? (
        <EmptyState
          title="尚無帳簿"
          description="建立第一個記帳本，開始與朋友分攤費用。"
          icon={
            <svg className="mx-auto size-14" viewBox="0 0 48 48" fill="none" aria-hidden>
              <rect x="10" y="12" width="28" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
              <path d="M16 22h16M16 28h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
          action={
            <Button className="w-full" onClick={() => setCreateOpen(true)}>
              建立帳簿
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {sortedRows.map((r) => {
            const nb = r.notebooks!
            const members = memberCountByNotebook[nb.id] ?? 0
            const bal = balanceByNotebook[nb.id] ?? 0
            return (
              <li key={nb.id}>
                <Card onClick={() => navigate(`/notebook/${nb.id}`)} className="flex gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-morandi-rose-light text-2xl">
                    {nb.icon || '📒'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-morandi-deep">{nb.name}</p>
                    <p className="mt-1 text-xs text-morandi-stone">
                      {members} 位成員 · 預設 {nb.default_currency}
                    </p>
                    <p className="mt-2 text-sm">
                      <span className="text-morandi-stone">我的淨額：</span>
                      <span
                        className={[
                          'ml-1 font-medium tabular-nums',
                          bal > 0.005
                            ? 'text-morandi-sage-dark'
                            : bal < -0.005
                              ? 'text-morandi-error'
                              : 'text-morandi-deep',
                        ].join(' ')}
                      >
                        {bal > 0 ? '+' : ''}
                        {bal.toFixed(2)} {nb.default_currency}
                      </span>
                    </p>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className={[
          'fixed right-5 z-40 flex size-14 items-center justify-center rounded-full',
          'bg-morandi-sage text-white shadow-[0_8px_24px_rgba(167,181,160,0.45)] transition active:scale-95',
        ].join(' ')}
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 1rem)' }}
        aria-label="新增帳簿"
      >
        <svg className="size-7" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <Modal
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false)
          setCreateError(null)
        }}
        title="建立新帳簿"
        actions={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button loading={createSubmitting} onClick={() => void submitCreate()}>
              建立
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="名稱" value={createName} onChange={setCreateName} placeholder="例如：東京之旅" />
          <Input
            label="描述（選填）"
            value={createDesc}
            onChange={setCreateDesc}
            placeholder="簡短說明"
          />
          <div>
            <label className="mb-1 block text-sm text-morandi-stone">預設幣別</label>
            <select
              value={createCurrency}
              onChange={(e) => setCreateCurrency(e.target.value as CurrencyCode)}
              className="h-11 w-full rounded-lg border border-morandi-warm bg-white px-3 text-morandi-deep outline-none focus:border-morandi-rose focus:ring-2 focus:ring-morandi-rose/20"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {createError ? (
            <p className="text-sm text-morandi-error" role="alert">
              {createError}
            </p>
          ) : null}
        </div>
      </Modal>
    </PageContainer>
  )
}
