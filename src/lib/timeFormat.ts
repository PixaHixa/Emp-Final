/** إعادة التصدير — استخدم timeUtils للمنطق الجديد */
export {
  formatTime as formatTime12From24,
  to24Hour,
  to12Hour,
  toDbTime,
  fromDbTime,
} from '@/lib/timeUtils'

import { to12Hour } from '@/lib/timeUtils'

export function parse24To12(time: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  const { hour, minute, period } = to12Hour(time)
  return { hour12: hour, minute, period }
}
