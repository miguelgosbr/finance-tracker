import { NextRequest, NextResponse } from "next/server";
import { getOwnedAccount } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { getCreditLineStatus } from "@/lib/creditLine";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const accountId = Number(id);
  const account = Number.isInteger(accountId) ? await getOwnedAccount(user.id, accountId) : null;
  if (!account) {
    return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
  }

  return NextResponse.json(await getCreditLineStatus(account));
}
