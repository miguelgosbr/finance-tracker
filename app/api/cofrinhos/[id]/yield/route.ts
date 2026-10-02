import { NextRequest, NextResponse } from "next/server";
import { getOwnedAccount } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { getCofrinho, setMonthlyYield } from "@/lib/cofrinhos";

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

  const { amount } = (await request.json()) as { amount?: unknown };
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Informe um rendimento válido (0 ou mais)." }, { status: 400 });
  }

  return NextResponse.json(await setMonthlyYield(cofrinhoId, Math.round(amount * 100) / 100));
}
