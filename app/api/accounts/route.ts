import { NextRequest, NextResponse } from "next/server";
import { createAccount, listAccounts, VALID_BANKS, type Bank } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  return NextResponse.json(await listAccounts(user.id));
}

export function parseAccountInput(body: unknown) {
  const { name, bank, bank_color, has_credit_line, credit_limit, credit_line_due_day } =
    body as {
      name?: unknown;
      bank?: unknown;
      bank_color?: unknown;
      has_credit_line?: unknown;
      credit_limit?: unknown;
      credit_line_due_day?: unknown;
    };

  if (typeof name !== "string" || name.trim().length === 0) {
    return { error: "O nome da conta é obrigatório." } as const;
  }

  if (typeof bank !== "string" || !VALID_BANKS.includes(bank as Bank)) {
    return { error: "Selecione um banco válido." } as const;
  }

  if (typeof bank_color !== "string" || !HEX_COLOR_PATTERN.test(bank_color)) {
    return { error: "A cor do tema deve ser um código hexadecimal válido." } as const;
  }

  const hasCreditLine = has_credit_line === true;

  let creditLimit: number | null = null;
  let creditLineDueDay: number | null = null;

  if (hasCreditLine) {
    if (typeof credit_limit !== "number" || !Number.isFinite(credit_limit) || credit_limit <= 0) {
      return {
        error: "Informe um limite de crédito válido para a linha de crédito.",
      } as const;
    }
    creditLimit = credit_limit;

    if (credit_line_due_day !== null && credit_line_due_day !== undefined) {
      if (
        typeof credit_line_due_day !== "number" ||
        !Number.isInteger(credit_line_due_day) ||
        credit_line_due_day < 1 ||
        credit_line_due_day > 31
      ) {
        return { error: "O dia de vencimento deve ser um número entre 1 e 31." } as const;
      }
      creditLineDueDay = credit_line_due_day;
    }
  }

  return {
    input: {
      name,
      bank: bank as Bank,
      bankColor: bank_color,
      hasCreditLine,
      creditLimit,
      creditLineDueDay,
    },
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
