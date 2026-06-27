import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  htmlFor?: string
  children: ReactNode
}

export function Field({ label, required, hint, htmlFor, children }: FieldProps) {
  return (
    <label className="field" htmlFor={htmlFor}>
      <span className="field__label">
        {label}
        {required && <span className="field__req" aria-hidden="true"> *</span>}
      </span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}
