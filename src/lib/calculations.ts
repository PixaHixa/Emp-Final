/**
 * فرق الساعات بين حضور ومغادرة بصيغة "HH:MM" أو "HH:MM:SS" (24 ساعة).
 * إذا كانت المغادرة قبل منتصف الليل والحضور بعد الظهر تُحسب عبر منتصف الليل.
 */
export function timeDiffHours(checkIn: string, checkOut: string): number {
  const parse = (t: string) => {
    const [h, m] = t.trim().split(':').map(Number)
    return h * 60 + (m || 0)
  }
  const inMinutes = parse(checkIn)
  const outMinutes = parse(checkOut)
  const diffMinutes =
    outMinutes >= inMinutes ? outMinutes - inMinutes : 24 * 60 - inMinutes + outMinutes
  return diffMinutes / 60
}

/** ساعات الدوام الأساسية قبل احتساب الإضافي */
export const STANDARD_WORK_HOURS = 9

/** كل ساعة بعد الأساس = ساعة وربع (1.25 × الأجر) */
export const OVERTIME_HOURLY_MULTIPLIER = 1.25

export type DailyWageResult = {
  hoursWorked: number
  overtimeHours: number
  baseWage: number
  dailyWage: number
}

/** مبلغ الساعات الإضافية (غير الجمعة) */
export function calculateOvertimePay(overtimeHours: number, hourlyRate: number): number {
  if (overtimeHours <= 0) return 0
  return overtimeHours * hourlyRate * OVERTIME_HOURLY_MULTIPLIER
}

/** حساب الراتب اليومي — dayOfWeek بالعربي */
export function calculateDailyWage(params: {
  checkIn: string
  checkOut: string
  hourlyRate: number
  transportAllowance: number
  dayOfWeek: string
}): DailyWageResult {
  const { checkIn, checkOut, hourlyRate, transportAllowance, dayOfWeek } = params

  const hoursWorked = timeDiffHours(checkIn, checkOut)

  let baseWage: number
  let overtimeHours = 0

  if (dayOfWeek === 'الجمعة') {
    baseWage = hoursWorked * hourlyRate * 1.5
    overtimeHours = 0
  } else {
    if (hoursWorked <= STANDARD_WORK_HOURS) {
      baseWage = hoursWorked * hourlyRate
      overtimeHours = 0
    } else {
      overtimeHours = hoursWorked - STANDARD_WORK_HOURS
      baseWage =
        STANDARD_WORK_HOURS * hourlyRate + calculateOvertimePay(overtimeHours, hourlyRate)
    }
  }

  const dailyWage = baseWage + transportAllowance

  return { hoursWorked, overtimeHours, baseWage, dailyWage }
}

export function getWednesdayCarryOver(params: {
  totalWage: number
  hourlyRate: number
  transportAllowance: number
}): {
  hasCarryOver: boolean
  wednesdayWage: number
  carriedAmount: number
} {
  const { totalWage, hourlyRate, transportAllowance } = params
  const baseDaily = hourlyRate * STANDARD_WORK_HOURS + transportAllowance

  if (totalWage > baseDaily) {
    return {
      hasCarryOver: true,
      wednesdayWage: baseDaily,
      carriedAmount: totalWage - baseDaily,
    }
  }

  return {
    hasCarryOver: false,
    wednesdayWage: totalWage,
    carriedAmount: 0,
  }
}

/** للتوافق مع الكود السابق */
export function calculateOvertimeHours(hoursWorked: number): number {
  return Math.max(0, hoursWorked - STANDARD_WORK_HOURS)
}

export function splitDayHours(hoursWorked: number, dayOfWeek: string) {
  if (dayOfWeek === 'الجمعة') {
    return { standardHours: hoursWorked, overtimeHours: 0 }
  }
  const overtimeHours = Math.max(0, hoursWorked - STANDARD_WORK_HOURS)
  return { standardHours: hoursWorked - overtimeHours, overtimeHours }
}

export function standardPayForDay(
  standardHours: number,
  hourlyRate: number,
  dayOfWeek: string
): number {
  if (standardHours <= 0) return 0
  if (dayOfWeek === 'الجمعة') return standardHours * hourlyRate * 1.5
  return standardHours * hourlyRate
}
