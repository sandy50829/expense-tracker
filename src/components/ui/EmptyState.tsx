import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-morandi-warm bg-white/60 px-6 py-12 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon ? <div className="mb-4 text-morandi-rose">{icon}</div> : null}
      <h3 className="text-base font-semibold text-morandi-deep">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-morandi-stone">{description}</p>
      ) : null}
      {action ? <div className="mt-6 w-full max-w-xs">{action}</div> : null}
    </div>
  )
}
