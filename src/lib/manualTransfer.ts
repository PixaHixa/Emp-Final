import { getCarryOverDate } from '@/lib/weekUtils'
import { supabase } from '@/lib/supabase'
import { toYmd } from '@/lib/format'
import { addDays, isAfter, parse } from 'date-fns'
import type { Employee } from '@/types'

export type ManualTransferRecord = {
  id: string
  employee_id: string
  source_week_start: string
  target_week_start: string
  amount: number
  note: string | null
  created_at: string | null
}

const LS_KEY = 'industrial-sys-manual-transfers'

function forDbDecimal(n: number): number {
  return Math.round(n * 1e6) / 1e6
}

function readLocalTransfers(): ManualTransferRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ManualTransferRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalTransfers(items: ManualTransferRecord[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

function isMissingTransfersTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message ?? '').toLowerCase()
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    msg.includes('manual_transfers') ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  )
}

/** إضافة مبلغ مرحّل إلى صف سهرة الأربعاء في الأسبوع الهدف */
export async function addCarryAmountToTargetWeek(
  employeeId: string,
  targetWeekStart: Date,
  amount: number,
): Promise<void> {
  const targetWs = toYmd(targetWeekStart)
  const carryDate = toYmd(getCarryOverDate(targetWeekStart))

  const { data: existing, error: fetchErr } = await supabase
    .from('attendance')
    .select('daily_wage, carried_over_amount')
    .eq('employee_id', employeeId)
    .eq('week_start_date', targetWs)
    .eq('date', carryDate)
    .eq('is_carried_over', true)
    .maybeSingle()

  if (fetchErr) throw fetchErr

  const prev = existing?.daily_wage != null ? Number(existing.daily_wage) : 0
  const total = forDbDecimal(prev + amount)

  const carryPayload = {
    employee_id: employeeId,
    date: carryDate,
    day_of_week: 'سهرة الأربعاء',
    check_in: '00:00:00',
    check_out: '00:00:00',
    hours_worked: 0,
    overtime_hours: 0,
    daily_wage: total,
    is_carried_over: true,
    carried_over_amount: total,
    week_start_date: targetWs,
  }

  const { error: upsertErr } = await supabase.from('attendance').upsert(carryPayload, {
    onConflict: 'employee_id,week_start_date,date',
  })
  if (upsertErr) throw upsertErr
}

export function isTargetWeekAfterSource(sourceWeekStart: string, targetWeekStart: string): boolean {
  const src = parse(sourceWeekStart, 'yyyy-MM-dd', new Date())
  const tgt = parse(targetWeekStart, 'yyyy-MM-dd', new Date())
  return isAfter(tgt, src)
}

export async function saveManualTransferRecord(input: {
  employee: Employee
  sourceWeekStart: Date
  targetWeekStart: Date
  amount: number
  note?: string
}): Promise<void> {
  const { employee, sourceWeekStart, targetWeekStart, amount, note } = input
  const sourceWs = toYmd(sourceWeekStart)
  const targetWs = toYmd(targetWeekStart)

  if (!isTargetWeekAfterSource(sourceWs, targetWs)) {
    throw new Error('اختر أسبوعاً بعد الأسبوع الحالي')
  }

  await addCarryAmountToTargetWeek(employee.id, targetWeekStart, amount)

  const ledger: ManualTransferRecord = {
    id: crypto.randomUUID(),
    employee_id: employee.id,
    source_week_start: sourceWs,
    target_week_start: targetWs,
    amount: forDbDecimal(amount),
    note: note?.trim() || null,
    created_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('manual_transfers').insert({
    employee_id: ledger.employee_id,
    source_week_start: ledger.source_week_start,
    target_week_start: ledger.target_week_start,
    amount: ledger.amount,
    note: ledger.note,
  })

  if (error && isMissingTransfersTable(error)) {
    writeLocalTransfers([...readLocalTransfers(), ledger])
    return
  }
  if (error) throw error
}

export async function loadManualTransfersForWeek(
  employeeId: string,
  weekStartStr: string,
): Promise<ManualTransferRecord[]> {
  const [incomingRes, outgoingRes] = await Promise.all([
    supabase
      .from('manual_transfers')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('target_week_start', weekStartStr)
      .order('created_at', { ascending: false }),
    supabase
      .from('manual_transfers')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('source_week_start', weekStartStr)
      .order('created_at', { ascending: false }),
  ])

  if (
    isMissingTransfersTable(incomingRes.error) ||
    isMissingTransfersTable(outgoingRes.error)
  ) {
    const local = readLocalTransfers().filter((t) => t.employee_id === employeeId)
    const merged = local.filter(
      (t) => t.target_week_start === weekStartStr || t.source_week_start === weekStartStr,
    )
    return Array.from(new Map(merged.map((t) => [t.id, t])).values())
  }

  if (incomingRes.error) throw incomingRes.error
  if (outgoingRes.error) throw outgoingRes.error

  const merged = [...(incomingRes.data ?? []), ...(outgoingRes.data ?? [])].map((row) => ({
    id: String(row.id),
    employee_id: String(row.employee_id),
    source_week_start: String(row.source_week_start),
    target_week_start: String(row.target_week_start),
    amount: Number(row.amount ?? 0),
    note: row.note ? String(row.note) : null,
    created_at: row.created_at ? String(row.created_at) : null,
  }))
  return Array.from(new Map(merged.map((t) => [t.id, t])).values())
}

/** أسبوع الخميس التالي للأسبوع الحالي */
export function defaultTargetWeekStart(sourceWeekStart: Date): Date {
  return addDays(sourceWeekStart, 7)
}
