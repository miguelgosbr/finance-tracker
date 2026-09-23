import type { Account } from "./accounts";
import { getCreditLineUsage } from "./transactions";

export interface CreditLineStatus {
  limit: number;
  usedThisMonth: number;
  availableLimit: number;
  dueDay: number | null;
  nextDueDate: string | null;
}

function nextDueDate(dueDay: number, referenceDate: Date): string {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const thisMonth = new Date(year, month, dueDay);
  const due = thisMonth >= referenceDate ? thisMonth : new Date(year, month + 1, dueDay);
  return due.toISOString().slice(0, 10);
}

/**
 * Approximates the account's current invoice using the calendar month (not a
 * real bank billing cycle, which this personal-finance tool doesn't model):
 * how much was charged to the credit line so far this month, how much limit
 * remains, and when the configured due day next falls.
 */
export async function getCreditLineStatus(
  account: Account,
  referenceDate: Date = new Date()
): Promise<CreditLineStatus | null> {
  if (!account.has_credit_line || account.credit_limit === null) return null;

  const usedThisMonth = await getCreditLineUsage(account.id, referenceDate);

  return {
    limit: account.credit_limit,
    usedThisMonth,
    availableLimit: Math.max(account.credit_limit - usedThisMonth, 0),
    dueDay: account.credit_line_due_day,
    nextDueDate:
      account.credit_line_due_day !== null
        ? nextDueDate(account.credit_line_due_day, referenceDate)
        : null,
  };
}
