export interface LoadingSpinnerProps {
  label?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'size-6 border-2',
  md: 'size-10 border-[3px]',
  lg: 'size-14 border-4',
}

export default function LoadingSpinner({
  label = '載入中…',
  className = '',
  size = 'md',
}: LoadingSpinnerProps) {
  return (
    <div
      className={['flex flex-col items-center justify-center gap-3', className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className={[
          'shrink-0 animate-spin rounded-full border-morandi-rose border-t-transparent',
          sizeMap[size],
        ].join(' ')}
        aria-hidden
      />
      {label ? <span className="text-sm text-morandi-stone">{label}</span> : null}
    </div>
  )
}
