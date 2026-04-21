/**
 * Minimum transaction count settlement algorithm.
 * Refs: specs/features/settlement.md#6
 */

export interface Balance {
  userId: string
  amount: number // positive = creditor, negative = debtor
}

export interface Transfer {
  from: string
  to: string
  amount: number
}

export interface SettlementInput {
  from_user: string
  to_user: string
  amount: number | string
}

export function calculateBalances(
  expenses: Array<{ paid_by: string; splits: Array<{ user_id: string; amount: number | string }> }>,
  settlements: SettlementInput[] = [],
): Balance[] {
  const balanceMap = new Map<string, number>()

  for (const expense of expenses) {
    const currentPaid = balanceMap.get(expense.paid_by) ?? 0
    const totalSplit = expense.splits.reduce((sum, s) => sum + Number(s.amount), 0)
    balanceMap.set(expense.paid_by, currentPaid + totalSplit)

    for (const split of expense.splits) {
      const currentOwed = balanceMap.get(split.user_id) ?? 0
      balanceMap.set(split.user_id, currentOwed - Number(split.amount))
    }
  }

  for (const s of settlements) {
    const amt = Number(s.amount)
    const fromBal = balanceMap.get(s.from_user) ?? 0
    const toBal = balanceMap.get(s.to_user) ?? 0
    balanceMap.set(s.from_user, fromBal + amt)
    balanceMap.set(s.to_user, toBal - amt)
  }

  return Array.from(balanceMap.entries())
    .map(([userId, amount]) => ({
      userId,
      amount: Math.round(amount * 100) / 100,
    }))
    .filter((b) => Math.abs(b.amount) > 0.01)
}

export function simplifyDebts(balances: Balance[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const debtors = balances
    .filter((b) => b.amount < 0)
    .map((b) => ({ ...b, amount: Math.abs(b.amount) }))
    .sort((a, b) => b.amount - a.amount)

  const transfers: Transfer[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci].amount
    const debt = debtors[di].amount
    const transferAmount = Math.min(credit, debt)

    if (transferAmount > 0.01) {
      transfers.push({
        from: debtors[di].userId,
        to: creditors[ci].userId,
        amount: Math.round(transferAmount * 100) / 100,
      })
    }

    creditors[ci].amount -= transferAmount
    debtors[di].amount -= transferAmount

    if (creditors[ci].amount < 0.01) ci++
    if (debtors[di].amount < 0.01) di++
  }

  return transfers
}
