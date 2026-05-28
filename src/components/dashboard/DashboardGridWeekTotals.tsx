import type { Employee } from '@/types'
import {
  formatManualHoursLabel,
  getManualPay,
  sumWeekFinance,
  type EmployeeWeekFinance,
} from '@/lib/employeeWeekFinance'
import { formatHoursAsHm, roundDisplay } from '@/lib/format'
import {
  tableCellLast,
  tableTotalCell,
  tableTotalRow,
} from '@/lib/tableUi'
import { cn } from '@/lib/utils'

type Props = {
  employees: Employee[]
  financeMap: Map<string, EmployeeWeekFinance>
}

function ManualCell({ f }: { f: EmployeeWeekFinance | undefined }) {
  const pay = f ? getManualPay(f) : 0
  if (pay <= 0) return <span className="text-slate-400">—</span>
  const label = f ? formatManualHoursLabel(f) : ''
  return (
    <div className="flex flex-col items-center gap-0.5 leading-tight">
      <span className="font-mono-nums text-xs font-bold text-violet-900">
        + د.أ {roundDisplay(pay)}
      </span>
      {label ? (
        <span className="text-[10px] font-medium text-violet-700" dir="ltr">
          {label}
        </span>
      ) : null}
    </div>
  )
}

/** صفوف المجاميع تحت الجدول — منفصلة عن خلايا الأيام حتى يطابق الظاهر + الإضافات */
export function DashboardGridWeekTotals({ employees, financeMap }: Props) {
  const totals = sumWeekFinance([...financeMap.values()])
  const hasAnyManual = totals.manualStandardPay + totals.manualOvertimePay > 1e-6

  return (
    <>
      <tr className={tableTotalRow}>
        <td
          className={cn(
            tableTotalCell(
              'sticky start-0 z-10 border-e border-e-slate-300 py-2 text-right text-sm font-semibold text-slate-800'
            )
          )}
        >
          مجموع الدوام
          <span className="mt-0.5 block text-[10px] font-normal text-slate-500">كما في الجدول أعلاه</span>
        </td>
        {employees.map((e) => {
          const gridSum = financeMap.get(e.id)?.attendanceRowsPay ?? 0
          return (
            <td key={e.id} className={cn(tableTotalCell('text-center font-mono-nums text-xs'))}>
              {gridSum > 0 ? roundDisplay(gridSum) : <span className="text-slate-400">—</span>}
            </td>
          )
        })}
        <td
          className={cn(
            tableTotalCell('text-center font-mono-nums text-sm font-semibold'),
            tableCellLast
          )}
        >
          {roundDisplay(totals.attendanceRowsPay)}
        </td>
      </tr>

      {hasAnyManual ? (
        <tr className="bg-violet-50/90">
          <td
            className={cn(
              tableTotalCell(
                'sticky start-0 z-10 border-e border-e-violet-200 py-2 text-right text-sm font-semibold text-violet-950'
              )
            )}
          >
            إضافات يدوية
            <span className="mt-0.5 block text-[10px] font-normal text-violet-700">
              ساعات أساسية / إضافية
            </span>
          </td>
          {employees.map((e) => {
            const f = financeMap.get(e.id)
            const pay = f ? getManualPay(f) : 0
            return (
              <td
                key={e.id}
                className={cn(
                  tableTotalCell('text-center py-2'),
                  pay > 0 && 'ring-1 ring-inset ring-violet-200/80'
                )}
              >
                <ManualCell f={f} />
              </td>
            )
          })}
          <td className={cn(tableTotalCell('text-center py-2'), tableCellLast)}>
            <div className="flex flex-col items-center gap-0.5 leading-tight">
              <span className="font-mono-nums text-xs font-bold text-violet-900">
                + د.أ {roundDisplay(totals.manualStandardPay + totals.manualOvertimePay)}
              </span>
              <span className="text-[10px] font-medium text-violet-700" dir="ltr">
                {[
                  totals.manualStandardHours > 1e-6
                    ? `${formatHoursAsHm(totals.manualStandardHours)} أساسي`
                    : '',
                  totals.manualOvertimeHours > 1e-6
                    ? `${formatHoursAsHm(totals.manualOvertimeHours)} إضافي`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
          </td>
        </tr>
      ) : null}

      <tr className={cn(tableTotalRow, 'border-t-2 border-slate-300')}>
        <td
          className={cn(
            tableTotalCell(
              'sticky start-0 z-10 border-e border-e-slate-300 py-2.5 text-right text-sm font-bold text-slate-900'
            )
          )}
        >
          الإجمالي الكامل
        </td>
        {employees.map((e) => {
          const total = financeMap.get(e.id)?.totalPay ?? 0
          return (
            <td
              key={e.id}
              className={cn(
                tableTotalCell('text-center font-mono-nums text-xs font-bold text-indigo-950')
              )}
            >
              {total > 0 ? roundDisplay(total) : <span className="text-slate-400">—</span>}
            </td>
          )
        })}
        <td
          className={cn(
            tableTotalCell('text-center font-mono-nums text-sm font-bold text-indigo-950'),
            tableCellLast
          )}
        >
          {roundDisplay(totals.totalPay)}
        </td>
      </tr>
    </>
  )
}
