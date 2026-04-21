import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, user, session, loading: authLoading } = useAuth()

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signUpSuccess, setSignUpSuccess] = useState(false)

  useEffect(() => {
    if (!authLoading && user) navigate(redirectTo, { replace: true })
  }, [authLoading, user, navigate, redirectTo])

  if (authLoading || user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-morandi-cream">
        <div
          className="size-10 animate-spin rounded-full border-[3px] border-morandi-rose border-t-transparent"
          role="status"
          aria-label="載入中"
        />
      </div>
    )
  }

  if (signUpSuccess) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-morandi-cream px-5">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-morandi-sage-light text-2xl">
            ✉️
          </div>
          <h2 className="text-lg font-semibold text-morandi-deep">註冊成功！</h2>
          <p className="mt-3 text-sm text-morandi-stone">
            驗證信已寄至 <span className="font-medium text-morandi-deep">{email}</span>，請至信箱點擊驗證連結後再回來登入。
          </p>
          <Button className="mt-6 w-full" onClick={() => { setSignUpSuccess(false); setMode('login') }}>
            返回登入
          </Button>
        </div>
      </div>
    )
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signInWithEmail(email.trim(), password)
        navigate(redirectTo, { replace: true })
      } else {
        if (!displayName.trim()) {
          setError('請輸入顯示名稱')
          setSubmitting(false)
          return
        }
        await signUpWithEmail(email.trim(), password, displayName.trim())
        if (session) {
          navigate(redirectTo, { replace: true })
        } else {
          setSignUpSuccess(true)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'))
    setError(null)
  }

  const onGoogle = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google 登入失敗')
    }
  }

  return (
    <div className="min-h-dvh bg-morandi-cream safe-top safe-bottom">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-6">
        <div className="mb-8 overflow-hidden rounded-2xl bg-morandi-rose shadow-[0_12px_40px_rgba(201,177,161,0.35)]">
          <div className="px-6 py-10 text-center text-white">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <svg viewBox="0 0 32 32" className="size-9" fill="none" aria-hidden>
                <rect x="6" y="8" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
                <path d="M10 14h12M10 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold tracking-wide">分帳記帳</h1>
            <p className="mt-2 text-sm text-white/85">與朋友輕鬆分攤、清楚結算</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="mb-6 flex rounded-xl bg-morandi-cream p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError(null)
              }}
              className={[
                'flex-1 rounded-lg py-2.5 text-sm font-medium transition',
                mode === 'login' ? 'bg-white text-morandi-deep shadow-sm' : 'text-morandi-stone',
              ].join(' ')}
            >
              登入
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register')
                setError(null)
              }}
              className={[
                'flex-1 rounded-lg py-2.5 text-sm font-medium transition',
                mode === 'register' ? 'bg-white text-morandi-deep shadow-sm' : 'text-morandi-stone',
              ].join(' ')}
            >
              註冊
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === 'register' ? (
              <Input
                label="顯示名稱"
                type="text"
                value={displayName}
                onChange={setDisplayName}
                placeholder="例如：小桑"
                autoComplete="name"
              />
            ) : null}
            <Input
              label="電子郵件"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Input
              label="密碼"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            {error ? (
              <p className="rounded-lg bg-morandi-error/15 px-3 py-2 text-sm text-morandi-error" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              {mode === 'login' ? '登入' : '建立帳號'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-morandi-warm" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-morandi-stone">或使用</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="lg"
            onClick={onGoogle}
          >
            <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            以 Google 帳號繼續
          </Button>

          <p className="mt-6 text-center text-sm text-morandi-stone">
            {mode === 'login' ? '還沒有帳號？' : '已有帳號？'}
            <button
              type="button"
              onClick={toggleMode}
              className="ml-1 font-medium text-morandi-rose underline-offset-2 hover:underline"
            >
              {mode === 'login' ? '改為註冊' : '改為登入'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
