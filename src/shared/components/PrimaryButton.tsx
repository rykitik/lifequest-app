import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'primary' | 'secondary' | 'ghost' | 'warning'
  fullWidth?: boolean
  icon?: ReactNode
}

const toneClasses = {
  primary:
    'bg-gradient-to-r from-primary via-indigo-500 to-cyan text-white shadow-glow hover:brightness-110',
  secondary:
    'border border-white/10 bg-white/5 text-text hover:border-primary/40 hover:bg-white/10',
  ghost:
    'border border-white/10 bg-transparent text-muted hover:border-white/20 hover:bg-white/5 hover:text-text',
  warning:
    'border border-warning/30 bg-warning/10 text-warning hover:bg-warning/15',
}

export function PrimaryButton({
  tone = 'primary',
  fullWidth = false,
  icon,
  className,
  children,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        toneClasses[tone],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}
