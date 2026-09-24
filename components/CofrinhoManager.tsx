"use client";

import { useState } from "react";
import type { Account } from "@/lib/accounts";
import type { CofrinhoWithAccount } from "@/lib/cofrinhos";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export interface CofrinhoFormInput {
  name: string;
  cdiPercentage: number;
  goalAmount: number | null;
  accountId: number;
}

interface CofrinhoManagerProps {
  cofrinhos: CofrinhoWithAccount[];
  accounts: Account[];
  onUpdate: (cofrinhoId: number, input: CofrinhoFormInput) => Promise<void>;
  onDelete: (cofrinhoId: number) => Promise<void>;
}

export function CofrinhoManager({ cofrinhos, accounts, onUpdate, onDelete }: CofrinhoManagerProps) {
  const [editingId, setEditingId] = useState<number | null>(null);

  async function handleDelete(cofrinho: CofrinhoWithAccount) {
    const confirmed = window.confirm(
      `Excluir o cofrinho "${cofrinho.name}"? Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;
    await onDelete(cofrinho.id);
  }

  if (accounts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Cofrinhos</h2>

      {cofrinhos.map((cofrinho) => (
        <div key={cofrinho.id} className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-zinc-800 dark:text-zinc-200">
              {cofrinho.name}{" "}
              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                {cofrinho.account_name} · {currencyFormatter.format(cofrinho.balance)}
              </span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingId(editingId === cofrinho.id ? null : cofrinho.id)}
                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(cofrinho)}
                className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
              >
                Excluir
              </button>
            </div>
          </div>

          {editingId === cofrinho.id && (
            <CofrinhoForm
              initial={cofrinho}
              accounts={accounts}
              onSubmit={async (input) => {
                await onUpdate(cofrinho.id, input);
                setEditingId(null);
              }}
            />
          )}
        </div>
      ))}

      {cofrinhos.length === 0 && (
        <p className="text-sm text-zinc-400">Nenhum cofrinho ainda.</p>
      )}
    </div>
  );
}

function CofrinhoForm({
  initial,
  accounts,
  onSubmit,
}: {
  initial: CofrinhoWithAccount;
  accounts: Account[];
  onSubmit: (input: CofrinhoFormInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name);
  const [cdiPercentage, setCdiPercentage] = useState(String(initial.cdi_percentage));
  const [goalAmount, setGoalAmount] = useState(initial.goal_amount ? String(initial.goal_amount) : "");
  const [accountId, setAccountId] = useState(String(initial.account_id));
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    try {
      await onSubmit({
        name,
        cdiPercentage: Number(cdiPercentage),
        goalAmount: goalAmount ? Number(goalAmount) : null,
        accountId: Number(accountId),
      });
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs">
        Nome
        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs">
        Conta
        <select
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex w-24 flex-col gap-1 text-xs">
        % do CDI
        <input
          type="number"
          step="1"
          min="1"
          required
          value={cdiPercentage}
          onChange={(event) => setCdiPercentage(event.target.value)}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs">
        Meta (opcional)
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={goalAmount}
          onChange={(event) => setGoalAmount(event.target.value)}
          placeholder="0,00"
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {status === "saving" ? "Salvando..." : "Salvar"}
      </button>

      {status === "error" && (
        <p className="w-full text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      {accounts.length > 1 && (
        <p className="w-full text-xs text-zinc-400">
          O saldo do cofrinho é mantido ao trocar de conta — é só uma reclassificação.
        </p>
      )}
    </form>
  );
}
