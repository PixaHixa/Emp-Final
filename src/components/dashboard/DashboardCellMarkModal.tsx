import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  DASHBOARD_MARK_COLORS,
  dashboardAbsenceCellClass,
  isAbsenceMark,
  type DashboardCellMark,
  type DashboardMarkColorId,
} from '@/lib/dashboardCellMarks'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onClose: () => void
  initial?: DashboardCellMark | null
  onSave: (mark: DashboardCellMark | null) => void
}

function initialFormState(initial?: DashboardCellMark | null) {
  if (isAbsenceMark(initial)) {
    return { mode: 'absence' as const, text: '', colorId: 'orange' as DashboardMarkColorId }
  }
  return {
    mode: 'custom' as const,
    text: initial?.type === 'custom' ? initial.text : '',
    colorId: (initial?.type === 'custom' ? initial.colorId : 'orange') as DashboardMarkColorId,
  }
}

function DashboardCellMarkModalBody({ onClose, initial, onSave }: Omit<Props, 'open'>) {
  const init = initialFormState(initial)
  const [text, setText] = useState(init.text)
  const [colorId, setColorId] = useState<DashboardMarkColorId>(init.colorId)
  const [mode, setMode] = useState<'absence' | 'custom'>(init.mode)

  function handleSaveCustom() {
    const trimmed = text.trim()
    if (!trimmed) {
      onSave(null)
      onClose()
      return
    }
    onSave({ type: 'custom', text: trimmed, colorId })
    onClose()
  }

  function handleSaveAbsence() {
    onSave({ type: 'absence' })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="تعبئة الخلية"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          {initial ? (
            <Button
              variant="danger"
              onClick={() => {
                onSave(null)
                onClose()
              }}
            >
              مسح
            </Button>
          ) : null}
          {mode === 'custom' ? (
            <Button variant="primary" onClick={handleSaveCustom}>
              حفظ
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSaveAbsence}>
              تسجيل غياب
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-right">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-700">غياب</p>
          <p className="mb-3 text-xs leading-relaxed text-slate-600">
            سجّل الغياب يدوياً لليوم المطلوب. الأيام بدون دوام وبدون تسجيل تبقى فارغة.
          </p>
          <Button
            type="button"
            variant={mode === 'absence' ? 'danger' : 'secondary'}
            className="w-full justify-center gap-2"
            onClick={() => setMode('absence')}
          >
            <span className={dashboardAbsenceCellClass}>غياب</span>
            <span>اختيار غياب</span>
          </Button>
        </div>

        <div className="relative flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-500">أو ملاحظة مخصصة</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">النص</label>
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setMode('custom')
              setText(e.target.value)
            }}
            placeholder="اكتب ملاحظة (إجازة، تأخر، …)"
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30"
            maxLength={24}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">اللون</p>
          <div className="flex flex-wrap justify-end gap-2">
            {DASHBOARD_MARK_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setMode('custom')
                  setColorId(c.id)
                }}
                className={cn(
                  'h-9 w-9 rounded-full ring-2 ring-offset-2 transition-transform',
                  c.chipClass,
                  mode === 'custom' && colorId === c.id
                    ? 'scale-110 ring-slate-900'
                    : 'ring-transparent opacity-80 hover:opacity-100'
                )}
                title={c.label}
                aria-label={c.label}
                aria-pressed={mode === 'custom' && colorId === c.id}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function DashboardCellMarkModal({ open, onClose, initial, onSave }: Props) {
  if (!open) return null
  const resetKey = initial
    ? initial.type === 'custom'
      ? `c-${initial.text}-${initial.colorId}`
      : 'a'
    : 'new'
  return (
    <DashboardCellMarkModalBody
      key={resetKey}
      onClose={onClose}
      initial={initial}
      onSave={onSave}
    />
  )
}
