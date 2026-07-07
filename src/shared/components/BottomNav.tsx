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
    <nav className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#070d1d]/82 px-2.5 py-2 shadow-shell backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan/45 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.16),transparent_48%)]" />
      <ul className="relative grid grid-cols-5 gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 text-[11px] font-medium transition',
                    isActive
                      ? 'border border-primary/30 bg-primary/16 text-white shadow-[0_0_24px_rgba(99,102,241,0.22),inset_0_1px_0_rgba(255,255,255,0.06)]'
                      : 'border border-transparent text-muted hover:border-white/10 hover:bg-white/5 hover:text-white',
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
