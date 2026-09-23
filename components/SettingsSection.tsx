"use client";

import { useState } from "react";

export interface Settings {
  monthly_budget: string;
  cdi_rate_annual: string;
}

interface SettingsSectionProps {
  initialSettings: Settings;
  onSaved: () => void;
}

export function SettingsSection({ initialSettings, onSaved }: SettingsSectionProps) {
  const [monthlyBudget, setMonthlyBudget] = useState(initialSettings.monthly_budget);
  const [cdiRate, setCdiRate] = useState(initialSettings.cdi_rate_annual);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthly_budget: monthlyBudget,
          cdi_rate_annual: cdiRate,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível salvar as configurações.");
      }

      setMonthlyBudget(data.monthly_budget);
      setCdiRate(data.cdi_rate_annual);
      setStatus("success");
      window.setTimeout(() => setStatus("idle"), 2500);
      onSaved();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Configurações</h2>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Orçamento mensal (opcional)
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={monthlyBudget}
            onChange={(event) => setMonthlyBudget(event.target.value)}
            placeholder="Sem orçamento definido"
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <label className="flex w-32 flex-col gap-1 text-sm">
          Taxa CDI anual (%)
          <input
            type="number"
            step="0.1"
            min="0.1"
            required
            value={cdiRate}
            onChange={(event) => setCdiRate(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
      </div>

      <p className="text-xs text-zinc-400">
        Sem orçamento, o ritmo de gastos usa a média dos últimos 3 meses. A taxa do CDI alimenta o
        rendimento dos cofrinhos.
      </p>

      {status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      {status === "success" && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          ✓ Configurações salvas!
        </p>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {status === "saving" ? "Salvando..." : "Salvar configurações"}
      </button>
    </form>
  );
}
