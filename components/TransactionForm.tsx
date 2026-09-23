"use client";

import { useState } from "react";
import type { Category } from "@/lib/categories";
import type { TransactionType } from "@/lib/transactions";

const NEW_CATEGORY_VALUE = "__new__";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const COPY: Record<
  TransactionType,
  {
    title: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    categoryLabel: string;
    newCategoryPlaceholder: string;
    submitLabel: string;
    savingLabel: string;
    buttonClassName: string;
  }
> = {
  expense: {
    title: "Novo gasto",
    descriptionLabel: "Descrição",
    descriptionPlaceholder: "Ex.: Almoço de trabalho",
    categoryLabel: "Categoria",
    newCategoryPlaceholder: "Ex.: Pets",
    submitLabel: "Registrar gasto",
    savingLabel: "Salvando...",
    buttonClassName: "bg-red-600 hover:bg-red-700",
  },
  income: {
    title: "Nova receita",
    descriptionLabel: "Descrição / fonte",
    descriptionPlaceholder: "Ex.: Salário, freela, rendimento",
    categoryLabel: "Fonte",
    newCategoryPlaceholder: "Ex.: Dividendos",
    submitLabel: "Registrar receita",
    savingLabel: "Salvando...",
    buttonClassName: "bg-green-600 hover:bg-green-700",
  },
};

interface TransactionFormProps {
  type: TransactionType;
  accountId: number;
  hasCreditLine: boolean;
  categories: Category[];
  onCreated: () => void;
}

export function TransactionForm({
  type,
  accountId,
  hasCreditLine,
  categories,
  onCreated,
}: TransactionFormProps) {
  const copy = COPY[type];

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(today());
  const [categoryId, setCategoryId] = useState<string>(
    categories[0] ? String(categories[0].id) : NEW_CATEGORY_VALUE
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"account" | "credit_line">("account");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isCreatingCategory = categoryId === NEW_CATEGORY_VALUE;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    try {
      let resolvedCategoryId = categoryId;

      if (isCreatingCategory) {
        if (newCategoryName.trim().length === 0) {
          throw new Error("Informe o nome da nova categoria.");
        }

        const categoryResponse = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCategoryName, kind: type }),
        });

        const categoryData = await categoryResponse.json();
        if (!categoryResponse.ok) {
          throw new Error(categoryData.error ?? "Não foi possível criar a categoria.");
        }

        resolvedCategoryId = String(categoryData.id);
      }

      const transactionResponse = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          type,
          amount: Number(amount),
          description,
          category_id: Number(resolvedCategoryId),
          occurred_on: occurredOn,
          payment_method: type === "expense" ? paymentMethod : "account",
        }),
      });

      const transactionData = await transactionResponse.json();
      if (!transactionResponse.ok) {
        throw new Error(transactionData.error ?? "Não foi possível registrar o lançamento.");
      }

      setAmount("");
      setDescription("");
      setNewCategoryName("");
      setOccurredOn(today());
      setPaymentMethod("account");
      setStatus("success");
      window.setTimeout(() => setStatus("idle"), 2500);
      onCreated();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{copy.title}</h2>

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

        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          Data
          <input
            type="date"
            required
            value={occurredOn}
            onChange={(event) => setOccurredOn(event.target.value)}
            className="w-full min-w-0 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        {copy.descriptionLabel}
        <input
          type="text"
          required
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={copy.descriptionPlaceholder}
          className="w-full min-w-0 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {copy.categoryLabel}
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="w-full min-w-0 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
          <option value={NEW_CATEGORY_VALUE}>+ Criar nova categoria</option>
        </select>
      </label>

      {isCreatingCategory && (
        <label className="flex flex-col gap-1 text-sm">
          Nome da nova categoria
          <input
            type="text"
            required
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder={copy.newCategoryPlaceholder}
            className="w-full min-w-0 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
      )}

      {type === "expense" && hasCreditLine && (
        <label className="flex flex-col gap-1 text-sm">
          Forma de pagamento
          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as "account" | "credit_line")}
            className="w-full min-w-0 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="account">Conta</option>
            <option value="credit_line">Cartão de crédito</option>
          </select>
        </label>
      )}

      {status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      {status === "success" && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          ✓ Lançamento registrado!
        </p>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className={`mt-1 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 ${copy.buttonClassName}`}
      >
        {status === "saving" ? copy.savingLabel : copy.submitLabel}
      </button>
    </form>
  );
}
