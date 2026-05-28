export type DashboardMarkColorId = 'orange' | 'blue' | 'amber' | 'slate'

export type DashboardCellMark =
  | { type: 'absence' }
  | { type: 'excused' }
  | { type: 'custom'; text: string; colorId: DashboardMarkColorId }

export const DASHBOARD_CELL_MARKS_STORAGE_KEY = 'industrial-sys-dashboard-cell-marks'

const STORAGE_KEY = DASHBOARD_CELL_MARKS_STORAGE_KEY

export const DASHBOARD_MARK_COLORS: {
  id: DashboardMarkColorId
  label: string
  chipClass: string
  cellClass: string
}[] = [
  {
    id: 'orange',
    label: 'برتقالي',
    chipClass: 'bg-orange-600 ring-orange-700',
    cellClass: 'bg-orange-600 text-white ring-orange-800',
  },
  {
    id: 'blue',
    label: 'أزرق',
    chipClass: 'bg-blue-700 ring-blue-800',
    cellClass: 'bg-blue-700 text-white ring-blue-800',
  },
  {
    id: 'amber',
    label: 'كهرماني',
    chipClass: 'bg-amber-600 ring-amber-700',
    cellClass: 'bg-amber-700 text-white ring-amber-800',
  },
  {
    id: 'slate',
    label: 'رمادي',
    chipClass: 'bg-slate-600 ring-slate-700',
    cellClass: 'bg-slate-600 text-white ring-slate-700',
  },
]

export function dashboardMarkKey(weekStart: string, employeeId: string, date: string) {
  return `${weekStart}|${employeeId}|${date}`
}

function normalizeMark(raw: unknown): DashboardCellMark | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as { type?: string; text?: string; colorId?: DashboardMarkColorId }
  if (m.type === 'excused') return { type: 'excused' }
  if (m.type === 'absence' || m.text?.trim() === 'غياب') return { type: 'absence' }
  if (m.type === 'custom' && m.text?.trim() && m.colorId) {
    return { type: 'custom', text: m.text.trim(), colorId: m.colorId }
  }
  if (m.text?.trim() && m.colorId) {
    return { type: 'custom', text: m.text.trim(), colorId: m.colorId }
  }
  return null
}

export function isAbsenceMark(mark: DashboardCellMark | undefined | null): boolean {
  return mark?.type === 'absence'
}

export function readDashboardCellMarks(): Record<string, DashboardCellMark> {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, DashboardCellMark> = {}
    for (const [key, value] of Object.entries(parsed)) {
      const mark = normalizeMark(value)
      if (mark) out[key] = mark
    }
    return out
  } catch {
    return {}
  }
}

export function writeDashboardCellMarks(marks: Record<string, DashboardCellMark>) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(marks))
  } catch {
    /* ignore */
  }
}

export function getMarkCellClass(colorId: DashboardMarkColorId): string {
  return DASHBOARD_MARK_COLORS.find((c) => c.id === colorId)?.cellClass ?? DASHBOARD_MARK_COLORS[0].cellClass
}

export const dashboardAbsenceCellClass =
  'inline-flex min-h-[1.75rem] min-w-[3.25rem] items-center justify-center rounded-md bg-red-700 px-2.5 py-1 text-xs font-bold leading-none tracking-wide text-white ring-1 ring-inset ring-red-800'
