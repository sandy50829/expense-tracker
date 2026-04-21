import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useExpenseRealtime, useSettlementRealtime } from '../hooks/useRealtime'
import { calculateBalances, simplifyDebts, type Transfer, type SettlementInput } from '../lib/settle'
import type { Expense, ExpenseSplit, Profile, Settlement } from '../types/database'
import PageContainer from '../components/layout/PageContainer'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import AmountDisplay from '../components/ui/AmountDisplay'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'

type MemberRow = {
  user_id: string
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
}

type ExpenseRow = Expense & { expense_splits: ExpenseSplit[] }

type SettlementRow = Settlement & {
  from_profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
  to_profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
}

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

export default function SettlementPage() {
  const { id: notebookId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [notebookName, setNotebookName] = useState('')
  const [currency, setCurrency] = useState('TWD')
  const [members, setMembers] = useState<MemberRow[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [history, setHistory] = useState<SettlementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const profileById = useMemo(() => {
    const m = new Map<string, Pick<Profile, 'id' | 'display_name' | 'avatar_url'>>()
    for (const row of members) {
      m.set(row.user_id, row.profiles)
    }
    return m
  }, [members])

  const load = useCallback(async () => {
    if (!notebookId || !user) return
    setLoading(true)
    setError(null)
    try {
      const { data: nb, error: e0 } = await supabase.from('notebooks').select('*').eq('id', notebookId).single()
      if (e0) throw e0
      setNotebookName(nb.name)
      setCurrency(nb.default_currency)

      const { data: mem, error: e1 } = await supabase
        .from('notebook_members')
        .select('user_id, profiles(id, display_name, avatar_url)')
        .eq('notebook_id', notebookId)

      if (e1) throw e1
      const memberList = (mem ?? []) as unknown as MemberRow[]
      setMembers(memberList)

      const pmap = new Map(
        memberList.map((m) => [m.user_id, m.profiles] as const),
      )
      const fallback = (id: string): Pick<Profile, 'id' | 'display_name' | 'avatar_url'> => ({
        id,
        display_name: '成員',
        avatar_url: null,
      })

      const { data: ex, error: e2 } = await supabase
        .from('expenses')
        .select('*, expense_splits(*)')
        .eq('notebook_id', notebookId)

      if (e2) throw e2
      setExpenses((ex ?? []) as ExpenseRow[])

      const { data: settledRaw, error: e3 } = await supabase
        .from('settlements')
        .select('*')
        .eq('notebook_id', notebookId)
        .order('settled_at', { ascending: false })

      if (e3) throw e3

      const enriched: SettlementRow[] = (settledRaw ?? []).map((s: Settlement) => ({
        ...s,
        from_profile: pmap.get(s.from_user) ?? fallback(s.from_user),
        to_profile: pmap.get(s.to_user) ?? fallback(s.to_user),
      }))
      setHistory(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法載入結算資料')
    } finally {
      setLoading(false)
    }
  }, [notebookId, user])

  useEffect(() => {
    void load()
  }, [load])

  useExpenseRealtime(notebookId ?? '', {
    onInsert: () => void load(),
    onUpdate: () => void load(),
    onDelete: () => void load(),
  })

  useSettlementRealtime(notebookId ?? '', {
    onInsert: () => void load(),
    onUpdate: () => void load(),
    onDelete: () => void load(),
  })

  const settlementInputs: SettlementInput[] = useMemo(
    () => history.map((h) => ({ from_user: h.from_user, to_user: h.to_user, amount: h.amount })),
    [history],
  )

  const balances = useMemo(() => {
    return calculateBalances(
      expenses.map((e) => ({
        paid_by: e.paid_by,
        splits: (e.expense_splits ?? []).map((s) => ({ user_id: s.user_id, amount: s.amount })),
      })),
      settlementInputs,
    )
  }, [expenses, settlementInputs])

  const transfers = useMemo(() => simplifyDebts(balances), [balances])

  const transferKey = (t: Transfer) => `${t.from}|${t.to}|${t.amount}`

  const markSettled = async (t: Transfer) => {
    if (!notebookId || !user) return
    const key = transferKey(t)
    setMarkingId(key)
    try {
      const { error: e1 } = await supabase.from('settlements').insert({
        notebook_id: notebookId,
        from_user: t.from,
        to_user: t.to,
        amount: t.amount,
        currency,
        settled_at: new Date().toISOString(),
      })
      if (e1) throw e1
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '標記失敗')
    } finally {
      setMarkingId(null)
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
          title="結算"
          leftAction={
            <button
              type="button"
              onClick={() => navigate(`/notebook/${notebookId}`)}
              className="flex size-10 items-center justify-center rounded-lg text-morandi-deep hover:bg-morandi-cream"
              aria-label="返回"
            >
              <IconBack className="size-6" />
            </button>
          }
        />
      }
    >
      <p className="mb-4 text-center text-xs text-morandi-stone">{notebookName}</p>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <Card className="mb-4 border border-morandi-error/30 bg-morandi-error/10">
          <p className="text-sm text-morandi-error">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => void load()}>
            重新載入
          </Button>
        </Card>
      ) : null}

      {!loading && !error ? (
        <>
          <Card className="mb-4">
            <h2 className="text-sm font-semibold text-morandi-deep">成員餘額概覽</h2>
            <p className="mt-1 text-xs text-morandi-stone">正數代表應收款項，負數代表應付款項。</p>
            <ul className="mt-4 space-y-3">
              {members.map((m) => {
                const b = balances.find((x) => x.userId === m.user_id)?.amount ?? 0
                return (
                  <li key={m.user_id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-morandi-cream text-sm font-medium">
                        {m.profiles.display_name.slice(0, 1)}
                      </div>
                      <span className="truncate text-sm font-medium text-morandi-deep">
                        {m.profiles.display_name}
                        {m.user_id === user?.id ? (
                          <span className="ml-1 text-xs text-morandi-rose">（我）</span>
                        ) : null}
                      </span>
                    </div>
                    <AmountDisplay amount={b} currency={currency} showSign className="text-sm" />
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card className="mb-4">
            <h2 className="text-sm font-semibold text-morandi-deep">建議轉帳（簡化後）</h2>
            {transfers.length === 0 ? (
              <p className="mt-3 text-sm text-morandi-stone">目前無需轉帳，太棒了！</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {transfers.map((t, idx) => {
                  const fromP = profileById.get(t.from)
                  const toP = profileById.get(t.to)
                  const rowKey = `${transferKey(t)}-${idx}`
                  return (
                    <li
                      key={rowKey}
                      className="flex flex-col gap-3 rounded-xl border border-morandi-warm/80 bg-morandi-cream/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <p className="text-sm text-morandi-deep">
                        <span className="font-medium">{fromP?.display_name ?? '成員'}</span>
                        <span className="mx-1 text-morandi-stone">付給</span>
                        <span className="font-medium">{toP?.display_name ?? '成員'}</span>
                        <span className="ml-2 tabular-nums">
                          <AmountDisplay amount={t.amount} currency={currency} />
                        </span>
                      </p>
                      {user && (t.from === user.id || t.to === user.id) ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={markingId === transferKey(t)}
                          onClick={() => void markSettled(t)}
                        >
                          標記已結算
                        </Button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-morandi-deep">結算紀錄</h2>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-morandi-stone">尚無紀錄。</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-morandi-warm/50 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="text-sm text-morandi-deep">
                      {h.from_profile.display_name} → {h.to_profile.display_name}
                    </div>
                    <div className="text-right">
                      <AmountDisplay amount={h.amount} currency={h.currency} className="text-sm" />
                      <p className="text-xs text-morandi-stone">
                        {new Date(h.settled_at).toLocaleString('zh-TW')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </PageContainer>
  )
}
