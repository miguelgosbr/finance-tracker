import { NextRequest, NextResponse } from "next/server";
import { resolveScopeAccountIds } from "@/lib/accounts";
import { getBurnRateDiagnosis } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const accountIds = await resolveScopeAccountIds(
    user.id,
    request.nextUrl.searchParams.get("account")
  );
  if (accountIds === null) {
    return NextResponse.json({ error: "Conta inválida." }, { status: 400 });
  }

  return NextResponse.json(await getBurnRateDiagnosis(user.id, accountIds));
}
