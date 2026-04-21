export const SUPPORTED_CURRENCIES = [
  'TWD', 'USD', 'JPY', 'EUR', 'KRW', 'THB', 'GBP', 'CNY', 'HKD', 'SGD',
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

export const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; decimals: number; label: string }> = {
  TWD: { symbol: 'NT$', decimals: 2, label: '新台幣' },
  USD: { symbol: '$', decimals: 2, label: '美元' },
  JPY: { symbol: '¥', decimals: 0, label: '日圓' },
  EUR: { symbol: '€', decimals: 2, label: '歐元' },
  KRW: { symbol: '₩', decimals: 0, label: '韓元' },
  THB: { symbol: '฿', decimals: 2, label: '泰銖' },
  GBP: { symbol: '£', decimals: 2, label: '英鎊' },
  CNY: { symbol: '¥', decimals: 2, label: '人民幣' },
  HKD: { symbol: 'HK$', decimals: 2, label: '港幣' },
  SGD: { symbol: 'S$', decimals: 2, label: '新加坡幣' },
}

export function formatAmount(amount: number, currency: string): string {
  const config = CURRENCY_CONFIG[currency as CurrencyCode]
  if (!config) return `${amount.toFixed(2)} ${currency}`

  const formatted = amount.toFixed(config.decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${config.symbol}${formatted}`
}

interface CachedRates {
  base: string
  date: string
  rates: Record<string, number>
}

function getCacheKey(base: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return `exchange_rates_${base}_${today}`
}

export async function getExchangeRates(base: string): Promise<Record<string, number>> {
  const cacheKey = getCacheKey(base)
  const cached = localStorage.getItem(cacheKey)

  if (cached) {
    const parsed: CachedRates = JSON.parse(cached)
    return parsed.rates
  }

  try {
    const res = await fetch(`https://api.frankfurter.dev/latest?base=${base}`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data: CachedRates = await res.json()
    localStorage.setItem(cacheKey, JSON.stringify(data))
    return data.rates
  } catch {
    const fallbackKey = findLatestCache(base)
    if (fallbackKey) {
      const parsed: CachedRates = JSON.parse(localStorage.getItem(fallbackKey)!)
      return parsed.rates
    }
    throw new Error('無法取得匯率，請檢查網路連線')
  }
}

function findLatestCache(base: string): string | null {
  const prefix = `exchange_rates_${base}_`
  let latestKey: string | null = null
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(prefix)) {
      if (!latestKey || key > latestKey) latestKey = key
    }
  }
  return latestKey
}

export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<number> {
  if (fromCurrency === toCurrency) return amount
  const rates = await getExchangeRates(fromCurrency)
  const rate = rates[toCurrency]
  if (!rate) throw new Error(`不支援的幣別轉換: ${fromCurrency} → ${toCurrency}`)
  return amount * rate
}
