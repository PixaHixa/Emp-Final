import type { Database } from './database'

export type EmployeeRow = Database['public']['Tables']['employees']['Row']
export type AttendanceRow = Database['public']['Tables']['attendance']['Row']

export type Employee = {
  id: string
  employee_id: string
  name: string
  hourly_rate: number
  transport_allowance: number
  daily_rate: number | null
  weekly_rate: number | null
  created_at: string | null
}

export type Attendance = {
  id: string
  employee_id: string
  date: string
  day_of_week: string
  check_in: string | null
  check_out: string | null
  hours_worked: number | null
  overtime_hours: number | null
  daily_wage: number | null
  is_carried_over: boolean
  carried_over_amount: number
  week_start_date: string
  created_at: string | null
}

export function parseEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    employee_id: row.employee_id,
    name: row.name,
    hourly_rate: Number(row.hourly_rate),
    transport_allowance: Number(row.transport_allowance ?? 0),
    daily_rate: row.daily_rate != null ? Number(row.daily_rate) : null,
    weekly_rate: row.weekly_rate != null ? Number(row.weekly_rate) : null,
    created_at: row.created_at,
  }
}

export function parseAttendance(row: AttendanceRow): Attendance {
  return {
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
}
