import { NextRequest, NextResponse } from "next/server";
import { getOwnedAccount } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import {
  getCofrinho,
  recordMovement,
  type CofrinhoMovementType,
} from "@/lib/cofrinhos";
import { getCurrentBalance } from "@/lib/transactions";

const VALID_TYPES: CofrinhoMovementType[] = ["deposit", "withdrawal"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const cofrinhoId = Number(id);

  const cofrinho = await getCofrinho(cofrinhoId);
  if (!cofrinho || !(await getOwnedAccount(user.id, cofrinho.account_id))) {
    return NextResponse.json({ error: "Cofrinho não encontrado." }, { status: 404 });
  }

  const body = await request.json();
  const { type, amount } = body as { type?: unknown; amount?: unknown };

  if (typeof type !== "string" || !VALID_TYPES.includes(type as CofrinhoMovementType)) {
    return NextResponse.json(
      { error: "O tipo deve ser 'deposit' ou 'withdrawal'." },
      { status: 400 }
    );
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "O valor deve ser um número maior que zero." },
      { status: 400 }
    );
  }

  if (type === "withdrawal" && amount > cofrinho.balance) {
    return NextResponse.json(
      { error: "O valor do resgate não pode ser maior que o saldo do cofrinho." },
      { status: 400 }
    );
  }

  if (type === "deposit" && amount > (await getCurrentBalance(cofrinho.account_id))) {
    return NextResponse.json(
      { error: "O valor do depósito não pode ser maior que o saldo disponível em conta." },
      { status: 400 }
    );
  }

  const updated = await recordMovement(cofrinhoId, type as CofrinhoMovementType, amount);
  return NextResponse.json(updated);
}
