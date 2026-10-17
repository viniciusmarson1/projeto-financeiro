"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CreditCard,
  LogOut,
  Moon,
  PiggyBank,
  Plus,
  Sun,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import {
  calculateMonthlySummary,
  centsToCurrency,
  createMonthlyMovement,
  formatDateForDisplay,
  getResponsibleTotals,
  parseBrazilianDateToIso,
  parseCurrencyInputToCents,
  type FinancialMovement,
  type MovementStatus,
  type MovementType,
  type ResponsiblePerson,
} from "@/src/lib/finance";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const defaultCategoryOptions = [
  "Mercado",
  "Moradia",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Internet",
  "Celular",
  "Combustível",
  "Cartão",
  "Salário",
  "Outros",
];

const CUSTOM_CATEGORY_OPTION = "__custom__";

const today = new Date();
const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

const emptyForm = {
  description: "",
  amount: "",
  category: "Mercado",
  date: new Date().toISOString().slice(0, 10),
  dateText: formatDateForDisplay(new Date().toISOString().slice(0, 10)),
  type: "expense" as MovementType,
  person: "eu" as ResponsiblePerson,
  status: "pending" as MovementStatus,
  recurring: false,
};

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrencyInput(value: string) {
  const sanitized = value.replace(/[^\d,]/g, "");

  if (!sanitized) {
    return "";
  }

  if (sanitized.includes(",")) {
    const [whole, decimalsRaw = ""] = sanitized.split(",");
    const cleanWhole = whole.replace(/\D/g, "").slice(0, 12);
    const cleanDecimals = decimalsRaw.replace(/\D/g, "").slice(0, 2);
    const formattedWhole = cleanWhole ? cleanWhole.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
    return `${formattedWhole},${cleanDecimals}`;
  }

  const digits = sanitized.replace(/\D/g, "").slice(0, 12);
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
}

