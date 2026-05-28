import { useMemo } from 'react'
import { WEEK_ORDER, getRowDateForWeekRow, type WeekDayLabel } from '@/lib/weekUtils'
import { formatDateEn, formatHoursAsHm, roundDisplay, toYmd } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type { Attendance, Employee } from '@/types'
import { cn } from '@/lib/utils'
import { AttendancePunchDisplay } from '@/components/attendance/AttendancePunchDisplay'
import { AttendanceWednesdayCloseSummary } from '@/components/attendance/AttendanceWednesdayCloseSummary'
import { findAttendanceCell } from '@/lib/attendanceLookup'
import { useFridayAttendance } from '@/contexts/FridayAttendanceContext'
import { useCellMarks } from '@/contexts/CellMarksContext'
import { dashboardAbsenceCellClass, dashboardMarkKey } from '@/lib/dashboardCellMarks'
import { isAttendanceRowActive, isDayAbsent } from '@/lib/dashboardDayCell'
import {
  calculateOvertimePay,
  splitDayHours,
  standardPayForDay,
} from '@/lib/calculations'
import type { WeekHourAdjustment } from '@/lib/hourAdjustments'
import { computeEmployeeWeekFinance } from '@/lib/employeeWeekFinance'
import {
  numNeutral,
  tableBaseClass,
  tableCellLast,
  tableHeadCell,
  tableHeadSticky,
  tableRowCell,
  tableRowGroup,
  tableShellClass,
} from '@/lib/tableUi'

type AttendanceTableProps = {
  employee: Employee
  weekStart: Date
  rows: Attendance[]
  hourAdjustments: WeekHourAdjustment[]
  onAdd: (rowLabel: WeekDayLabel, rowDate: Date) => void
  onEdit: (rowLabel: WeekDayLabel, rowDate: Date, att: Attendance) => void
  onDeleteRow: (att: Attendance) => void
}

function dayBreakdown(att: Attendance, hourlyRate: number) {
  const hours = att.hours_worked ?? 0
  const { standardHours, overtimeHours } = splitDayHours(hours, att.day_of_week)
  const standardPay = standardPayForDay(standardHours, hourlyRate, att.day_of_week)
  const overtimePay =
    att.day_of_week === 'الجمعة' ? 0 : calculateOvertimePay(overtimeHours, hourlyRate)
  return { standardHours, standardPay, overtimeHours, overtimePay }
}

function HoursMoneyCell({
  hours,
  amount,
}: {
  hours: number
  amount: number
}) {
  if (hours <= 0 && amount <= 0) {
    return <span className="text-slate-400">—</span>
  }
  return (
    <div className="flex flex-col items-center gap-0.5 leading-tight">
      <span className={cn(numNeutral, 'text-[11px]')} dir="ltr">
        {formatHoursAsHm(hours)}
      </span>
      {amount > 0 ? (
        <span className="font-mono-nums text-[10px] font-medium text-slate-600">
          د.أ {roundDisplay(amount)}
        </span>
      ) : null}
    </div>
  )
}

