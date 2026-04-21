import { formatAmount } from '../../lib/currency'

export interface AmountDisplayProps {
  amount: number | string
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
  const numAmount = Number(amount)
  const abs = Math.abs(numAmount)
  const formatted = formatAmount(abs, currency)
  const sign =
    showSign && numAmount > 0.005 ? '+' : showSign && numAmount < -0.005 ? '−' : ''

  let tone = 'text-morandi-deep'
  if (numAmount > 0.005) tone = 'text-morandi-sage-dark'
  else if (numAmount < -0.005) tone = 'text-morandi-error'

  const display =
    numAmount < -0.005 ? `${sign}${formatted}` : numAmount > 0.005 ? `${sign}${formatted}` : formatted

  return (
    <span className={['tabular-nums font-medium', tone, className].filter(Boolean).join(' ')}>
      {display}
    </span>
  )
}
