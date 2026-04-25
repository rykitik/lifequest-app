import { cn } from '@/shared/lib/cn'

interface LinearProgressProps {
  value: number
  className?: string
  barClassName?: string
}

export function LinearProgress({ value, className, barClassName }: LinearProgressProps) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-white/8', className)}>
      <div
        className={cn(
          'h-full rounded-full bg-gradient-to-r from-primary via-indigo-400 to-cyan transition-[width] duration-300',
          barClassName,
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}
