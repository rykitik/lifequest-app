import type { ReactNode } from 'react'

interface ScreenHeaderProps {
  title: string
  subtitle: string
  action?: ReactNode
}

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <p className="font-display text-xl font-bold leading-tight text-white">{title}</p>
        <p className="mt-1 max-w-xs text-[13px] leading-5 text-muted">{subtitle}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
