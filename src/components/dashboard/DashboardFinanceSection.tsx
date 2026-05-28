import { useMemo } from 'react'
import type { Employee } from '@/types'
import type { WeekHourAdjustment } from '@/lib/hourAdjustments'
import { sumWeekFinance, type EmployeeWeekFinance } from '@/lib/employeeWeekFinance'
import { adjustmentKindLabel, payForAdjustmentHours } from '@/lib/hourAdjustments'
import { formatHoursAsHm, roundDisplay } from '@/lib/format'
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
import { cn } from '@/lib/utils'
import { Wallet } from 'lucide-react'

type Props = {
  employees: Employee[]
  financeByEmployee: EmployeeWeekFinance[]
  adjustments: WeekHourAdjustment[]
  /** مدمج مباشرة تحت جدول الأسبوع */
  embedded?: boolean
}

function HoursPayCell({ hours, pay }: { hours: number; pay: number }) {
  if (hours <= 0 && pay <= 0) return <span className="text-slate-400">—</span>
  return (
    <div className="flex flex-col items-center gap-0.5 leading-tight">
      <span className={cn(numNeutral, 'text-[11px]')} dir="ltr">
        {formatHoursAsHm(hours)}
      </span>
      {pay > 0 ? (
        <span className="font-mono-nums text-[10px] font-medium text-slate-600">
          د.أ {roundDisplay(pay)}
        </span>
      ) : null}
    </div>
  )
}

function MoneyCell({ amount }: { amount: number }) {
  if (amount <= 0) return <span className="text-slate-400">—</span>
  return <span className="font-mono-nums text-xs font-semibold">د.أ {roundDisplay(amount)}</span>
}

