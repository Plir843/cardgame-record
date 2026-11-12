import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ToastContext, type ToastOptions } from './toast-context'

interface Current extends ToastOptions {
  id: number
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Current | null>(null)

  const show = useCallback((options: ToastOptions) => {
    setToast({ ...options, id: Date.now() + Math.random() })
  }, [])

  // 일정 시간이 지나면 자동으로 닫는다
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), toast.duration ?? 5000)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 104px)' }}
        >
          <div
            role="status"
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink py-2 pl-4 pr-2 text-bg shadow-lg"
          >
            <span className="min-w-0 flex-1 py-2 text-[15px] font-medium">{toast.message}</span>
            {toast.actionLabel && (
              <button
                type="button"
                className="h-11 shrink-0 rounded-xl bg-accent px-4 text-[15px] font-bold text-accent-ink active:opacity-80"
                onClick={() => {
                  const action = toast.onAction
                  setToast(null)
                  void action?.()
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
