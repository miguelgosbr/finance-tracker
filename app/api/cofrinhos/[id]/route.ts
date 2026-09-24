import { NextRequest, NextResponse } from "next/server";
import { getOwnedAccount } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { deleteCofrinho, getCofrinho, updateCofrinho } from "@/lib/cofrinhos";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const cofrinhoId = Number(id);
  const cofrinho = Number.isInteger(cofrinhoId) ? await getCofrinho(cofrinhoId) : null;
  if (!cofrinho || !(await getOwnedAccount(user.id, cofrinho.account_id))) {
    return NextResponse.json({ error: "Cofrinho não encontrado." }, { status: 404 });
  }

  const body = await request.json();
  const { name, cdi_percentage, goal_amount, account_id } = body as {
    name?: unknown;
    cdi_percentage?: unknown;
    goal_amount?: unknown;
    account_id?: unknown;
  };

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "O nome do cofrinho é obrigatório." }, { status: 400 });
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

  if (typeof account_id !== "number" || !Number.isInteger(account_id)) {
    return NextResponse.json({ error: "A conta é obrigatória." }, { status: 400 });
  }

  if (!(await getOwnedAccount(user.id, account_id))) {
    return NextResponse.json({ error: "Conta inválida." }, { status: 400 });
  }

  const updated = await updateCofrinho(cofrinhoId, {
    name,
    cdiPercentage: cdi_percentage,
    goalAmount: goal_amount ?? null,
    accountId: account_id,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const cofrinhoId = Number(id);
  const cofrinho = Number.isInteger(cofrinhoId) ? await getCofrinho(cofrinhoId) : null;
  if (!cofrinho || !(await getOwnedAccount(user.id, cofrinho.account_id))) {
    return NextResponse.json({ error: "Cofrinho não encontrado." }, { status: 404 });
  }

  await deleteCofrinho(cofrinhoId);
  return NextResponse.json({ ok: true });
}
