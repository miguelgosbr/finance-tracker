"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AccountTabs } from "@/components/AccountTabs";
import { BurnRateCard } from "@/components/BurnRateCard";
import { CofrinhosSection } from "@/components/CofrinhosSection";
import { ReportsChart } from "@/components/ReportsChart";
import { SettingsSection, type Settings } from "@/components/SettingsSection";
import { TransactionForm } from "@/components/TransactionForm";
import type { Account, AccountKind } from "@/lib/accounts";
import type { BurnRateDiagnosis } from "@/lib/analytics";
import type { Category } from "@/lib/categories";
import type { CofrinhoWithAccount } from "@/lib/cofrinhos";
import type { ReportPeriod, ReportPoint } from "@/lib/reports";
import type { TransactionWithAccount } from "@/lib/transactions";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface DashboardProps {
  user: { id: number; email: string };
  initialAccounts: Account[];
  initialScope: string;
  initialCategories: Category[];
  initialTransactions: TransactionWithAccount[];
  initialBalance: number;
  initialBurnRate: BurnRateDiagnosis;
  initialReportPeriod: ReportPeriod;
  initialReportData: ReportPoint[];
  initialCofrinhos: CofrinhoWithAccount[];
  initialSettings: Settings;
}

export function Dashboard({
  user,
  initialAccounts,
  initialScope,
  initialCategories,
  initialTransactions,
  initialBalance,
  initialBurnRate,
  initialReportPeriod,
  initialReportData,
  initialCofrinhos,
  initialSettings,
}: DashboardProps) {
  const router = useRouter();

  const [accounts, setAccounts] = useState(initialAccounts);
  const [scope, setScope] = useState(initialScope);
  const [categories, setCategories] = useState(initialCategories);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [balance, setBalance] = useState(initialBalance);
  const [burnRate, setBurnRate] = useState(initialBurnRate);
  const [reportPeriod, setReportPeriod] = useState(initialReportPeriod);
  const [reportData, setReportData] = useState(initialReportData);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [cofrinhos, setCofrinhos] = useState(initialCofrinhos);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAll = scope === "all";
  const currentAccountId = isAll ? null : Number(scope);

  async function loadScopeData(targetScope: string, period: ReportPeriod) {
    setIsRefreshing(true);
    try {
      const qs = `account=${targetScope}`;
      const [transactionsResponse, burnRateResponse, cofrinhosResponse, reportResponse] =
        await Promise.all([
          fetch(`/api/transactions?${qs}`),
          fetch(`/api/analytics/burn-rate?${qs}`),
          fetch(`/api/cofrinhos?${qs}`),
          fetch(`/api/reports?period=${period}&${qs}`),
        ]);

      const transactionsData = await transactionsResponse.json();
      setTransactions(transactionsData.transactions);
      setBalance(transactionsData.balance);
      setBurnRate(await burnRateResponse.json());
      setCofrinhos(await cofrinhosResponse.json());
      setReportData(await reportResponse.json());
    } finally {
      setIsRefreshing(false);
    }
  }

  async function selectScope(nextScope: string) {
    if (nextScope === scope) return;
    setScope(nextScope);
    await loadScopeData(nextScope, reportPeriod);
  }

  async function selectReportPeriod(period: ReportPeriod) {
    if (period === reportPeriod) return;
    setReportPeriod(period);
    setIsReportLoading(true);
    try {
      const response = await fetch(`/api/reports?period=${period}&account=${scope}`);
      setReportData(await response.json());
    } finally {
      setIsReportLoading(false);
    }
  }

  async function refresh() {
    const categoriesResponse = await fetch("/api/categories");
    setCategories(await categoriesResponse.json());
    await loadScopeData(scope, reportPeriod);
  }

  async function handleCreateAccount(name: string, kind: AccountKind) {
    const response = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Não foi possível criar a conta.");
    }

    setAccounts((previous) => [...previous, data]);
    setScope(String(data.id));
    await loadScopeData(String(data.id), reportPeriod);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const expenseCategories = categories.filter((category) => category.kind !== "income");
  const incomeCategories = categories.filter((category) => category.kind !== "expense");

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-8 sm:py-12 dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-5 sm:gap-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Finanças</h1>
          <div className="flex items-center gap-3">
            {isRefreshing && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                Atualizando…
              </span>
            )}
            <span className="text-xs text-zinc-400">{user.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-medium text-zinc-500 underline transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Sair
            </button>
          </div>
        </header>

        <AccountTabs
          accounts={accounts}
          scope={scope}
          onSelect={selectScope}
          onCreate={handleCreateAccount}
        />

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isAll ? "Saldo consolidado" : "Saldo atual"}
          </p>
          <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {currencyFormatter.format(balance)}
          </p>
        </div>

        <BurnRateCard diagnosis={burnRate} />

        <CofrinhosSection
          cofrinhos={cofrinhos}
          accountId={currentAccountId}
          canManage={!isAll}
          showAccountNames={isAll}
          onChanged={refresh}
        />

        <ReportsChart
          period={reportPeriod}
          data={reportData}
          isLoading={isReportLoading}
          onPeriodChange={selectReportPeriod}
        />

        {isAll || currentAccountId === null ? (
          <p className="text-center text-sm text-zinc-400">
            Para registrar um gasto ou receita, selecione uma conta específica acima.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TransactionForm
              type="expense"
              accountId={currentAccountId}
              categories={expenseCategories}
              onCreated={refresh}
            />
            <TransactionForm
              type="income"
              accountId={currentAccountId}
              categories={incomeCategories}
              onCreated={refresh}
            />
          </div>
        )}

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
                  {isAll && (
                    <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {transaction.account_name}
                    </span>
                  )}
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

        <SettingsSection initialSettings={initialSettings} onSaved={refresh} />
      </main>
    </div>
  );
}
