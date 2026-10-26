import type { ComponentProps } from 'react'

type Props = ComponentProps<'input'> & { name: string; label: string; error?: string }
export function FormField({ name, label, error, ...input }: Props) {
  return <div className="form-field"><label htmlFor={name}>{label}</label><input {...input} id={name} name={name} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined} />{error && <span className="field-error" id={`${name}-error`}>{error}</span>}</div>
}
