import { useCallback, useEffect, useMemo, useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { WeekPicker } from '@/components/attendance/WeekPicker'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDateEn, roundDisplay, toYmd } from '@/lib/format'
import {
  getCarryOverDate,
  getWeekEnd,
  getWeekStart,
  WEEK_ORDER,
  getRowDateForWeekRow,
} from '@/lib/weekUtils'
import { findAttendanceCell } from '@/lib/attendanceLookup'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { parseAttendance, parseEmployee, type Attendance, type Employee } from '@/types'
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'
import { formatTime12From24 } from '@/lib/timeFormat'
import { isWithinInterval, parse, startOfDay } from 'date-fns'
import { getArabicWeekdayName } from '@/lib/weekUtils'
import {
  tableBaseClass,
  tableCellLast,
  tableHeadCell,
  tableHeadSticky,
  tableRowCell,
  tableRowGroup,
  tableShellClass,
} from '@/lib/tableUi'
import { useFridayAttendance } from '@/contexts/FridayAttendanceContext'
import { STANDARD_WORK_HOURS } from '@/lib/calculations'
import { dashboardAbsenceCellClass, dashboardMarkKey } from '@/lib/dashboardCellMarks'
import { DashboardCellMarkModal } from '@/components/dashboard/DashboardCellMarkModal'
import { DashboardGridCellContent } from '@/components/dashboard/DashboardGridCellContent'
import { useCellMarks } from '@/contexts/CellMarksContext'
import { syncPunchAttendanceForWeek } from '@/lib/attendanceOps'
import { loadAllWeekHourAdjustments, type WeekHourAdjustment } from '@/lib/hourAdjustments'
import {
  computeWeekFinanceForAll,
  getManualPay,
  sumWeekFinance,
} from '@/lib/employeeWeekFinance'
import { DashboardFinanceSection } from '@/components/dashboard/DashboardFinanceSection'
import { DashboardGridWeekTotals } from '@/components/dashboard/DashboardGridWeekTotals'
import { getAttendancePunchStatus } from '@/lib/attendancePunch'
import { PunchIssueBadge } from '@/components/attendance/PunchIssueBadge'
import {
  isAttendanceRowActive,
  isDayAbsent,
  isFutureWorkDay,
  isTodayWorkDay,
} from '@/lib/dashboardDayCell'

