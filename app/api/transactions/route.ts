import { NextRequest, NextResponse } from "next/server";
import { getOwnedAccount, resolveScopeAccountIds, type Account } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedCategory } from "@/lib/categories";
import { accrueYieldsForAccount, accrueYieldsForUser } from "@/lib/cofrinhos";
import {
  createTransaction,
  getBalanceForAccounts,
  listTransactionsForUser,
  type PaymentMethod,
  type TransactionType,
} from "@/lib/transactions";

const VALID_TYPES: TransactionType[] = ["income", "expense"];
const VALID_PAYMENT_METHODS: PaymentMethod[] = ["account", "credit_line"];
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

/**
 * Validates the body shared by POST (new transaction) and PATCH (edit).
 * `account` is the already-resolved, ownership-checked target account,
 * needed to validate a 'credit_line' payment method and (for POST) required
 * in the body as account_id.
 */
export async function parseTransactionInput(
  body: unknown,
  userId: number,
  account: Account | null
) {
  const { type, amount, description, category_id, occurred_on, payment_method } = body as {
    type?: unknown;
    amount?: unknown;
    description?: unknown;
    category_id?: unknown;
    occurred_on?: unknown;
    payment_method?: unknown;
  };

  if (typeof type !== "string" || !VALID_TYPES.includes(type as TransactionType)) {
    return { error: "O tipo deve ser 'income' ou 'expense'." } as const;
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return { error: "O valor deve ser um número maior que zero." } as const;
  }

  if (typeof description !== "string" || description.trim().length === 0) {
    return { error: "A descrição é obrigatória." } as const;
  }

  if (typeof category_id !== "number" || !Number.isInteger(category_id)) {
    return { error: "A categoria é obrigatória." } as const;
  }

  if (!(await getOwnedCategory(userId, category_id))) {
    return { error: "Categoria inválida." } as const;
  }

  if (typeof occurred_on !== "string" || !DATE_PATTERN.test(occurred_on)) {
    return { error: "A data deve estar no formato AAAA-MM-DD." } as const;
  }

  const paymentMethod: PaymentMethod =
    payment_method === undefined || payment_method === null ? "account" : (payment_method as PaymentMethod);

  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    return { error: "A forma de pagamento deve ser 'account' ou 'credit_line'." } as const;
  }

  if (paymentMethod === "credit_line" && (type !== "expense" || !account?.has_credit_line)) {
    return {
      error: "Essa conta não possui linha de crédito, ou o lançamento não é um gasto.",
    } as const;
  }

  return {
    input: {
      type: type as TransactionType,
      amount,
      description: description.trim(),
      category_id,
      occurred_on,
      paymentMethod,
    },
  } as const;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json();
  const { account_id } = body as { account_id?: unknown };

  if (typeof account_id !== "number" || !Number.isInteger(account_id)) {
    return NextResponse.json({ error: "A conta é obrigatória." }, { status: 400 });
  }

  const account = await getOwnedAccount(user.id, account_id);
  if (!account) {
    return NextResponse.json({ error: "Conta inválida." }, { status: 400 });
  }

  const parsed = await parseTransactionInput(body, user.id, account);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const transaction = await createTransaction({ account_id, ...parsed.input });
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