export function AttendanceTable({
  employee,
  weekStart,
  rows,
  hourAdjustments,
  onAdd,
  onEdit,
  onDeleteRow,
}: AttendanceTableProps) {
  const { fridayAttendanceEnabled } = useFridayAttendance()
  const { marks, setMark } = useCellMarks()
  const wsStr = toYmd(weekStart)
  const rate = employee.hourly_rate

  const weekTotals = useMemo(() => {
    const f = computeEmployeeWeekFinance(employee, rows, hourAdjustments)
    return {
      standardHours: f.totalStandardHours,
      standardPay: f.totalStandardPay,
      overtimeHours: f.totalOvertimeHours,
      overtimePay: f.totalOvertimePay,
      totalWage: f.totalPay,
      carriedAmount: f.carriedPay,
      manualPay: f.manualStandardPay + f.manualOvertimePay,
    }
  }, [employee, rows, hourAdjustments])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-right sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-slate-600">مجموع العمل الأساسي</p>
          <p className="mt-1 font-mono-nums text-lg font-semibold text-slate-900" dir="ltr">
            {formatHoursAsHm(weekTotals.standardHours)}
          </p>
          <p className="mt-0.5 font-mono-nums text-sm text-slate-700">
            د.أ {roundDisplay(weekTotals.standardPay)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600">مجموع الإضافي</p>
          <p className="mt-1 font-mono-nums text-lg font-semibold text-slate-900" dir="ltr">
            {formatHoursAsHm(weekTotals.overtimeHours)}
          </p>
          <p className="mt-0.5 font-mono-nums text-sm text-slate-700">
            د.أ {roundDisplay(weekTotals.overtimePay)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600">مجموع الراتب (الأسبوع)</p>
          <p className="mt-1 font-mono-nums text-lg font-bold text-slate-900">
            د.أ {roundDisplay(weekTotals.totalWage)}
          </p>
          {weekTotals.manualPay > 0 ? (
            <p className="mt-0.5 text-[10px] text-violet-700">
              يشمل يدوي: د.أ {roundDisplay(weekTotals.manualPay)}
            </p>
          ) : null}
        </div>
      </div>
      {weekTotals.carriedAmount > 0 ? (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-4 text-right sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-emerald-800">المبلغ المُرحّل (سهرة الأربعاء)</p>
            <p className="mt-1 font-mono-nums text-lg font-bold text-emerald-900">
              د.أ {roundDisplay(weekTotals.carriedAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-800">الإجمالي الأسبوعي (شامل الترحيل)</p>
            <p className="mt-1 font-mono-nums text-lg font-bold text-emerald-950">
              د.أ {roundDisplay(weekTotals.totalWage)}
            </p>
          </div>
        </div>
      ) : null}

      <div className={tableShellClass}>
        <table className={cn(tableBaseClass, 'table-fixed min-w-[880px]')} dir="rtl">
          <thead>
            <tr>
              <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[11%] min-w-0 text-right')}>
                اليوم
              </th>
              <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[9%] min-w-0 text-center font-mono-nums')}>
                التاريخ
              </th>
              <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 min-w-0 text-right')}>الدوام</th>
              <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[14%] min-w-0 text-center')}>
                أساسي
                <span className="mt-0.5 block text-[10px] font-normal text-slate-500">وقت · مبلغ</span>
              </th>
              <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[14%] min-w-0 text-center')}>
                إضافي
                <span className="mt-0.5 block text-[10px] font-normal text-slate-500">وقت · مبلغ</span>
              </th>
              <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[11%] min-w-0 text-center font-mono-nums')}>
                الراتب
              </th>
              <th className={cn(tableHeadCell, tableHeadSticky, tableCellLast, 'z-20 text-center')}>
                إجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            {WEEK_ORDER.map((rowLabel, idx) => {
              const rowDate = getRowDateForWeekRow(weekStart, rowLabel)
              const rowDateStr = toYmd(rowDate)
              const att = findAttendanceCell(rows, employee.id, wsStr, rowLabel, rowDateStr)
              const isFriday = rowLabel === 'الجمعة'
              const isWedNight = rowLabel === 'سهرة الأربعاء'
              const zebra = idx % 2 === 0
              const breakdown =
                att && !att.is_carried_over ? dayBreakdown(att, rate) : null
              const markKey = dashboardMarkKey(wsStr, employee.id, rowDateStr)
              const mark = marks[markKey]
              const rowActive = isAttendanceRowActive(isWedNight, isFriday, fridayAttendanceEnabled)
              const absent =
                !att?.is_carried_over &&
                isDayAbsent({
                  rowDate,
                  att,
                  isWedNight,
                  isFriday,
                  fridayAttendanceEnabled,
                  mark,
                })

              return (
                <tr key={rowLabel} className={tableRowGroup}>
                  <td
                    className={cn(
                      tableRowCell(zebra),
                      'min-w-0 truncate text-right text-sm font-medium',
                      isWedNight && 'text-amber-900',
                      isFriday && 'text-indigo-900'
                    )}
                  >
                    {rowLabel}
                    {isWedNight ? <Star className="ms-0.5 inline h-3 w-3 shrink-0 text-amber-600" /> : null}
                  </td>
                  <td
                    className={cn(
                      tableRowCell(zebra),
                      'min-w-0 truncate text-center font-mono-nums text-xs text-slate-600'
                    )}
                  >
                    {formatDateEn(rowDate)}
                  </td>
                  <td className={cn(tableRowCell(zebra), 'min-w-0 text-right text-xs')}>
                    {att?.is_carried_over ? (
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Badge className="rounded-md border border-amber-200/60 bg-amber-50/90 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                          مُرحّل
                        </Badge>
                        <span className="text-slate-400">—</span>
                      </div>
                    ) : att ? (
                      <AttendancePunchDisplay
                        att={att}
                        className="inline-flex min-w-0 max-w-full items-center justify-end gap-1 truncate font-mono-nums"
                      />
                    ) : absent ? (
                      <span className={dashboardAbsenceCellClass} aria-label="غياب">
                        غياب
                      </span>
                    ) : mark?.type === 'custom' ? (
                      <span className="text-[11px] font-semibold text-slate-700">{mark.text}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className={cn(tableRowCell(zebra), 'min-w-0 text-center text-xs')}>
                    {breakdown ? (
                      <HoursMoneyCell
                        hours={breakdown.standardHours}
                        amount={breakdown.standardPay}
                      />
                    ) : att?.is_carried_over ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className={cn(tableRowCell(zebra), 'min-w-0 text-center text-xs')}>
                    {breakdown && breakdown.overtimeHours > 0 ? (
                      <HoursMoneyCell
                        hours={breakdown.overtimeHours}
                        amount={breakdown.overtimePay}
                      />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className={cn(tableRowCell(zebra), 'min-w-0 text-center font-mono-nums text-xs')}>
                    {att && att.daily_wage != null ? (
                      <span className={numNeutral}>د.أ {roundDisplay(att.daily_wage)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className={cn(tableRowCell(zebra), tableCellLast, 'text-center')}>
                    <div className="flex flex-wrap justify-center gap-1">
                      {att ? (
                        <>
                          {!att.is_carried_over ? (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="min-h-11 gap-1 rounded-md px-3 py-2 text-xs sm:h-9 sm:min-h-9 sm:px-2 sm:py-1"
                                onClick={() => onEdit(rowLabel, rowDate, att)}
                              >
                                <Pencil className="h-3 w-3 shrink-0" /> تعديل
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                className="min-h-11 gap-1 rounded-md px-3 py-2 text-xs sm:h-9 sm:min-h-9 sm:px-2 sm:py-1"
                                onClick={() => onDeleteRow(att)}
                              >
                                <Trash2 className="h-3 w-3 shrink-0" /> حذف
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="danger"
                              className="min-h-11 gap-1 rounded-md px-3 py-2 text-xs sm:h-9 sm:min-h-9 sm:px-2 sm:py-1"
                              onClick={() => onDeleteRow(att)}
                            >
                              <Trash2 className="h-3 w-3 shrink-0" /> حذف
                            </Button>
                          )}
                        </>
                      ) : !rowActive ? null : (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            className="min-h-11 gap-1 rounded-md px-3 py-2 text-xs sm:h-9 sm:min-h-9 sm:px-2 sm:py-1"
                            onClick={() => onAdd(rowLabel, rowDate)}
                          >
                            <Plus className="h-3 w-3 shrink-0" /> إضافة
                          </Button>
                          {absent ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="min-h-11 gap-1 rounded-md px-2 py-2 text-xs sm:h-9 sm:min-h-9 sm:px-2 sm:py-1"
                              onClick={() => setMark(markKey, { type: 'excused' })}
                            >
                              ليس غياب
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="danger"
                              className="min-h-11 gap-1 rounded-md px-2 py-2 text-xs sm:h-9 sm:min-h-9 sm:px-2 sm:py-1"
                              onClick={() => setMark(markKey, { type: 'absence' })}
                            >
                              غياب
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <AttendanceWednesdayCloseSummary
        employee={employee}
        weekStart={weekStart}
        weekStartStr={wsStr}
        rows={rows}
        fridayAttendanceEnabled={fridayAttendanceEnabled}
      />
    </div>
  )
}
