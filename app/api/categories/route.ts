import { NextRequest, NextResponse } from "next/server";
import { createCategory, listCategories, type CategoryKind } from "@/lib/categories";
import { getCurrentUser } from "@/lib/auth";

const VALID_KINDS: CategoryKind[] = ["income", "expense", "both"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  return NextResponse.json(await listCategories(user.id));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json();
  const { name, kind } = body as { name?: unknown; kind?: unknown };

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "O nome da categoria é obrigatório." },
      { status: 400 }
    );
  }

  if (typeof kind !== "string" || !VALID_KINDS.includes(kind as CategoryKind)) {
    return NextResponse.json(
      { error: "O tipo da categoria deve ser 'income', 'expense' ou 'both'." },
      { status: 400 }
    );
  }

  try {
    const category = await createCategory(user.id, name, kind as CategoryKind);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return NextResponse.json(
        { error: "Já existe uma categoria com esse nome." },
        { status: 409 }
      );
    }
    throw error;
  }
}
