import { useMemo } from 'react'
import { formatDateEn, roundDisplay } from '@/lib/format'
import {
  computeWednesdayCloseTotalWage,
  WEDNESDAY_PAYROLL_CLOSE_TIME,
} from '@/lib/wednesdayCloseHours'
import { getRowDateForWeekRow } from '@/lib/weekUtils'
import type { Attendance, Employee } from '@/types'

type Props = {
  employee: Employee
  weekStart: Date
  weekStartStr: string
  rows: Attendance[]
  fridayAttendanceEnabled: boolean
}

export function AttendanceWednesdayCloseSummary({
  employee,
  weekStart,
  weekStartStr,
  rows,
  fridayAttendanceEnabled,
}: Props) {
  const wednesdayDate = formatDateEn(getRowDateForWeekRow(weekStart, 'الأربعاء'))

  const { totalWage, wednesdayWage, wednesdayCarryOverWage } = useMemo(
    () =>
      computeWednesdayCloseTotalWage(
        employee,
        weekStart,
        weekStartStr,
        rows,
        fridayAttendanceEnabled
      ),
    [employee, weekStart, weekStartStr, rows, fridayAttendanceEnabled]
  )

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-4 text-right shadow-sm sm:px-5">
      <h3 className="text-base font-bold text-indigo-950">إغلاق الأربعاء</h3>
      <p className="mt-1 text-xs leading-relaxed text-indigo-900/80">
        مجموع عمود «الراتب» (يشمل سهرة الأربعاء المُرحّلة)، + يوم الأربعاء{' '}
        <span className="font-mono-nums" dir="ltr">
          {wednesdayDate}
        </span>{' '}
        من وقت الحضور حتى{' '}
        <span className="font-mono-nums font-semibold" dir="ltr">
          {WEDNESDAY_PAYROLL_CLOSE_TIME}
        </span>{' '}
        (أو وقت المغادرة إن كان أبكر). للعرض فقط — لا يغيّر البصمة.
      </p>

      <table className="mt-4 w-full text-sm" dir="rtl">
        <tbody>
          {wednesdayCarryOverWage > 0 ? (
            <tr className="border-b border-indigo-200/60">
              <td className="py-2.5 text-indigo-900">سهرة الأربعاء (مُرحّل)</td>
              <td className="py-2.5 text-end font-mono-nums font-semibold text-slate-900">
                د.أ {roundDisplay(wednesdayCarryOverWage)}
              </td>
            </tr>
          ) : null}
          <tr className="border-b border-indigo-200/60">
            <td className="py-2.5 text-indigo-900">راتب الأربعاء (حتى 6 مساءً)</td>
            <td className="py-2.5 text-end font-mono-nums font-semibold text-slate-900">
              د.أ {roundDisplay(wednesdayWage)}
            </td>
          </tr>
          <tr>
            <td className="py-2.5 text-base font-bold text-indigo-950">
              المجموع (خميس — أربعاء)
            </td>
            <td className="py-2.5 text-end font-mono-nums text-lg font-bold text-indigo-950">
              د.أ {roundDisplay(totalWage)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
