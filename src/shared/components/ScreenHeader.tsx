import type { ReactNode } from 'react'

interface ScreenHeaderProps {
  title: string
  subtitle: string
  action?: ReactNode
}

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="font-display text-2xl font-bold text-white">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-muted">{subtitle}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
