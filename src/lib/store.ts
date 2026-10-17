import { createClient } from "@supabase/supabase-js";

import { type FinancialMovement } from "@/src/lib/finance";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no servidor.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getMonthEntries(monthKey: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.from("financial_movements").select("*").eq("month_key", monthKey).order("date", { ascending: true });
  if (error) {
    throw new Error(`Não foi possível carregar os lançamentos: ${error.message}`);
  }
  return (data ?? []).map(fromDatabaseMovement);
}

export async function saveMonthEntries(monthKey: string, items: FinancialMovement[]) {
  const client = getSupabaseClient();
  const { data, error } = await client.from("financial_movements").upsert(
    items.map((item) => toDatabaseMovement(monthKey, item)),
    { onConflict: "id" },
  ).select();
  if (error) {
    throw new Error(`Não foi possível salvar o lançamento: ${error.message}`);
  }
  return (data ?? []).map(fromDatabaseMovement);
}

export async function deleteMonthEntry(id: string) {
  const client = getSupabaseClient();
  const { error } = await client.from("financial_movements").delete().eq("id", id);
  if (error) {
    throw new Error(`Não foi possível excluir o lançamento: ${error.message}`);
  }
}

function toDatabaseMovement(monthKey: string, item: FinancialMovement) {
  return {
    id: item.id,
    month_key: monthKey,
    description: item.description,
    amount: item.amount,
    category: item.category,
    date: item.date,
    type: item.type,
    person: item.person,
    status: item.status,
    recurring: item.recurring ?? false,
    source: item.source ?? "custom",
    observed: item.observed ?? "",
    created_at: item.createdAt ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function fromDatabaseMovement(item: Record<string, unknown>): FinancialMovement {
  return {
    id: String(item.id),
    description: String(item.description),
    amount: Number(item.amount),
    category: String(item.category),
    date: String(item.date),
    type: item.type as FinancialMovement["type"],
    person: item.person as FinancialMovement["person"],
    status: item.status as FinancialMovement["status"],
    recurring: Boolean(item.recurring),
    source: String(item.source ?? "custom"),
    observed: String(item.observed ?? ""),
    createdAt: String(item.created_at ?? ""),
    updatedAt: String(item.updated_at ?? ""),
  };
}
