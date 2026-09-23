import { NextRequest, NextResponse } from "next/server";
import { createCofrinho, listCofrinhos } from "@/lib/cofrinhos";

export async function GET() {
  return NextResponse.json(listCofrinhos());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, cdi_percentage, goal_amount } = body as {
    name?: unknown;
    cdi_percentage?: unknown;
    goal_amount?: unknown;
  };

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "O nome do cofrinho é obrigatório." },
      { status: 400 }
    );
  }

  if (typeof cdi_percentage !== "number" || !Number.isFinite(cdi_percentage) || cdi_percentage <= 0) {
    return NextResponse.json(
      { error: "O percentual do CDI deve ser um número maior que zero." },
      { status: 400 }
    );
  }

  if (
    goal_amount !== null &&
    goal_amount !== undefined &&
    (typeof goal_amount !== "number" || !Number.isFinite(goal_amount) || goal_amount <= 0)
  ) {
    return NextResponse.json(
      { error: "A meta, se informada, deve ser um número maior que zero." },
      { status: 400 }
    );
  }

  const cofrinho = createCofrinho(name, cdi_percentage, goal_amount ?? null);
  return NextResponse.json(cofrinho, { status: 201 });
}
