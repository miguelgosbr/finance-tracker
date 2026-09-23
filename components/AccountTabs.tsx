"use client";

import { useState } from "react";
import type { Account, AccountKind } from "@/lib/accounts";

interface AccountTabsProps {
  accounts: Account[];
  scope: string;
  onSelect: (scope: string) => void;
  onCreate: (name: string, kind: AccountKind) => Promise<void>;
}

const TAB_BASE =
  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap";
const TAB_ACTIVE = "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900";
const TAB_INACTIVE =
  "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400";

export function AccountTabs({ accounts, scope, onSelect, onCreate }: AccountTabsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("checking");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    try {
      await onCreate(name, kind);
      setName("");
      setKind("checking");
      setIsCreating(false);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => onSelect(String(account.id))}
            className={`${TAB_BASE} ${scope === String(account.id) ? TAB_ACTIVE : TAB_INACTIVE}`}
          >
            {account.name}
            {account.kind === "credit" && (
              <span className="ml-1 text-xs opacity-70">(crédito)</span>
            )}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onSelect("all")}
          className={`${TAB_BASE} ${scope === "all" ? TAB_ACTIVE : TAB_INACTIVE}`}
        >
          Todas
        </button>

        <button
          type="button"
          onClick={() => setIsCreating((value) => !value)}
          className={`${TAB_BASE} border border-dashed border-zinc-300 bg-transparent text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400`}
        >
          + Nova conta
        </button>
      </div>

      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <label className="flex flex-col gap-1 text-sm">
            Nome
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Conta da pensão"
              className="w-48 min-w-0 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Tipo
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as AccountKind)}
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="checking">Conta corrente</option>
              <option value="credit">Linha de crédito</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={status === "saving"}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {status === "saving" ? "Criando..." : "Criar"}
          </button>

          {status === "error" && (
            <p className="w-full text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          )}
        </form>
      )}
    </div>
  );
}
