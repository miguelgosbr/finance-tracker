"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportPeriod, ReportPoint } from "@/lib/reports";

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  week: "Semana",
  month: "Mês",
  year: "Ano",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface ReportsChartProps {
  period: ReportPeriod;
  data: ReportPoint[];
  isLoading: boolean;
  onPeriodChange: (period: ReportPeriod) => void;
}

export function ReportsChart({ period, data, isLoading, onPeriodChange }: ReportsChartProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Receitas x despesas
        </h2>
        <div className="flex gap-1">
          {(Object.keys(PERIOD_LABELS) as ReportPeriod[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onPeriodChange(option)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                period === option
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {PERIOD_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <div className={`h-64 ${isLoading ? "opacity-50" : ""}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => currencyFormatter.format(value as number)}
              width={80}
            />
            <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
            <Legend />
            <Bar dataKey="income" name="Receitas" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Despesas" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
