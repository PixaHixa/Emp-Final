import { calculateOvertimePay } from '@/lib/calculations'
import { toYmd } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { Employee } from '@/types'

export type HourAdjustmentKind = 'standard' | 'overtime'

export type WeekHourAdjustment = {
  id: string
  employee_id: string
  week_start_date: string
  kind: HourAdjustmentKind
  hours: number
  note: string | null
  created_at: string | null
}

const LS_KEY = 'industrial-sys-week-hour-adjustments'

export function readLocalAdjustmentsForWeek(weekStartStr: string): WeekHourAdjustment[] {
  return readLocal().filter((a) => a.week_start_date === weekStartStr)
}

function readLocal(): WeekHourAdjustment[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WeekHourAdjustment[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(items: WeekHourAdjustment[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message ?? '').toLowerCase()
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    msg.includes('week_hour_adjustments') ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  )
}

export function adjustmentKindLabel(kind: HourAdjustmentKind): string {
  return kind === 'standard' ? 'ساعة أساسية' : 'ساعة إضافية'
}

export function payForAdjustmentHours(
  kind: HourAdjustmentKind,
  hours: number,
  hourlyRate: number,
): number {
  if (hours <= 0) return 0
  if (kind === 'standard') return hours * hourlyRate
  return calculateOvertimePay(hours, hourlyRate)
}

export function computeAdjustmentTotals(
  items: WeekHourAdjustment[],
  hourlyRate: number,
): {
  standardHours: number
  standardPay: number
  overtimeHours: number
  overtimePay: number
  totalPay: number
} {
  let standardHours = 0
  let overtimeHours = 0
  for (const a of items) {
    if (a.kind === 'standard') standardHours += a.hours
    else overtimeHours += a.hours
  }
  const standardPay = payForAdjustmentHours('standard', standardHours, hourlyRate)
  const overtimePay = payForAdjustmentHours('overtime', overtimeHours, hourlyRate)
  return {
    standardHours,
    standardPay,
    overtimeHours,
    overtimePay,
    totalPay: standardPay + overtimePay,
  }
}

export async function loadWeekHourAdjustments(
  employeeId: string,
  weekStartStr: string,
): Promise<WeekHourAdjustment[]> {
  const { data, error } = await supabase
    .from('week_hour_adjustments')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('week_start_date', weekStartStr)
    .order('created_at', { ascending: false })

  if (isMissingTable(error)) {
    return readLocal().filter(
      (a) => a.employee_id === employeeId && a.week_start_date === weekStartStr,
    )
  }
  if (error) throw error

  return (data ?? []).map((row) => ({
    id: String(row.id),
    employee_id: String(row.employee_id),
    week_start_date: String(row.week_start_date),
    kind: row.kind as HourAdjustmentKind,
    hours: Number(row.hours ?? 0),
    note: row.note ? String(row.note) : null,
    created_at: row.created_at ? String(row.created_at) : null,
  }))
}

export async function saveWeekHourAdjustment(input: {
  employee: Employee
  weekStart: Date
  kind: HourAdjustmentKind
  hours: number
  note?: string
}): Promise<WeekHourAdjustment> {
  const { employee, weekStart, kind, hours, note } = input
  const weekStartStr = toYmd(weekStart)
  const roundedHours = Math.round(hours * 1e6) / 1e6

  const record: WeekHourAdjustment = {
    id: crypto.randomUUID(),
    employee_id: employee.id,
    week_start_date: weekStartStr,
    kind,
    hours: roundedHours,
    note: note?.trim() || null,
    created_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('week_hour_adjustments')
    .insert({
      employee_id: record.employee_id,
      week_start_date: record.week_start_date,
      kind: record.kind,
      hours: record.hours,
      note: record.note,
    })
    .select('*')
    .single()

  if (error && isMissingTable(error)) {
    writeLocal([...readLocal(), record])
    return record
  }
  if (error) throw error

  return {
    id: String(data.id),
    employee_id: String(data.employee_id),
    week_start_date: String(data.week_start_date),
    kind: data.kind as HourAdjustmentKind,
    hours: Number(data.hours ?? 0),
    note: data.note ? String(data.note) : null,
    created_at: data.created_at ? String(data.created_at) : null,
  }
}

/** كل الإضافات اليدوية لأسبوع (لوحة التحكم) */
export async function loadAllWeekHourAdjustments(
  weekStartStr: string,
): Promise<WeekHourAdjustment[]> {
  const { data, error } = await supabase
    .from('week_hour_adjustments')
    .select('*')
    .eq('week_start_date', weekStartStr)
    .order('created_at', { ascending: false })

  if (isMissingTable(error)) {
    return readLocalAdjustmentsForWeek(weekStartStr)
  }
  if (error) throw error

  return (data ?? []).map((row) => ({
    id: String(row.id),
    employee_id: String(row.employee_id),
    week_start_date: String(row.week_start_date),
    kind: row.kind as HourAdjustmentKind,
    hours: Number(row.hours ?? 0),
    note: row.note ? String(row.note) : null,
    created_at: row.created_at ? String(row.created_at) : null,
  }))
}

export async function deleteWeekHourAdjustment(id: string): Promise<void> {
  const { error } = await supabase.from('week_hour_adjustments').delete().eq('id', id)
  if (error && isMissingTable(error)) {
    writeLocal(readLocal().filter((a) => a.id !== id))
    return
  }
  if (error) throw error
}
