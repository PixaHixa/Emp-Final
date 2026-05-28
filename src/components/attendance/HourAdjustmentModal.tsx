import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatHoursAsHm, hoursFromParts, roundDisplay } from '@/lib/format'
import {
  adjustmentKindLabel,
  payForAdjustmentHours,
  saveWeekHourAdjustment,
  type HourAdjustmentKind,
} from '@/lib/hourAdjustments'
import type { Employee } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  employee: Employee | null
  weekStart: Date
  initialKind: HourAdjustmentKind
  onSaved: () => void
}

export function HourAdjustmentModal({
  open,
  onClose,
  employee,
  weekStart,
  initialKind,
  onSaved,
}: Props) {
  const toast = useToast()
  const [kind, setKind] = useState<HourAdjustmentKind>(initialKind)
  const [hoursPart, setHoursPart] = useState('0')
  const [minutesPart, setMinutesPart] = useState('0')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setKind(initialKind)
    setHoursPart('1')
    setMinutesPart('0')
    setNote('')
  }, [open, initialKind])

  const decimalHours = useMemo(() => {
    const h = Number(hoursPart)
    const m = Number(minutesPart)
    return hoursFromParts(
      Number.isFinite(h) ? Math.floor(h) : 0,
      Number.isFinite(m) ? Math.floor(m) : 0,
    )
  }, [hoursPart, minutesPart])

  const previewPay = useMemo(() => {
    if (!employee || decimalHours == null) return 0
    return payForAdjustmentHours(kind, decimalHours, employee.hourly_rate)
  }, [employee, decimalHours, kind])

  async function handleSave() {
    if (!employee || saving) return
    if (decimalHours == null) {
      toast.error('أدخل مدة صحيحة (ساعة ودقيقة)')
      return
    }
    setSaving(true)
    try {
      await saveWeekHourAdjustment({
        employee,
        weekStart,
        kind,
        hours: decimalHours,
        note,
      })
      toast.success('تمت إضافة ' + adjustmentKindLabel(kind))
      onSaved()
      onClose()
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة ساعات يدوية"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            إلغاء
          </Button>
          <Button
            variant="primary"
            disabled={saving}
            className="w-full sm:w-auto"
            onClick={() => void handleSave()}
          >
            {saving ? 'جاري الحفظ…' : 'حفظ الإضافة'}
          </Button>
        </>
      }
    >
      {employee ? (
        <div className="space-y-4 text-right">
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            الموظف: <strong>{employee.name}</strong>
            <span className="mx-1 text-slate-400">·</span>
            أجر الساعة: <span className="font-mono-nums">د.أ {roundDisplay(employee.hourly_rate)}</span>
          </p>

          <div className="grid grid-cols-2 gap-2">
            {(['standard', 'overtime'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  'min-h-11 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
                  kind === k
                    ? k === 'standard'
                      ? 'border-blue-300 bg-blue-50 text-blue-900'
                      : 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                {adjustmentKindLabel(k)}
              </button>
            ))}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--color-text-secondary)]">المدة</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-600">ساعات</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={hoursPart}
                  onChange={(e) => setHoursPart(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-app-card px-3 py-2 font-mono-nums text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-blue)]"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">دقائق</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  step={1}
                  value={minutesPart}
                  onChange={(e) => setMinutesPart(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-app-card px-3 py-2 font-mono-nums text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-blue)]"
                  dir="ltr"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">مثال: ساعة واحدة و 17 دقيقة → 1 ساعة + 17 دقيقة</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-[var(--color-text-secondary)]">
              ملاحظة (اختياري)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-app-card px-3 py-2 outline-none focus:border-[var(--color-accent-blue)]"
              placeholder="سبب الإضافة"
            />
          </div>

          <div
            className={cn(
              'flex items-center justify-between gap-3 rounded-xl border px-4 py-3',
              kind === 'standard'
                ? 'border-blue-200 bg-blue-50/80'
                : 'border-amber-200 bg-amber-50/80'
            )}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Clock className="h-4 w-4 shrink-0" />
              معاينة المبلغ
            </div>
            <div className="text-end">
              <p className="font-mono-nums text-xs text-slate-600" dir="ltr">
                {decimalHours != null ? formatHoursAsHm(decimalHours) : '—'}
              </p>
              <p className="font-mono-nums text-lg font-bold text-slate-900">
                د.أ {roundDisplay(previewPay)}
              </p>
              {kind === 'overtime' ? (
                <p className="text-[10px] text-amber-800">مضاعف الإضافي ×1.25</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
