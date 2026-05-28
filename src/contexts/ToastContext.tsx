/* eslint-disable react-refresh/only-export-components -- hook مرتبط بالمزود */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error'

type ToastItem = { id: number; message: string; kind: ToastKind }

type ToastContextValue = {
  success: (message?: string) => void
  error: (message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, kind: ToastKind) => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev, { id, message, kind }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (m = 'تم الحفظ بنجاح \u2713') => push(m, 'success'),
      error: (m = 'حدث خطأ، حاول مرة أخرى') => push(m, 'error'),
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 left-5 z-[200] flex max-w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2 sm:bottom-6 sm:left-6" dir="rtl">
        {items.map((t) => (
          <div
            key={t.id}
            className={
              t.kind === 'success'
                ? 'rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm'
                : 'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 shadow-sm'
            }
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast outside ToastProvider')
  return ctx
}
