import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children?: ReactNode
  className?: string
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 min-h-9 px-3 text-sm',
  md: 'h-11 min-h-11 px-4 text-base',
  lg: 'h-[52px] min-h-[52px] px-5 text-lg',
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-morandi-rose text-white hover:bg-morandi-rose-dark',
  secondary: 'bg-morandi-warm-light text-morandi-deep hover:bg-morandi-warm',
  outline: 'border border-morandi-rose bg-transparent text-morandi-rose hover:bg-morandi-rose-light',
  ghost: 'bg-transparent text-morandi-stone hover:bg-morandi-cream',
  danger: 'bg-morandi-error text-white hover:bg-morandi-error-dark',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
        'transition active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? (
        <span
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  )
}
