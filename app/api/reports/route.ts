import { NextRequest, NextResponse } from "next/server";
import { resolveScopeAccountIds } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { getTimeSeries, type ReportPeriod } from "@/lib/reports";

const VALID_PERIODS: ReportPeriod[] = ["week", "month", "year"];

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const period = request.nextUrl.searchParams.get("period") ?? "month";
  if (!VALID_PERIODS.includes(period as ReportPeriod)) {
    return NextResponse.json(
      { error: "O período deve ser 'week', 'month' ou 'year'." },
      { status: 400 }
    );
  }

  const accountIds = await resolveScopeAccountIds(
    user.id,
    request.nextUrl.searchParams.get("account")
  );
  if (accountIds === null) {
    return NextResponse.json({ error: "Conta inválida." }, { status: 400 });
  }

  return NextResponse.json(await getTimeSeries(accountIds, period as ReportPeriod));
}
