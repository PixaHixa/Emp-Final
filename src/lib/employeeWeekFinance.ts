import {
  calculateOvertimePay,
  splitDayHours,
  standardPayForDay,
} from '@/lib/calculations'
import { computeAdjustmentTotals, type WeekHourAdjustment } from '@/lib/hourAdjustments'
import { formatHoursAsHm } from '@/lib/format'
import type { Attendance, Employee } from '@/types'

export function getManualPay(f: EmployeeWeekFinance): number {
  return f.manualStandardPay + f.manualOvertimePay
}

/** وصف الساعات اليدوية للعرض تحت المبلغ */
export function formatManualHoursLabel(f: EmployeeWeekFinance): string {
  const parts: string[] = []
  if (f.manualStandardHours > 1e-6) {
    parts.push(`${formatHoursAsHm(f.manualStandardHours)} أساسي`)
  }
  if (f.manualOvertimeHours > 1e-6) {
    parts.push(`${formatHoursAsHm(f.manualOvertimeHours)} إضافي`)
  }
  return parts.join(' · ')
}

export type EmployeeWeekFinance = {
  employeeId: string
  /** من صفوف الدوام (بدون سهرة) */
  attendanceStandardHours: number
  attendanceStandardPay: number
  attendanceOvertimeHours: number
  attendanceOvertimePay: number
  /** صفوف سهرة / ترحيل */
  carriedPay: number
  /** إضافات يدوية */
  manualStandardHours: number
  manualStandardPay: number
  manualOvertimeHours: number
  manualOvertimePay: number
  /** مجاميع */
  totalStandardHours: number
  totalStandardPay: number
  totalOvertimeHours: number
  totalOvertimePay: number
  totalHours: number
  totalPay: number
  /** فرق بسيط إن وُجدت مواصلات أو تقريب */
  attendanceRowsPay: number
  workDaysCount: number
}

function breakdownAttendanceRow(att: Attendance, hourlyRate: number) {
  const hours = att.hours_worked ?? 0
  const { standardHours, overtimeHours } = splitDayHours(hours, att.day_of_week)
  const standardPay = standardPayForDay(standardHours, hourlyRate, att.day_of_week)
  const overtimePay =
    att.day_of_week === 'الجمعة' ? 0 : calculateOvertimePay(overtimeHours, hourlyRate)
  return { standardHours, standardPay, overtimeHours, overtimePay, hours }
}

export function computeEmployeeWeekFinance(
  employee: Employee,
  attendanceRows: Attendance[],
  adjustments: WeekHourAdjustment[],
): EmployeeWeekFinance {
  const rate = employee.hourly_rate
  const empRows = attendanceRows.filter((a) => a.employee_id === employee.id)

  let attendanceStandardHours = 0
  let attendanceStandardPay = 0
  let attendanceOvertimeHours = 0
  let attendanceOvertimePay = 0
  let carriedPay = 0
  let attendanceRowsPay = 0
  let workDaysCount = 0

  for (const att of empRows) {
    attendanceRowsPay += att.daily_wage ?? 0
    if (att.is_carried_over) {
      carriedPay += att.daily_wage ?? 0
      continue
    }
    if ((att.daily_wage ?? 0) > 0 || (att.hours_worked ?? 0) > 0) workDaysCount += 1
    const b = breakdownAttendanceRow(att, rate)
    attendanceStandardHours += b.standardHours
    attendanceStandardPay += b.standardPay
    attendanceOvertimeHours += b.overtimeHours
    attendanceOvertimePay += b.overtimePay
  }

  const empAdjustments = adjustments.filter((a) => a.employee_id === employee.id)
  const manual = computeAdjustmentTotals(empAdjustments, rate)

  const totalStandardHours = attendanceStandardHours + manual.standardHours
  const totalStandardPay = attendanceStandardPay + manual.standardPay
  const totalOvertimeHours = attendanceOvertimeHours + manual.overtimeHours
  const totalOvertimePay = attendanceOvertimePay + manual.overtimePay
  const totalHours = totalStandardHours + totalOvertimeHours
  const totalPay = attendanceRowsPay + manual.totalPay

  return {
    employeeId: employee.id,
    attendanceStandardHours,
    attendanceStandardPay,
    attendanceOvertimeHours,
    attendanceOvertimePay,
    carriedPay,
    manualStandardHours: manual.standardHours,
    manualStandardPay: manual.standardPay,
    manualOvertimeHours: manual.overtimeHours,
    manualOvertimePay: manual.overtimePay,
    totalStandardHours,
    totalStandardPay,
    totalOvertimeHours,
    totalOvertimePay,
    totalHours,
    totalPay,
    attendanceRowsPay,
    workDaysCount,
  }
}

export function computeWeekFinanceForAll(
  employees: Employee[],
  attendanceRows: Attendance[],
  adjustments: WeekHourAdjustment[],
): EmployeeWeekFinance[] {
  return employees.map((e) => computeEmployeeWeekFinance(e, attendanceRows, adjustments))
}

export function sumWeekFinance(rows: EmployeeWeekFinance[]) {
  return rows.reduce(
    (acc, r) => ({
      attendanceStandardHours: acc.attendanceStandardHours + r.attendanceStandardHours,
      attendanceStandardPay: acc.attendanceStandardPay + r.attendanceStandardPay,
      attendanceOvertimeHours: acc.attendanceOvertimeHours + r.attendanceOvertimeHours,
      attendanceOvertimePay: acc.attendanceOvertimePay + r.attendanceOvertimePay,
      carriedPay: acc.carriedPay + r.carriedPay,
      manualStandardHours: acc.manualStandardHours + r.manualStandardHours,
      manualStandardPay: acc.manualStandardPay + r.manualStandardPay,
      manualOvertimeHours: acc.manualOvertimeHours + r.manualOvertimeHours,
      manualOvertimePay: acc.manualOvertimePay + r.manualOvertimePay,
      totalStandardHours: acc.totalStandardHours + r.totalStandardHours,
      totalStandardPay: acc.totalStandardPay + r.totalStandardPay,
      totalOvertimeHours: acc.totalOvertimeHours + r.totalOvertimeHours,
      totalOvertimePay: acc.totalOvertimePay + r.totalOvertimePay,
      totalHours: acc.totalHours + r.totalHours,
      totalPay: acc.totalPay + r.totalPay,
      attendanceRowsPay: acc.attendanceRowsPay + r.attendanceRowsPay,
      workDaysCount: acc.workDaysCount + r.workDaysCount,
    }),
    {
      attendanceStandardHours: 0,
      attendanceStandardPay: 0,
      attendanceOvertimeHours: 0,
      attendanceOvertimePay: 0,
      carriedPay: 0,
      manualStandardHours: 0,
      manualStandardPay: 0,
      manualOvertimeHours: 0,
      manualOvertimePay: 0,
      totalStandardHours: 0,
      totalStandardPay: 0,
      totalOvertimeHours: 0,
      totalOvertimePay: 0,
      totalHours: 0,
      totalPay: 0,
      attendanceRowsPay: 0,
      workDaysCount: 0,
    },
  )
}
