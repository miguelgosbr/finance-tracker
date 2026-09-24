"use client";

import { useState } from "react";
import type { Account } from "@/lib/accounts";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface TransferFormProps {
  accounts: Account[];
  defaultFromAccountId: number;
  onCreated: () => void;
}

export function TransferForm({ accounts, defaultFromAccountId, onCreated }: TransferFormProps) {
  const otherAccounts = accounts.filter((account) => account.id !== defaultFromAccountId);

  const [fromAccountId, setFromAccountId] = useState(String(defaultFromAccountId));
  const [toAccountId, setToAccountId] = useState(
    otherAccounts[0] ? String(otherAccounts[0].id) : ""
  );
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(today());
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    try {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_account_id: Number(fromAccountId),
          to_account_id: Number(toAccountId),
          amount: Number(amount),
          description,
          occurred_on: occurredOn,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível transferir.");
      }

      setAmount("");
      setDescription("");
      setOccurredOn(today());
      setStatus("success");
      window.setTimeout(() => setStatus("idle"), 2500);
      onCreated();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }

  if (accounts.length < 2) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Transferir entre contas
      </h2>

      <div className="flex gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          De
          <select
            value={fromAccountId}
            onChange={(event) => setFromAccountId(event.target.value)}
            className="w-full min-w-0 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          Para
          <select
            value={toAccountId}
            onChange={(event) => setToAccountId(event.target.value)}
            className="w-full min-w-0 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          >
            {accounts
              .filter((account) => String(account.id) !== fromAccountId)
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="flex gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          Valor
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            className="w-full min-w-0 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Data
          <input
            type="date"
            required
            value={occurredOn}
            onChange={(event) => setOccurredOn(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Descrição (opcional)
        <input
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex.: Reforço para a fatura"
          className="w-full min-w-0 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      {status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      {status === "success" && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          ✓ Transferência registrada!
        </p>
      )}

      <button
        type="submit"
        disabled={status === "saving" || !toAccountId}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {status === "saving" ? "Transferindo..." : "Transferir"}
      </button>
    </form>
  );
}
