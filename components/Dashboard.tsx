"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountTabs, type AccountFormInput } from "@/components/AccountTabs";
import { getAccountTheme, hexToRgba } from "@/components/bankTheme";
import { BurnRateCard } from "@/components/BurnRateCard";
import { CofrinhosSection } from "@/components/CofrinhosSection";
import { ReportsChart } from "@/components/ReportsChart";
import { TransactionForm } from "@/components/TransactionForm";
import type { Account } from "@/lib/accounts";
import type { BurnRateDiagnosis } from "@/lib/analytics";
import type { Category } from "@/lib/categories";
import type { CofrinhoWithAccount } from "@/lib/cofrinhos";
import type { CreditLineStatus } from "@/lib/creditLine";
import type { ReportPeriod, ReportPoint } from "@/lib/reports";
import type { TransactionWithAccount } from "@/lib/transactions";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

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
  initialCreditLine: CreditLineStatus | null;
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
  initialCreditLine,
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
  const [creditLine, setCreditLine] = useState(initialCreditLine);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAll = scope === "all";
  const currentAccountId = isAll ? null : Number(scope);
  const currentAccount = accounts.find((account) => account.id === currentAccountId) ?? null;
  const theme = currentAccount ? getAccountTheme(currentAccount) : null;

  function accountById(accountId: number): Account | undefined {
    return accounts.find((account) => account.id === accountId);
  }

  async function loadScopeData(targetScope: string, period: ReportPeriod) {
    setIsRefreshing(true);
    try {
      const qs = `account=${targetScope}`;
      const targetAccountId = targetScope === "all" ? null : Number(targetScope);
      const targetAccount = targetAccountId !== null ? accountById(targetAccountId) : null;

      const [transactionsResponse, burnRateResponse, cofrinhosResponse, reportResponse, creditLineResponse] =
        await Promise.all([
          fetch(`/api/transactions?${qs}`),
          fetch(`/api/analytics/burn-rate?${qs}`),
          fetch(`/api/cofrinhos?${qs}`),
          fetch(`/api/reports?period=${period}&${qs}`),
          targetAccount?.has_credit_line
            ? fetch(`/api/accounts/${targetAccount.id}/credit-line`)
            : Promise.resolve(null),
        ]);

      const transactionsData = await transactionsResponse.json();
      setTransactions(transactionsData.transactions);
      setBalance(transactionsData.balance);
      setBurnRate(await burnRateResponse.json());
      setCofrinhos(await cofrinhosResponse.json());
      setReportData(await reportResponse.json());
      setCreditLine(creditLineResponse ? await creditLineResponse.json() : null);
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

  function toAccountBody(input: AccountFormInput) {
    return {
      name: input.name,
      bank: input.bank,
      bank_color: input.bankColor,
      has_credit_line: input.hasCreditLine,
      credit_limit: input.creditLimit,
      credit_line_due_day: input.creditLineDueDay,
      closing_day: input.closingDay,
    };
  }

  async function handleCreateAccount(input: AccountFormInput) {
    const response = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toAccountBody(input)),
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
    <div className="relative flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-8 sm:py-12 dark:bg-black">
      {theme && (
        <div
          className="pointer-events-none fixed inset-0 -z-10 transition-colors duration-300"
          style={{ backgroundColor: hexToRgba(theme.color, 0.14) }}
        />
      )}
      <main className="flex w-full max-w-2xl flex-col gap-5 sm:gap-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h1
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            style={theme ? { color: theme.color } : undefined}
          >
            Finanças{currentAccount ? ` · ${currentAccount.name}` : ""}
          </h1>
          <div className="flex items-center gap-3">
            {isRefreshing && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                Atualizando…
              </span>
            )}
            <span className="text-xs text-zinc-400">{user.email}</span>
            <Link
              href="/editor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-zinc-500 underline transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Modo Editor
            </Link>
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

        <div
          className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          style={theme ? { borderTopColor: theme.color, borderTopWidth: 4 } : undefined}
        >
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isAll ? "Saldo consolidado" : "Saldo atual"}
          </p>
          <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {currencyFormatter.format(balance)}
          </p>

          {creditLine && (
            <div className="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <p className="mb-1 font-medium text-zinc-600 dark:text-zinc-300">Linha de crédito</p>
              <p>Fatura fechada: {currencyFormatter.format(creditLine.closedInvoice)}</p>
              <p>Fatura aberta: {currencyFormatter.format(creditLine.openInvoice)}</p>
              <p>
                Limite disponível: {currencyFormatter.format(creditLine.availableLimit)} de{" "}
                {currencyFormatter.format(creditLine.limit)}
              </p>
              {creditLine.dueDate && (
                <p>Vencimento da fatura fechada: {dateFormatter.format(new Date(`${creditLine.dueDate}T12:00:00`))}</p>
              )}
              <p>Fecha em: {dateFormatter.format(new Date(`${creditLine.closingDate}T12:00:00`))}</p>
            </div>
          )}
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

        {isAll || currentAccountId === null || !currentAccount ? (
          <p className="text-center text-sm text-zinc-400">
            Para registrar um gasto ou receita, selecione uma conta específica acima.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TransactionForm
              type="expense"
              accountId={currentAccountId}
              hasCreditLine={currentAccount.has_credit_line}
              categories={expenseCategories}
              onCreated={refresh}
            />
            <TransactionForm
              type="income"
              accountId={currentAccountId}
              hasCreditLine={false}
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
              <li key={transaction.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">
                  {transaction.description}
                  {isAll && (
                    <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {transaction.account_name}
                    </span>
                  )}
                  {transaction.payment_method === "credit_line" && (
                    <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      crédito
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
      </main>
    </div>
  );
}
