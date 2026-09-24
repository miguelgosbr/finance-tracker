import { NextRequest, NextResponse } from "next/server";
import { getOwnedAccount, resolveScopeAccountIds } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentBalance } from "@/lib/transactions";
import { createTransfer, listTransfersForUser } from "@/lib/transfers";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const accountIds = await resolveScopeAccountIds(
    user.id,
    request.nextUrl.searchParams.get("account")
  );
  if (accountIds === null) {
    return NextResponse.json({ error: "Conta inválida." }, { status: 400 });
  }

  return NextResponse.json(await listTransfersForUser(user.id, accountIds));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json();
  const { from_account_id, to_account_id, amount, description, occurred_on } = body as {
    from_account_id?: unknown;
    to_account_id?: unknown;
    amount?: unknown;
    description?: unknown;
    occurred_on?: unknown;
  };

  if (typeof from_account_id !== "number" || typeof to_account_id !== "number") {
    return NextResponse.json(
      { error: "Selecione a conta de origem e a conta de destino." },
      { status: 400 }
    );
  }

  if (from_account_id === to_account_id) {
    return NextResponse.json(
      { error: "A conta de origem e a de destino devem ser diferentes." },
      { status: 400 }
    );
  }

  const [fromAccount, toAccount] = await Promise.all([
    getOwnedAccount(user.id, from_account_id),
    getOwnedAccount(user.id, to_account_id),
  ]);

  if (!fromAccount || !toAccount) {
    return NextResponse.json({ error: "Conta inválida." }, { status: 400 });
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "O valor deve ser um número maior que zero." },
      { status: 400 }
    );
  }

  const availableBalance = await getCurrentBalance(from_account_id);
  if (amount > availableBalance) {
    return NextResponse.json(
      { error: "O valor da transferência não pode ser maior que o saldo disponível na conta de origem." },
      { status: 400 }
    );
  }

  if (typeof occurred_on !== "string" || !DATE_PATTERN.test(occurred_on)) {
    return NextResponse.json(
      { error: "A data deve estar no formato AAAA-MM-DD." },
      { status: 400 }
    );
  }

  if (description !== undefined && description !== null && typeof description !== "string") {
    return NextResponse.json({ error: "Descrição inválida." }, { status: 400 });
  }

  const transfer = await createTransfer({
    user_id: user.id,
    from_account_id,
    to_account_id,
    amount,
    description: typeof description === "string" ? description.trim() : "",
    occurred_on,
  });

  return NextResponse.json(transfer, { status: 201 });
}
