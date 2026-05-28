import type { Attendance } from '@/types'
import type { WeekDayLabel } from '@/lib/weekUtils'

export function findAttendanceCell(
  rows: Attendance[],
  employeeId: string,
  weekStartStr: string,
  rowLabel: WeekDayLabel,
  rowDateStr: string
): Attendance | undefined {
  const pool = rows.filter(
    (r) =>
      r.employee_id === employeeId &&
      r.week_start_date === weekStartStr &&
      r.date === rowDateStr
  )
  if (rowLabel === 'سهرة الأربعاء') {
    return pool.find((r) => r.is_carried_over)
  }
  return pool.find((r) => !r.is_carried_over)
}
