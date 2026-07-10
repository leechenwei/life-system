import { db } from "./supabase";
import { planMath } from "./money";

export type Account = {
  id: string; name: string; type: string; balance: number; currency: string;
};
export type Goal = {
  id: string; name: string; target_amount: number; saved_amount: number;
  target_date: string | null; life_area: string;
};
export type Reminder = {
  id: string; title: string; life_area: string; due_date: string;
  recur: string; amount: number | null; done: boolean;
};
export type Investment = {
  id: string; name: string; invested_amount: number; current_value: number;
};

export async function getAccounts(): Promise<Account[]> {
  const { data } = await db().from("accounts").select("*").order("type").order("name");
  return (data ?? []) as Account[];
}

export async function getInvestments(): Promise<Investment[]> {
  const { data } = await db().from("investments").select("*").order("name");
  return (data ?? []) as Investment[];
}

export async function getGoals(): Promise<Goal[]> {
  const { data } = await db().from("goals").select("*").order("priority", { ascending: false });
  return (data ?? []) as Goal[];
}

export async function getUpcomingReminders(days = 60): Promise<Reminder[]> {
  const until = new Date();
  until.setDate(until.getDate() + days);
  const { data } = await db()
    .from("reminders")
    .select("*")
    .eq("done", false)
    .lte("due_date", until.toISOString().slice(0, 10))
    .order("due_date");
  return (data ?? []) as Reminder[];
}

// This calendar month's income / spend / net (from signed transaction amounts).
export async function getMonthTotals() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const { data } = await db().from("transactions").select("amount").gte("occurred_on", first);
  let spend = 0, income = 0;
  for (const t of data ?? []) {
    const a = Number(t.amount);
    if (a < 0) spend += -a; else income += a;
  }
  return { spend, income, net: income - spend };
}

// Average monthly spend from the last ~90 days of real data; fall back to settings.
export async function getAvgMonthlySpend(fallback: number): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const { data } = await db()
    .from("transactions")
    .select("amount")
    .lt("amount", 0)
    .gte("occurred_on", since.toISOString().slice(0, 10));
  const rows = data ?? [];
  if (rows.length === 0) return fallback;
  const totalSpend = rows.reduce((s, t) => s + -Number(t.amount), 0);
  return totalSpend / 3; // 90 days ≈ 3 months
}

export async function getSettings() {
  const { data } = await db().from("settings").select("*").eq("id", 1).single();
  return data as { buffer_months: number; default_monthly_spend: number };
}

// The Plan brain — your one honest rule, computed.
export async function computePlan() {
  const [accounts, settings] = await Promise.all([getAccounts(), getSettings()]);
  const avgSpend = await getAvgMonthlySpend(settings.default_monthly_spend);
  const emergencyFund = accounts
    .filter((a) => a.type === "savings")
    .reduce((s, a) => s + Number(a.balance), 0);
  const { target, safe, surplus, toGo } = planMath(emergencyFund, avgSpend, settings.buffer_months);
  return {
    emergencyFund, target, surplus, toGo, safe, avgSpend,
    bufferMonths: settings.buffer_months,
  };
}

export function money(n: number, currency = "MYR") {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency }).format(n);
}
