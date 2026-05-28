import { useCallback, useEffect, useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { WeekPicker } from '@/components/attendance/WeekPicker'
import { ReportTable } from '@/components/reports/ReportTable'
import { getWeekStart } from '@/lib/weekUtils'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { parseAttendance, parseEmployee, type Attendance, type Employee } from '@/types'
import { toYmd } from '@/lib/format'

export function ReportsPage() {
  const [weekRef, setWeekRef] = useState(() => getWeekStart(new Date()))
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)

  const weekStart = getWeekStart(weekRef)
  const wsStr = toYmd(weekStart)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setEmployees([])
      setAttendance([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [empRes, attRes] = await Promise.all([
        supabase.from('employees').select('*').order('employee_id'),
        supabase.from('attendance').select('*').eq('week_start_date', wsStr),
      ])
      if (empRes.error) throw empRes.error
      if (attRes.error) throw attRes.error
      setEmployees((empRes.data ?? []).map(parseEmployee))
      setAttendance((attRes.data ?? []).map(parseAttendance))
    } catch (e) {
      console.error(e)
      setEmployees([])
      setAttendance([])
    } finally {
      setLoading(false)
    }
  }, [wsStr])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Layout weekReference={weekStart}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 text-right">
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">التقارير</h2>
        <WeekPicker value={weekRef} onChange={(d) => setWeekRef(d)} />
      </div>
      <ReportTable weekStart={weekStart} employees={employees} attendance={attendance} loading={loading} />
    </Layout>
  )
}
