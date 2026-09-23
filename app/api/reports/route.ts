import { NextRequest, NextResponse } from "next/server";
import { getTimeSeries, type ReportPeriod } from "@/lib/reports";

const VALID_PERIODS: ReportPeriod[] = ["week", "month", "year"];

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") ?? "month";

  if (!VALID_PERIODS.includes(period as ReportPeriod)) {
    return NextResponse.json(
      { error: "O período deve ser 'week', 'month' ou 'year'." },
      { status: 400 }
    );
  }

  return NextResponse.json(await getTimeSeries(period as ReportPeriod));
}
