"use client";

import { useState } from "react";
import { BurnRateCard } from "@/components/BurnRateCard";
import { TransactionForm } from "@/components/TransactionForm";
import type { BurnRateDiagnosis } from "@/lib/analytics";
import type { Category } from "@/lib/categories";
import type { Transaction } from "@/lib/transactions";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface DashboardProps {
  initialCategories: Category[];
  initialTransactions: Transaction[];
  initialBalance: number;
  initialBurnRate: BurnRateDiagnosis;
}

export function Dashboard({
  initialCategories,
  initialTransactions,
  initialBalance,
  initialBurnRate,
}: DashboardProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [balance, setBalance] = useState(initialBalance);
  const [burnRate, setBurnRate] = useState(initialBurnRate);

  async function refresh() {
    const [categoriesResponse, transactionsResponse, burnRateResponse] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/transactions"),
      fetch("/api/analytics/burn-rate"),
    ]);
    setCategories(await categoriesResponse.json());
    const transactionsData = await transactionsResponse.json();
    setTransactions(transactionsData.transactions);
    setBalance(transactionsData.balance);
    setBurnRate(await burnRateResponse.json());
  }

  const expenseCategories = categories.filter((category) => category.kind !== "income");
  const incomeCategories = categories.filter((category) => category.kind !== "expense");

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Saldo atual</p>
          <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {currencyFormatter.format(balance)}
          </p>
        </div>

        <BurnRateCard diagnosis={burnRate} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TransactionForm type="expense" categories={expenseCategories} onCreated={refresh} />
          <TransactionForm type="income" categories={incomeCategories} onCreated={refresh} />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Últimos lançamentos
          </h2>
          <ul className="flex flex-col gap-2">
            {transactions.slice(0, 10).map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-zinc-600 dark:text-zinc-400">
                  {transaction.description}
                </span>
                <span
                  className={
                    transaction.type === "income"
                      ? "font-medium text-green-600 dark:text-green-400"
                      : "font-medium text-red-600 dark:text-red-400"
                  }
                >
                  {transaction.type === "income" ? "+" : "-"}
                  {currencyFormatter.format(transaction.amount)}
                </span>
              </li>
            ))}
            {transactions.length === 0 && (
              <li className="text-sm text-zinc-400">Nenhum lançamento ainda.</li>
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}