export function FinanceDashboard() {
  const [monthKey, setMonthKey] = useState(defaultMonth);
  const [entries, setEntries] = useState<FinancialMovement[]>([]);
  const [view, setView] = useState<"overview" | "me" | "wife">("overview");
  const [summary, setSummary] = useState(
    calculateMonthlySummary({ initialBalance: 0, movements: [] }),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>(defaultCategoryOptions);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryDraft, setCustomCategoryDraft] = useState("");
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("finance-theme") === "dark" ? "dark" : "light";
  });
  const router = useRouter();

  useEffect(() => {
    window.localStorage.setItem("finance-theme", theme);
  }, [theme]);

  const monthLabel = useMemo(() => {
    const [year, month] = monthKey.split("-").map(Number);
    return monthFormatter.format(new Date(year, month - 1, 1));
  }, [monthKey]);

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();

    entries.forEach((entry) => {
      if (entry.type !== "expense") {
        return;
      }

      totals.set(entry.category, (totals.get(entry.category) ?? 0) + entry.amount);
    });

    return Array.from(totals.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [entries]);

  const topExpenseCategory = categoryTotals[0];

  const orderedCategoryOptions = useMemo(() => {
    const usageMap = new Map<string, number>();

    entries.forEach((entry) => {
      usageMap.set(entry.category, (usageMap.get(entry.category) ?? 0) + 1);
    });

    return [...categoryOptions].sort((a, b) => {
      const aIsDefault = defaultCategoryOptions.includes(a) ? 1 : 0;
      const bIsDefault = defaultCategoryOptions.includes(b) ? 1 : 0;

      if (aIsDefault !== bIsDefault) {
        return bIsDefault - aIsDefault;
      }

      return (usageMap.get(b) ?? 0) - (usageMap.get(a) ?? 0);
    });
  }, [categoryOptions, entries]);

  const customCategories = useMemo(
    () => orderedCategoryOptions.filter((option) => !defaultCategoryOptions.includes(option)),
    [orderedCategoryOptions],
  );

  const filteredEntries = useMemo(() => {
    const base = entries.filter((entry) => {
      if (view === "me") return entry.person === "eu";
      if (view === "wife") return entry.person === "esposa";
      return true;
    });

    const query = searchTerm.trim().toLowerCase();

    return base.filter((entry) => {
      const matchesSearch = !query || entry.description.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [entries, searchTerm, statusFilter, view]);

  const filteredSummary = useMemo(
    () => calculateMonthlySummary({ initialBalance: summary.initialBalance, movements: filteredEntries }),
    [filteredEntries, summary.initialBalance],
  );

  const loadMonth = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/finance?month=${monthKey}`);
    const data = await response.json();

    const monthEntries = data.entries ?? [];

    setEntries(monthEntries);
    setSummary(
      calculateMonthlySummary({
        initialBalance: data.initialBalance ?? 0,
        movements: monthEntries,
      }),
    );
    setLoading(false);
  }, [monthKey]);

  useEffect(() => {
    // This effect fetches data whenever the selected competence changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMonth();
  }, [loadMonth]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function handleCategoryKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    const name = customCategoryDraft.trim();

    if (!name) {
      return;
    }

    if (editingCategoryName) {
      const nextCategories = categoryOptions.map((item) => (item === editingCategoryName ? name : item));
      setCategoryOptions(Array.from(new Set(nextCategories)));
      setForm((current) => ({ ...current, category: name }));
      setStatusMessage(`Categoria "${name}" atualizada.`);
      setEditingCategoryName(null);
    } else {
      const nextCategories = Array.from(new Set([...categoryOptions, name]));
      setCategoryOptions(nextCategories);
      setForm((current) => ({ ...current, category: name }));
      setStatusMessage(`Categoria "${name}" adicionada.`);
    }

    setIsCustomCategory(false);
    setCustomCategoryDraft("");
  }

  function removeCategory(category: string) {
    if (defaultCategoryOptions.includes(category)) {
      return;
    }

    const nextCategories = categoryOptions.filter((item) => item !== category);
    setCategoryOptions(nextCategories);
    setForm((current) => ({
      ...current,
      category: nextCategories[0] ?? defaultCategoryOptions[0],
    }));
    setStatusMessage(`Categoria "${category}" removida.`);
  }

  function editCategory(category: string) {
    setEditingCategoryName(category);
    setCustomCategoryDraft(category);
    setIsCustomCategory(true);
    setForm((current) => ({ ...current, category }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dateValue = parseBrazilianDateToIso(form.dateText) || form.date;
    const amountInCents = parseCurrencyInputToCents(form.amount);

    if (!form.description || !form.category || amountInCents <= 0 || !dateValue) {
      setStatusMessage("Preencha descrição, categoria, data e valor válidos.");
      return;
    }

    const movement = createMonthlyMovement({
      id: crypto.randomUUID(),
      description: form.description,
      amount: amountInCents,
      category: form.category,
      date: dateValue,
      type: form.type,
      person: form.person,
      status: form.type === "income" ? (form.status === "pending" ? "planned" : form.status) : form.status,
      recurring: form.recurring,
      source: form.recurring ? "fixed" : "daily",
      observed: form.recurring ? "Despesa fixa cadastrada" : "Adicionado pelo painel rápido",
    });

    const response = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upsert", monthKey, movement }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatusMessage(payload.error ?? "Não foi possível salvar.");
      return;
    }

    setStatusMessage("Lançamento salvo com sucesso.");
    setForm({ ...emptyForm, date: dateValue, dateText: formatDateForDisplay(dateValue) });
    setIsCustomCategory(false);
    setCustomCategoryDraft("");
    await loadMonth();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Excluir este lançamento? Esta ação não pode ser desfeita.")) {
      return;
    }

    const response = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", monthKey, id }),
    });

    if (response.ok) {
      setStatusMessage("Lançamento removido.");
      await loadMonth();
    } else {
      const payload = await response.json();
      setStatusMessage(payload.error ?? "Não foi possível excluir o lançamento.");
    }
  }

  function changeMonth(offset: number) {
    const [year, month] = monthKey.split("-").map(Number);
    const nextDate = new Date(year, month - 1 + offset, 1);
    setMonthKey(formatMonthKey(nextDate));
  }

  const totals = useMemo(() => getResponsibleTotals(entries), [entries]);

  const isDark = theme === "dark";
  const controlClass = isDark
    ? "rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
    : "rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none";
  const labelClass = isDark
    ? "mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400"
    : "mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500";

  return (
    <div className={isDark ? "min-h-screen bg-slate-950 text-slate-100" : "min-h-screen bg-[radial-gradient(circle_at_top,_#ecfdf5_0%,_#f8fafc_38%,_#f1f5f9_100%)] text-slate-900"}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-24 pt-4 sm:px-6 sm:pb-4 lg:px-8">
        <header className={isDark ? "rounded-3xl border border-slate-700 bg-slate-900/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.35)] backdrop-blur-sm" : "rounded-3xl border border-emerald-100 bg-white/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm"}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={isDark ? "text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400" : "text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700"}>Financeira familiar</p>
              <h1 className={isDark ? "mt-2 text-2xl font-bold text-white" : "mt-2 text-2xl font-bold text-slate-900"}>Painel financeiro</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className={isDark ? "inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700" : "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? "Claro" : "Escuro"}
              </button>

              <button
                onClick={handleLogout}
                className={isDark ? "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700" : "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>

          <div className={isDark ? "mt-4 flex flex-col gap-3 rounded-2xl bg-slate-800/90 p-3 sm:flex-row sm:items-center sm:justify-between" : "mt-4 flex flex-col gap-3 rounded-2xl bg-slate-50/90 p-3 sm:flex-row sm:items-center sm:justify-between"}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => changeMonth(-1)}
                className={isDark ? "rounded-lg border border-slate-600 bg-slate-700 p-2 text-slate-100 transition hover:bg-slate-600" : "rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-100"}
                aria-label="Mês anterior"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className={isDark ? "flex min-w-0 items-center gap-2 rounded-xl bg-slate-700 px-3 py-2 shadow-sm ring-1 ring-slate-600" : "flex min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200"}>
                <CalendarDays className="h-4 w-4 text-emerald-400" />
                <span className={isDark ? "text-sm font-semibold capitalize text-slate-100" : "text-sm font-semibold capitalize text-slate-900"}>{monthLabel}</span>
              </div>
              <button
                onClick={() => changeMonth(1)}
                className={isDark ? "rounded-lg border border-slate-600 bg-slate-700 p-2 text-slate-100 transition hover:bg-slate-600" : "rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-100"}
                aria-label="Próximo mês"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <label className={isDark ? "flex items-center gap-2 text-sm text-slate-300" : "flex items-center gap-2 text-sm text-slate-700"}>
              <span>Competência</span>
              <input
                type="month"
                value={monthKey}
                onChange={(event) => setMonthKey(event.target.value)}
                className={isDark ? "rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-100 shadow-sm focus:border-emerald-500 focus:outline-none" : "rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"}
              />
            </label>
          </div>

          <nav className="mt-4 flex flex-wrap gap-2">
            {[
              { key: "overview", label: "Visão geral" },
              { key: "me", label: "Minhas finanças" },
              { key: "wife", label: "Finanças da esposa" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key as "overview" | "me" | "wife")}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  view === tab.key
                    ? isDark
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-emerald-600 text-white shadow-sm"
                    : isDark
                      ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Saldo inicial" value={centsToCurrency(summary.initialBalance)} icon={<PiggyBank className="h-5 w-5" />} tone="emerald" dark={isDark} />
          <StatCard title="Receitas previstas" value={centsToCurrency(filteredSummary.totalIncomePlanned)} icon={<TrendingUp className="h-5 w-5" />} tone="green" dark={isDark} />
          <StatCard title="Despesas previstas" value={centsToCurrency(filteredSummary.totalExpensePlanned)} icon={<TrendingDown className="h-5 w-5" />} tone="amber" dark={isDark} />
          <StatCard title="Saldo atual" value={centsToCurrency(filteredSummary.realizedBalance)} icon={<Wallet className="h-5 w-5" />} tone="blue" dark={isDark} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className={isDark ? "rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.35)]" : "rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={isDark ? "text-lg font-semibold text-slate-100" : "text-lg font-semibold text-slate-900"}>Resumo do mês</h2>
              <span className={isDark ? "rounded-full bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"}>{filteredEntries.length} itens</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MiniStat label="Receitas recebidas" value={centsToCurrency(filteredSummary.totalIncomeReceived)} accent="text-emerald-600" dark={isDark} />
              <MiniStat label="Despesas pagas" value={centsToCurrency(filteredSummary.totalExpensePaid)} accent="text-rose-600" dark={isDark} />
              <MiniStat label="Saldo final previsto" value={centsToCurrency(filteredSummary.projectedBalance)} accent={isDark ? "text-indigo-300" : "text-indigo-600"} dark={isDark} />
              <MiniStat label="Saldo realizado" value={centsToCurrency(filteredSummary.realizedBalance)} accent={isDark ? "text-sky-300" : "text-sky-600"} dark={isDark} />
            </div>

            <div className={isDark ? "mt-5 rounded-2xl bg-slate-800 p-4 ring-1 ring-slate-700" : "mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/80"}>
              <div className={isDark ? "mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200" : "mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"}>
                <CreditCard className="h-4 w-4" />
                Totais por responsável
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <InfoPill label="Eu" income={centsToCurrency(totals.eu.income)} expense={centsToCurrency(totals.eu.expense)} dark={isDark} />
                <InfoPill label="Esposa" income={centsToCurrency(totals.esposa.income)} expense={centsToCurrency(totals.esposa.expense)} dark={isDark} />
                <InfoPill label="Família" income={centsToCurrency(totals.family.income)} expense={centsToCurrency(totals.family.expense)} dark={isDark} />
              </div>
            </div>

            <div className={isDark ? "mt-5 rounded-2xl bg-slate-800 p-4 ring-1 ring-slate-700" : "mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/80"}>
              <div className={isDark ? "mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200" : "mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"}>
                <TrendingDown className="h-4 w-4 text-rose-500" />
                Maior gasto por categoria
              </div>

              {categoryTotals.length === 0 ? (
                <p className="text-sm text-slate-500">Ainda não há despesas para comparar.</p>
              ) : (
                <div className="space-y-3">
                  <div className={isDark ? "flex items-center justify-between gap-3 rounded-xl bg-slate-700 px-3 py-2 ring-1 ring-slate-600" : "flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200"}>
                    <span className={isDark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-slate-800"}>{topExpenseCategory.category}</span>
                    <span className="text-sm font-bold text-rose-600">{centsToCurrency(topExpenseCategory.total)}</span>
                  </div>

                  {categoryTotals.slice(0, 5).map(({ category, total }) => {
                    const percent = (total / (topExpenseCategory.total || 1)) * 100;

                    return (
                      <div key={category}>
                        <div className={isDark ? "mb-1 flex items-center justify-between text-xs text-slate-300" : "mb-1 flex items-center justify-between text-xs text-slate-600"}>
                          <span>{category}</span>
                          <span>{centsToCurrency(total)}</span>
                        </div>
                        <div className={isDark ? "h-2.5 w-full overflow-hidden rounded-full bg-slate-700" : "h-2.5 w-full overflow-hidden rounded-full bg-slate-200"}>
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-400"
                            style={{ width: `${Math.max(percent, 8)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className={isDark ? "rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.35)]" : "rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-4 shadow-[0_12px_30px_rgba(16,185,129,0.09)]"}>
            <div className="mb-4 flex items-center gap-2">
              <div className={isDark ? "rounded-xl bg-emerald-500/20 p-2 text-emerald-300" : "rounded-xl bg-emerald-100 p-2 text-emerald-700"}>
                <Plus className="h-4 w-4" />
              </div>
              <h2 className={isDark ? "text-lg font-semibold text-slate-100" : "text-lg font-semibold text-slate-900"}>Lançamento rápido</h2>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className={labelClass}>Descrição</label>
                <input
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className={isDark ? "w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none" : "w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"}
                  placeholder="Ex: Mercado, salário, aluguel"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tipo</label>
                  <select
                    value={form.type}
                    onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as MovementType }))}
                    className={`w-full ${controlClass}`}
                  >
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Responsável</label>
                  <select
                    value={form.person}
                    onChange={(event) => setForm((current) => ({ ...current, person: event.target.value as ResponsiblePerson }))}
                    className={`w-full ${controlClass}`}
                  >
                    <option value="eu">Eu</option>
                    <option value="esposa">Esposa</option>
                    <option value="familia">Família</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Valor</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    maxLength={18}
                    value={form.amount}
                    onChange={(event) => setForm((current) => ({ ...current, amount: formatCurrencyInput(event.target.value) }))}
                    className={`w-full ${controlClass}`}
                    placeholder="5.800,00"
                  />
                </div>

                <div>
                  <label className={labelClass}>Categoria</label>
                  {!isCustomCategory ? (
                    <div className="space-y-2">
                      <select
                        value={form.category}
                        onChange={(event) => {
                          const nextValue = event.target.value;

                          if (nextValue === CUSTOM_CATEGORY_OPTION) {
                            setIsCustomCategory(true);
                            setCustomCategoryDraft("");
                            return;
                          }

                          setForm((current) => ({ ...current, category: nextValue }));
                          setIsCustomCategory(false);
                        }}
                        className={`w-full ${controlClass}`}
                      >
                        {orderedCategoryOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                        <option value={CUSTOM_CATEGORY_OPTION}>+ Nova categoria</option>
                      </select>

                      {customCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {customCategories.map((category) => (
                            <div key={category} className={isDark ? "inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200" : "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"}>
                              <button type="button" onClick={() => setForm((current) => ({ ...current, category }))} className="font-medium">
                                {category}
                              </button>
                              <button type="button" onClick={() => editCategory(category)} className={isDark ? "text-sky-300" : "text-sky-600"} aria-label={`Editar ${category}`}>
                                ✎
                              </button>
                              <button type="button" onClick={() => removeCategory(category)} className={isDark ? "text-rose-300" : "text-rose-600"} aria-label={`Remover ${category}`}>
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <input
                      value={customCategoryDraft}
                      onChange={(event) => setCustomCategoryDraft(event.target.value)}
                      onKeyDown={handleCategoryKeyDown}
                      maxLength={30}
                      className={`w-full ${controlClass}`}
                      placeholder="Digite e pressione Enter"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Data</label>
                  <input
                    type="text"
                    value={form.dateText}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      const isoValue = parseBrazilianDateToIso(nextValue) || form.date;
                      setForm((current) => ({
                        ...current,
                        dateText: nextValue,
                        date: isoValue,
                      }));
                    }}
                    className={`w-full ${controlClass}`}
                    placeholder="DD/MM/YYYY"
                  />
                </div>

                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as MovementStatus }))}
                    className={`w-full ${controlClass}`}
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="planned">Previsto</option>
                    <option value="received">Recebido</option>
                  </select>
                </div>
              </div>

              <label className={isDark ? "flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200" : "flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"}>
                <input
                  type="checkbox"
                  checked={form.recurring}
                  onChange={(event) => setForm((current) => ({ ...current, recurring: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Despesa fixa / recorrente
              </label>

              {statusMessage ? <p className={isDark ? "text-sm text-emerald-300" : "text-sm text-emerald-700"}>{statusMessage}</p> : null}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
                Salvar lançamento
              </button>
            </form>
          </aside>
        </div>

        <section className={isDark ? "rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.35)]" : "rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className={isDark ? "text-lg font-semibold text-slate-100" : "text-lg font-semibold text-slate-900"}>Movimentações</h2>
            <div className={isDark ? "rounded-full bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"}>{loading ? "Carregando..." : "Atualizado"}</div>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por descrição"
              className={isDark ? "w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-emerald-500 focus:outline-none" : "w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={isDark ? "rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-emerald-500 focus:outline-none" : "rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"}
            >
              <option value="all">Todos</option>
              <option value="planned">Previsto</option>
              <option value="received">Recebido</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className={isDark ? "min-w-full divide-y divide-slate-700 text-left text-sm" : "min-w-full divide-y divide-slate-200 text-left text-sm"}>
              <thead className={isDark ? "bg-slate-800 text-slate-300" : "bg-slate-50 text-slate-600"}>
                <tr>
                  <th className="px-3 py-3 font-medium">Data</th>
                  <th className="px-3 py-3 font-medium">Descrição</th>
                  <th className="px-3 py-3 font-medium">Categoria</th>
                  <th className="px-3 py-3 font-medium">Responsável</th>
                  <th className="px-3 py-3 font-medium">Valor</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className={isDark ? "divide-y divide-slate-700" : "divide-y divide-slate-200"}>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={isDark ? "px-3 py-8 text-center text-slate-400" : "px-3 py-8 text-center text-slate-500"}>
                      Nenhum lançamento para esta competência.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((item) => (
                    <tr key={item.id} className={isDark ? "hover:bg-slate-800" : "hover:bg-slate-50"}>
                      <td className={isDark ? "px-3 py-3 text-slate-300" : "px-3 py-3 text-slate-700"}>{formatDateForDisplay(item.date)}</td>
                      <td className={isDark ? "px-3 py-3 font-medium text-slate-100" : "px-3 py-3 font-medium text-slate-900"}>{item.description}</td>
                      <td className={isDark ? "px-3 py-3 text-slate-300" : "px-3 py-3 text-slate-700"}>{item.category}</td>
                      <td className={isDark ? "px-3 py-3 text-slate-300" : "px-3 py-3 text-slate-700"}>{item.person}</td>
                      <td className={`px-3 py-3 font-semibold ${item.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                        {item.type === "income" ? "+" : "-"} {centsToCurrency(item.amount)}
                      </td>
                      <td className="px-3 py-3">
                        <span className={isDark ? "rounded-full bg-slate-700 px-2 py-1 text-xs font-medium text-slate-200" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className={isDark ? "rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20" : "rounded-lg border border-rose-200 px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <nav className={isDark ? "fixed inset-x-0 bottom-0 z-20 border-t border-slate-700 bg-slate-900/95 px-2 py-2 backdrop-blur sm:hidden" : "fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur sm:hidden"}>
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-2">
          {[
            { key: "overview", label: "Visão" },
            { key: "me", label: "Eu" },
            { key: "wife", label: "Esposa" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key as "overview" | "me" | "wife")}
              className={`rounded-xl px-2 py-2 text-xs font-medium transition ${
                view === tab.key
                  ? isDark
                    ? "bg-emerald-500 text-white"
                    : "bg-emerald-600 text-white"
                  : isDark
                    ? "bg-slate-800 text-slate-200"
                    : "bg-slate-100 text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  tone,
  dark,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: "emerald" | "green" | "amber" | "blue";
  dark: boolean;
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <div className={dark ? "rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(15,23,42,0.45)]" : "rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(15,23,42,0.09)]"}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className={dark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>{title}</p>
          <p className={dark ? "mt-3 text-xl font-bold text-slate-100" : "mt-3 text-xl font-bold text-slate-900"}>{value}</p>
        </div>
        <div className={`rounded-2xl p-2.5 ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent, dark }: { label: string; value: string; accent: string; dark: boolean }) {
  return (
    <div
      className={
        dark
          ? "rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-3 shadow-sm"
          : "rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 shadow-sm"
      }
    >
      <p className={dark ? "text-xs font-medium uppercase tracking-wide text-slate-400" : "text-xs font-medium uppercase tracking-wide text-slate-500"}>{label}</p>
      <p className={`mt-2 text-lg font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function InfoPill({ label, income, expense, dark }: { label: string; income: string; expense: string; dark: boolean }) {
  return (
    <div
      className={
        dark
          ? "rounded-2xl bg-slate-800 p-3 ring-1 ring-slate-700 shadow-sm"
          : "rounded-2xl bg-white p-3 ring-1 ring-slate-200 shadow-sm"
      }
    >
      <p className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-slate-800"}>{label}</p>
      <p className="mt-2 text-xs text-emerald-600">Receitas: {income}</p>
      <p className="text-xs text-rose-600">Despesas: {expense}</p>
    </div>
  );
}
