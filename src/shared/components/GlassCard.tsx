import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'default' | 'strong'
}

export function GlassCard({
  tone = 'default',
  className,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        tone === 'strong' ? 'glass-card-strong' : 'glass-card',
        'rounded-3xl p-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
