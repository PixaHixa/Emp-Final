import { isAfter, isSameDay, startOfDay } from 'date-fns'
import { hasAnyPunchActivity } from '@/lib/attendancePunch'
import { isAbsenceMark, type DashboardCellMark } from '@/lib/dashboardCellMarks'
import type { Attendance } from '@/types'

/** يوم لم يأتِ بعد (بعد اليوم الحالي) */
export function isFutureWorkDay(rowDate: Date, today = startOfDay(new Date())): boolean {
  return isAfter(startOfDay(rowDate), today)
}

export function isTodayWorkDay(rowDate: Date, today = startOfDay(new Date())): boolean {
  return isSameDay(startOfDay(rowDate), today)
}

export function isAttendanceRowActive(
  isWedNight: boolean,
  isFriday: boolean,
  fridayAttendanceEnabled: boolean
): boolean {
  if (isWedNight) return false
  if (isFriday && !fridayAttendanceEnabled) return false
  return true
}

export function isExcusedMark(mark: DashboardCellMark | undefined | null): boolean {
  return mark?.type === 'excused'
}

/**
 * غياب تلقائي: أيام ماضية فقط، بدون أي بصمة.
 * اليوم الحالي: لا غياب حتى ينتهي اليوم (بصمة حضور فقط = «مغادرة» وليس غياب).
 */
export function shouldShowAutoAbsence(params: {
  rowDate: Date
  att?: Attendance | null
  isWedNight: boolean
  isFriday: boolean
  fridayAttendanceEnabled: boolean
  mark?: DashboardCellMark | null
}): boolean {
  const { rowDate, att, isWedNight, isFriday, fridayAttendanceEnabled, mark } = params
  if (hasAnyPunchActivity(att) || mark) return false
  if (!isAttendanceRowActive(isWedNight, isFriday, fridayAttendanceEnabled)) return false
  if (isFutureWorkDay(rowDate)) return false
  if (isTodayWorkDay(rowDate)) return false
  return true
}

export const dashboardFutureCellClass =
  'inline-block min-h-[1.75rem] min-w-[3.25rem] rounded-md border border-dashed border-slate-200 bg-slate-50/70'

export const dashboardInactiveCellClass = 'inline-block min-h-[1.75rem] min-w-[3.25rem]'

/** غياب يدوي أو تلقائي (مشترك بين لوحة التحكم وصفحة الدوام) */
export function isDayAbsent(params: {
  rowDate: Date
  att?: Attendance | null
  isWedNight: boolean
  isFriday: boolean
  fridayAttendanceEnabled: boolean
  mark?: DashboardCellMark | null
}): boolean {
  if (params.mark?.type === 'custom') return false
  if (hasAnyPunchActivity(params.att)) return false
  if (isAbsenceMark(params.mark)) return true
  return shouldShowAutoAbsence(params)
}
