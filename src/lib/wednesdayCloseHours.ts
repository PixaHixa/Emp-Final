import { calculateDailyWage, getWednesdayCarryOver } from '@/lib/calculations'
import { isMeaningfulPunchTime } from '@/lib/attendancePunch'
import { fromDbTime } from '@/lib/timeFormat'
import { findAttendanceCell } from '@/lib/attendanceLookup'
import { getRowDateForWeekRow, type WeekDayLabel } from '@/lib/weekUtils'
import { toYmd } from '@/lib/format'
import type { Attendance, Employee } from '@/types'

/** إغلاق الرواتب — يوم الأربعاء الساعة 6 مساءً */
export const WEDNESDAY_PAYROLL_CLOSE_TIME = '18:00'

/** أيام الأسبوع المشمولة بإغلاق الأربعاء (بما فيها سهرة الأربعاء المُرحّلة) */
export const WEEK_ROWS_THROUGH_WEDNESDAY: WeekDayLabel[] = [
  'الخميس',
  'سهرة الأربعاء',
  'الجمعة',
  'السبت',
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
]

function parseMinutes(time24: string): number {
  const [h, m] = time24.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** مغادرة فعلية للحساب: إن وُجدت قبل 6 م تُستخدم، وإلا حتى 6 م */
function wednesdayCloseCheckOut24(checkOut: string | null): string {
  const capMin = parseMinutes(WEDNESDAY_PAYROLL_CLOSE_TIME)
  if (!isMeaningfulPunchTime(checkOut)) return WEDNESDAY_PAYROLL_CLOSE_TIME
  const outMin = parseMinutes(fromDbTime(checkOut))
  if (outMin <= capMin) return fromDbTime(checkOut)
  return WEDNESDAY_PAYROLL_CLOSE_TIME
}

/** راتب يوم الأربعاء (عمود الراتب) من الحضور حتى 6 م أو المغادرة الفعلية إن كانت أبكر */
function wednesdayCloseDayWage(att: Attendance, employee: Employee): number {
  if (!isMeaningfulPunchTime(att.check_in)) return 0
  const calc = calculateDailyWage({
    checkIn: fromDbTime(att.check_in),
    checkOut: wednesdayCloseCheckOut24(att.check_out),
    hourlyRate: employee.hourly_rate,
    transportAllowance: employee.transport_allowance,
    dayOfWeek: 'الأربعاء',
  })
  const split = getWednesdayCarryOver({
    totalWage: calc.dailyWage,
    hourlyRate: employee.hourly_rate,
    transportAllowance: employee.transport_allowance,
  })
  return split.wednesdayWage
}

export type WednesdayCloseWage = {
  totalWage: number
  wednesdayWage: number
  wednesdayCarryOverWage: number
}

/**
 * مجموع عمود «الراتب» (خميس → ثلاثاء + سهرة الأربعاء المُرحّلة)،
 * + راتب الأربعاء محسوب من الحضور حتى 6 م (أو مغادرة أبكر).
 */
export function computeWednesdayCloseTotalWage(
  employee: Employee,
  weekStart: Date,
  weekStartStr: string,
  attendance: Attendance[],
  fridayAttendanceEnabled: boolean
): WednesdayCloseWage {
  let totalWage = 0
  let wednesdayWage = 0
  let wednesdayCarryOverWage = 0

  for (const rowLabel of WEEK_ROWS_THROUGH_WEDNESDAY) {
    if (rowLabel === 'الجمعة' && !fridayAttendanceEnabled) continue
    const rowDate = getRowDateForWeekRow(weekStart, rowLabel)
    const rowDateStr = toYmd(rowDate)
    const att = findAttendanceCell(attendance, employee.id, weekStartStr, rowLabel, rowDateStr)
    if (!att) continue

    if (rowLabel === 'سهرة الأربعاء') {
      const w = att.daily_wage ?? 0
      wednesdayCarryOverWage = w
      if (w > 0) totalWage += w
      continue
    }

    if (att.is_carried_over) continue

    if (rowLabel === 'الأربعاء') {
      wednesdayWage = wednesdayCloseDayWage(att, employee)
      totalWage += wednesdayWage
    } else if (att.daily_wage != null && att.daily_wage > 0) {
      totalWage += att.daily_wage
    }
  }

  return { totalWage, wednesdayWage, wednesdayCarryOverWage }
}
