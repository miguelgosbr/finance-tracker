import { NextResponse } from "next/server";
import { getBurnRateDiagnosis } from "@/lib/analytics";

export async function GET() {
  return NextResponse.json(getBurnRateDiagnosis());
}
