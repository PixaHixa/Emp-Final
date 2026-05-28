import { formatTime12From24 } from '@/lib/timeFormat'
import { getAttendancePunchStatus, isMeaningfulPunchTime } from '@/lib/attendancePunch'
import type { Attendance } from '@/types'
import { PunchIssueBadge } from '@/components/attendance/PunchIssueBadge'

type Props = {
  att: Attendance
  className?: string
}

/** عرض أوقات البصمة مع تنبيه «حضور» أو «مغادرة» الناقص */
export function AttendancePunchDisplay({ att, className }: Props) {
  const status = getAttendancePunchStatus(att)

  if (status === 'missing_check_out') {
    return (
      <span dir="rtl" className={className}>
        <span dir="ltr" className="font-mono-nums text-slate-900">
          {formatTime12From24(att.check_in)}
        </span>
        <span className="mx-1 shrink-0 text-slate-400">—</span>
        <PunchIssueBadge status="missing_check_out" />
      </span>
    )
  }

  if (status === 'missing_check_in') {
    return (
      <span dir="rtl" className={className}>
        <PunchIssueBadge status="missing_check_in" />
        <span className="mx-1 shrink-0 text-slate-400">—</span>
        <span dir="ltr" className="font-mono-nums text-slate-900">
          {formatTime12From24(att.check_out)}
        </span>
      </span>
    )
  }

  return (
    <span
      dir="rtl"
      className={
        className ??
        'inline-flex min-w-0 max-w-full items-center justify-end gap-1 truncate font-mono-nums text-slate-900'
      }
    >
      <span dir="ltr" className="truncate">
        {isMeaningfulPunchTime(att.check_in) ? formatTime12From24(att.check_in) : '—'}
      </span>
      <span className="shrink-0 text-slate-400" dir="ltr">
        —
      </span>
      <span dir="ltr" className="truncate">
        {isMeaningfulPunchTime(att.check_out) ? formatTime12From24(att.check_out) : '—'}
      </span>
    </span>
  )
}
