export type MovementType = "income" | "expense";
export type ResponsiblePerson = "eu" | "esposa" | "familia";
export type MovementStatus = "planned" | "received" | "paid" | "pending";

export type FinancialMovement = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: MovementType;
  person: ResponsiblePerson;
  status: MovementStatus;
  recurring?: boolean;
  source?: string;
  observed?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MonthlySummary = {
  initialBalance: number;
  totalIncomePlanned: number;
  totalIncomeReceived: number;
  totalExpensePlanned: number;
  totalExpensePaid: number;
  projectedBalance: number;
  realizedBalance: number;
};

export function parseCurrencyInputToCents(value: string | number) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return 0;
  }

  const normalized = raw
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed * 100);
}

export function parseBrazilianDateToIso(value: string) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return "";
  }

  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function formatDateForDisplay(value: string) {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12));

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function centsToCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

export function createMonthlyMovement(
  movement: Partial<FinancialMovement> & Pick<FinancialMovement, "description" | "amount" | "category" | "date" | "type" | "person" | "status">,
): FinancialMovement {
  return {
    id: movement.id ?? crypto.randomUUID(),
    description: movement.description,
    amount: movement.amount,
    category: movement.category,
    date: movement.date,
    type: movement.type,
    person: movement.person,
    status: movement.status,
    recurring: movement.recurring ?? false,
    source: movement.source ?? "custom",
    observed: movement.observed ?? "",
    createdAt: movement.createdAt ?? new Date().toISOString(),
    updatedAt: movement.updatedAt ?? new Date().toISOString(),
  };
}

export function calculateProjectedBalance(initialBalance: number, movements: FinancialMovement[]) {
  const summary = calculateMonthlySummary({ initialBalance, movements });
  return summary.projectedBalance;
}

export function calculateMonthlySummary({
  initialBalance,
  movements,
}: {
  initialBalance: number;
  movements: FinancialMovement[];
}): MonthlySummary {
  const totalIncomePlanned = movements
    .filter((item) => item.type === "income" && (item.status === "planned" || item.status === "received"))
    .reduce((sum, item) => sum + item.amount, 0);

  const totalIncomeReceived = movements
    .filter((item) => item.type === "income" && item.status === "received")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpensePlanned = movements
    .filter((item) => item.type === "expense" && (item.status === "planned" || item.status === "pending" || item.status === "paid"))
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpensePaid = movements
    .filter((item) => item.type === "expense" && item.status === "paid")
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    initialBalance,
    totalIncomePlanned,
    totalIncomeReceived,
    totalExpensePlanned,
    totalExpensePaid,
    projectedBalance: initialBalance + totalIncomePlanned - totalExpensePlanned,
    realizedBalance: initialBalance + totalIncomeReceived - totalExpensePaid,
  };
}

export function getResponsibleTotals(movements: FinancialMovement[]) {
  const empty: Record<"eu" | "esposa" | "family", { income: number; expense: number }> = {
    eu: { income: 0, expense: 0 },
    esposa: { income: 0, expense: 0 },
    family: { income: 0, expense: 0 },
  };

  return movements.reduce((totals, item) => {
    const owner: "eu" | "esposa" | "family" = item.person === "eu" || item.person === "esposa" ? item.person : "family";
    const bucket = totals[owner];

    if (item.type === "income") {
      bucket.income += item.amount;
    } else {
      bucket.expense += item.amount;
    }

    totals.family.income += item.type === "income" ? item.amount : 0;
    totals.family.expense += item.type === "expense" ? item.amount : 0;

    return totals;
  }, empty);
}

export function reconcileMonthData({
  monthKey,
  existing,
  newEntries,
}: {
  monthKey: string;
  existing: FinancialMovement[];
  newEntries: FinancialMovement[];
}) {
  const lookup = new Map<string, FinancialMovement>();

  for (const item of [...existing, ...newEntries]) {
    if (monthKey && item.date.startsWith(monthKey)) {
      lookup.set(item.id, item);
    }
  }

  return Array.from(lookup.values());
}
