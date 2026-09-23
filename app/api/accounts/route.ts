import { NextRequest, NextResponse } from "next/server";
import { createAccount, listAccounts, VALID_BANKS, type Bank } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  return NextResponse.json(await listAccounts(user.id));
}

export function parseAccountInput(body: unknown) {
  const { name, bank, has_credit_line, credit_limit } = body as {
    name?: unknown;
    bank?: unknown;
    has_credit_line?: unknown;
    credit_limit?: unknown;
  };

  if (typeof name !== "string" || name.trim().length === 0) {
    return { error: "O nome da conta é obrigatório." } as const;
  }

  if (typeof bank !== "string" || !VALID_BANKS.includes(bank as Bank)) {
    return { error: "Selecione um banco válido." } as const;
  }

  const hasCreditLine = has_credit_line === true;

  let creditLimit: number | null = null;
  if (hasCreditLine) {
    if (typeof credit_limit !== "number" || !Number.isFinite(credit_limit) || credit_limit <= 0) {
      return {
        error: "Informe um limite de crédito válido para a linha de crédito.",
      } as const;
    }
    creditLimit = credit_limit;
  }

  return {
    input: { name, bank: bank as Bank, hasCreditLine, creditLimit },
  } as const;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const parsed = parseAccountInput(await request.json());
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const account = await createAccount(user.id, parsed.input);
  return NextResponse.json(account, { status: 201 });
}
