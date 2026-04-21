import { useEffect, useState, type ReactNode } from 'react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  actions?: ReactNode
}

export default function Modal({ isOpen, onClose, title, children, actions }: ModalProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
    const t = window.setTimeout(() => setMounted(false), 200)
    return () => window.clearTimeout(t)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!mounted) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="關閉對話框"
        className={[
          'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={[
          'relative z-10 w-full max-w-md rounded-xl bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
          'transition-all duration-200 ease-out',
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          {title ? (
            <h2 id="modal-title" className="text-lg font-semibold text-morandi-deep">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-morandi-stone transition hover:bg-morandi-cream hover:text-morandi-deep"
          >
            關閉
          </button>
        </div>
        <div className="text-morandi-deep">{children}</div>
        {actions ? <div className="mt-4 flex flex-wrap justify-end gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
