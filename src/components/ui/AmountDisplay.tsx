import { formatAmount } from '../../lib/currency'

export interface AmountDisplayProps {
  amount: number
  currency: string
  /** 顯示正負號 */
  showSign?: boolean
  className?: string
}

export default function AmountDisplay({
  amount,
  currency,
  showSign = false,
  className = '',
}: AmountDisplayProps) {
  const abs = Math.abs(amount)
  const formatted = formatAmount(abs, currency)
  const sign =
    showSign && amount > 0.005 ? '+' : showSign && amount < -0.005 ? '−' : ''

  let tone = 'text-morandi-deep'
  if (amount > 0.005) tone = 'text-morandi-sage-dark'
  else if (amount < -0.005) tone = 'text-morandi-error'

  const display =
    amount < -0.005 ? `${sign}${formatted}` : amount > 0.005 ? `${sign}${formatted}` : formatted

  return (
    <span className={['tabular-nums font-medium', tone, className].filter(Boolean).join(' ')}>
      {display}
    </span>
  )
}
