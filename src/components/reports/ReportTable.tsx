import { useMemo } from 'react'
import { WEEK_ORDER, getRowDateForWeekRow } from '@/lib/weekUtils'
import { roundDisplay, toYmd } from '@/lib/format'
import { findAttendanceCell } from '@/lib/attendanceLookup'
import type { Attendance, Employee } from '@/types'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import {
  numNeutral,
  tableBaseClass,
  tableCellLast,
  tableHeadCell,
  tableHeadSticky,
  tableRowCell,
  tableRowGroup,
  tableShellClass,
  tableTotalCell,
  tableTotalRow,
} from '@/lib/tableUi'

type ReportTableProps = {
  weekStart: Date
  employees: Employee[]
  attendance: Attendance[]
  loading: boolean
}

export function ReportTable({ weekStart, employees, attendance, loading }: ReportTableProps) {
  const wsStr = toYmd(weekStart)

  const summary = useMemo(() => {
    let total = 0
    let days = 0
    for (const a of attendance) {
      if (a.week_start_date !== wsStr) continue
      total += a.daily_wage ?? 0
      if ((a.daily_wage ?? 0) > 0) days += 1
    }
    const avg = days > 0 ? total / days : 0
    return { total, days, avg }
  }, [attendance, wsStr])

  const perEmployee = useMemo(() => {
    return employees.map((e) => {
      let sum = 0
      const rows = WEEK_ORDER.map((label) => {
        const d = getRowDateForWeekRow(weekStart, label)
        const ds = toYmd(d)
        const att = findAttendanceCell(attendance, e.id, wsStr, label, ds)
        const wage = att?.daily_wage ?? null
        if (wage != null) sum += wage
        return { label, att, wage }
      })
      return { employee: e, rows, sum }
    })
  }, [employees, attendance, weekStart, wsStr])

  if (loading) {
    return <Skeleton className="h-[500px] w-full rounded-2xl" />
  }

  if (employees.length === 0) {
    return <p className="text-[var(--color-text-secondary)]">لا يوجد موظفون لعرض التقرير.</p>
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5" dir="rtl">
        <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">إجمالي الرواتب</p>
          <p className="mt-2 text-center font-mono-nums text-xl font-semibold text-slate-800">
            د.أ {roundDisplay(summary.total)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">أيام الدوام</p>
          <p className="mt-2 text-center font-mono-nums text-xl font-semibold text-slate-800">
            {summary.days}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">متوسط اليومي</p>
          <p className="mt-2 text-center font-mono-nums text-xl font-semibold text-slate-800">
            د.أ {roundDisplay(summary.avg)}
          </p>
        </div>
      </div>

      <div className={tableShellClass}>
        <table className={cn(tableBaseClass, 'table-fixed min-w-[1040px]')} dir="rtl">
          <thead>
            <tr>
              <th
                className={cn(
                  tableHeadCell,
                  tableHeadSticky,
                  'sticky start-0 z-30 w-[11rem] min-w-0 max-w-[13rem] text-right shadow-[1px_0_0_rgb(226,232,240)]'
                )}
              >
                الموظف
              </th>
              {WEEK_ORDER.map((l) => (
                <th
                  key={l}
                  className={cn(
                    tableHeadCell,
                    tableHeadSticky,
                    'z-20 min-w-0 px-1 text-center text-[10px] font-medium leading-tight whitespace-normal'
                  )}
                >
                  {l}
                </th>
              ))}
              <th
                className={cn(
                  tableHeadCell,
                  tableHeadSticky,
                  tableCellLast,
                  'z-20 w-[4.5rem] min-w-0 text-center'
                )}
              >
                المجموع
              </th>
            </tr>
          </thead>
          <tbody>
            {perEmployee.map(({ employee: e, rows, sum }, idx) => {
              const zebra = idx % 2 === 0
              return (
                <tr key={e.id} className={tableRowGroup}>
                  <td
                    className={cn(
                      tableRowCell(zebra),
                      'sticky start-0 z-10 min-w-0 border-e border-e-slate-200 text-right text-sm font-medium'
                    )}
                  >
                    <span className="block truncate leading-snug">
                      {e.name}{' '}
                      <span className="font-mono-nums text-[11px] font-normal text-slate-500">
                        ({e.employee_id})
                      </span>
                    </span>
                  </td>
                  {rows.map(({ label, wage }) => (
                    <td
                      key={label}
                      className={cn(
                        tableRowCell(zebra),
                        'min-w-0 text-center font-mono-nums text-xs font-medium'
                      )}
                    >
                      {wage != null ? (
                        <span className={numNeutral}>{roundDisplay(wage)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  ))}
                  <td
                    className={cn(
                      tableRowCell(zebra),
                      tableCellLast,
                      'text-center font-mono-nums text-xs font-semibold text-slate-900'
                    )}
                  >
                    {roundDisplay(sum)}
                  </td>
                </tr>
              )
            })}
            <tr className={tableTotalRow}>
              <td
                className={cn(
                  tableTotalCell(
                    'sticky start-0 z-10 border-e border-e-slate-300 py-2 text-right text-sm'
                  )
                )}
              >
                المجموع الكلي
              </td>
              {WEEK_ORDER.map((label) => {
                const d = getRowDateForWeekRow(weekStart, label)
                const ds = toYmd(d)
                let daySum = 0
                for (const emp of employees) {
                  const att = findAttendanceCell(attendance, emp.id, wsStr, label, ds)
                  if (att?.daily_wage != null) daySum += att.daily_wage
                }
                return (
                  <td
                    key={label}
                    className={cn(tableTotalCell('text-center font-mono-nums text-xs'))}
                  >
                    {roundDisplay(daySum)}
                  </td>
                )
              })}
              <td
                className={cn(
                  tableTotalCell('text-center font-mono-nums text-sm'),
                  tableCellLast
                )}
              >
                {roundDisplay(summary.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
