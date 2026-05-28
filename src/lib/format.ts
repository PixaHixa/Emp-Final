import { format } from 'date-fns'

/** تاريخ قصير للمقارنة مع قاعدة البيانات */
export function toYmd(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** عرض التاريخ للمستخدم: DD/MM/YYYY (أرقام إنجليزية عبر صيغة date-fns) */
export function formatDateEn(d: Date): string {
  return format(d, 'dd/MM/yyyy')
}

export function formatMoneyDisplay(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** تقريب للعرض فقط — منزلتان عشريتان */
export function roundDisplay(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2)
}

/** تحويل ساعات عشرية إلى ساعة:دقيقة للعرض */
export function formatHoursAsHm(decimalHours: number): string {
  if (!Number.isFinite(decimalHours) || decimalHours <= 0) return '0:00'
  const totalMinutes = Math.round(decimalHours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}:${m.toString().padStart(2, '0')}`
}

/** ساعات من حقول ساعة + دقيقة */
export function hoursFromParts(hours: number, minutes: number): number | null {
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours < 0 || minutes < 0 || minutes >= 60) return null
  if (hours === 0 && minutes === 0) return null
  return hours + minutes / 60
}

/** تحويل نص "س:د" أو عدد عشري إلى ساعات */
export function parseHoursFromHm(input: string): number | null {
  const trimmed = input.trim().replace(',', '.')
  if (!trimmed) return null
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed)
    return n > 0 ? n : null
  }
  const match = trimmed.match(/^(\d+)\s*:\s*(\d{1,2})$/)
  if (!match) return null
  return hoursFromParts(Number(match[1]), Number(match[2]))
}
