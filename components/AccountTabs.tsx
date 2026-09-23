"use client";

import { useState } from "react";
import {
  BANK_LABELS,
  contrastTextColor,
  defaultColorForBank,
  getAccountTheme,
} from "@/components/bankTheme";
import type { Account, Bank } from "@/lib/accounts";

export interface AccountFormInput {
  name: string;
  bank: Bank;
  bankColor: string;
  hasCreditLine: boolean;
  creditLimit: number | null;
  creditLineDueDay: number | null;
}

interface AccountTabsProps {
  accounts: Account[];
  scope: string;
  onSelect: (scope: string) => void;
  onCreate: (input: AccountFormInput) => Promise<void>;
  onUpdate: (accountId: number, input: AccountFormInput) => Promise<void>;
  onDelete: (accountId: number) => Promise<void>;
}

const TAB_BASE =
  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap";
const TAB_INACTIVE =
  "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400";
const ICON_BUTTON =
  "rounded-full p-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200";

export function AccountTabs({
  accounts,
  scope,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
}: AccountTabsProps) {
  const [panel, setPanel] = useState<"none" | "create" | number>("none");

  async function handleDelete(account: Account) {
    const confirmed = window.confirm(
      `Excluir "${account.name}"? Todos os lançamentos e cofrinhos dessa conta serão apagados. Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;
    await onDelete(account.id);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {accounts.map((account) => {
          const theme = getAccountTheme(account);
          const isActive = scope === String(account.id);
          const activeTextColor = contrastTextColor(theme.color);
          return (
            <div key={account.id} className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onSelect(String(account.id))}
                className={`${TAB_BASE} ${isActive ? "" : TAB_INACTIVE}`}
                style={isActive ? { backgroundColor: theme.color, color: activeTextColor } : undefined}
              >
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: isActive ? activeTextColor : theme.color }}
                />
                {account.name}
                {account.has_credit_line && (
                  <span className="ml-1 text-xs opacity-70">(crédito)</span>
                )}
              </button>
              <button
                type="button"
                aria-label={`Editar ${account.name}`}
                onClick={() => setPanel(panel === account.id ? "none" : account.id)}
                className={ICON_BUTTON}
              >
                ✎
              </button>
              <button
                type="button"
                aria-label={`Excluir ${account.name}`}
                onClick={() => handleDelete(account)}
                className={ICON_BUTTON}
              >
                🗑
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => onSelect("all")}
          className={`${TAB_BASE} ${scope === "all" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : TAB_INACTIVE}`}
        >
          Todas
        </button>

        <button
          type="button"
          onClick={() => setPanel(panel === "create" ? "none" : "create")}
          className={`${TAB_BASE} border border-dashed border-zinc-300 bg-transparent text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400`}
        >
          + Nova conta
        </button>
      </div>

      {panel === "create" && (
        <AccountForm
          submitLabel="Criar"
          savingLabel="Criando..."
          onSubmit={async (input) => {
            await onCreate(input);
            setPanel("none");
          }}
        />
      )}

      {typeof panel === "number" && (
        <AccountForm
          initial={accounts.find((account) => account.id === panel)}
          submitLabel="Salvar"
          savingLabel="Salvando..."
          onSubmit={async (input) => {
            await onUpdate(panel, input);
            setPanel("none");
          }}
        />
      )}
    </div>
  );
}

function AccountForm({
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
