import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
      dir="rtl"
    >
      <button
        type="button"
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 my-auto w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-app-card p-4 shadow-lg animate-fade-in max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto sm:p-6',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="min-w-0 flex-1 text-lg font-bold text-[var(--color-accent-blue)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-m-1 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="text-[var(--color-text-primary)]">{children}</div>
        {footer ? (
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}

type ConfirmModalProps = {
  open: boolean
  onClose: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  danger?: boolean
}

export function ConfirmModal({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  onConfirm,
  danger,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            className="w-full sm:w-auto"
            onClick={() => {
              void (async () => {
                try {
                  await Promise.resolve(onConfirm())
                  onClose()
                } catch {
                  /* لا يُغلق المودال عند فشل العملية */
                }
              })()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{message}</p>
    </Modal>
  )
}
