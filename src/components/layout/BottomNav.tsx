import { useState } from 'react'
import { useLocation, useMatch, useNavigate } from 'react-router-dom'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00-.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82 1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const notebookMatch = useMatch('/notebook/:id')
  const notebookId = notebookMatch?.params.id

  const [addHintOpen, setAddHintOpen] = useState(false)

  const isHome = location.pathname === '/'
  const isSettings = location.pathname === '/settings'

  const navItemClass = (active: boolean) =>
    [
      'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition',
      active ? 'text-morandi-rose' : 'text-morandi-stone',
    ].join(' ')

  const handleAddClick = () => {
    if (notebookId) {
      navigate(`/notebook/${notebookId}/add`)
      return
    }
    setAddHintOpen(true)
  }

  return (
    <>
      <nav
        className={[
          'fixed bottom-0 left-0 right-0 z-50 border-t border-morandi-warm bg-white safe-bottom',
          'h-16',
        ].join(' ')}
        aria-label="主要導覽"
      >
        <div className="mx-auto flex h-16 max-w-lg items-end justify-between px-2">
          <button type="button" className={navItemClass(isHome)} onClick={() => navigate('/')}>
            <IconHome className="size-6" />
            <span>帳簿</span>
          </button>

          <div className="relative flex flex-1 flex-col items-center">
            <button
              type="button"
              onClick={handleAddClick}
              className={[
                'absolute -top-7 flex size-14 items-center justify-center rounded-full',
                'bg-morandi-rose text-white shadow-[0_6px_20px_rgba(201,177,161,0.55)]',
                'transition active:scale-95',
              ].join(' ')}
              aria-label="新增支出"
            >
              <IconPlus className="size-7" />
            </button>
            <span className="pb-2 text-xs font-medium text-morandi-stone">新增</span>
          </div>

          <button
            type="button"
            className={navItemClass(isSettings)}
            onClick={() => navigate('/settings')}
          >
            <IconSettings className="size-6" />
            <span>設定</span>
          </button>
        </div>
      </nav>

      <Modal
        isOpen={addHintOpen}
        onClose={() => setAddHintOpen(false)}
        title="新增支出"
        actions={
          <Button variant="primary" onClick={() => setAddHintOpen(false)}>
            知道了
          </Button>
        }
      >
        <p className="text-sm leading-relaxed text-morandi-stone">
          請先從「帳簿」進入一個記帳本，即可在此新增支出。
        </p>
      </Modal>
    </>
  )
}
