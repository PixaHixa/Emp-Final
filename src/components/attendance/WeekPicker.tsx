import { useId } from 'react'
import { formatDateEn } from '@/lib/format'
import { getWeekEnd, getWeekStart } from '@/lib/weekUtils'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, format, parse, subDays } from 'date-fns'

type WeekPickerProps = {
  value: Date
  onChange: (weekStart: Date) => void
  className?: string
}

export function WeekPicker({ value, onChange, className }: WeekPickerProps) {
  const weekStart = getWeekStart(value)
  const weekEnd = getWeekEnd(value)
  const id = useId()

  return (
    <div
      className={`flex w-full max-w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center ${className ?? ''}`}
      dir="rtl"
    >
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-app-card p-2.5 text-[var(--color-accent-blue)] shadow-sm transition-colors touch-manipulation hover:border-[var(--color-accent-blue)]/40 hover:bg-[var(--color-bg-surface)]"
        aria-label="الأسبوع السابق"
        onClick={() => onChange(subDays(weekStart, 7))}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <label
        htmlFor={id}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-app-card px-3 py-2.5 text-sm text-[var(--color-text-primary)] shadow-sm transition-colors hover:border-[var(--color-accent-blue)]/35 hover:bg-[var(--color-bg-surface)] sm:flex-initial sm:px-4"
      >
        <Calendar className="h-4 w-4 text-[var(--color-accent-blue)]" />
        <span className="font-mono-nums font-semibold text-[var(--color-text-primary)]" dir="ltr">
          {formatDateEn(weekStart)} — {formatDateEn(weekEnd)}
        </span>
        <input
          id={id}
          type="date"
          className="sr-only"
          value={format(weekStart, 'yyyy-MM-dd')}
          onChange={(e) => {
            if (!e.target.value) return
            const parsed = parse(e.target.value, 'yyyy-MM-dd', new Date())
            onChange(getWeekStart(parsed))
          }}
        />
      </label>
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-app-card p-2.5 text-[var(--color-accent-blue)] shadow-sm transition-colors touch-manipulation hover:border-[var(--color-accent-blue)]/40 hover:bg-[var(--color-bg-surface)]"
        aria-label="الأسبوع التالي"
        onClick={() => onChange(addDays(weekStart, 7))}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
    </div>
  )
}
