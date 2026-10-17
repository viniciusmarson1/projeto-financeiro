import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/src/lib/auth";
import { calculateMonthlySummary, type FinancialMovement } from "@/src/lib/finance";
import { deleteMonthEntry, getMonthEntries, saveMonthEntries } from "@/src/lib/store";

const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const movementSchema = z.object({
  id: z.string().uuid(),
  description: z.string().trim().min(1).max(120),
  amount: z.number().int().positive(),
  category: z.string().trim().min(1).max(60),
  date: z.string().date(),
  type: z.enum(["income", "expense"]),
  person: z.enum(["eu", "esposa", "familia"]),
  status: z.enum(["planned", "received", "paid", "pending"]),
  recurring: z.boolean().optional(),
  source: z.string().max(50).optional(),
  observed: z.string().max(500).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export async function GET(request: Request) {
  const isAuthenticated = await requireAuth();

  if (!isAuthenticated) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedMonth = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const parsedMonth = monthKeySchema.safeParse(requestedMonth);
  if (!parsedMonth.success) return NextResponse.json({ error: "Competência inválida." }, { status: 400 });

  try {
    const entries = (await getMonthEntries(parsedMonth.data)) as FinancialMovement[];
    const initialBalance = 0;

    return NextResponse.json({
      monthKey: parsedMonth.data,
      entries,
      initialBalance,
      summary: calculateMonthlySummary({ initialBalance, movements: entries }),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const isAuthenticated = await requireAuth();

  if (!isAuthenticated) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: "upsert" | "delete";
      monthKey?: string;
      movement?: unknown;
      id?: string;
    };

    const monthKey = monthKeySchema.parse(body.monthKey ?? new Date().toISOString().slice(0, 7));

    if (body.action === "delete") {
      const id = z.string().uuid().parse(body.id);
      await deleteMonthEntry(id);
      return NextResponse.json({ ok: true });
    }

    const movement = movementSchema.parse(body.movement);
    if (!movement.date.startsWith(monthKey)) return NextResponse.json({ error: "A data deve pertencer à competência selecionada." }, { status: 400 });
    const saved = await saveMonthEntries(monthKey, [movement]);

    return NextResponse.json({ ok: true, entries: saved });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar." }, { status: 500 });
  }
}
