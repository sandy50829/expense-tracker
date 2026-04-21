import type { ReactNode } from 'react'

export interface HeaderProps {
  title: string
  leftAction?: ReactNode
  rightAction?: ReactNode
}

export default function Header({ title, leftAction, rightAction }: HeaderProps) {
  return (
    <header
      className={[
        'fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between gap-2',
        'border-b border-morandi-warm/60 bg-white/80 px-3 backdrop-blur-md safe-top',
      ].join(' ')}
    >
      <div className="flex min-w-10 shrink-0 items-center justify-start">{leftAction}</div>
      <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold text-morandi-deep">
        {title}
      </h1>
      <div className="flex min-w-10 shrink-0 items-center justify-end">{rightAction}</div>
    </header>
  )
}
