import { addDays, startOfDay, subDays } from 'date-fns'

export const WEEK_ORDER = [
  'الخميس',
  'سهرة الأربعاء',
  'الجمعة',
  'السبت',
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
] as const

export type WeekDayLabel = (typeof WEEK_ORDER)[number]

/** صفوف الجدول — نفس ترتيب WEEK_ORDER مع مفاتيح ثابتة */
export const WEEK_ROWS = [
  { key: 'thursday', label: 'الخميس', offset: 0 },
  { key: 'wed_carryover', label: 'سهرة الأربعاء', offset: -1, isCarryOver: true },
  { key: 'friday', label: 'الجمعة', offset: 1 },
  { key: 'saturday', label: 'السبت', offset: 2 },
  { key: 'sunday', label: 'الأحد', offset: 3 },
  { key: 'monday', label: 'الاثنين', offset: 4 },
  { key: 'tuesday', label: 'الثلاثاء', offset: 5 },
  { key: 'wednesday', label: 'الأربعاء', offset: 6 },
] as const

export function getWeekBounds(anyDateInWeek: Date): {
  weekStart: Date
  weekEnd: Date
  carryOverDate: Date
} {
  const d = startOfDay(anyDateInWeek)
  const day = d.getDay()
  const daysFromThursday = (day + 3) % 7
  const weekStart = subDays(d, daysFromThursday)
  const weekEnd = addDays(weekStart, 6)
  const carryOverDate = subDays(weekStart, 1)
  return { weekStart, weekEnd, carryOverDate }
}

/** بداية الأسبوع (الخميس) لأي تاريخ — الأسبوع من الخميس إلى الأربعاء */
export function getWeekStart(date: Date): Date {
  return getWeekBounds(date).weekStart
}

/** نهاية الأسبوع (الأربعاء) */
export function getWeekEnd(date: Date): Date {
  return getWeekBounds(date).weekEnd
}

/** الأربعاء السابق لبداية الأسبوع (تاريخ صف سهرة الأربعاء) */
export function getCarryOverDate(weekStart: Date): Date {
  return subDays(startOfDay(weekStart), 1)
}

/** تاريخ اليوم الفعلي لكل صف في الجدول الأسبوعي */
export function getRowDateForWeekRow(weekStart: Date, rowLabel: WeekDayLabel): Date {
  const ws = startOfDay(weekStart)
  if (rowLabel === 'الخميس') return ws
  if (rowLabel === 'سهرة الأربعاء') return getCarryOverDate(ws)
  if (rowLabel === 'الجمعة') return addDays(ws, 1)
  if (rowLabel === 'السبت') return addDays(ws, 2)
  if (rowLabel === 'الأحد') return addDays(ws, 3)
  if (rowLabel === 'الاثنين') return addDays(ws, 4)
  if (rowLabel === 'الثلاثاء') return addDays(ws, 5)
  return addDays(ws, 6)
}

/** اسم اليوم العربي من تاريخ */
export function getArabicWeekdayName(date: Date): string {
  const map = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  return map[date.getDay()]
}
