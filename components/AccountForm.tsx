"use client";

import { useState } from "react";
import { BANK_LABELS, defaultColorForBank } from "@/components/bankTheme";
import type { Account, Bank } from "@/lib/accounts";

export interface AccountFormInput {
  name: string;
  bank: Bank;
  bankColor: string;
  hasCreditLine: boolean;
  creditLimit: number | null;
  creditLineDueDay: number | null;
}

export function AccountForm({
  initial,
  submitLabel,
  savingLabel,
  onSubmit,
}: {
  initial?: Account;
  submitLabel: string;
  savingLabel: string;
  onSubmit: (input: AccountFormInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [bank, setBank] = useState<Bank>(initial?.bank ?? "custom");
  const [bankColor, setBankColor] = useState(
    initial?.bank_color ?? defaultColorForBank(initial?.bank ?? "custom")
  );
  const [hasCreditLine, setHasCreditLine] = useState(initial?.has_credit_line ?? false);
  const [creditLimit, setCreditLimit] = useState(
    initial?.credit_limit ? String(initial.credit_limit) : ""
  );
  const [creditLineDueDay, setCreditLineDueDay] = useState(
    initial?.credit_line_due_day ? String(initial.credit_line_due_day) : ""
  );
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function handleBankChange(nextBank: Bank) {
    setBank(nextBank);
    setBankColor(defaultColorForBank(nextBank));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    try {
      await onSubmit({
        name,
        bank,
        bankColor,
        hasCreditLine,
        creditLimit: hasCreditLine ? Number(creditLimit) : null,
        creditLineDueDay: hasCreditLine && creditLineDueDay ? Number(creditLineDueDay) : null,
      });
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
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
        Banco
        <select
          value={bank}
          onChange={(event) => handleBankChange(event.target.value as Bank)}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        >
          {(Object.keys(BANK_LABELS) as Bank[])
            .filter((key) => key !== "custom")
            .map((key) => (
              <option key={key} value={key}>
                {BANK_LABELS[key]}
              </option>
            ))}
          <option value="custom">+ Criar outro banco</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Cor do tema
        <input
          type="color"
          value={bankColor}
          onChange={(event) => setBankColor(event.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-zinc-300 dark:border-zinc-700"
        />
      </label>

      <label className="flex items-center gap-2 pb-2 text-sm">
        <input
          type="checkbox"
          checked={hasCreditLine}
          onChange={(event) => setHasCreditLine(event.target.checked)}
          className="h-4 w-4"
        />
        Linha de crédito
      </label>

      {hasCreditLine && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Limite
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={creditLimit}
              onChange={(event) => setCreditLimit(event.target.value)}
              placeholder="0,00"
              className="w-32 min-w-0 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Dia do vencimento
            <input
              type="number"
              step="1"
              min="1"
              max="31"
              value={creditLineDueDay}
              onChange={(event) => setCreditLineDueDay(event.target.value)}
              placeholder="Ex.: 10"
              className="w-28 min-w-0 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </label>
        </>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {status === "saving" ? savingLabel : submitLabel}
      </button>

      {status === "error" && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}
    </form>
  );
}
