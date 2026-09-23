"use client";

import { useState } from "react";
import type { Category } from "@/lib/categories";
import type { PaymentMethod, TransactionType, TransactionWithAccount } from "@/lib/transactions";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface TransactionRowProps {
  transaction: TransactionWithAccount;
  categories: Category[];
  showAccountName: boolean;
  hasCreditLine: boolean;
  onChanged: () => void;
}

export function TransactionRow({
  transaction,
  categories,
  showAccountName,
  hasCreditLine,
  onChanged,
}: TransactionRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [type, setType] = useState<TransactionType>(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [description, setDescription] = useState(transaction.description);
  const [categoryId, setCategoryId] = useState(String(transaction.category_id));
  const [occurredOn, setOccurredOn] = useState(transaction.occurred_on);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(transaction.payment_method);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: Number(amount),
          description,
          category_id: Number(categoryId),
          occurred_on: occurredOn,
          payment_method: type === "expense" ? paymentMethod : "account",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível salvar o lançamento.");
      }

      setStatus("idle");
      setIsEditing(false);
      onChanged();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Excluir o lançamento "${transaction.description}"?`);
    if (!confirmed) return;

    const response = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      setStatus("error");
      setErrorMessage(data.error ?? "Não foi possível excluir o lançamento.");
      return;
    }

    onChanged();
  }

  if (!isEditing) {
    return (
      <li className="flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-400">
          {transaction.description}
          {showAccountName && (
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
        <button
          type="button"
          aria-label="Editar lançamento"
          onClick={() => setIsEditing(true)}
          className="rounded p-1 text-xs text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
        >
          ✎
        </button>
        <button
          type="button"
          aria-label="Excluir lançamento"
          onClick={handleDelete}
          className="rounded p-1 text-xs text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
        >
          🗑
        </button>
      </li>
    );
  }

  return (
    <li className="rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
      <form onSubmit={handleSave} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          Tipo
          <select
            value={type}
            onChange={(event) => setType(event.target.value as TransactionType)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="expense">Gasto</option>
            <option value="income">Receita</option>
          </select>
        </label>

        <label className="flex w-24 flex-col gap-1 text-xs">
          Valor
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs">
          Data
          <input
            type="date"
            required
            value={occurredOn}
            onChange={(event) => setOccurredOn(event.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
          Descrição
          <input
            type="text"
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full min-w-0 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs">
          Categoria
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        {type === "expense" && hasCreditLine && (
          <label className="flex flex-col gap-1 text-xs">
            Pagamento
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
              className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="account">Conta</option>
              <option value="credit_line">Cartão de crédito</option>
            </select>
          </label>
        )}

        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {status === "saving" ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="rounded-md bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
        >
          Cancelar
        </button>

        {status === "error" && (
          <p className="w-full text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
        )}
      </form>
    </li>
  );
}
