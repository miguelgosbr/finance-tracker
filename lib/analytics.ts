import { getDb } from "./db";
import { getSetting } from "./settings";

export type BurnRateStatus = "no_data" | "on_track" | "ahead_of_pace";

export interface BurnRateDiagnosis {
  status: BurnRateStatus;
  budget: number;
  spentSoFar: number;
  expectedSpendSoFar: number;
  daysElapsed: number;
  daysRemaining: number;
  daysInMonth: number;
  suggestedDailyLimit: number;
  message: string;
}

const PACE_ALERT_THRESHOLD = 1.1;

interface MonthWindow {
  monthStart: string;
  today: string;
  dayOfMonth: number;
  daysInMonth: number;
}

function getMonthWindow(referenceDate: Date): MonthWindow {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const monthStart = new Date(year, month, 1).toISOString().slice(0, 10);
  const today = referenceDate.toISOString().slice(0, 10);
  const dayOfMonth = referenceDate.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return { monthStart, today, dayOfMonth, daysInMonth };
}

function getExpensesBetween(startInclusive: string, endInclusive: string): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE type = 'expense' AND occurred_on BETWEEN ? AND ?`
    )
    .get(startInclusive, endInclusive) as { total: number };

  return row.total;
}

function getTrailingAverageMonthlyExpense(referenceDate: Date, monthsBack: number): number {
  const totals: number[] = [];

  for (let i = 1; i <= monthsBack; i++) {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth() - i;

    const start = new Date(year, month, 1).toISOString().slice(0, 10);
    const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);

    totals.push(getExpensesBetween(start, end));
  }

  const monthsWithData = totals.filter((total) => total > 0);
  if (monthsWithData.length === 0) return 0;

  return monthsWithData.reduce((sum, total) => sum + total, 0) / monthsWithData.length;
}

function resolveBudget(referenceDate: Date): number {
  const configured = Number(getSetting("monthly_budget"));
  if (Number.isFinite(configured) && configured > 0) return configured;

  return getTrailingAverageMonthlyExpense(referenceDate, 3);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function getBurnRateDiagnosis(referenceDate: Date = new Date()): BurnRateDiagnosis {
  const { monthStart, today, dayOfMonth, daysInMonth } = getMonthWindow(referenceDate);

  const budget = resolveBudget(referenceDate);
  const spentSoFar = getExpensesBetween(monthStart, today);
  const daysRemaining = Math.max(daysInMonth - dayOfMonth, 0);

  if (budget <= 0) {
    return {
      status: "no_data",
      budget: 0,
      spentSoFar,
      expectedSpendSoFar: 0,
      daysElapsed: dayOfMonth,
      daysRemaining,
      daysInMonth,
      suggestedDailyLimit: 0,
      message:
        "Ainda não há orçamento definido nem histórico suficiente para estimar o ritmo de gastos.",
    };
  }

  const expectedSpendSoFar = budget * (dayOfMonth / daysInMonth);
  const isAheadOfPace = spentSoFar > expectedSpendSoFar * PACE_ALERT_THRESHOLD;

  const remainingBudget = Math.max(budget - spentSoFar, 0);
  const suggestedDailyLimit =
    daysRemaining > 0 ? remainingBudget / daysRemaining : remainingBudget;

  const message = isAheadOfPace
    ? `Seu ritmo de gastos está acima do esperado: você já gastou ${formatCurrency(
        spentSoFar
      )} de um orçamento de ${formatCurrency(
        budget
      )}, quando o esperado até hoje seria ${formatCurrency(
        expectedSpendSoFar
      )}. Mantendo esse ritmo, o orçamento pode estourar antes do fim do mês. Para se ajustar, tente limitar os gastos a ${formatCurrency(
        suggestedDailyLimit
      )} por dia nos dias restantes.`
    : `Seu ritmo de gastos está sob controle: ${formatCurrency(
        spentSoFar
      )} gastos de um orçamento de ${formatCurrency(
        budget
      )}. Para continuar assim, mantenha os gastos em até ${formatCurrency(
        suggestedDailyLimit
      )} por dia pelo resto do mês.`;

  return {
    status: isAheadOfPace ? "ahead_of_pace" : "on_track",
    budget,
    spentSoFar,
    expectedSpendSoFar,
    daysElapsed: dayOfMonth,
    daysRemaining,
    daysInMonth,
    suggestedDailyLimit,
    message,
  };
}
