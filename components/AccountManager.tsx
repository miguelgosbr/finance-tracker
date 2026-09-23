"use client";

import { useState } from "react";
import { AccountForm, type AccountFormInput } from "@/components/AccountForm";
import { getAccountTheme } from "@/components/bankTheme";
import type { Account } from "@/lib/accounts";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface AccountManagerProps {
  accounts: Account[];
  onUpdate: (accountId: number, input: AccountFormInput) => Promise<void>;
  onDelete: (accountId: number) => Promise<void>;
}

export function AccountManager({ accounts, onUpdate, onDelete }: AccountManagerProps) {
  const [editingId, setEditingId] = useState<number | null>(null);

  async function handleDelete(account: Account) {
    const confirmed = window.confirm(
      `Excluir "${account.name}"? Todos os lançamentos e cofrinhos dessa conta serão apagados. Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;
    await onDelete(account.id);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Contas</h2>

      {accounts.map((account) => {
        const theme = getAccountTheme(account);
        return (
          <div key={account.id} className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-medium text-zinc-800 dark:text-zinc-200">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: theme.color }}
                />
                {account.name}
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  {theme.label}
                  {account.has_credit_line &&
                    ` · crédito ${currencyFormatter.format(account.credit_limit ?? 0)}`}
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(editingId === account.id ? null : account.id)}
                  className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(account)}
                  className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  Excluir
                </button>
              </div>
            </div>

            {editingId === account.id && (
              <div className="mt-3">
                <AccountForm
                  initial={account}
                  submitLabel="Salvar"
                  savingLabel="Salvando..."
                  onSubmit={async (input) => {
                    await onUpdate(account.id, input);
                    setEditingId(null);
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      {accounts.length === 0 && (
        <p className="text-sm text-zinc-400">Nenhuma conta ainda.</p>
      )}
    </div>
  );
}
