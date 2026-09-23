import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const [monthlyBudget, cdiRateAnnual] = await Promise.all([
    getSetting(user.id, "monthly_budget"),
    getSetting(user.id, "cdi_rate_annual"),
  ]);

  return NextResponse.json({
    monthly_budget: monthlyBudget ?? "",
    cdi_rate_annual: cdiRateAnnual ?? "",
  });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json();
  const { monthly_budget, cdi_rate_annual } = body as {
    monthly_budget?: unknown;
    cdi_rate_annual?: unknown;
  };

  // Monthly budget is optional: empty clears it (falls back to the trailing average).
  let budgetValue = "";
  if (monthly_budget !== undefined && monthly_budget !== null && monthly_budget !== "") {
    const parsed = Number(monthly_budget);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json(
        { error: "O orçamento mensal deve ser um número maior que zero, ou vazio." },
        { status: 400 }
      );
    }
    budgetValue = String(parsed);
  }

  const cdiParsed = Number(cdi_rate_annual);
  if (!Number.isFinite(cdiParsed) || cdiParsed <= 0) {
    return NextResponse.json(
      { error: "A taxa anual do CDI deve ser um número maior que zero." },
      { status: 400 }
    );
  }

  await setSetting(user.id, "monthly_budget", budgetValue);
  await setSetting(user.id, "cdi_rate_annual", String(cdiParsed));

  return NextResponse.json({
    monthly_budget: budgetValue,
    cdi_rate_annual: String(cdiParsed),
  });
}
