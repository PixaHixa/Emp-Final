import { cn } from '@/lib/utils'

/** غلاف الجدول — تمرير أفقي آمن على الجوال دون كسر التصميم */
export const tableShellClass =
  'max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-slate-300/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] [-webkit-overflow-scrolling:touch]'

export const tableBaseClass =
  'w-full border-collapse text-sm leading-snug text-slate-900 [font-feature-settings:normal]'

/** صف جسم تفاعلي — hover يغيّر لون كل الخلايا */
export const tableRowGroup = 'group/row transition-[background-color] duration-150 ease-out'

/** خلفية الصف + hover بارز (رمادي واضح) */
export function tableRowCell(zebraEven: boolean) {
  return cn(
    'border-b border-b-slate-200 px-2 py-1.5 align-middle transition-colors duration-150 sm:px-3 sm:py-2',
    zebraEven ? 'bg-white' : 'bg-slate-50',
    'group-hover/row:bg-slate-200'
  )
}

export const tableHeadCell =
  'border-b border-b-slate-300 bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-800 sm:px-3 sm:py-2 sm:text-sm'

export const tableHeadSticky =
  'sticky top-0 z-20 bg-slate-100 shadow-[0_1px_0_0_rgb(183,198,214)]'

export const tableCellLast = 'border-e-0'

/** صف إجمالي / تذييل — بدون hover صف كامل */
export const tableTotalRow = 'bg-slate-300/40 text-slate-900'

export function tableTotalCell(extra?: string) {
  return cn(
    'border-b border-b-slate-300/80 bg-slate-300/35 px-2 py-1.5 font-semibold sm:px-3 sm:py-2',
    extra
  )
}

export const numNeutral = 'font-mono-nums font-semibold tabular-nums tracking-tight text-slate-800'
