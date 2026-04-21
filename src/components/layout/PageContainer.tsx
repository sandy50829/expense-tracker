import type { ReactNode } from 'react'
import BottomNav from './BottomNav'

export interface PageContainerProps {
  children: ReactNode
  header?: ReactNode
  showBottomNav?: boolean
}

const HEADER_OFFSET = 'calc(3.5rem + env(safe-area-inset-top))'
const NAV_OFFSET = 'calc(4rem + env(safe-area-inset-bottom))'

export default function PageContainer({
  children,
  header,
  showBottomNav = true,
}: PageContainerProps) {
  return (
    <div
      className="min-h-dvh bg-morandi-cream"
      style={{
        paddingTop: header ? HEADER_OFFSET : undefined,
        paddingBottom: showBottomNav ? NAV_OFFSET : undefined,
      }}
    >
      {header}
      <div className="mx-auto w-full max-w-lg px-4 py-4">{children}</div>
      {showBottomNav ? <BottomNav /> : null}
    </div>
  )
}
