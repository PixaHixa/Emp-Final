import { formatDateEn } from '@/lib/format'
import { getWeekEnd, getWeekStart } from '@/lib/weekUtils'
import { CalendarRange } from 'lucide-react'
import type { DateArg } from 'date-fns'

type HeaderProps = {
  weekReference: DateArg<Date>
}

export function Header({ weekReference }: HeaderProps) {
  const d = new Date(weekReference as Date)
  const start = getWeekStart(d)
  const end = getWeekEnd(d)

  return (
    <header className="flex min-h-16 min-w-0 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-app-card px-3 py-3 text-right shadow-sm sm:px-5 sm:py-3.5 md:px-6 lg:px-8">
      <h1 className="min-w-0 max-w-full text-base font-bold tracking-tight text-[var(--color-text-primary)] sm:text-lg">
        نظام إدارة رواتب الموظفين
      </h1>
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-[var(--color-text-secondary)]">
        <CalendarRange className="h-5 w-5 shrink-0 text-[var(--color-accent-blue)]" />
        <span
          className="min-w-0 text-center font-mono-nums text-sm text-[var(--color-text-primary)] max-[480px]:text-xs"
          dir="ltr"
        >
          {formatDateEn(start)} — {formatDateEn(end)}
        </span>
      </div>
    </header>
  )
}
