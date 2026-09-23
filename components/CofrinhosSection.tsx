"use client";

import { useState } from "react";
import type { Cofrinho } from "@/lib/cofrinhos";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface CofrinhosSectionProps {
  cofrinhos: Cofrinho[];
  onChanged: () => void;
}

export function CofrinhosSection({ cofrinhos, onChanged }: CofrinhosSectionProps) {
  const [name, setName] = useState("");
  const [cdiPercentage, setCdiPercentage] = useState("100");
  const [goalAmount, setGoalAmount] = useState("");
  const [createStatus, setCreateStatus] = useState<"idle" | "saving" | "error">("idle");
  const [createError, setCreateError] = useState("");

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreateStatus("saving");
    setCreateError("");

    try {
      const response = await fetch("/api/cofrinhos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          cdi_percentage: Number(cdiPercentage),
          goal_amount: goalAmount ? Number(goalAmount) : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível criar o cofrinho.");
      }

      setName("");
      setCdiPercentage("100");
      setGoalAmount("");
      setCreateStatus("idle");
      onChanged();
    } catch (error) {
      setCreateStatus("error");
      setCreateError(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Cofrinhos</h2>

      <div className="flex flex-col gap-3">
        {cofrinhos.map((cofrinho) => (
          <CofrinhoCard key={cofrinho.id} cofrinho={cofrinho} onChanged={onChanged} />
        ))}
        {cofrinhos.length === 0 && (
          <p className="text-sm text-zinc-400">Nenhum cofrinho criado ainda.</p>
        )}
      </div>

      <form onSubmit={handleCreate} className="flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Novo cofrinho</h3>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Nome
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Reserva de emergência"
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </label>

          <label className="flex w-28 flex-col gap-1 text-sm">
            % do CDI
            <input
              type="number"
              step="1"
              min="1"
              required
              value={cdiPercentage}
              onChange={(event) => setCdiPercentage(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Meta (opcional)
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={goalAmount}
            onChange={(event) => setGoalAmount(event.target.value)}
            placeholder="0,00"
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        {createStatus === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>
        )}

        <button
          type="submit"
          disabled={createStatus === "saving"}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {createStatus === "saving" ? "Salvando..." : "Criar cofrinho"}
        </button>
      </form>
    </div>
  );
}

function CofrinhoCard({
  cofrinho,
  onChanged,
}: {
  cofrinho: Cofrinho;
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const progress =
    cofrinho.goal_amount && cofrinho.goal_amount > 0
      ? Math.min((cofrinho.balance / cofrinho.goal_amount) * 100, 100)
      : null;

  async function move(type: "deposit" | "withdrawal") {
    setStatus("saving");
    setErrorMessage("");

    try {
      const response = await fetch(`/api/cofrinhos/${cofrinho.id}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount: Number(amount) }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível registrar a movimentação.");
      }

      setAmount("");
      setStatus("idle");
      onChanged();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }

  return (
    <div className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <p className="font-medium text-zinc-800 dark:text-zinc-200">{cofrinho.name}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {cofrinho.cdi_percentage}% do CDI
        </p>
      </div>

      <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {currencyFormatter.format(cofrinho.balance)}
      </p>

      {progress !== null && (
        <div className="mt-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full bg-blue-600"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {progress.toFixed(0)}% da meta de {currencyFormatter.format(cofrinho.goal_amount!)}
          </p>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0,00"
          className="w-28 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
        <button
          type="button"
          disabled={status === "saving" || !amount}
          onClick={() => move("deposit")}
          className="rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
        >
          Depositar
        </button>
        <button
          type="button"
          disabled={status === "saving" || !amount}
          onClick={() => move("withdrawal")}
          className="rounded-md bg-zinc-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60"
        >
          Resgatar
        </button>
      </div>

      {status === "error" && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}
    </div>
  );
}
