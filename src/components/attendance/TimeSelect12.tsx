import { to24Hour, parse24To12 } from '@/lib/timeFormat'

type TimeSelect12Props = {
  value24: string
  onChange: (hhmm24: string) => void
  label: string
}

const hours = Array.from({ length: 12 }, (_, i) => i + 1)
/** كل الدقائق — مطلوب لحسابات مثل 14:11 و 21:33 */
const minutes = Array.from({ length: 60 }, (_, i) => i)

export function TimeSelect12({ value24, onChange, label }: TimeSelect12Props) {
  const { hour12, minute, period } = parse24To12(value24 || '09:00')

  const set = (h12: number, m: number, p: 'AM' | 'PM') => {
    onChange(to24Hour(h12, m, p))
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-[var(--color-text-secondary)]">{label}</label>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center" dir="ltr">
        <select
          className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-app-card px-3 py-2 text-sm font-mono-nums text-[var(--color-text-primary)] shadow-sm outline-none transition-colors focus:border-[var(--color-accent-blue)] focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 sm:w-auto sm:min-w-[4.5rem]"
          value={hour12}
          onChange={(e) => set(Number(e.target.value), minute, period)}
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="hidden text-center text-[var(--color-text-muted)] sm:inline">:</span>
        <select
          className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-app-card px-3 py-2 text-sm font-mono-nums text-[var(--color-text-primary)] shadow-sm outline-none transition-colors focus:border-[var(--color-accent-blue)] focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 sm:w-auto sm:min-w-[4.5rem]"
          value={minute}
          onChange={(e) => set(hour12, Number(e.target.value), period)}
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m.toString().padStart(2, '0')}
            </option>
          ))}
        </select>
        <select
          className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-app-card px-3 py-2 text-sm font-mono-nums text-[var(--color-text-primary)] shadow-sm outline-none transition-colors focus:border-[var(--color-accent-blue)] focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 sm:w-auto sm:min-w-[5rem]"
          value={period}
          onChange={(e) => set(hour12, minute, e.target.value as 'AM' | 'PM')}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  )
}
