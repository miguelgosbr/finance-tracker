"use client";

import { useState } from "react";
import type { Category } from "@/lib/categories";

const NEW_CATEGORY_VALUE = "__new__";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ExpenseFormProps {
  categories: Category[];
  onCreated: () => void;
}

export function ExpenseForm({ categories, onCreated }: ExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(today());
  const [categoryId, setCategoryId] = useState<string>(
    categories[0] ? String(categories[0].id) : NEW_CATEGORY_VALUE
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
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
          body: JSON.stringify({ name: newCategoryName, kind: "expense" }),
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
          type: "expense",
          amount: Number(amount),
          description,
          category_id: Number(resolvedCategoryId),
          occurred_on: occurredOn,
        }),
      });

      const transactionData = await transactionResponse.json();
      if (!transactionResponse.ok) {
        throw new Error(transactionData.error ?? "Não foi possível registrar o gasto.");
      }

      setAmount("");
      setDescription("");
      setNewCategoryName("");
      setOccurredOn(today());
      setStatus("idle");
      onCreated();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Novo gasto</h2>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Valor
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1 text-sm">
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
        Descrição
        <input
          type="text"
          required
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex.: Almoço de trabalho"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Categoria
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
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
            placeholder="Ex.: Pets"
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
      )}

      {status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
      >
        {status === "saving" ? "Salvando..." : "Registrar gasto"}
      </button>
    </form>
  );
}
