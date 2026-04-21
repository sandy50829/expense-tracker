import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useExpenseRealtime } from '../hooks/useRealtime'
import { calculateBalances } from '../lib/settle'
import type { Expense, ExpenseSplit, Notebook, Profile } from '../types/database'
import PageContainer from '../components/layout/PageContainer'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import AmountDisplay from '../components/ui/AmountDisplay'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'

type ExpenseRow = Expense & {
  payer: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
  expense_splits: ExpenseSplit[]
}

type MemberRow = {
  user_id: string
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
}

function groupByDate(items: ExpenseRow[]) {
  const map = new Map<string, ExpenseRow[]>()
  for (const e of items) {
    const d = e.expense_date.slice(0, 10)
    const arr = map.get(d) ?? []
    arr.push(e)
    map.set(d, arr)
  }
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
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

function IconMembers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const categoryLabel: Record<string, string> = {
  food: '餐飲',
  transport: '交通',
  lodging: '住宿',
  shopping: '購物',
  entertainment: '娛樂',
  other: '其他',
}

export default function NotebookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [notebook, setNotebook] = useState<Notebook | null>(null)
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [membersOpen, setMembersOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id || !user) return
    setLoading(true)
    setError(null)
    try {
      const { data: nb, error: e1 } = await supabase.from('notebooks').select('*').eq('id', id).single()
      if (e1) throw e1
      setNotebook(nb)

      const { data: mem, error: e2 } = await supabase
        .from('notebook_members')
        .select('user_id, profiles(id, display_name, avatar_url)')
        .eq('notebook_id', id)

      if (e2) throw e2
      const memberList = (mem ?? []) as unknown as MemberRow[]
      setMembers(memberList)

      const profileByUser = new Map(
        memberList.map((m) => [m.user_id, m.profiles] as const),
      )

      const { data: ex, error: e3 } = await supabase
        .from('expenses')
        .select('*, expense_splits(*)')
        .eq('notebook_id', id)
        .order('expense_date', { ascending: false })

      if (e3) throw e3

      const unknownProfile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> = {
        id: '',
        display_name: '未知成員',
        avatar_url: null,
      }

      setExpenses(
        (ex ?? []).map((row) => {
          const e = row as Expense & { expense_splits: ExpenseSplit[] }
          return {
            ...e,
            payer: profileByUser.get(e.paid_by) ?? { ...unknownProfile, id: e.paid_by },
            expense_splits: e.expense_splits ?? [],
          }
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法載入帳簿')
    } finally {
      setLoading(false)
    }
  }, [id, user])

  useEffect(() => {
    void load()
  }, [load])

  useExpenseRealtime(id ?? '', {
    onInsert: () => void load(),
    onUpdate: () => void load(),
    onDelete: () => void load(),
  })

  const myBalance = useMemo(() => {
    if (!user) return 0
    const balances = calculateBalances(
      expenses.map((e) => ({
        paid_by: e.paid_by,
        splits: e.expense_splits.map((s) => ({ user_id: s.user_id, amount: s.amount })),
      })),
    )
    return balances.find((b) => b.userId === user.id)?.amount ?? 0
  }, [expenses, user])

  const currency = notebook?.default_currency ?? 'TWD'
  const grouped = useMemo(() => groupByDate(expenses), [expenses])

  const dateLabel = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('zh-TW', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

  if (!id) {
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
          title={notebook?.name ?? '帳簿'}
          leftAction={
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex size-10 items-center justify-center rounded-lg text-morandi-deep hover:bg-morandi-cream"
              aria-label="返回"
            >
              <IconBack className="size-6" />
            </button>
          }
          rightAction={
            <button
              type="button"
              onClick={() => setMembersOpen(true)}
              className="flex size-10 items-center justify-center rounded-lg text-morandi-deep hover:bg-morandi-cream"
              aria-label="成員"
            >
              <IconMembers className="size-6" />
            </button>
          }
        />
      }
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
      ) : (
        <>
          <Card className="mb-4 bg-gradient-to-br from-morandi-rose-light/80 to-white">
            <p className="text-sm text-morandi-stone">我的淨餘額（{currency}）</p>
            <p className="mt-1 text-3xl tabular-nums">
              <AmountDisplay amount={myBalance} currency={currency} showSign />
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => navigate(`/notebook/${id}/settle`)}
              >
                結算
              </Button>
            </div>
          </Card>

          {grouped.length === 0 ? (
            <Card className="border border-dashed border-morandi-warm text-center text-sm text-morandi-stone">
              尚無支出紀錄，點右下角新增一筆吧。
            </Card>
          ) : (
            <div className="space-y-6">
              {grouped.map(([date, list]) => (
                <section key={date}>
                  <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-morandi-stone">
                    {dateLabel(date)}
                  </h2>
                  <ul className="space-y-2">
                    {list.map((e) => (
                      <li key={e.id}>
                        <Card className="flex items-start justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-morandi-deep">
                              {e.description || '（無說明）'}
                            </p>
                            <p className="mt-1 text-xs text-morandi-stone">
                              {categoryLabel[e.category] ?? e.category} · 付款：{e.payer.display_name}
                            </p>
                          </div>
                          <AmountDisplay
                            amount={e.amount}
                            currency={e.currency}
                            className="shrink-0 text-base"
                          />
                        </Card>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => navigate(`/notebook/${id}/add`)}
        className={[
          'fixed right-5 z-40 flex size-14 items-center justify-center rounded-full',
          'bg-morandi-rose text-white shadow-[0_8px_24px_rgba(201,177,161,0.5)] transition active:scale-95',
        ].join(' ')}
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        aria-label="新增支出"
      >
        <svg className="size-7" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <Modal isOpen={membersOpen} onClose={() => setMembersOpen(false)} title="成員">
        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-morandi-cream text-sm font-medium text-morandi-deep">
                {m.profiles.display_name.slice(0, 1)}
              </div>
              <div>
                <p className="font-medium text-morandi-deep">{m.profiles.display_name}</p>
                {m.user_id === user?.id ? (
                  <p className="text-xs text-morandi-rose">目前使用者</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Modal>
    </PageContainer>
  )
}
