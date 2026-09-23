import type { Account } from "./accounts";
import { getCreditLineUsageBetween } from "./transactions";

export interface CreditLineStatus {
  limit: number;
  closedInvoice: number;
  openInvoice: number;
  availableLimit: number;
  dueDay: number | null;
  dueDate: string | null;
  closingDay: number;
  closingDate: string;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Clamps the configured closing/due day to the number of days the given month actually has. */
function closingDateForMonth(day: number, year: number, month: number): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, daysInMonth));
}

function nextOccurrence(day: number, referenceDate: Date): Date {
  const thisMonth = closingDateForMonth(day, referenceDate.getFullYear(), referenceDate.getMonth());
  if (thisMonth >= referenceDate) return thisMonth;
  return closingDateForMonth(day, referenceDate.getFullYear(), referenceDate.getMonth() + 1);
}

/**
 * Splits the credit line into its two live invoices around `closingDay`:
 * the cycle that already closed (due soon, no longer accepting new charges)
 * and the one still accumulating charges until it closes next.
 */
function getCycles(closingDay: number, referenceDate: Date) {
  const openEnd = nextOccurrence(closingDay, referenceDate);
  const closedEnd = closingDateForMonth(closingDay, openEnd.getFullYear(), openEnd.getMonth() - 1);
  const openStart = addDays(closedEnd, 1);
  const closedStart = addDays(
    closingDateForMonth(closingDay, closedEnd.getFullYear(), closedEnd.getMonth() - 1),
    1
  );

  return {
    open: { start: openStart, end: openEnd },
    closed: { start: closedStart, end: closedEnd },
  };
}

/**
 * Approximates the account's two live invoices around its closing day (not a
 * real bank billing engine, which this personal-finance tool doesn't model):
 * the closed invoice (already fechada, due at the next due day) and the open
 * invoice (still accumulating charges until the next closing day).
 */
export async function getCreditLineStatus(
  account: Account,
  referenceDate: Date = new Date()
): Promise<CreditLineStatus | null> {
  if (!account.has_credit_line || account.credit_limit === null) return null;

  const closingDay = account.closing_day ?? 1;
  const { open, closed } = getCycles(closingDay, referenceDate);

  const [openInvoice, closedInvoice] = await Promise.all([
    getCreditLineUsageBetween(account.id, toIsoDate(open.start), toIsoDate(open.end)),
    getCreditLineUsageBetween(account.id, toIsoDate(closed.start), toIsoDate(closed.end)),
  ]);

  return {
    limit: account.credit_limit,
    closedInvoice,
    openInvoice,
    availableLimit: Math.max(account.credit_limit - closedInvoice - openInvoice, 0),
    dueDay: account.credit_line_due_day,
    dueDate:
      account.credit_line_due_day !== null
        ? toIsoDate(nextOccurrence(account.credit_line_due_day, referenceDate))
        : null,
    closingDay,
    closingDate: toIsoDate(open.end),
  };
}