export function Dashboard() {
  const { fridayAttendanceEnabled } = useFridayAttendance()
  const [weekRef, setWeekRef] = useState(() => getWeekStart(new Date()))
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [hourAdjustments, setHourAdjustments] = useState<WeekHourAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [detailDay, setDetailDay] = useState(() => getWeekStart(new Date()))
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { marks: cellMarks, setMark: saveCellMark } = useCellMarks()
  const [markEdit, setMarkEdit] = useState<{
    employeeId: string
    date: string
    key: string
  } | null>(null)

  const weekStart = getWeekStart(weekRef)
  const weekEnd = getWeekEnd(weekRef)
  const wsStr = toYmd(weekStart)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setEmployees([])
      setAttendance([])
      setHourAdjustments([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [empRes, attRes, adjRes] = await Promise.all([
        supabase.from('employees').select('*').order('employee_id'),
        supabase.from('attendance').select('*').eq('week_start_date', wsStr),
        loadAllWeekHourAdjustments(wsStr).catch(() => [] as WeekHourAdjustment[]),
      ])
      if (empRes.error) throw empRes.error
      if (attRes.error) throw attRes.error
      setEmployees((empRes.data ?? []).map(parseEmployee))
      setAttendance((attRes.data ?? []).map(parseAttendance))
      setHourAdjustments(adjRes)
    } catch (e) {
      console.error(e)
      setEmployees([])
      setAttendance([])
      setHourAdjustments([])
    } finally {
      setLoading(false)
    }

    try {
      const weekDate = parse(wsStr, 'yyyy-MM-dd', new Date())
      const changed = await syncPunchAttendanceForWeek(weekDate)
      if (!changed) return
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('week_start_date', wsStr)
      if (error) throw error
      setAttendance((data ?? []).map(parseAttendance))
      const adj = await loadAllWeekHourAdjustments(wsStr).catch(() => [] as WeekHourAdjustment[])
      setHourAdjustments(adj)
    } catch (e) {
      console.error('syncPunchAttendanceForWeek', e)
    }
  }, [wsStr])

  const financeByEmployee = useMemo(
    () => computeWeekFinanceForAll(employees, attendance, hourAdjustments),
    [employees, attendance, hourAdjustments],
  )

  const financeMap = useMemo(() => {
    const m = new Map<string, (typeof financeByEmployee)[0]>()
    for (const f of financeByEmployee) m.set(f.employeeId, f)
    return m
  }, [financeByEmployee])

  useEffect(() => {
    void load()
  }, [load])

  /** عند تغيير الأسبوع فقط — تجنب الاعتماد على كائن `weekStart` الجديد كل تصيير (كان يعيد ضبط التاريخ ويثقل التطبيق) */
  useEffect(() => {
    setDetailDay((prev) => {
      const ws = startOfDay(parse(wsStr, 'yyyy-MM-dd', new Date()))
      const we = startOfDay(getWeekEnd(ws))
      if (isWithinInterval(startOfDay(prev), { start: ws, end: we })) return prev
      return ws
    })
    setSelectedIds(new Set())
  }, [wsStr])

  const stats = useMemo(() => {
    const weekTotals = sumWeekFinance(financeByEmployee)
    let days = 0
    const activeIds = new Set<string>()
    for (const a of attendance) {
      const w = a.daily_wage ?? 0
      if (w > 0 && !a.is_carried_over) {
        days += 1
        activeIds.add(a.employee_id)
      }
    }
    for (const adj of hourAdjustments) {
      activeIds.add(adj.employee_id)
    }
    let topName = '—'
    let topVal = -1
    for (const f of financeByEmployee) {
      const emp = employees.find((e) => e.id === f.employeeId)
      if (f.totalPay > topVal) {
        topVal = f.totalPay
        topName = emp?.name ?? '—'
      }
    }
    const byEmp: Record<string, number> = {}
    for (const f of financeByEmployee) byEmp[f.employeeId] = f.totalPay
    return {
      total: weekTotals.totalPay,
      manualPay: weekTotals.manualStandardPay + weekTotals.manualOvertimePay,
      totalHours: weekTotals.totalHours,
      days,
      topName,
      topVal,
      byEmp,
      activeCount: activeIds.size,
    }
  }, [attendance, employees, financeByEmployee, hourAdjustments])

  const toggleSel = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const detailYmd = toYmd(detailDay)
  const detailDayArabic = useMemo(() => getArabicWeekdayName(detailDay), [detailDay])
  const detailIsFriday = detailDayArabic === 'الجمعة'
  const detailFridayRestDay = detailIsFriday && !fridayAttendanceEnabled

  const detailRows = useMemo(() => {
    return employees.map((e) => {
      const att =
        attendance.find(
          (a) =>
            a.employee_id === e.id && a.week_start_date === wsStr && a.date === detailYmd && !a.is_carried_over
        ) ?? null
      return { employee: e, att }
    })
  }, [employees, attendance, wsStr, detailYmd])

  const selectedSum = useMemo(() => {
    let s = 0
    for (const r of detailRows) {
      if (!selectedIds.has(r.employee.id) || !r.att || r.att.daily_wage == null) continue
      s += r.att.daily_wage
    }
    return s
  }, [detailRows, selectedIds])

  return (
    <Layout weekReference={weekStart}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 text-right">
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">لوحة التحكم</h2>
        <WeekPicker value={weekRef} onChange={(d) => setWeekRef(d)} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">إجمالي رواتب الأسبوع</p>
              <p className={cn('mt-3 text-center font-mono-nums text-2xl font-semibold text-slate-800')}>
                د.أ {roundDisplay(stats.total)}
              </p>
              {stats.manualPay > 0 ? (
                <p className="mt-1 text-center text-[10px] text-violet-700">
                  يشمل يدوي: د.أ {roundDisplay(stats.manualPay)}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">الموظفون النشطون هذا الأسبوع</p>
              <p className="mt-3 text-center font-mono-nums text-2xl font-semibold text-slate-800" dir="ltr">
                <span className="text-slate-800">{stats.activeCount}</span>
                <span className="text-[var(--color-text-muted)]"> / </span>
                <span className="text-[var(--color-text-primary)]">{employees.length}</span>
              </p>
              <p className="mt-2 text-center text-xs text-[var(--color-text-muted)]">نشطون / إجمالي الموظفين</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">أيام الدوام المسجلة</p>
              <p className="mt-3 text-center font-mono-nums text-2xl font-bold text-[var(--color-accent-blue)]">
                {stats.days}{' '}
                <span className="text-base font-semibold text-[var(--color-text-secondary)]">يوم</span>
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">الأعلى راتباً</p>
              <p className="mt-3 text-right text-lg font-bold text-[var(--color-text-primary)]">{stats.topName}</p>
              <p className="mt-1 text-center font-mono-nums text-xl font-semibold text-slate-800">
                {stats.topVal >= 0 ? `د.أ ${roundDisplay(stats.topVal)}` : '—'}
              </p>
            </div>
          </>
        )}
      </div>

      <div className={cn(tableShellClass, 'overflow-hidden')}>
        {loading ? (
          <Skeleton className="m-4 h-96 w-full min-w-[800px]" />
        ) : employees.length === 0 ? (
          <p className="p-8 text-center text-[var(--color-text-secondary)]">
            لم تُضف أي موظف بعد. افتح صفحة «الموظفون» لإضافة الفريق ثم ارجع لهذه اللوحة.
          </p>
        ) : (
          <>
          <div className="overflow-x-auto">
          <table className={cn(tableBaseClass, 'min-w-[920px] border-0 shadow-none')} dir="rtl">
            <thead>
              <tr>
                <th
                  className={cn(
                    tableHeadCell,
                    tableHeadSticky,
                    'sticky start-0 z-30 min-w-[7.5rem] max-w-[9rem] text-right shadow-[1px_0_0_rgb(226,232,240)]'
                  )}
                >
                  اليوم / التاريخ
                </th>
                {employees.map((e) => {
                  const f = financeMap.get(e.id)
                  const manual = f ? getManualPay(f) : 0
                  return (
                    <th
                      key={e.id}
                      className={cn(
                        tableHeadCell,
                        tableHeadSticky,
                        'z-20 min-w-0 max-w-[6.5rem] px-1.5 text-center font-medium'
                      )}
                    >
                      <span className="block truncate">{e.name}</span>
                      {manual > 0 ? (
                        <span className="mt-0.5 block truncate text-[9px] font-semibold text-violet-700">
                          +يدوي
                        </span>
                      ) : null}
                    </th>
                  )
                })}
                <th
                  className={cn(
                    tableHeadCell,
                    tableHeadSticky,
                    tableCellLast,
                    'z-20 min-w-[4.5rem] text-center font-medium text-slate-900'
                  )}
                >
                  مجموع اليوم
                </th>
              </tr>
            </thead>
            <tbody>
              {WEEK_ORDER.map((rowLabel, idx) => {
                const rowDate = getRowDateForWeekRow(weekStart, rowLabel)
                const rowDateStr = toYmd(rowDate)
                const isFriday = rowLabel === 'الجمعة'
                const isWedNight = rowLabel === 'سهرة الأربعاء'
                const isTodayRow = isTodayWorkDay(rowDate)
                const zebra = idx % 2 === 0
                const todayRowClass = isTodayRow
                  ? '!bg-sky-100/95 group-hover/row:!bg-sky-200/90 ring-1 ring-inset ring-sky-400/50'
                  : ''

                let daySum = 0
                const cells = employees.map((e) => {
                  const att = findAttendanceCell(attendance, e.id, wsStr, rowLabel, rowDateStr)
                  if (att?.daily_wage != null) daySum += att.daily_wage
                  return { att }
                })

                return (
                  <tr key={rowLabel} className={cn(tableRowGroup, isTodayRow && 'relative z-[1]')}>
                    <td
                      className={cn(
                        tableRowCell(zebra),
                        todayRowClass,
                        'sticky start-0 z-10 border-e border-e-slate-200 text-right text-sm font-medium leading-snug',
                        isWedNight && 'text-amber-900',
                        isFriday && 'text-indigo-900',
                        isTodayRow && 'font-bold text-sky-950'
                      )}
                    >
                      {rowLabel}
                      {isWedNight ? <Star className="ms-0.5 inline h-3 w-3 shrink-0 text-amber-600" /> : null}
                      <div className="mt-0.5 font-mono-nums text-[11px] font-medium text-slate-500" dir="ltr">
                        {formatDateEn(rowDate)}
                        {isTodayRow ? (
                          <span className="ms-1 rounded bg-sky-600 px-1 py-px font-sans text-[10px] font-bold text-white">
                            اليوم
                          </span>
                        ) : isFutureWorkDay(rowDate) ? (
                          <span className="ms-1 font-sans text-[10px] text-slate-400">· قادم</span>
                        ) : null}
                      </div>
                    </td>
                    {cells.map(({ att }, i) => {
                      const empId = employees[i].id
                      const markKey = dashboardMarkKey(wsStr, empId, rowDateStr)
                      const mark = cellMarks[markKey]
                      const canMark =
                        !att?.is_carried_over &&
                        att?.daily_wage == null &&
                        isAttendanceRowActive(isWedNight, isFriday, fridayAttendanceEnabled)
                      const cellTitle = !canMark
                        ? undefined
                        : isFutureWorkDay(rowDate)
                          ? 'انقر لملاحظة مسبقة (اختياري)'
                          : 'انقر لتعديل غياب أو ملاحظة'
                      return (
                        <td
                          key={empId}
                          className={cn(
                            tableRowCell(zebra),
                            todayRowClass,
                            'min-w-0 text-center font-mono-nums text-xs',
                            canMark && 'cursor-pointer',
                            isFutureWorkDay(rowDate) &&
                              canMark &&
                              !isTodayRow &&
                              'bg-slate-50/40 group-hover/row:bg-slate-100/80'
                          )}
                          onClick={
                            canMark
                              ? () =>
                                  setMarkEdit({
                                    employeeId: empId,
                                    date: rowDateStr,
                                    key: markKey,
                                  })
                              : undefined
                          }
                          title={cellTitle}
                        >
                          <DashboardGridCellContent
                            rowDate={rowDate}
                            att={att}
                            mark={mark}
                            isWedNight={isWedNight}
                            isFriday={isFriday}
                            fridayAttendanceEnabled={fridayAttendanceEnabled}
                          />
                        </td>
                      )
                    })}
                    <td
                      className={cn(
                        tableRowCell(zebra),
                        todayRowClass,
                        tableCellLast,
                        'text-center font-mono-nums text-xs font-semibold text-slate-900'
                      )}
                    >
                      {daySum > 0 ? (
                        roundDisplay(daySum)
                      ) : isFutureWorkDay(rowDate) ? (
                        <span className="text-slate-300" aria-hidden />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              <DashboardGridWeekTotals employees={employees} financeMap={financeMap} />
            </tbody>
          </table>
          </div>
          <DashboardFinanceSection
            embedded
            employees={employees}
            financeByEmployee={financeByEmployee}
            adjustments={hourAdjustments}
          />
          </>
        )}
      </div>

      <section className="mt-10 space-y-5 text-right sm:mt-12">
        <div>
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] sm:text-xl">تفاصيل اليوم</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">اختر تاريخاً لعرض تفاصيل الدوام:</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <input
            type="date"
            lang="en"
            className="min-h-11 w-full max-w-full rounded-xl border border-[var(--color-border)] bg-app-card px-3 py-2.5 font-mono-nums text-[var(--color-text-primary)] shadow-sm outline-none transition-colors focus:border-[var(--color-accent-blue)] focus:ring-2 focus:ring-[var(--color-accent-blue)]/25 sm:w-auto sm:max-w-none"
            dir="ltr"
            value={toYmd(detailDay)}
            min={toYmd(weekStart)}
            max={toYmd(weekEnd)}
            onChange={(e) => {
              if (!e.target.value) return
              const d = startOfDay(parse(e.target.value, 'yyyy-MM-dd', new Date()))
              if (
                isWithinInterval(d, {
                  start: startOfDay(weekStart),
                  end: startOfDay(weekEnd),
                })
              ) {
                setDetailDay(d)
                setSelectedIds(new Set())
              }
            }}
          />
        </div>
        <div className={tableShellClass}>
          {employees.length === 0 ? (
            <p className="p-6 text-center text-[var(--color-text-secondary)]">أضف موظفين أولاً لعرض التفاصيل.</p>
          ) : (
            <table className={cn(tableBaseClass, 'table-fixed')} dir="rtl">
              <thead>
                <tr>
                  <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[7%] text-center')} />
                  <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[31%] min-w-0 text-right')}>
                    الموظف
                  </th>
                  <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[15%] text-center font-mono-nums')}>
                    حضور
                  </th>
                  <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[15%] text-center font-mono-nums')}>
                    مغادرة
                  </th>
                  <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[14%] text-center font-mono-nums')}>
                    اليومية
                  </th>
                  <th
                    className={cn(
                      tableHeadCell,
                      tableHeadSticky,
                      tableCellLast,
                      'z-20 w-[18%] text-center font-mono-nums'
                    )}
                  >
                    اليوم
                  </th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map(({ employee: e, att }, idx) => {
                  const baseDaily = e.hourly_rate * STANDARD_WORK_HOURS
                  const sel = selectedIds.has(e.id)
                  const detailMark = cellMarks[dashboardMarkKey(wsStr, e.id, detailYmd)]
                  const isDetailWedNight = toYmd(detailDay) === toYmd(getCarryOverDate(weekStart))
                  const markedAbsent = isDayAbsent({
                    rowDate: detailDay,
                    att,
                    isWedNight: isDetailWedNight,
                    isFriday: detailIsFriday,
                    fridayAttendanceEnabled,
                    mark: detailMark,
                  })
                  const detailPunch = att ? getAttendancePunchStatus(att) : 'none'
                  const zebra = idx % 2 === 0
                  const rowPick = sel && att ? '!bg-amber-100 group-hover/row:!bg-amber-200' : ''
                  return (
                    <tr key={e.id} className={tableRowGroup}>
                      <td className={cn(tableRowCell(zebra), 'text-center', rowPick)}>
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleSel(e.id)}
                          disabled={!att}
                          className="h-3.5 w-3.5 accent-slate-700 disabled:opacity-40"
                        />
                      </td>
                      <td
                        className={cn(
                          tableRowCell(zebra),
                          'min-w-0 truncate text-right font-medium text-slate-900',
                          rowPick
                        )}
                      >
                        {e.name}
                      </td>
                      <td
                        className={cn(
                          tableRowCell(zebra),
                          'text-center font-mono-nums text-xs',
                          rowPick
                        )}
                      >
                        {detailFridayRestDay ? (
                          <span className="text-slate-400">—</span>
                        ) : markedAbsent ? (
                          <span className={dashboardAbsenceCellClass} aria-label="غياب">
                            غياب
                          </span>
                        ) : detailPunch === 'missing_check_out' ? (
                          <PunchIssueBadge status="missing_check_out" />
                        ) : detailPunch === 'missing_check_in' ? (
                          <PunchIssueBadge status="missing_check_in" />
                        ) : att ? (
                          formatTime12From24(att.check_in)
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          tableRowCell(zebra),
                          'text-center font-mono-nums text-xs',
                          rowPick
                        )}
                      >
                        {detailFridayRestDay ? (
                          <span className="text-slate-400">—</span>
                        ) : markedAbsent || !att ? (
                          <span className="text-slate-400">—</span>
                        ) : detailPunch === 'missing_check_out' ? (
                          <span className="text-slate-400">—</span>
                        ) : detailPunch === 'missing_check_in' ? (
                          <PunchIssueBadge status="missing_check_in" />
                        ) : (
                          formatTime12From24(att.check_out)
                        )}
                      </td>
                      <td
                        className={cn(
                          tableRowCell(zebra),
                          'text-center font-mono-nums text-xs text-slate-600',
                          rowPick
                        )}
                      >
                        {detailFridayRestDay ? (
                          <span className="text-slate-400">—</span>
                        ) : markedAbsent || !att ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          roundDisplay(baseDaily)
                        )}
                      </td>
                      <td
                        className={cn(
                          tableRowCell(zebra),
                          tableCellLast,
                          'text-center font-mono-nums text-xs font-semibold',
                          markedAbsent ? 'text-red-900' : 'text-slate-900',
                          rowPick
                        )}
                      >
                        {detailFridayRestDay
                          ? '—'
                          : markedAbsent
                            ? '—'
                            : att?.daily_wage != null
                              ? roundDisplay(att.daily_wage)
                              : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3.5 text-slate-700 shadow-sm sm:px-5">
          المحدد ({selectedIds.size}): د.أ{' '}
          <span className="font-mono-nums font-semibold text-slate-900">{roundDisplay(selectedSum)}</span>
        </div>
      </section>

      <DashboardCellMarkModal
        open={!!markEdit}
        onClose={() => setMarkEdit(null)}
        initial={markEdit ? cellMarks[markEdit.key] : null}
        onSave={(mark) => {
          if (!markEdit) return
          saveCellMark(markEdit.key, mark)
        }}
      />
    </Layout>
  )
}
