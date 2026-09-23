import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/settings";

export interface SettingsPayload {
  monthly_budget: string;
  cdi_rate_annual: string;
}

export async function GET() {
  const [monthlyBudget, cdiRateAnnual] = await Promise.all([
    getSetting("monthly_budget"),
    getSetting("cdi_rate_annual"),
  ]);

  return NextResponse.json({
    monthly_budget: monthlyBudget ?? "",
    cdi_rate_annual: cdiRateAnnual ?? "",
  });
}

export async function PUT(request: NextRequest) {
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

  await setSetting("monthly_budget", budgetValue);
  await setSetting("cdi_rate_annual", String(cdiParsed));

  return NextResponse.json({
    monthly_budget: budgetValue,
    cdi_rate_annual: String(cdiParsed),
  });
}
