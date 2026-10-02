import { NextRequest, NextResponse } from "next/server";
import { getOwnedAccount, resolveScopeAccountIds } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import {
  accrueYieldsForAccount,
  accrueYieldsForUser,
  createCofrinho,
  listCofrinhosForUser,
} from "@/lib/cofrinhos";

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
    return NextResponse.json(await listCofrinhosForUser(user.id));
  }

  await accrueYieldsForAccount(accountIds[0]);
  return NextResponse.json(await listCofrinhosForUser(user.id, accountIds));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json();
  const { account_id, name, cdi_percentage, goal_amount, initial_balance, initial_yield } = body as {
    account_id?: unknown;
    name?: unknown;
    cdi_percentage?: unknown;
    goal_amount?: unknown;
    initial_balance?: unknown;
    initial_yield?: unknown;
  };

  if (typeof account_id !== "number" || !Number.isInteger(account_id)) {
    return NextResponse.json({ error: "A conta é obrigatória." }, { status: 400 });
  }

  if (!(await getOwnedAccount(user.id, account_id))) {
    return NextResponse.json({ error: "Conta inválida." }, { status: 400 });
  }

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "O nome do cofrinho é obrigatório." },
      { status: 400 }
    );
  }

  if (typeof cdi_percentage !== "number" || !Number.isFinite(cdi_percentage) || cdi_percentage <= 0) {
    return NextResponse.json(
      { error: "O percentual do CDI deve ser um número maior que zero." },
      { status: 400 }
    );
  }

  if (
    goal_amount !== null &&
    goal_amount !== undefined &&
    (typeof goal_amount !== "number" || !Number.isFinite(goal_amount) || goal_amount <= 0)
  ) {
    return NextResponse.json(
      { error: "A meta, se informada, deve ser um número maior que zero." },
      { status: 400 }
    );
  }

  for (const value of [initial_balance, initial_yield]) {
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
      return NextResponse.json(
        { error: "Saldo inicial e rendimento devem ser números maiores ou iguais a zero." },
        { status: 400 }
      );
    }
  }

  if (((initial_yield as number | undefined) ?? 0) > ((initial_balance as number | undefined) ?? 0)) {
    return NextResponse.json(
      { error: "O rendimento não pode ser maior que o saldo do cofrinho." },
      { status: 400 }
    );
  }

  const cofrinho = await createCofrinho(
    account_id,
    name,
    cdi_percentage,
    goal_amount ?? null,
    (initial_balance as number | undefined) ?? 0,
    (initial_yield as number | undefined) ?? 0
  );
  return NextResponse.json(cofrinho, { status: 201 });
}
