import { STANDARD_WORK_HOURS } from '@/lib/calculations'
import { roundDisplay } from '@/lib/format'
import type { Employee } from '@/types'
import { Button } from '@/components/ui/Button'
import { Pencil, Trash2 } from 'lucide-react'
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
} from '@/lib/tableUi'

type EmployeeTableProps = {
  employees: Employee[]
  loading: boolean
  onEdit: (e: Employee) => void
  onDeleteRequest: (e: Employee) => void
}

export function EmployeeTable({ employees, loading, onEdit, onDeleteRequest }: EmployeeTableProps) {
  if (loading) {
    return (
      <div className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-app-card p-5 shadow-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (employees.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-app-card/80 p-10 text-center text-[var(--color-text-secondary)] shadow-sm">
        لا يوجد موظفون بعد. استخدم النموذج المجاور لإضافة موظف.
      </div>
    )
  }

  return (
    <div className={tableShellClass}>
      <table className={cn(tableBaseClass, 'table-fixed')} dir="rtl">
        <thead>
          <tr>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[9%] text-center font-mono-nums')}>
              المعرف
            </th>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[22%] min-w-0 text-right')}>الاسم</th>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center font-mono-nums')}>
              سعر الساعة
            </th>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center font-mono-nums')}>
              دوام (ساعات)
            </th>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center font-mono-nums')}>
              المواصلات
            </th>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center font-mono-nums')}>
              اليومية
            </th>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center font-mono-nums')}>
              الأسبوعية
            </th>
            <th
              className={cn(tableHeadCell, tableHeadSticky, tableCellLast, 'z-20 w-[17%] text-center')}
            >
              إجراءات
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e, idx) => {
            const zebra = idx % 2 === 0
            return (
              <tr key={e.id} className={tableRowGroup}>
                <td className={cn(tableRowCell(zebra), 'text-center font-mono-nums text-xs text-slate-700')}>
                  {e.employee_id}
                </td>
                <td className={cn(tableRowCell(zebra), 'min-w-0 truncate text-right text-sm font-medium text-slate-900')}>
                  {e.name}
                </td>
                <td className={cn(tableRowCell(zebra), 'text-center font-mono-nums text-xs text-slate-800')}>
                  {roundDisplay(e.hourly_rate)}
                </td>
                <td className={cn(tableRowCell(zebra), 'text-center font-mono-nums text-xs text-slate-800')}>
                  {roundDisplay(STANDARD_WORK_HOURS)}
                </td>
                <td className={cn(tableRowCell(zebra), 'text-center font-mono-nums text-xs text-slate-800')}>
                  {roundDisplay(e.transport_allowance)}
                </td>
                <td className={cn(tableRowCell(zebra), 'text-center font-mono-nums text-xs')}>
                  <span className={numNeutral}>
                    {roundDisplay(e.hourly_rate * STANDARD_WORK_HOURS)}
                  </span>
                </td>
                <td className={cn(tableRowCell(zebra), 'text-center font-mono-nums text-xs')}>
                  <span className={numNeutral}>
                    {roundDisplay(e.hourly_rate * STANDARD_WORK_HOURS * 6)}
                  </span>
                </td>
                <td className={cn(tableRowCell(zebra), tableCellLast, 'text-center')}>
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="min-h-11 gap-1 rounded-md px-3 py-2 text-xs sm:h-9 sm:min-h-9 sm:px-2 sm:py-1"
                      onClick={() => onEdit(e)}
                    >
                      <Pencil className="h-3 w-3 shrink-0" /> تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="min-h-11 gap-1 rounded-md px-3 py-2 text-xs sm:h-9 sm:min-h-9 sm:px-2 sm:py-1"
                      onClick={() => onDeleteRequest(e)}
                    >
                      <Trash2 className="h-3 w-3 shrink-0" /> حذف
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