export function DashboardFinanceSection({
  employees,
  financeByEmployee,
  adjustments,
  embedded = false,
}: Props) {
  const financeMap = useMemo(() => {
    const m = new Map<string, EmployeeWeekFinance>()
    for (const f of financeByEmployee) m.set(f.employeeId, f)
    return m
  }, [financeByEmployee])

  const activeEmployees = useMemo(() => {
    return employees.filter((e) => {
      const f = financeMap.get(e.id)
      if (!f) return false
      return (
        f.totalPay > 0 ||
        f.workDaysCount > 0 ||
        f.manualStandardPay + f.manualOvertimePay > 0 ||
        f.carriedPay > 0
      )
    })
  }, [employees, financeMap])

  const list = embedded && activeEmployees.length > 0 ? activeEmployees : employees

  const totals = useMemo(() => {
    const rows = list
      .map((e) => financeMap.get(e.id))
      .filter((f): f is EmployeeWeekFinance => !!f)
    return sumWeekFinance(rows.length > 0 ? rows : financeByEmployee)
  }, [list, financeMap, financeByEmployee])

  const adjustmentLines = useMemo(() => {
    const empById = new Map(employees.map((e) => [e.id, e]))
    return adjustments.map((a) => {
      const emp = empById.get(a.employee_id)
      const rate = emp?.hourly_rate ?? 0
      return {
        ...a,
        employeeName: emp?.name ?? '—',
        pay: payForAdjustmentHours(a.kind, a.hours, rate),
      }
    })
  }, [adjustments, employees])

  if (employees.length === 0) return null

  return (
    <section
      className={cn(
        'text-right',
        embedded
          ? 'border-t-2 border-indigo-200/80 bg-gradient-to-b from-indigo-50/50 to-white'
          : 'mt-10 space-y-6 sm:mt-12'
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-center gap-2',
          embedded ? 'border-b border-indigo-100 px-3 py-2.5 sm:px-4' : ''
        )}
      >
        <Wallet className={cn('shrink-0 text-indigo-700', embedded ? 'h-5 w-5' : 'h-6 w-6')} />
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'font-bold text-[var(--color-text-primary)]',
              embedded ? 'text-sm sm:text-base' : 'text-lg sm:text-xl'
            )}
          >
            التفاصيل المالية للأسبوع
          </h3>
          <p
            className={cn(
              'text-[var(--color-text-secondary)]',
              embedded ? 'text-[11px]' : 'mt-0.5 text-sm'
            )}
          >
            مكمّل لجدول الأسبوع أعلاه — دوام + يدوي + ترحيل
          </p>
        </div>
      </div>

      <div
        className={cn(
          'grid grid-cols-2 gap-2 sm:grid-cols-4',
          embedded ? 'px-3 py-3 sm:px-4' : 'gap-3'
        )}
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-[10px] font-medium text-slate-600">مجموع الساعات</p>
          <p className="mt-1 font-mono-nums text-lg font-bold text-slate-900" dir="ltr">
            {formatHoursAsHm(totals.totalHours)}
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-3">
          <p className="text-[10px] font-medium text-blue-800">أساسي (كل المصادر)</p>
          <p className="mt-1 font-mono-nums text-sm font-bold text-blue-950" dir="ltr">
            {formatHoursAsHm(totals.totalStandardHours)}
          </p>
          <p className="font-mono-nums text-xs">د.أ {roundDisplay(totals.totalStandardPay)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-3">
          <p className="text-[10px] font-medium text-amber-800">إضافي (كل المصادر)</p>
          <p className="mt-1 font-mono-nums text-sm font-bold text-amber-950" dir="ltr">
            {formatHoursAsHm(totals.totalOvertimeHours)}
          </p>
          <p className="font-mono-nums text-xs">د.أ {roundDisplay(totals.totalOvertimePay)}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-3">
          <p className="text-[10px] font-medium text-indigo-800">إجمالي الرواتب</p>
          <p className="mt-1 font-mono-nums text-lg font-bold text-indigo-950">
            د.أ {roundDisplay(totals.totalPay)}
          </p>
        </div>
      </div>

      <div className={cn(embedded ? 'border-t border-slate-200/80' : tableShellClass)}>
        <div className="overflow-x-auto">
          <table
            className={cn(tableBaseClass, 'min-w-[1100px]', embedded && 'border-0 shadow-none')}
            dir="rtl"
          >
            <thead>
              <tr>
                <th
                  className={cn(
                    tableHeadCell,
                    tableHeadSticky,
                    'sticky start-0 z-30 min-w-[8rem] text-right shadow-[1px_0_0_rgb(226,232,240)]'
                  )}
                >
                  الموظف
                </th>
                <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center')}>
                  أساسي (دوام)
                  <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                    وقت · مبلغ
                  </span>
                </th>
                <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center')}>
                  إضافي (دوام)
                  <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                    وقت · مبلغ
                  </span>
                </th>
                <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center')}>
                  أساسي (يدوي)
                </th>
                <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center')}>
                  إضافي (يدوي)
                </th>
                <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center')}>
                  ترحيل
                </th>
                <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center')}>
                  أيام دوام
                </th>
                <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center')}>
                  مجموع الساعات
                </th>
                <th
                  className={cn(
                    tableHeadCell,
                    tableHeadSticky,
                    tableCellLast,
                    'z-20 text-center'
                  )}
                >
                  الإجمالي
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((e, idx) => {
                const f = financeMap.get(e.id)
                if (!f) return null
                const zebra = idx % 2 === 0
                return (
                  <tr key={e.id} className={tableRowGroup}>
                    <td
                      className={cn(
                        tableRowCell(zebra),
                        'sticky start-0 z-10 border-e border-e-slate-200 text-right text-sm font-semibold text-slate-900'
                      )}
                    >
                      {e.name}
                      <div className="mt-0.5 font-mono-nums text-[10px] font-normal text-slate-500">
                        د.أ {roundDisplay(e.hourly_rate)}/س
                      </div>
                    </td>
                    <td className={cn(tableRowCell(zebra), 'text-center')}>
                      <HoursPayCell
                        hours={f.attendanceStandardHours}
                        pay={f.attendanceStandardPay}
                      />
                    </td>
                    <td className={cn(tableRowCell(zebra), 'text-center')}>
                      <HoursPayCell
                        hours={f.attendanceOvertimeHours}
                        pay={f.attendanceOvertimePay}
                      />
                    </td>
                    <td className={cn(tableRowCell(zebra), 'text-center')}>
                      <HoursPayCell
                        hours={f.manualStandardHours}
                        pay={f.manualStandardPay}
                      />
                    </td>
                    <td className={cn(tableRowCell(zebra), 'text-center')}>
                      <HoursPayCell
                        hours={f.manualOvertimeHours}
                        pay={f.manualOvertimePay}
                      />
                    </td>
                    <td className={cn(tableRowCell(zebra), 'text-center')}>
                      <MoneyCell amount={f.carriedPay} />
                    </td>
                    <td
                      className={cn(
                        tableRowCell(zebra),
                        'text-center font-mono-nums text-xs text-slate-700'
                      )}
                    >
                      {f.workDaysCount}
                    </td>
                    <td
                      className={cn(
                        tableRowCell(zebra),
                        'text-center font-mono-nums text-xs font-semibold'
                      )}
                      dir="ltr"
                    >
                      {formatHoursAsHm(f.totalHours)}
                    </td>
                    <td
                      className={cn(
                        tableRowCell(zebra),
                        tableCellLast,
                        'text-center font-mono-nums text-sm font-bold text-indigo-950'
                      )}
                    >
                      د.أ {roundDisplay(f.totalPay)}
                    </td>
                  </tr>
                )
              })}
              <tr className={tableTotalRow}>
                <td className={cn(tableTotalCell('sticky start-0 z-10 text-right text-sm font-bold'))}>
                  المجموع
                </td>
                <td className={cn(tableTotalCell('text-center'))}>
                  <HoursPayCell
                    hours={totals.attendanceStandardHours}
                    pay={totals.attendanceStandardPay}
                  />
                </td>
                <td className={cn(tableTotalCell('text-center'))}>
                  <HoursPayCell
                    hours={totals.attendanceOvertimeHours}
                    pay={totals.attendanceOvertimePay}
                  />
                </td>
                <td className={cn(tableTotalCell('text-center'))}>
                  <HoursPayCell
                    hours={totals.manualStandardHours}
                    pay={totals.manualStandardPay}
                  />
                </td>
                <td className={cn(tableTotalCell('text-center'))}>
                  <HoursPayCell
                    hours={totals.manualOvertimeHours}
                    pay={totals.manualOvertimePay}
                  />
                </td>
                <td className={cn(tableTotalCell('text-center'))}>
                  <MoneyCell amount={totals.carriedPay} />
                </td>
                <td className={cn(tableTotalCell('text-center font-mono-nums'))}>
                  {totals.workDaysCount}
                </td>
                <td className={cn(tableTotalCell('text-center font-mono-nums'))} dir="ltr">
                  {formatHoursAsHm(totals.totalHours)}
                </td>
                <td
                  className={cn(
                    tableTotalCell('text-center font-mono-nums text-sm font-bold'),
                    tableCellLast
                  )}
                >
                  د.أ {roundDisplay(totals.totalPay)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {adjustmentLines.length > 0 ? (
        <div
          className={cn(
            embedded ? 'border-t border-violet-200/80' : tableShellClass,
            embedded && 'mx-0'
          )}
        >
          <h4
            className={cn(
              'border-b border-violet-200/80 bg-violet-50/90 font-bold text-violet-950',
              embedded ? 'px-3 py-2 text-xs sm:px-4' : 'px-4 py-3 text-sm'
            )}
          >
            تفصيل الإضافات اليدوية
          </h4>
          <div className="overflow-x-auto">
          <table
            className={cn(tableBaseClass, 'min-w-[640px]', embedded && 'border-0 shadow-none')}
            dir="rtl"
          >
            <thead>
              <tr>
                <th className={cn(tableHeadCell, 'text-right')}>الموظف</th>
                <th className={cn(tableHeadCell, 'text-center')}>النوع</th>
                <th className={cn(tableHeadCell, 'text-center')}>المدة</th>
                <th className={cn(tableHeadCell, 'text-center')}>المبلغ</th>
                <th className={cn(tableHeadCell, tableCellLast, 'text-right')}>ملاحظة</th>
              </tr>
            </thead>
            <tbody>
              {adjustmentLines.map((line, idx) => (
                <tr key={line.id} className={tableRowGroup}>
                  <td className={cn(tableRowCell(idx % 2 === 0), 'text-right text-sm font-medium')}>
                    {line.employeeName}
                  </td>
                  <td className={cn(tableRowCell(idx % 2 === 0), 'text-center text-xs')}>
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 font-semibold',
                        line.kind === 'standard'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-amber-100 text-amber-900'
                      )}
                    >
                      {adjustmentKindLabel(line.kind)}
                    </span>
                  </td>
                  <td
                    className={cn(
                      tableRowCell(idx % 2 === 0),
                      'text-center font-mono-nums text-xs'
                    )}
                    dir="ltr"
                  >
                    {formatHoursAsHm(line.hours)}
                  </td>
                  <td
                    className={cn(
                      tableRowCell(idx % 2 === 0),
                      'text-center font-mono-nums text-xs font-semibold'
                    )}
                  >
                    د.أ {roundDisplay(line.pay)}
                  </td>
                  <td
                    className={cn(
                      tableRowCell(idx % 2 === 0),
                      tableCellLast,
                      'text-right text-xs text-slate-600'
                    )}
                  >
                    {line.note || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : null}
    </section>
  )
}

