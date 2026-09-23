import { NextRequest, NextResponse } from "next/server";
import { createAccount, listAccounts, type AccountKind } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";

const VALID_KINDS: AccountKind[] = ["checking", "credit"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  return NextResponse.json(await listAccounts(user.id));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json();
  const { name, kind } = body as { name?: unknown; kind?: unknown };

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "O nome da conta é obrigatório." }, { status: 400 });
  }

  if (typeof kind !== "string" || !VALID_KINDS.includes(kind as AccountKind)) {
    return NextResponse.json(
      { error: "O tipo deve ser 'checking' ou 'credit'." },
      { status: 400 }
    );
  }

  const account = await createAccount(user.id, name, kind as AccountKind);
  return NextResponse.json(account, { status: 201 });
}
