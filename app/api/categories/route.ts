import { NextRequest, NextResponse } from "next/server";
import { createCategory, listCategories, type CategoryKind } from "@/lib/categories";

const VALID_KINDS: CategoryKind[] = ["income", "expense", "both"];

export async function GET() {
  return NextResponse.json(await listCategories());
}

export async function POST(request: NextRequest) {
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
    const category = await createCategory(name, kind as CategoryKind);
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
