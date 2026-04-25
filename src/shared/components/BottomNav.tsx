import type { LucideIcon } from 'lucide-react'
import { HeartPulse, House, Map, Sparkles, Wallet } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { to: '/today', label: 'Сегодня', icon: House },
  { to: '/plan', label: 'План', icon: Map },
  { to: '/body', label: 'Тело', icon: HeartPulse },
  { to: '/money', label: 'Деньги', icon: Wallet },
  { to: '/core', label: 'Ядро', icon: Sparkles },
]

export function BottomNav() {
  return (
    <nav className="glass-card-strong rounded-[2rem] px-3 py-2 shadow-shell">
      <ul className="grid grid-cols-5 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[4.25rem] flex-col items-center justify-center gap-2 rounded-2xl px-1 text-[11px] font-medium transition',
                    isActive
                      ? 'bg-primary/20 text-white shadow-glow'
                      : 'text-muted hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <Icon className="h-5 w-5" strokeWidth={1.9} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
