import { useId, type ChangeEvent, type InputHTMLAttributes } from 'react'

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'size'> {
  label?: string
  error?: string
  helperText?: string
  type?: 'text' | 'number' | 'date' | 'email' | 'password'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function Input({
  label,
  error,
  helperText,
  type = 'text',
  value,
  onChange,
  placeholder,
  className = '',
  id: idProp,
  ...rest
}: InputProps) {
  const uid = useId()
  const id = idProp ?? uid

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className={['w-full', className].filter(Boolean).join(' ')}>
      {label ? (
        <label htmlFor={id} className="mb-1 block text-sm text-morandi-stone">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [error ? `${id}-error` : null, helperText && !error ? `${id}-helper` : null]
            .filter(Boolean)
            .join(' ') || undefined
        }
        className={[
          'h-11 w-full rounded-lg border border-morandi-warm bg-white px-3 text-morandi-deep',
          'outline-none transition',
          'placeholder:text-morandi-stone/60',
          'focus:border-morandi-rose focus:ring-2 focus:ring-morandi-rose/20',
          error ? 'border-morandi-error focus:border-morandi-error focus:ring-morandi-error/20' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-morandi-error" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="mt-1 text-xs text-morandi-stone">
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
