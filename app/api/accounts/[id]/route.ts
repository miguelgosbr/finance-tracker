import { NextRequest, NextResponse } from "next/server";
import { deleteAccount, updateAccount } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { parseAccountInput } from "../route";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const accountId = Number(id);
  if (!Number.isInteger(accountId)) {
    return NextResponse.json({ error: "Conta inválida." }, { status: 400 });
  }

  const parsed = parseAccountInput(await request.json());
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const account = await updateAccount(user.id, accountId, parsed.input);
  if (!account) {
    return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
  }

  return NextResponse.json(account);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const accountId = Number(id);
  if (!Number.isInteger(accountId)) {
    return NextResponse.json({ error: "Conta inválida." }, { status: 400 });
  }

  const deleted = await deleteAccount(user.id, accountId);
  if (!deleted) {
    return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
