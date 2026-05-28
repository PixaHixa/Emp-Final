import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { formatHoursAsHm, roundDisplay } from '@/lib/format'
import {
  adjustmentKindLabel,
  computeAdjustmentTotals,
  deleteWeekHourAdjustment,
  payForAdjustmentHours,
  type HourAdjustmentKind,
  type WeekHourAdjustment,
} from '@/lib/hourAdjustments'
import type { Employee } from '@/types'
import { cn } from '@/lib/utils'
import { Clock, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

type Props = {
  employee: Employee
  adjustments: WeekHourAdjustment[]
  onAdd: (kind: HourAdjustmentKind) => void
  onChanged: () => void
}

export function HourAdjustmentsPanel({ employee, adjustments, onAdd, onChanged }: Props) {
  const toast = useToast()
  const rate = employee.hourly_rate
  const totals = useMemo(
    () => computeAdjustmentTotals(adjustments, rate),
    [adjustments, rate],
  )

  async function handleDelete(id: string) {
    try {
      await deleteWeekHourAdjustment(id)
      toast.success('تم الحذف')
      onChanged()
    } catch (e) {
      console.error(e)
      toast.error()
    }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-b from-violet-50/80 to-white px-4 py-4 text-right shadow-sm sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 shrink-0 text-violet-700" />
            <h3 className="text-base font-bold text-violet-950">ساعات إضافية يدوية</h3>
          </div>
          <p className="mt-1 text-xs text-violet-900/75">
            لـ <strong>{employee.name}</strong> — تُضاف على مجموع الأسبوع (أساسي أو إضافي ×1.25)
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <Button
            size="sm"
            variant="secondary"
            className="min-h-10 flex-1 gap-1 border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100 sm:flex-initial"
            onClick={() => onAdd('standard')}
          >
            <Plus className="h-3.5 w-3.5" /> ساعة أساسية
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="min-h-10 flex-1 gap-1 border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 sm:flex-initial"
            onClick={() => onAdd('overtime')}
          >
            <Plus className="h-3.5 w-3.5" /> ساعة إضافية
          </Button>
        </div>
      </div>

      {adjustments.length > 0 ? (
        <>
          <ul className="mt-4 space-y-2">
            {adjustments.map((a) => {
              const pay = payForAdjustmentHours(a.kind, a.hours, rate)
              return (
                <li
                  key={a.id}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2.5',
                    a.kind === 'standard' ? 'border-blue-100' : 'border-amber-100'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {adjustmentKindLabel(a.kind)}
                      <span className="mx-1.5 font-normal text-slate-400">·</span>
                      <span className="font-mono-nums" dir="ltr">
                        {formatHoursAsHm(a.hours)}
                      </span>
                    </p>
                    <p className="font-mono-nums text-xs font-medium text-slate-600">
                      د.أ {roundDisplay(pay)}
                    </p>
                    {a.note ? <p className="mt-0.5 text-xs text-slate-500">{a.note}</p> : null}
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    className="min-h-9 shrink-0 gap-1 px-2.5"
                    onClick={() => void handleDelete(a.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              )
            })}
          </ul>
          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-violet-200/60 pt-3 text-sm sm:grid-cols-3">
            <div>
              <span className="text-violet-800">أساسي يدوي:</span>{' '}
              <span className="font-mono-nums font-semibold" dir="ltr">
                {formatHoursAsHm(totals.standardHours)}
              </span>
              <span className="mx-1 text-slate-400">·</span>
              <span className="font-mono-nums">د.أ {roundDisplay(totals.standardPay)}</span>
            </div>
            <div>
              <span className="text-violet-800">إضافي يدوي:</span>{' '}
              <span className="font-mono-nums font-semibold" dir="ltr">
                {formatHoursAsHm(totals.overtimeHours)}
              </span>
              <span className="mx-1 text-slate-400">·</span>
              <span className="font-mono-nums">د.أ {roundDisplay(totals.overtimePay)}</span>
            </div>
            <div className="font-semibold text-violet-950">
              مجموع الإضافات اليدوية:{' '}
              <span className="font-mono-nums">د.أ {roundDisplay(totals.totalPay)}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-600">لا توجد إضافات يدوية لهذا الأسبوع.</p>
      )}
    </div>
  )
}
