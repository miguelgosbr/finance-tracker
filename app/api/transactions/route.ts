import { NextRequest, NextResponse } from "next/server";
import { accrueAllYields } from "@/lib/cofrinhos";
import {
  createTransaction,
  getCurrentBalance,
  listTransactions,
  type TransactionType,
} from "@/lib/transactions";

const VALID_TYPES: TransactionType[] = ["income", "expense"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  await accrueAllYields();
  return NextResponse.json({
    transactions: await listTransactions(),
    balance: await getCurrentBalance(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, amount, description, category_id, occurred_on } = body as {
    type?: unknown;
    amount?: unknown;
    description?: unknown;
    category_id?: unknown;
    occurred_on?: unknown;
  };

  if (typeof type !== "string" || !VALID_TYPES.includes(type as TransactionType)) {
    return NextResponse.json(
      { error: "O tipo deve ser 'income' ou 'expense'." },
      { status: 400 }
    );
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "O valor deve ser um número maior que zero." },
      { status: 400 }
    );
  }

  if (typeof description !== "string" || description.trim().length === 0) {
    return NextResponse.json(
      { error: "A descrição é obrigatória." },
      { status: 400 }
    );
  }

  if (typeof category_id !== "number" || !Number.isInteger(category_id)) {
    return NextResponse.json(
      { error: "A categoria é obrigatória." },
      { status: 400 }
    );
  }

  if (typeof occurred_on !== "string" || !DATE_PATTERN.test(occurred_on)) {
    return NextResponse.json(
      { error: "A data deve estar no formato AAAA-MM-DD." },
      { status: 400 }
    );
  }

  try {
    const transaction = await createTransaction({
      type: type as TransactionType,
      amount,
      description: description.trim(),
      category_id,
      occurred_on,
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23503") {
      return NextResponse.json(
        { error: "Categoria inválida." },
        { status: 400 }
      );
    }
    throw error;
  }
}
