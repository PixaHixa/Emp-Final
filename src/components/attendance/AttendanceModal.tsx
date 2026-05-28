import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TimeSelect12 } from './TimeSelect12'
import { formatDateEn, roundDisplay } from '@/lib/format'
import { calculateDailyWage, getWednesdayCarryOver } from '@/lib/calculations'
import { getArabicWeekdayName } from '@/lib/weekUtils'
import { fromDbTime, toDbTime } from '@/lib/timeFormat'
import type { Employee } from '@/types'
import type { WeekDayLabel } from '@/lib/weekUtils'
import { saveAttendanceRecord } from '@/lib/attendanceOps'
import { useToast } from '@/contexts/ToastContext'

type AttendanceModalProps = {
  open: boolean
  onClose: () => void
  employee: Employee | null
  rowDate: Date
  weekStart: Date
  rowLabel: WeekDayLabel
  existingId?: string
  initialCheckIn?: string | null
  initialCheckOut?: string | null
  onSaved: () => void
}

export function AttendanceModal({
  open,
  onClose,
  employee,
  rowDate,
  weekStart,
  rowLabel,
  existingId,
  initialCheckIn,
  initialCheckOut,
  onSaved,
}: AttendanceModalProps) {
  const toast = useToast()
  const [checkIn, setCheckIn] = useState('09:00')
  const [checkOut, setCheckOut] = useState('18:00')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !employee) return
    setCheckIn(initialCheckIn ? fromDbTime(initialCheckIn) : '09:00')
    setCheckOut(initialCheckOut ? fromDbTime(initialCheckOut) : '18:00')
  }, [open, employee, initialCheckIn, initialCheckOut])

  const arabicDayForCalc =
    rowLabel === 'الجمعة'
      ? 'الجمعة'
      : rowLabel === 'الخميس'
        ? 'الخميس'
        : rowLabel === 'السبت'
          ? 'السبت'
          : rowLabel === 'الأحد'
            ? 'الأحد'
            : rowLabel === 'الاثنين'
              ? 'الاثنين'
              : rowLabel === 'الثلاثاء'
                ? 'الثلاثاء'
                : 'الأربعاء'

  const preview = useMemo(() => {
    if (!employee) return { hours: 0, wage: 0, carried: 0 }
    const cin = fromDbTime(toDbTime(checkIn))
    const cout = fromDbTime(toDbTime(checkOut))
    const calc = calculateDailyWage({
      checkIn: cin,
      checkOut: cout,
      hourlyRate: employee.hourly_rate,
      transportAllowance: employee.transport_allowance,
      dayOfWeek: arabicDayForCalc,
    })
    if (arabicDayForCalc === 'الأربعاء') {
      const split = getWednesdayCarryOver({
        totalWage: calc.dailyWage,
        hourlyRate: employee.hourly_rate,
        transportAllowance: employee.transport_allowance,
      })
      return { hours: calc.hoursWorked, wage: split.wednesdayWage, carried: split.carriedAmount }
    }
    return { hours: calc.hoursWorked, wage: calc.dailyWage, carried: 0 }
  }, [employee, checkIn, checkOut, arabicDayForCalc])

  const weekdayLabel = getArabicWeekdayName(rowDate)

  async function handleSave() {
    if (!employee) return
    setSaving(true)
    try {
      await saveAttendanceRecord({
        employee,
        rowDate,
        weekStart,
        rowLabel,
        checkIn24: checkIn,
        checkOut24: checkOut,
        existingId,
      })
      toast.success()
      onSaved()
      onClose()
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message.slice(0, 240) : 'حدث خطأ، حاول مرة أخرى'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!employee) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${existingId ? 'تعديل دوام' : 'إضافة دوام'} — ${employee.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            حفظ {'\u2713'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">التاريخ</p>
          <p className="font-mono-nums text-lg font-bold text-[var(--color-accent-blue)]">{formatDateEn(rowDate)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">اليوم</p>
          <p className="font-semibold text-[var(--color-text-primary)]">{weekdayLabel}</p>
        </div>
        <TimeSelect12 label="وقت الحضور" value24={checkIn} onChange={setCheckIn} />
        <TimeSelect12 label="وقت المغادرة" value24={checkOut} onChange={setCheckOut} />
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]/60 p-4 sm:p-5">
          <p className="mb-2 text-sm font-semibold text-[var(--color-text-secondary)]">معاينة الحساب</p>
          <p className="text-[var(--color-text-primary)]">
            ساعات العمل:{' '}
            <span className="font-mono-nums font-bold text-[var(--color-accent-blue)]">{roundDisplay(preview.hours)}</span>
          </p>
          <p className="text-[var(--color-text-primary)]">
            الراتب اليومي:{' '}
            <span className="font-mono-nums font-bold text-slate-800">
              د.أ {roundDisplay(preview.wage)}
            </span>
          </p>
          {preview.carried > 0 ? (
            <p className="mt-2 text-sm font-medium text-[var(--color-gold)]">
              يُرحّل للأسبوع القادم: د.أ {roundDisplay(preview.carried)}
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
