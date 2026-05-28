import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { STANDARD_WORK_HOURS } from '@/lib/calculations'
import { roundDisplay } from '@/lib/format'
import type { Employee } from '@/types'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'

type EmployeeFormProps = {
  editing: Employee | null
  existingIds: string[]
  onDone: () => void
}

const fieldClass =
  'min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-app-card px-4 py-3 text-[var(--color-text-primary)] shadow-sm outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/25'

export function EmployeeForm({ editing, existingIds, onDone }: EmployeeFormProps) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [hourly, setHourly] = useState('')
  const [transport, setTransport] = useState('')
  const [saving, setSaving] = useState(false)
  const [idError, setIdError] = useState('')

  useEffect(() => {
    if (editing) {
      setName(editing.name)
      setEmployeeId(editing.employee_id)
      setHourly(String(editing.hourly_rate))
      setTransport(String(editing.transport_allowance))
    } else {
      setName('')
      setEmployeeId('')
      setHourly('')
      setTransport('0')
    }
  }, [editing])

  const preview = useMemo(() => {
    const h = Number(hourly)
    if (!Number.isFinite(h)) return { daily: 0, weekly: 0 }
    const daily = h * STANDARD_WORK_HOURS
    const weekly = daily * 6
    return { daily, weekly }
  }, [hourly])

  async function submit() {
    setIdError('')
    if (!/^\d{3}$/.test(employeeId)) {
      setIdError('رقم المعرف يجب أن يكون 3 أرقام بالضبط')
      return
    }
    const dup = existingIds.some((id) => id === employeeId && (!editing || editing.employee_id !== employeeId))
    if (dup) {
      setIdError('هذا المعرف مستخدم بالفعل')
      return
    }

    const h = Number(hourly)
    const tr = Number(transport || 0)
    if (!Number.isFinite(h) || h <= 0) {
      toast.error('أدخل سعر ساعة صحيحاً')
      return
    }

    const daily_rate = h * STANDARD_WORK_HOURS
    const weekly_rate = daily_rate * 6

    setSaving(true)
    try {
      const payload = {
        employee_id: employeeId,
        name: name.trim(),
        hourly_rate: h,
        transport_allowance: tr,
        daily_rate,
        weekly_rate,
      }
      if (editing) {
        const { error } = await supabase.from('employees').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('employees').insert(payload)
        if (error) throw error
      }
      toast.success()
      onDone()
    } catch (e) {
      console.error(e)
      toast.error()
    } finally {
      setSaving(false)
    }
  }

  const submitDisabled = saving || !name.trim()

  return (
    <div className="relative z-10 rounded-2xl border border-[var(--color-border)] bg-app-card p-6 text-right shadow-sm sm:p-7">
      <h2 className="mb-6 text-lg font-bold text-[var(--color-accent-blue)]">
        {editing ? 'تعديل موظف' : 'إضافة موظف'}
      </h2>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]">الاسم</label>
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]">
            رقم المعرف
          </label>
          <input
            className={fieldClass + ' font-mono-nums'}
            maxLength={3}
            inputMode="numeric"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value.replace(/\D/g, '').slice(0, 3))}
          />
          {idError ? <p className="mt-1.5 text-sm text-[var(--color-danger)]">{idError}</p> : null}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]">
            سعر الساعة
          </label>
          <input className={fieldClass + ' font-mono-nums'} value={hourly} onChange={(e) => setHourly(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]">
            {'بدل المواصلات (اختياري)'}
          </label>
          <input
            className={fieldClass + ' font-mono-nums'}
            value={transport}
            onChange={(e) => setTransport(e.target.value)}
          />
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]/70 p-4">
          <p className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">حساب تلقائي</p>
          <p className="text-[var(--color-text-primary)]">
            الراتب اليومي ({STANDARD_WORK_HOURS} ساعات):{' '}
            <span className="font-mono-nums font-bold text-slate-800">
              {roundDisplay(preview.daily)}
            </span>
          </p>
          <p className="mt-1 text-[var(--color-text-primary)]">
            الراتب الأسبوعي (6 أيام):{' '}
            <span className="font-mono-nums font-bold text-slate-800">
              {roundDisplay(preview.weekly)}
            </span>
          </p>
        </div>
        <Button
          type="submit"
          className="w-full py-3 text-base font-semibold disabled:cursor-not-allowed"
          disabled={submitDisabled}
          title={submitDisabled && !name.trim() ? 'أدخل اسم الموظف أولاً' : undefined}
        >
          {editing ? 'حفظ التعديل' : 'إضافة'}
        </Button>
        {submitDisabled && !name.trim() ? (
          <p className="-mt-1 text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
            املأ حقل الاسم أولاً لتفعيل زر الإضافة.
          </p>
        ) : null}
      </form>
    </div>
  )
}
