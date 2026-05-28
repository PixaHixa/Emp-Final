export const FRIDAY_ATTENDANCE_STORAGE_KEY = 'industrial-sys-friday-attendance-enabled'

export function readFridayAttendanceEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(FRIDAY_ATTENDANCE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeFridayAttendanceEnabled(value: boolean) {
  try {
    globalThis.localStorage?.setItem(FRIDAY_ATTENDANCE_STORAGE_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}
