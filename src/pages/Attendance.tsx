import { useCallback, useEffect, useMemo, useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { WeekPicker } from '@/components/attendance/WeekPicker'
import { AttendanceTable } from '@/components/attendance/AttendanceTable'
import { AttendanceModal } from '@/components/attendance/AttendanceModal'
import { HourAdjustmentModal } from '@/components/attendance/HourAdjustmentModal'
import { HourAdjustmentsPanel } from '@/components/attendance/HourAdjustmentsPanel'
import { Button } from '@/components/ui/Button'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { getWeekStart, getWeekEnd } from '@/lib/weekUtils'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { parseAttendance, parseEmployee, type Attendance, type Employee } from '@/types'
import {
  deleteAttendanceById,
  deleteWeekForEmployee,
  syncPunchAttendanceForEmployeeWeek,
} from '@/lib/attendanceOps'
import { useToast } from '@/contexts/ToastContext'
import { formatDateEn, roundDisplay, toYmd } from '@/lib/format'
import { parse } from 'date-fns'
import type { WeekDayLabel } from '@/lib/weekUtils'
import { ArrowRightLeft, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { useFridayAttendance } from '@/contexts/FridayAttendanceContext'
import { cn } from '@/lib/utils'
import {
  defaultTargetWeekStart,
  loadManualTransfersForWeek,
  saveManualTransferRecord,
  type ManualTransferRecord,
} from '@/lib/manualTransfer'
import {
  loadWeekHourAdjustments,
  type HourAdjustmentKind,
  type WeekHourAdjustment,
} from '@/lib/hourAdjustments'

export function AttendancePage() {
  const toast = useToast()
  const { fridayAttendanceEnabled, setFridayAttendanceEnabled } = useFridayAttendance()
  const [weekRef, setWeekRef] = useState(() => getWeekStart(new Date()))
  const [employees, setEmployees] = useState<Employee[]>([])
  const [empId, setEmpId] = useState<string>('')
  const [rows, setRows] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalCtx, setModalCtx] = useState<{
    rowLabel: WeekDayLabel
    rowDate: Date
    existing?: Attendance
  } | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferWeekRef, setTransferWeekRef] = useState(() => getWeekStart(new Date()))
  const [transferAmount, setTransferAmount] = useState<string>('')
  const [transferNote, setTransferNote] = useState('')
  const [transferSaving, setTransferSaving] = useState(false)
  const [transfers, setTransfers] = useState<ManualTransferRecord[]>([])
  const [hourAdjustments, setHourAdjustments] = useState<WeekHourAdjustment[]>([])
  const [hourModalOpen, setHourModalOpen] = useState(false)
  const [hourModalKind, setHourModalKind] = useState<HourAdjustmentKind>('standard')

  const [delAtt, setDelAtt] = useState<Attendance | null>(null)
  const [delWeekOpen, setDelWeekOpen] = useState(false)

  const weekStart = getWeekStart(weekRef)
  const wsStr = toYmd(weekStart)
  const selectedEmployee = employees.find((e) => e.id === empId) ?? null
  const targetTransferWs = toYmd(getWeekStart(transferWeekRef))

  const loadEmployees = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setEmployees([])
      return
    }
    const { data, error } = await supabase.from('employees').select('*').order('employee_id')
    if (error) {
      console.error(error)
      setEmployees([])
      return
    }
    const list = (data ?? []).map(parseEmployee)
    setEmployees(list)
    setEmpId((prev) => {
      if (prev && list.some((e) => e.id === prev)) return prev
      return list[0]?.id ?? ''
    })
  }, [])

  const loadRows = useCallback(async () => {
    if (!isSupabaseConfigured() || !empId) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', empId)
        .eq('week_start_date', wsStr)
      if (error) throw error
      setRows((data ?? []).map(parseAttendance))
    } catch (e) {
      console.error(e)
      setRows([])
    } finally {
      setLoading(false)
    }

    try {
      const weekDate = parse(wsStr, 'yyyy-MM-dd', new Date())
      const employee = employees.find((e) => e.id === empId)
      if (!employee) return
      const changed = await syncPunchAttendanceForEmployeeWeek(employee, weekDate)
      if (!changed) return
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', empId)
        .eq('week_start_date', wsStr)
      if (error) throw error
      setRows((data ?? []).map(parseAttendance))
    } catch (e) {
      console.error('syncPunchAttendanceForEmployeeWeek', e)
    }
  }, [empId, wsStr, employees])

  const loadTransfers = useCallback(async () => {
    if (!isSupabaseConfigured() || !empId) {
      setTransfers([])
      return
    }
    try {
      const list = await loadManualTransfersForWeek(empId, wsStr)
      setTransfers(list)
    } catch (e) {
      console.error(e)
      setTransfers([])
    }
  }, [empId, wsStr])

  useEffect(() => {
    void loadEmployees()
  }, [loadEmployees])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  useEffect(() => {
    void loadTransfers()
  }, [loadTransfers])

  const loadHourAdjustments = useCallback(async () => {
    if (!isSupabaseConfigured() || !empId) {
      setHourAdjustments([])
      return
    }
    try {
      const list = await loadWeekHourAdjustments(empId, wsStr)
      setHourAdjustments(list)
    } catch (e) {
      console.error(e)
      setHourAdjustments([])
    }
  }, [empId, wsStr])

  useEffect(() => {
    void loadHourAdjustments()
  }, [loadHourAdjustments])

  function openHourModal(kind: HourAdjustmentKind) {
    setHourModalKind(kind)
    setHourModalOpen(true)
  }

  const outgoingTransfers = useMemo(
    () => transfers.filter((t) => t.source_week_start === wsStr),
    [transfers, wsStr]
  )

  const incomingTransfers = useMemo(
    () => transfers.filter((t) => t.target_week_start === wsStr),
    [transfers, wsStr]
  )

  const weekRangeLabel = useMemo(() => {
    const end = getWeekEnd(weekStart)
    return `${formatDateEn(weekStart)} — ${formatDateEn(end)}`
  }, [weekStart])

  async function confirmDeleteWeek() {
    if (!selectedEmployee) return
    try {
      await deleteWeekForEmployee(selectedEmployee.id, weekStart)
      toast.success()
      void loadRows()
    } catch (e) {
      console.error(e)
      toast.error()
    }
  }

  async function confirmDeleteRow() {
    if (!delAtt) return
    try {
      await deleteAttendanceById(delAtt.id)
      toast.success()
      setDelAtt(null)
      void loadRows()
    } catch (e) {
      console.error(e)
      toast.error()
    }
  }

  function openTransferModal() {
    setTransferWeekRef(defaultTargetWeekStart(weekStart))
    setTransferOpen(true)
  }

  async function saveManualTransfer() {
    if (!selectedEmployee || transferSaving) return
    const amount = Number(transferAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('أدخل مبلغ ترحيل صحيح')
      return
    }
    setTransferSaving(true)
    try {
      const targetWeekStart = getWeekStart(transferWeekRef)
      await saveManualTransferRecord({
        employee: selectedEmployee,
        sourceWeekStart: weekStart,
        targetWeekStart,
        amount,
        note: transferNote,
      })
      setTransferAmount('')
      setTransferNote('')
      setTransferOpen(false)
      await loadTransfers()
      toast.success('تم الترحيل — سيظهر في أسبوع ' + toYmd(targetWeekStart) + ' ضمن سهرة الأربعاء')
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : 'فشل حفظ الترحيل'
      toast.error(msg)
    } finally {
      setTransferSaving(false)
    }
  }

  return (
    <Layout weekReference={weekStart}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 text-right">
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">الدوام</h2>
        <div className="flex flex-wrap items-center gap-3">
          <WeekPicker value={weekRef} onChange={(d) => setWeekRef(d)} />
          <Button
            variant="secondary"
            disabled={!selectedEmployee}
            onClick={openTransferModal}
            className="min-h-11 w-full justify-center sm:w-auto"
          >
            <ArrowRightLeft className="h-4 w-4" /> ترحيل مبلغ
          </Button>
          <Button
            variant="danger"
            disabled={!selectedEmployee}
            onClick={() => setDelWeekOpen(true)}
            className="min-h-11 w-full justify-center sm:w-auto"
          >
            <Trash2 className="h-4 w-4" /> حذف أسبوع
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">اختر موظف</label>
        <select
          className="min-h-11 w-full max-w-full rounded-xl border border-[var(--color-border)] bg-app-card px-4 py-3 font-semibold text-[var(--color-text-primary)] shadow-sm outline-none transition-colors focus:border-[var(--color-accent-blue)] focus:ring-2 focus:ring-[var(--color-accent-blue)]/25 sm:max-w-md"
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.employee_id})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-4 text-right shadow-sm sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">دوام يوم الجمعة (لجميع الموظفين)</p>
            <p className="mt-1 text-sm text-slate-600">
              <strong className="text-slate-800">إيقاف:</strong> لا زر «إضافة» للجمعة ولا يُحسب غياب يوم الجمعة.
              <span className="mx-1">—</span>
              <strong className="text-slate-800">تشغيل:</strong> يظهر «إضافة» ليوم الجمعة ويُحسب الغياب كباقي الأيام.
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
            <span className="text-sm font-medium text-slate-600">
              {fridayAttendanceEnabled ? 'تشغيل' : 'إيقاف'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={fridayAttendanceEnabled}
              aria-label={fridayAttendanceEnabled ? 'إيقاف دوام الجمعة' : 'تشغيل دوام الجمعة'}
              onClick={() => setFridayAttendanceEnabled(!fridayAttendanceEnabled)}
              className={cn(
                'relative h-10 w-[3.75rem] min-h-11 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 sm:h-8 sm:min-h-0 sm:w-14',
                fridayAttendanceEnabled ? 'bg-slate-700' : 'bg-slate-300'
              )}
            >
              <span
                className={cn(
                  'absolute top-1.5 h-7 w-7 rounded-full bg-white shadow-sm transition-all duration-200 ease-out sm:top-1 sm:h-6 sm:w-6',
                  fridayAttendanceEnabled ? 'inset-inline-end-1' : 'inset-inline-start-1'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-[600px] w-full rounded-2xl" />
      ) : !selectedEmployee ? (
        <p className="text-[var(--color-text-secondary)]">لا يوجد موظفون.</p>
      ) : (
        <div className="space-y-4">
          <HourAdjustmentsPanel
            employee={selectedEmployee}
            adjustments={hourAdjustments}
            onAdd={openHourModal}
            onChanged={() => void loadHourAdjustments()}
          />
          <AttendanceTable
          employee={selectedEmployee}
          weekStart={weekStart}
          rows={rows}
          hourAdjustments={hourAdjustments}
          onAdd={(rowLabel, rowDate) => {
            setModalCtx({ rowLabel, rowDate })
            setModalOpen(true)
          }}
          onEdit={(rowLabel, rowDate, att) => {
            setModalCtx({ rowLabel, rowDate, existing: att })
            setModalOpen(true)
          }}
          onDeleteRow={(att) => setDelAtt(att)}
        />
        </div>
      )}

      {selectedEmployee ? (
        <div className="mt-6 grid grid-cols-1 gap-4 text-right lg:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-4">
            <p className="text-sm font-bold text-emerald-900">مبالغ واردة لهذا الأسبوع</p>
            {incomingTransfers.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">لا يوجد ترحيل وارد.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {incomingTransfers.map((t) => (
                  <li key={t.id} className="rounded-lg border border-emerald-200/70 bg-white px-3 py-2">
                    <p className="font-mono-nums font-semibold text-emerald-900">
                      د.أ {roundDisplay(t.amount)}
                    </p>
                    <p className="text-xs text-slate-600">من أسبوع {t.source_week_start}</p>
                    {t.note ? <p className="text-xs text-slate-500">{t.note}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-4">
            <p className="text-sm font-bold text-amber-900">مبالغ مرحّلة من هذا الأسبوع</p>
            {outgoingTransfers.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">لا يوجد ترحيل صادر.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {outgoingTransfers.map((t) => (
                  <li key={t.id} className="rounded-lg border border-amber-200/70 bg-white px-3 py-2">
                    <p className="font-mono-nums font-semibold text-amber-900">
                      د.أ {roundDisplay(t.amount)}
                    </p>
                    <p className="text-xs text-slate-600">إلى أسبوع {t.target_week_start}</p>
                    {t.note ? <p className="text-xs text-slate-500">{t.note}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <AttendanceModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setModalCtx(null)
        }}
        employee={selectedEmployee}
        rowDate={modalCtx?.rowDate ?? weekStart}
        weekStart={weekStart}
        rowLabel={modalCtx?.rowLabel ?? 'الخميس'}
        existingId={modalCtx?.existing?.id}
        initialCheckIn={modalCtx?.existing?.check_in}
        initialCheckOut={modalCtx?.existing?.check_out}
        onSaved={() => void loadRows()}
      />

      <HourAdjustmentModal
        open={hourModalOpen}
        onClose={() => setHourModalOpen(false)}
        employee={selectedEmployee}
        weekStart={weekStart}
        initialKind={hourModalKind}
        onSaved={() => void loadHourAdjustments()}
      />

      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="ترحيل مبلغ إلى أسبوع قادم"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransferOpen(false)} className="w-full sm:w-auto">
              إلغاء
            </Button>
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              disabled={transferSaving}
              onClick={() => {
                void saveManualTransfer()
              }}
            >
              {transferSaving ? 'جاري الحفظ…' : 'حفظ الترحيل'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-right">
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            من أسبوع <span className="font-mono-nums font-semibold">{wsStr}</span> إلى أسبوع{' '}
            <span className="font-mono-nums font-semibold">{targetTransferWs}</span>
          </p>
          <div>
            <p className="mb-1 text-sm font-semibold text-[var(--color-text-secondary)]">الأسبوع الهدف</p>
            <WeekPicker value={transferWeekRef} onChange={setTransferWeekRef} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[var(--color-text-secondary)]">المبلغ</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-app-card px-3 py-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-blue)]"
              placeholder="مثال: 25.50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[var(--color-text-secondary)]">ملاحظة (اختياري)</label>
            <input
              type="text"
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-app-card px-3 py-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-blue)]"
              placeholder="سبب أو وصف الترحيل"
            />
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!delAtt}
        onClose={() => setDelAtt(null)}
        title="تأكيد الحذف"
        message={
          delAtt
            ? 'هل تريد حذف دوام ' +
              delAtt.day_of_week +
              ' ليوم ' +
              formatDateEn(new Date(delAtt.date + 'T12:00:00')) +
              '\u061F'
            : ''
        }
        danger
        confirmLabel="حذف"
        onConfirm={confirmDeleteRow}
      />

      <ConfirmModal
        open={delWeekOpen}
        onClose={() => setDelWeekOpen(false)}
        title="تأكيد حذف الأسبوع"
        message={
          selectedEmployee
            ? 'هل تريد حذف كامل أسبوع ' +
              weekRangeLabel +
              ' للموظف ' +
              selectedEmployee.name +
              '\u061F لن يؤثر على الأسابيع الأخرى.'
            : ''
        }
        danger
        confirmLabel="حذف الأسبوع"
        onConfirm={confirmDeleteWeek}
      />
    </Layout>
  )
}
