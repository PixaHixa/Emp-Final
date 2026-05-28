import type { Attendance } from '@/types'

export type PunchStatus = 'none' | 'complete' | 'missing_check_in' | 'missing_check_out'

/** وقت بصمة فعلي (ليس فارغاً ولا placeholder منتصف الليل) */
export function isMeaningfulPunchTime(time: string | null | undefined): boolean {
  if (time == null) return false
  const raw = String(time).trim()
  if (!raw) return false
  const segment = raw.includes('T') ? (raw.split('T')[1]?.split('.')[0] ?? raw) : raw
  const [h, m] = segment.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false
  return !(h === 0 && m === 0)
}

export function getAttendancePunchStatus(att: Attendance | null | undefined): PunchStatus {
  if (!att || att.is_carried_over) return 'none'
  const hasIn = isMeaningfulPunchTime(att.check_in)
  const hasOut = isMeaningfulPunchTime(att.check_out)
  if (hasIn && hasOut) return 'complete'
  if (hasIn && !hasOut) return 'missing_check_out'
  if (!hasIn && hasOut) return 'missing_check_in'
  return 'none'
}

/** أي نشاط بصمة — لا يُحسب غياباً */
export function hasAnyPunchActivity(att: Attendance | null | undefined): boolean {
  return getAttendancePunchStatus(att) !== 'none'
}
