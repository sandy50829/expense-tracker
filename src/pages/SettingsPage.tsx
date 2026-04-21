import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import PageContainer from '../components/layout/PageContainer'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const APP_VERSION = '1.0.0'

export default function SettingsPage() {
  const { profile, loading, updateProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name ?? '')
    setAvatarUrl(profile.avatar_url ?? '')
  }, [profile])

  const onSaveProfile = async () => {
    setError(null)
    setMessage(null)
    setSaving(true)
    try {
      await updateProfile({
        display_name: displayName.trim() || profile?.display_name || '使用者',
        avatar_url: avatarUrl.trim() || null,
      })
      setMessage('已儲存個人資料')
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const onSignOut = async () => {
    setError(null)
    setSigningOut(true)
    try {
      await signOut()
    } catch (err) {
      setError(err instanceof Error ? err.message : '登出失敗')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <PageContainer header={<Header title="設定" />} showBottomNav>
      {loading && !profile ? (
        <div className="flex min-h-[40vh] items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold text-morandi-deep">個人檔案</h2>
            <p className="mt-1 text-xs text-morandi-stone">更新顯示名稱與頭像網址。</p>
            <div className="mt-4 space-y-4">
              <Input label="顯示名稱" type="text" value={displayName} onChange={setDisplayName} />
              <Input
                label="頭像網址（選填）"
                type="text"
                value={avatarUrl}
                onChange={setAvatarUrl}
                placeholder="https://…"
              />
            </div>
            {message ? (
              <p className="mt-3 text-sm text-morandi-sage-dark" role="status">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 text-sm text-morandi-error" role="alert">
                {error}
              </p>
            ) : null}
            <Button className="mt-4 w-full" loading={saving} onClick={() => void onSaveProfile()}>
              儲存變更
            </Button>
          </Card>

          <Card className="border border-morandi-warm/80">
            <Button
              variant="danger"
              className="w-full"
              loading={signingOut}
              onClick={() => void onSignOut()}
            >
              登出
            </Button>
          </Card>

          <div className="pb-6 text-center text-xs text-morandi-stone">
            <p>分帳記帳 PWA</p>
            <p className="mt-1">版本 {APP_VERSION}</p>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
