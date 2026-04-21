import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Notebook } from '../types/database'
import PageContainer from '../components/layout/PageContainer'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function JoinNotebookPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [notebook, setNotebook] = useState<Notebook | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [alreadyMember, setAlreadyMember] = useState(false)

  const loadNotebook = useCallback(async () => {
    if (!code) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: e1 } = await supabase
        .from('notebooks')
        .select('*')
        .eq('invite_code', code.trim())
        .maybeSingle()

      if (e1) throw e1
      if (!data) {
        setNotebook(null)
        setError('找不到此邀請碼，請確認連結是否正確。')
        return
      }
      setNotebook(data)

      if (user) {
        const { data: existing, error: e2 } = await supabase
          .from('notebook_members')
          .select('id')
          .eq('notebook_id', data.id)
          .eq('user_id', user.id)
          .maybeSingle()
        if (e2) throw e2
        setAlreadyMember(Boolean(existing))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法載入帳簿')
    } finally {
      setLoading(false)
    }
  }, [code, user])

  useEffect(() => {
    void loadNotebook()
  }, [loadNotebook])

  const goLogin = () => {
    navigate('/login', { state: { from: `/join/${code}` } })
  }

  const join = async () => {
    if (!notebook || !user) return
    setJoining(true)
    setError(null)
    try {
      if (alreadyMember) {
        navigate(`/notebook/${notebook.id}`, { replace: true })
        return
      }
      const { error: e1 } = await supabase.from('notebook_members').insert({
        notebook_id: notebook.id,
        user_id: user.id,
        role: 'member',
      })
      if (e1) throw e1
      navigate(`/notebook/${notebook.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入失敗')
    } finally {
      setJoining(false)
    }
  }

  if (!code) {
    return (
      <PageContainer showBottomNav={false}>
        <Card className="border border-morandi-error/30">
          <p className="text-sm text-morandi-error">邀請連結無效。</p>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer showBottomNav={false}>
      <div className="mx-auto max-w-md pt-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-morandi-rose-light text-2xl">
            📩
          </div>
          <h1 className="text-lg font-semibold text-morandi-deep">加入帳簿</h1>
          <p className="mt-1 text-sm text-morandi-stone">透過邀請碼加入朋友的分帳記帳本</p>
        </div>

        {authLoading || loading ? (
          <div className="flex min-h-[30vh] items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error && !notebook ? (
          <Card className="border border-morandi-error/30 bg-morandi-error/10">
            <p className="text-sm text-morandi-error">{error}</p>
            <Button variant="outline" className="mt-4 w-full" onClick={() => void loadNotebook()}>
              重新載入
            </Button>
          </Card>
        ) : notebook ? (
          <Card className="overflow-hidden">
            <div className="flex gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-morandi-sage-light text-2xl">
                {notebook.icon || '📒'}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-morandi-deep">{notebook.name}</h2>
                {notebook.description ? (
                  <p className="mt-1 text-sm text-morandi-stone">{notebook.description}</p>
                ) : null}
                <p className="mt-2 text-xs text-morandi-stone">
                  預設幣別 {notebook.default_currency} · 邀請碼 {code}
                </p>
              </div>
            </div>

            {!user ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-morandi-stone">請先登入以加入此帳簿。</p>
                <Button className="w-full" onClick={goLogin}>
                  前往登入
                </Button>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {alreadyMember ? (
                  <p className="text-sm text-morandi-sage-dark">你已經是此帳簿的成員。</p>
                ) : null}
                {error ? (
                  <p className="text-sm text-morandi-error" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button className="w-full" loading={joining} onClick={() => void join()}>
                  {alreadyMember ? '進入帳簿' : '加入帳簿'}
                </Button>
              </div>
            )}
          </Card>
        ) : null}
      </div>
    </PageContainer>
  )
}
