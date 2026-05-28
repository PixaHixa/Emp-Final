/** تحويل "HH:MM" أو "HH:MM:SS" إلى صيغة 12 ساعة للعرض */
export function formatTime(time24: string | null | undefined): string {
  if (!time24) return '—'
  const [hs, ms] = time24.split(':')
  let h = Number(hs)
  const m = Number(ms ?? 0)
  const period = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  const mm = m.toString().padStart(2, '0')
  /* U+200E: يثبت ترتيب الساعة و AM/PM في سياق RTL خارج خلية «الدوام» */
  return `\u200E${h}:${mm} ${period}`
}

export function to24Hour(hour: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour
  if (period === 'AM' && h === 12) h = 0
  if (period === 'PM' && h !== 12) h += 12
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function to12Hour(time24: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  const [hRaw, mRaw] = time24.split(':').map(Number)
  const period = hRaw >= 12 ? 'PM' : 'AM'
  const hour = hRaw % 12 || 12
  return { hour, minute: mRaw || 0, period }
}

/** للتخزين في Postgres time */
export function toDbTime(hour24: string): string {
  const [h, m] = hour24.split(':')
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`
}

/** يقرأ وقت Postgres/PostgREST سواء HH:MM:SS أو جزء وقت من ISO مثل 1970-01-01T09:00:00 */
export function fromDbTime(db: string | null | undefined): string {
  if (!db) return '09:00'
  const raw = String(db).trim()
  let segment = raw
  if (raw.includes('T')) {
    const afterT = raw.split('T')[1] ?? ''
    segment = afterT.split('.')[0].split('Z')[0].split('+')[0]
  }
  const parts = segment.split(':')
  const h = Number(parts[0])
  const m = Number(parts[1] ?? 0)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '09:00'
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
