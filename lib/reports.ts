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

  const year = referenceDate.getFullYear() - periodsAgo;
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return { start, end, label: String(year) };
}

function getIncomeAndExpense(startInclusive: string, endInclusive: string) {
  const row = getDb()
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
       FROM transactions
       WHERE occurred_on BETWEEN ? AND ?`
    )
    .get(startInclusive, endInclusive) as { income: number; expense: number };

  return row;
}

export function getTimeSeries(
  period: ReportPeriod,
  referenceDate: Date = new Date()
): ReportPoint[] {
  const pointCount = POINTS_BY_PERIOD[period];
  const points: ReportPoint[] = [];

  for (let periodsAgo = pointCount - 1; periodsAgo >= 0; periodsAgo--) {
    const { start, end, label } = getBucketRange(period, referenceDate, periodsAgo);
    const { income, expense } = getIncomeAndExpense(toIsoDate(start), toIsoDate(end));
    points.push({ label, income, expense });
  }

  return points;
}
