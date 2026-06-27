import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  push: (kind: ToastKind, message: string) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++counter.current
      setToasts((list) => [...list, { id, kind, message }])
      window.setTimeout(() => remove(id), 4500)
    },
    [remove],
  )

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
    }),
    [push],
  )

  const renderToast = (t: Toast) => (
    <div key={t.id} className={`toast toast--${t.kind}`}>
      <Icon name={t.kind === 'success' ? 'check' : t.kind === 'error' ? 'alert' : 'info'} />
      <span className="toast__msg">{t.message}</span>
      <button
        type="button"
        className="toast__close"
        onClick={() => remove(t.id)}
        aria-label="Закрити"
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts">
        {/* Errors are announced assertively; success/info politely. */}
        <div className="toasts__region" role="alert" aria-live="assertive">
          {toasts.filter((t) => t.kind === 'error').map(renderToast)}
        </div>
        <div className="toasts__region" role="status" aria-live="polite">
          {toasts.filter((t) => t.kind !== 'error').map(renderToast)}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
