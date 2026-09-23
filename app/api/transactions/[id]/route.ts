import { NextRequest, NextResponse } from "next/server";
import { getOwnedAccount } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import {
  deleteTransaction,
  getOwnedTransaction,
  updateTransaction,
} from "@/lib/transactions";
import { parseTransactionInput } from "../route";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const transactionId = Number(id);
  const existing = Number.isInteger(transactionId)
    ? await getOwnedTransaction(user.id, transactionId)
    : null;
  if (!existing) {
    return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  }

  const account = await getOwnedAccount(user.id, existing.account_id);
  const parsed = await parseTransactionInput(await request.json(), user.id, account);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const transaction = await updateTransaction(user.id, transactionId, parsed.input);
  return NextResponse.json(transaction);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const transactionId = Number(id);
  if (!Number.isInteger(transactionId)) {
    return NextResponse.json({ error: "Lançamento inválido." }, { status: 400 });
  }

  const deleted = await deleteTransaction(user.id, transactionId);
  if (!deleted) {
    return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
