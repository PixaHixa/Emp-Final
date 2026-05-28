import { cn } from '@/lib/utils'
import type { PunchStatus } from '@/lib/attendancePunch'

const issueClass =
  'inline-flex min-h-[1.75rem] items-center justify-center rounded-md bg-amber-600 px-2.5 py-1 text-xs font-bold leading-none text-white ring-1 ring-inset ring-amber-700'

type Props = {
  status: Extract<PunchStatus, 'missing_check_in' | 'missing_check_out'>
  className?: string
}

/** ناقص حضور أو ناقص مغادرة */
export function PunchIssueBadge({ status, className }: Props) {
  const label = status === 'missing_check_in' ? 'حضور' : 'مغادرة'
  const title =
    status === 'missing_check_in'
      ? 'بُصمت مغادرة دون حضور — أضف وقت الحضور'
      : 'بُصم حضور دون مغادرة — أضف وقت المغادرة'

  return (
    <span className={cn(issueClass, className)} title={title} aria-label={title}>
      {label}
    </span>
  )
}
