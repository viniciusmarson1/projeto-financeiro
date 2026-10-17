import { describe, expect, it } from "vitest";
import {
  calculateMonthlySummary,
  createMonthlyMovement,
  getResponsibleTotals,
  parseBrazilianDateToIso,
  parseCurrencyInputToCents,
  reconcileMonthData,
  type FinancialMovement,
} from "./finance";

describe("financial calculations", () => {
  it("calculates projected and realized balances correctly", () => {
    const movements: FinancialMovement[] = [
      createMonthlyMovement({
        id: "r1",
        description: "Salário",
        amount: 6000,
        category: "Salário",
        date: "2026-10-01",
        type: "income",
        person: "eu",
        status: "received",
        recurring: false,
      }),
      createMonthlyMovement({
        id: "r2",
        description: "Freela",
        amount: 1200,
        category: "Receita extra",
        date: "2026-10-10",
        type: "income",
        person: "eu",
        status: "planned",
        recurring: false,
      }),
      createMonthlyMovement({
        id: "d1",
        description: "Aluguel",
        amount: 2200,
        category: "Moradia",
        date: "2026-10-05",
        type: "expense",
        person: "eu",
        status: "paid",
        recurring: true,
      }),
      createMonthlyMovement({
        id: "d2",
        description: "Supermercado",
        amount: 950,
        category: "Mercado",
        date: "2026-10-08",
        type: "expense",
        person: "eu",
        status: "pending",
        recurring: false,
      }),
    ];

    const summary = calculateMonthlySummary({
      initialBalance: 1000,
      movements,
    });

    expect(summary.totalIncomePlanned).toBe(7200);
    expect(summary.totalIncomeReceived).toBe(6000);
    expect(summary.totalExpensePlanned).toBe(3150);
    expect(summary.totalExpensePaid).toBe(2200);
    expect(summary.projectedBalance).toBe(1000 + 7200 - 3150);
    expect(summary.realizedBalance).toBe(1000 + 6000 - 2200);
  });

  it("keeps family and individual totals separated", () => {
    const movements: FinancialMovement[] = [
      createMonthlyMovement({
        id: "m1",
        description: "Salário",
        amount: 5000,
        category: "Salário",
        date: "2026-10-01",
        type: "income",
        person: "eu",
        status: "received",
        recurring: false,
      }),
      createMonthlyMovement({
        id: "m2",
        description: "Compra",
        amount: 800,
        category: "Mercado",
        date: "2026-10-02",
        type: "expense",
        person: "eu",
        status: "paid",
        recurring: false,
      }),
      createMonthlyMovement({
        id: "w1",
        description: "Salário da esposa",
        amount: 4500,
        category: "Salário",
        date: "2026-10-03",
        type: "income",
        person: "esposa",
        status: "received",
        recurring: false,
      }),
      createMonthlyMovement({
        id: "w2",
        description: "Farmácia",
        amount: 200,
        category: "Saúde",
        date: "2026-10-04",
        type: "expense",
        person: "esposa",
        status: "pending",
        recurring: false,
      }),
    ];

    const totals = getResponsibleTotals(movements);
    expect(totals.eu.income).toBe(5000);
    expect(totals.eu.expense).toBe(800);
    expect(totals.esposa.income).toBe(4500);
    expect(totals.esposa.expense).toBe(200);
    expect(totals.family.income).toBe(9500);
    expect(totals.family.expense).toBe(1000);
  });

  it("reconciles month data without duplicating recurring entries", () => {
    const base = [
      createMonthlyMovement({
        id: "1",
        description: "Internet",
        amount: 200,
        category: "Moradia",
        date: "2026-10-10",
        type: "expense",
        person: "eu",
        status: "pending",
        recurring: true,
      }),
    ];

    const reconciled = reconcileMonthData({
      monthKey: "2026-10",
      existing: base,
      newEntries: [
        { ...base[0], id: "1" },
        { ...base[0], id: "2", description: "Internet 2" },
      ],
    });

    expect(reconciled).toHaveLength(2);
    expect(reconciled.map((item) => item.id)).toContain("1");
    expect(reconciled.map((item) => item.id)).toContain("2");
  });

  it("converts BRL values like 5800 to 580000 cents", () => {
    expect(parseCurrencyInputToCents("5800")).toBe(580000);
    expect(parseCurrencyInputToCents("5800,50")).toBe(580050);
    expect(parseCurrencyInputToCents("R$ 1.250,75")).toBe(125075);
  });

  it("converts Brazilian dates to ISO format", () => {
    expect(parseBrazilianDateToIso("11/06/2026")).toBe("2026-06-11");
    expect(parseBrazilianDateToIso("01/01/2027")).toBe("2027-01-01");
  });
});
