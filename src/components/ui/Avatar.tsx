import type { ImgHTMLAttributes } from 'react'

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizePixels: Record<NonNullable<AvatarProps['size']>, number> = {
  sm: 32,
  md: 40,
  lg: 56,
}

function initialsFromName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0][0] ?? ''
    const b = parts[1][0] ?? ''
    return (a + b).toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

export default function Avatar({ src, name, size = 'md', className = '', alt, ...rest }: AvatarProps) {
  const px = sizePixels[size]
  const initials = initialsFromName(name)
  const dimensionStyle = { width: px, height: px, minWidth: px, minHeight: px }

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? name}
        width={px}
        height={px}
        className={['rounded-full object-cover', className].filter(Boolean).join(' ')}
        style={dimensionStyle}
        {...rest}
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={alt ?? name}
      className={[
        'flex items-center justify-center rounded-full bg-morandi-dusty-light text-sm font-medium text-morandi-deep',
        size === 'sm' ? 'text-xs' : '',
        size === 'lg' ? 'text-base' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={dimensionStyle}
    >
      {initials}
    </div>
  )
}
