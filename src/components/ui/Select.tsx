import { useId, type ChangeEvent } from 'react'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  label?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  className?: string
  id?: string
  disabled?: boolean
  name?: string
}

export default function Select({
  label,
  options,
  value,
  onChange,
  placeholder,
  error,
  className = '',
  id: idProp,
  disabled,
  name,
}: SelectProps) {
  const uid = useId()
  const id = idProp ?? uid

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className={['w-full', className].filter(Boolean).join(' ')}>
      {label ? (
        <label htmlFor={id} className="mb-1 block text-sm text-morandi-stone">
          {label}
        </label>
      ) : null}
      <select
        id={id}
        name={name}
        disabled={disabled}
        value={value}
        onChange={handleChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          'h-11 w-full appearance-none rounded-lg border border-morandi-warm bg-white px-3 pr-10 text-morandi-deep',
          'outline-none transition',
          'focus:border-morandi-rose focus:ring-2 focus:ring-morandi-rose/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-morandi-error focus:border-morandi-error focus:ring-morandi-error/20' : '',
          'bg-[length:1rem_1rem] bg-[right_0.75rem_center] bg-no-repeat',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        }}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-morandi-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
