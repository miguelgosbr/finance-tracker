import { getDb } from "./db";

export type ReportPeriod = "week" | "month" | "year";

export interface ReportPoint {
  label: string;
  income: number;
  expense: number;
}

const POINTS_BY_PERIOD: Record<ReportPeriod, number> = {
  week: 8,
  month: 12,
  year: 5,
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const isoDayOfWeek = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - isoDayOfWeek);
  return result;
}

function getBucketRange(
  period: ReportPeriod,
  referenceDate: Date,
  periodsAgo: number
): { start: Date; end: Date; label: string } {
  if (period === "week") {
    const start = startOfWeek(referenceDate);
    start.setDate(start.getDate() - periodsAgo * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end, label: toIsoDate(start) };
  }

  if (period === "month") {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth() - periodsAgo;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start, end, label: start.toISOString().slice(0, 7) };
  }

  // Years start at the current year and move forward, rather than into the
  // past, since the app has no data before its own launch year.
  const year = referenceDate.getFullYear() + (POINTS_BY_PERIOD.year - 1 - periodsAgo);
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return { start, end, label: String(year) };
}

async function getIncomeAndExpense(
  accountIds: number[],
  startInclusive: string,
  endInclusive: string
) {
  if (accountIds.length === 0) return { income: 0, expense: 0 };

  const db = await getDb();
  const placeholders = accountIds.map((_, index) => `$${index + 3}`).join(", ");
  const result = await db.query<{ income: number; expense: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
     FROM transactions
     WHERE occurred_on BETWEEN $1 AND $2 AND account_id IN (${placeholders})`,
    [startInclusive, endInclusive, ...accountIds]
  );
  return {
    income: Number(result.rows[0].income),
    expense: Number(result.rows[0].expense),
  };
}

export async function getTimeSeries(
  accountIds: number[],
  period: ReportPeriod,
  referenceDate: Date = new Date()
): Promise<ReportPoint[]> {
  const pointCount = POINTS_BY_PERIOD[period];
  const points: ReportPoint[] = [];

  for (let periodsAgo = pointCount - 1; periodsAgo >= 0; periodsAgo--) {
    const { start, end, label } = getBucketRange(period, referenceDate, periodsAgo);
    const { income, expense } = await getIncomeAndExpense(
      accountIds,
      toIsoDate(start),
      toIsoDate(end)
    );
    points.push({ label, income, expense });
  }

  return points;
}
