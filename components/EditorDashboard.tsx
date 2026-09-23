"use client";

import { useState } from "react";
import Link from "next/link";
import { AccountManager } from "@/components/AccountManager";
import type { AccountFormInput } from "@/components/AccountForm";
import { SettingsSection, type Settings } from "@/components/SettingsSection";
import { TransactionRow } from "@/components/TransactionRow";
import type { Account } from "@/lib/accounts";
import type { Category } from "@/lib/categories";
import type { TransactionWithAccount } from "@/lib/transactions";

interface EditorDashboardProps {
  user: { id: number; email: string };
  initialAccounts: Account[];
  initialCategories: Category[];
  initialTransactions: TransactionWithAccount[];
  initialSettings: Settings;
}

export function EditorDashboard({
  user,
  initialAccounts,
  initialCategories,
  initialTransactions,
  initialSettings,
}: EditorDashboardProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [transactions, setTransactions] = useState(initialTransactions);
  const categories = initialCategories;

  function accountById(accountId: number): Account | undefined {
    return accounts.find((account) => account.id === accountId);
  }

  async function refreshTransactions() {
    const response = await fetch("/api/transactions?account=all");
    const data = await response.json();
    setTransactions(data.transactions);
  }

  async function handleUpdateAccount(accountId: number, input: AccountFormInput) {
    const response = await fetch(`/api/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        bank: input.bank,
        bank_color: input.bankColor,
        has_credit_line: input.hasCreditLine,
        credit_limit: input.creditLimit,
        credit_line_due_day: input.creditLineDueDay,
        closing_day: input.closingDay,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Não foi possível salvar a conta.");
    }

    setAccounts((previous) =>
      previous.map((account) => (account.id === accountId ? data : account))
    );
  }

  async function handleDeleteAccount(accountId: number) {
    const response = await fetch(`/api/accounts/${accountId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error ?? "Não foi possível excluir a conta.");
    }

    setAccounts((previous) => previous.filter((account) => account.id !== accountId));
    await refreshTransactions();
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-8 sm:py-12 dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-5 sm:gap-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Modo Editor
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">{user.email}</span>
            <Link
              href="/"
              className="text-xs font-medium text-zinc-500 underline transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Voltar ao painel
            </Link>
          </div>
        </header>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Aqui você edita e exclui contas, lançamentos e configurações. Para registrar novos gastos
          e receitas, use o painel principal.
        </p>

        <SettingsSection initialSettings={initialSettings} onSaved={() => {}} />

        <AccountManager
          accounts={accounts}
          onUpdate={handleUpdateAccount}
          onDelete={handleDeleteAccount}
        />

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Lançamentos
          </h2>
          <ul className="flex flex-col gap-2">
            {transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                categories={categories}
                showAccountName
                hasCreditLine={accountById(transaction.account_id)?.has_credit_line ?? false}
                onChanged={refreshTransactions}
              />
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
