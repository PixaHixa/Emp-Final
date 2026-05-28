import { cn } from '@/lib/utils'
import { LayoutDashboard, Clock, Users, FileText } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { format } from 'date-fns'
import { getWeekEnd } from '@/lib/weekUtils'

const links = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
  { to: '/attendance', label: 'الدوام', icon: Clock, end: false },
  { to: '/employees', label: 'الموظفون', icon: Users, end: false },
  { to: '/reports', label: 'التقارير', icon: FileText, end: false },
] as const

type SidebarProps = {
  weekStart: Date
}

export function Sidebar({ weekStart }: SidebarProps) {
  const weekEnd = getWeekEnd(weekStart)
  const rangeLabel = `${format(weekStart, 'dd/MM')} — ${format(weekEnd, 'dd/MM')}`

  return (
    <aside
      className="flex w-full max-w-full shrink-0 flex-col border-t border-[var(--color-border)] bg-app-card shadow-sm lg:w-[min(17rem,100%)] lg:border-s lg:border-t-0"
      dir="rtl"
    >
      <nav className="flex max-lg:snap-x max-lg:snap-mandatory max-lg:flex-row max-lg:flex-nowrap max-lg:gap-2 max-lg:overflow-x-auto max-lg:overflow-y-hidden max-lg:px-3 max-lg:py-3 max-lg:[scrollbar-width:thin] lg:flex-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:p-5 lg:pt-8">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex shrink-0 flex-row-reverse items-center justify-end gap-3 rounded-xl px-4 py-3 text-right text-sm font-semibold transition-colors touch-manipulation max-lg:min-h-11 max-lg:snap-start max-lg:justify-center',
                isActive
                  ? 'bg-[var(--color-accent-blue-bg)] text-[var(--color-accent-blue)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="shrink-0 border-t border-[var(--color-border)] p-3 text-right text-sm text-[var(--color-text-secondary)] sm:p-4">
        <p className="text-xs text-[var(--color-text-muted)]">الأسبوع المعروض</p>
        <p className="mt-1 font-mono-nums font-semibold text-[var(--color-accent-blue)]" dir="ltr">
          {rangeLabel}
        </p>
      </div>
    </aside>
  )
}
