import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-morandi-sage text-white',
  error: 'bg-morandi-error text-white',
  info: 'bg-morandi-info text-white',
  warning: 'bg-morandi-warning text-morandi-deep',
}

export interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, number>>(new Map())

  const remove = useCallback((id: string) => {
    const t = timers.current.get(id)
    if (t) window.clearTimeout(t)
    timers.current.delete(id)
    setItems((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = makeId()
    setItems((prev) => [...prev, { id, message, type }])
    const tid = window.setTimeout(() => remove(id), 3000)
    timers.current.set(id, tid)
  }, [remove])

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t))
      timers.current.clear()
    }
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer items={items} onDismiss={remove} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast 必須在 ToastProvider 內使用')
  }
  return ctx
}

export interface ToastContainerProps {
  items: ToastItem[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ items, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-[100] flex flex-col items-center gap-2 p-4"
      aria-live="polite"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={[
            'pointer-events-auto w-full max-w-sm rounded-xl px-4 py-3 text-sm shadow-lg',
            'animate-[toastIn_0.25s_ease-out]',
            typeStyles[item.type],
          ].join(' ')}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="flex-1 leading-snug">{item.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="shrink-0 rounded-lg px-1 text-xs opacity-80 hover:opacity-100"
              aria-label="關閉通知"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
