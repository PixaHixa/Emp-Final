import { calculateDailyWage, getWednesdayCarryOver } from '@/lib/calculations'
import { getAttendancePunchStatus } from '@/lib/attendancePunch'
import { getCarryOverDate, getWeekStart } from '@/lib/weekUtils'
import { fromDbTime, toDbTime } from '@/lib/timeFormat'
import { supabase } from '@/lib/supabase'
import { addDays, format, parse, subDays } from 'date-fns'
import type { Attendance, Employee } from '@/types'
import type { WeekDayLabel } from '@/lib/weekUtils'

export type SaveAttendanceInput = {
  employee: Employee
  /** تاريخ الصف في الجدول */
  rowDate: Date
  weekStart: Date
  rowLabel: WeekDayLabel
  checkIn24: string
  checkOut24: string
  existingId?: string
}

function fmt(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

/** يطابق حد DECIMAL(10,6) في Postgres دون تغيير منطق الحساب */
function forDbDecimal(n: number): number {
  return Math.round(n * 1e6) / 1e6
}

function rowLabelToArabic(rowLabel: WeekDayLabel): string {
  if (rowLabel === 'الجمعة') return 'الجمعة'
  if (rowLabel === 'الخميس') return 'الخميس'
  if (rowLabel === 'السبت') return 'السبت'
  if (rowLabel === 'الأحد') return 'الأحد'
  if (rowLabel === 'الاثنين') return 'الاثنين'
  if (rowLabel === 'الثلاثاء') return 'الثلاثاء'
  return 'الأربعاء'
}

export type PunchWageResult = {
  hoursWorked: number
  overtime: number
  dailyWage: number
  carriedOver: number
}

/** حساب الراتب من أوقات البصمة (نفس منطق الحفظ اليدوي) */
export function computeWageFromPunch(
  employee: Employee,
  dayOfWeek: string,
  checkIn24: string,
  checkOut24: string,
): PunchWageResult {
  const cin = fromDbTime(toDbTime(checkIn24))
  const cout = fromDbTime(toDbTime(checkOut24))
  const wageCalc = calculateDailyWage({
    checkIn: cin,
    checkOut: cout,
    hourlyRate: employee.hourly_rate,
    transportAllowance: employee.transport_allowance,
    dayOfWeek,
  })
  let dailyWage = forDbDecimal(wageCalc.dailyWage)
  let carriedOver = 0
  if (dayOfWeek === 'الأربعاء') {
    const split = getWednesdayCarryOver({
      totalWage: wageCalc.dailyWage,
      hourlyRate: employee.hourly_rate,
      transportAllowance: employee.transport_allowance,
    })
    dailyWage = forDbDecimal(split.wednesdayWage)
    carriedOver = forDbDecimal(split.carriedAmount)
  }
  return {
    hoursWorked: forDbDecimal(wageCalc.hoursWorked),
    overtime: forDbDecimal(wageCalc.overtimeHours),
    dailyWage,
    carriedOver,
  }
}

/** حذف ترحيل مرتبط بأربعاء محددة (نفس الموظف، الأسبوع التالي) */
async function deleteCarryForWednesday(employeeId: string, wednesdayDate: Date) {
  const nextWeekStart = addDays(getWeekStart(wednesdayDate), 7)
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('employee_id', employeeId)
    .eq('week_start_date', fmt(nextWeekStart))
    .eq('is_carried_over', true)
    .eq('date', fmt(wednesdayDate))
  if (error) throw error
}

async function upsertWednesdayCarry(
  employee: Employee,
  wednesdayDate: Date,
  weekStart: Date,
  carriedOver: number,
) {
  await deleteCarryForWednesday(employee.id, wednesdayDate)
  if (carriedOver <= 1e-5) return
  const nextWeekStart = addDays(weekStart, 7)
  const carryDate = getCarryOverDate(nextWeekStart)
  const carryPayload = {
    employee_id: employee.id,
    date: fmt(carryDate),
    day_of_week: 'سهرة الأربعاء' as const,
    check_in: '00:00:00',
    check_out: '00:00:00',
    hours_worked: 0,
    overtime_hours: 0,
    daily_wage: forDbDecimal(carriedOver),
    is_carried_over: true,
    carried_over_amount: forDbDecimal(carriedOver),
    week_start_date: fmt(nextWeekStart),
  }
  const { error: carryErr } = await supabase.from('attendance').upsert(carryPayload, {
    onConflict: 'employee_id,week_start_date,date',
  })
  if (carryErr) {
    const hint =
      carryErr.code === '23505'
        ? ' (شغّل supabase/migrations/fix_attendance_unique.sql)'
        : ''
    throw new Error((carryErr.message || 'فشل حفظ الترحيل لسهرة الأربعاء') + hint)
  }
}

async function fetchCarryRowForWednesday(employeeId: string, wednesdayDate: Date) {
  const nextWeekStart = addDays(getWeekStart(wednesdayDate), 7)
  const { data, error } = await supabase
    .from('attendance')
    .select('id, daily_wage')
    .eq('employee_id', employeeId)
    .eq('week_start_date', fmt(nextWeekStart))
    .eq('is_carried_over', true)
    .eq('date', fmt(wednesdayDate))
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * بعد بصمة الهاتف (حضور + مغادرة): يحدّث الساعات والراتب ويُنشئ سهرة الأربعاء إن وُجد إضافي.
 * يُستخدم عند فتح التطبيق إن لم يُشغَّل trigger قاعدة البيانات بعد.
 */
export async function finalizePunchAttendanceRow(
  att: Attendance,
  employee: Employee,
): Promise<boolean> {
  if (att.is_carried_over || att.day_of_week === 'سهرة الأربعاء') return false
  if (getAttendancePunchStatus(att) !== 'complete') return false
  if (!att.check_in || !att.check_out) return false

  const dayOfWeek = att.day_of_week || 'الأربعاء'
  const wage = computeWageFromPunch(employee, dayOfWeek, att.check_in, att.check_out)
  const rowDate = parse(att.date, 'yyyy-MM-dd', new Date())
  const weekStart = parse(att.week_start_date, 'yyyy-MM-dd', new Date())

  const wageMismatch =
    att.hours_worked == null ||
    att.daily_wage == null ||
    Math.abs((att.hours_worked ?? 0) - wage.hoursWorked) > 1e-4 ||
    Math.abs((att.daily_wage ?? 0) - wage.dailyWage) > 1e-4 ||
    Math.abs((att.overtime_hours ?? 0) - wage.overtime) > 1e-4

  let carryMismatch = false
  if (dayOfWeek === 'الأربعاء') {
    const carry = await fetchCarryRowForWednesday(employee.id, rowDate)
    const carryAmt = carry?.daily_wage != null ? Number(carry.daily_wage) : 0
    if (wage.carriedOver > 1e-5) {
      carryMismatch = !carry || Math.abs(carryAmt - wage.carriedOver) > 1e-4
    } else {
      carryMismatch = Boolean(carry)
    }
  }

  if (!wageMismatch && !carryMismatch) return false

  const payload = {
    check_in: toDbTime(att.check_in),
    check_out: toDbTime(att.check_out),
    hours_worked: wage.hoursWorked,
    overtime_hours: wage.overtime,
    daily_wage: wage.dailyWage,
    is_carried_over: false,
    carried_over_amount: 0,
  }
  const { error } = await supabase.from('attendance').update(payload).eq('id', att.id)
  if (error) throw error

  if (dayOfWeek === 'الأربعاء') {
    await upsertWednesdayCarry(employee, rowDate, weekStart, wage.carriedOver)
  }
  return true
}

/** مزامنة بصمات أسبوع موظف (والأربعاء السابق لصف سهرة هذا الأسبوع) */
export async function syncPunchAttendanceForEmployeeWeek(
  employee: Employee,
  weekStart: Date,
): Promise<boolean> {
  const ws = fmt(weekStart)
  const prevWs = fmt(subDays(weekStart, 7))

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employee.id)
    .in('week_start_date', [ws, prevWs])
    .eq('is_carried_over', false)
  if (error) throw error

  let changed = false
  for (const row of data ?? []) {
    const att: Attendance = {
      id: row.id,
      employee_id: row.employee_id,
      date: row.date,
      day_of_week: row.day_of_week,
      check_in: row.check_in,
      check_out: row.check_out,
      hours_worked: row.hours_worked != null ? Number(row.hours_worked) : null,
      overtime_hours: row.overtime_hours != null ? Number(row.overtime_hours) : null,
      daily_wage: row.daily_wage != null ? Number(row.daily_wage) : null,
      is_carried_over: Boolean(row.is_carried_over),
      carried_over_amount: Number(row.carried_over_amount ?? 0),
      week_start_date: row.week_start_date,
      created_at: row.created_at,
    }
    if (await finalizePunchAttendanceRow(att, employee)) changed = true
  }
  return changed
}

export async function syncPunchAttendanceForWeek(weekStart: Date): Promise<boolean> {
  const { data: emps, error } = await supabase.from('employees').select('*')
  if (error) throw error
  let changed = false
  for (const row of emps ?? []) {
    const employee: Employee = {
      id: row.id,
      employee_id: row.employee_id,
      name: row.name,
      hourly_rate: Number(row.hourly_rate),
      transport_allowance: Number(row.transport_allowance ?? 0),
      daily_rate: row.daily_rate != null ? Number(row.daily_rate) : null,
      weekly_rate: row.weekly_rate != null ? Number(row.weekly_rate) : null,
      created_at: row.created_at,
    }
    if (await syncPunchAttendanceForEmployeeWeek(employee, weekStart)) changed = true
  }
  return changed
}

export async function saveAttendanceRecord(input: SaveAttendanceInput) {
  const { employee, rowDate, weekStart, rowLabel, checkIn24, checkOut24, existingId } = input
  if (rowLabel === 'سهرة الأربعاء') {
    throw new Error('لا يمكن إضافة دوام يدوي لصف سهرة الأربعاء')
  }

  const weekStartStr = fmt(weekStart)
  const dateStr = fmt(rowDate)
  const arabicDay = rowLabelToArabic(rowLabel)
  const { hoursWorked, overtime, dailyWage, carriedOver } = computeWageFromPunch(
    employee,
    arabicDay,
    checkIn24,
    checkOut24,
  )

  const payload = {
    employee_id: employee.id,
    date: dateStr,
    day_of_week: arabicDay,
    check_in: toDbTime(checkIn24),
    check_out: toDbTime(checkOut24),
    hours_worked: hoursWorked,
    overtime_hours: overtime,
    daily_wage: dailyWage,
    is_carried_over: false,
    carried_over_amount: 0,
    week_start_date: weekStartStr,
  }

  let newRowId: string | undefined

  if (existingId) {
    const { error } = await supabase.from('attendance').update(payload).eq('id', existingId)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('attendance').insert(payload).select('id').maybeSingle()
    if (error) throw error
    newRowId = data?.id
  }

  if (arabicDay === 'الأربعاء') {
    try {
      await upsertWednesdayCarry(employee, rowDate, weekStart, carriedOver)
    } catch (carryErr) {
      if (newRowId) {
        await supabase.from('attendance').delete().eq('id', newRowId)
      }
      throw carryErr
    }
  }
}

export async function deleteAttendanceById(id: string) {
  const { data: row } = await supabase.from('attendance').select('*').eq('id', id).maybeSingle()
  if (row && !row.is_carried_over && row.day_of_week === 'الأربعاء' && row.date) {
    await deleteCarryForWednesday(row.employee_id, parse(row.date, 'yyyy-MM-dd', new Date()))
  }
  const { error } = await supabase.from('attendance').delete().eq('id', id)
  if (error) throw error
}

export async function deleteWeekForEmployee(employeeId: string, weekStart: Date) {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('employee_id', employeeId)
    .eq('week_start_date', fmt(weekStart))
  if (error) throw error
}
