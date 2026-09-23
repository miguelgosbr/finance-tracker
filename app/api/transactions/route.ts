import { NextRequest, NextResponse } from "next/server";
import { getOwnedAccount, resolveScopeAccountIds } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedCategory } from "@/lib/categories";
import { accrueYieldsForAccount, accrueYieldsForUser } from "@/lib/cofrinhos";
import {
  createTransaction,
  getBalanceForAccounts,
  listTransactionsForUser,
  type TransactionType,
} from "@/lib/transactions";

const VALID_TYPES: TransactionType[] = ["income", "expense"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const accountParam = request.nextUrl.searchParams.get("account");
  const accountIds = await resolveScopeAccountIds(user.id, accountParam);
  if (accountIds === null) {
    return NextResponse.json({ error: "Conta inválida." }, { status: 400 });
  }

  if (!accountParam || accountParam === "all") {
    await accrueYieldsForUser(user.id);
  } else {
    await accrueYieldsForAccount(accountIds[0]);
  }

  return NextResponse.json({
    transactions: await listTransactionsForUser(user.id, accountIds),
    balance: await getBalanceForAccounts(accountIds),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json();
  const { account_id, type, amount, description, category_id, occurred_on } = body as {
    account_id?: unknown;
    type?: unknown;
    amount?: unknown;
    description?: unknown;
    category_id?: unknown;
    occurred_on?: unknown;
  };

  if (typeof account_id !== "number" || !Number.isInteger(account_id)) {
    return NextResponse.json({ error: "A conta é obrigatória." }, { status: 400 });
  }

  const account = await getOwnedAccount(user.id, account_id);
  if (!account) {
    return NextResponse.json({ error: "Conta inválida." }, { status: 400 });
  }

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

  if (!(await getOwnedCategory(user.id, category_id))) {
    return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
  }

  if (typeof occurred_on !== "string" || !DATE_PATTERN.test(occurred_on)) {
    return NextResponse.json(
      { error: "A data deve estar no formato AAAA-MM-DD." },
      { status: 400 }
    );
  }

  try {
    const transaction = await createTransaction({
      account_id,
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
