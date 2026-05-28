import { cn } from '@/lib/utils'
import { roundDisplay } from '@/lib/format'
import { getAttendancePunchStatus } from '@/lib/attendancePunch'
import { PunchIssueBadge } from '@/components/attendance/PunchIssueBadge'
import {
  dashboardAbsenceCellClass,
  getMarkCellClass,
  type DashboardCellMark,
} from '@/lib/dashboardCellMarks'
import {
  dashboardFutureCellClass,
  dashboardInactiveCellClass,
  isAttendanceRowActive,
  isDayAbsent,
  isExcusedMark,
  isFutureWorkDay,
  isTodayWorkDay,
} from '@/lib/dashboardDayCell'
import { numNeutral } from '@/lib/tableUi'
import type { Attendance } from '@/types'

type Props = {
  rowDate: Date
  att?: Attendance | null
  mark?: DashboardCellMark | null
  isWedNight: boolean
  isFriday: boolean
  fridayAttendanceEnabled: boolean
}

export function DashboardGridCellContent({
  rowDate,
  att,
  mark,
  isWedNight,
  isFriday,
  fridayAttendanceEnabled,
}: Props) {
  const rowActive = isAttendanceRowActive(isWedNight, isFriday, fridayAttendanceEnabled)
  const future = isFutureWorkDay(rowDate)
  const today = isTodayWorkDay(rowDate)
  const punchStatus = getAttendancePunchStatus(att)
  const absent = isDayAbsent({
    rowDate,
    att,
    isWedNight,
    isFriday,
    fridayAttendanceEnabled,
    mark,
  })

  if (att?.is_carried_over && att.daily_wage != null && att.daily_wage > 0) {
    return (
      <div className="flex flex-col items-center gap-0.5 leading-tight">
        <span className="rounded-md bg-amber-200/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 ring-1 ring-inset ring-amber-400/80">
          مُرحّل
        </span>
        <span className={numNeutral}>{roundDisplay(att.daily_wage)}</span>
      </div>
    )
  }

  if (mark?.type === 'custom') {
    return (
      <span
        className={cn(
          'inline-block max-w-full truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-snug ring-1 ring-inset',
          getMarkCellClass(mark.colorId)
        )}
      >
        {mark.text}
      </span>
    )
  }

  if (absent) {
    return (
      <span className={dashboardAbsenceCellClass} aria-label="غياب">
        غياب
      </span>
    )
  }

  if (punchStatus === 'missing_check_out') {
    return <PunchIssueBadge status="missing_check_out" />
  }

  if (punchStatus === 'missing_check_in') {
    return <PunchIssueBadge status="missing_check_in" />
  }

  if (punchStatus === 'complete' && att?.daily_wage != null) {
    return <span className={numNeutral}>{roundDisplay(att.daily_wage)}</span>
  }

  if (!rowActive || isExcusedMark(mark)) {
    return <span className={dashboardInactiveCellClass} aria-hidden />
  }

  if (future || (today && punchStatus === 'none')) {
    return (
      <span
        className={dashboardFutureCellClass}
        aria-label={today ? 'اليوم — لم تُسجَّل بصمة بعد' : 'يوم لم يحن بعد'}
        title={
          today
            ? 'اليوم — لا يُحسب غياب حتى انتهاء اليوم'
            : 'يوم لم يحن بعد — لم يُحسب غياب'
        }
      />
    )
  }

  return <span className={dashboardInactiveCellClass} aria-hidden />
}
