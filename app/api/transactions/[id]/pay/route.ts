import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markTransactionPaid } from "@/lib/transactions";

export async function POST(
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

  const transaction = await markTransactionPaid(user.id, transactionId);
  if (!transaction) {
    return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  }

  return NextResponse.json(transaction);
}
