import { cache } from "react";
import { db } from "./supabase";
import { planMath, reduceTxStats } from "./money";

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

// cache() dedupes identical calls within a single server render, so a page and
// computePlan sharing getAccounts() = ONE query, not two.
export const getAccounts = cache(async (): Promise<Account[]> => {
  const { data } = await db().from("accounts").select("*").order("type").order("name");
  return (data ?? []) as Account[];
});

export const getInvestments = cache(async (): Promise<Investment[]> => {
  const { data } = await db().from("investments").select("*").order("name");
  return (data ?? []) as Investment[];
});

export const getGoals = cache(async (): Promise<Goal[]> => {
  const { data } = await db().from("goals").select("*").order("priority", { ascending: false });
  return (data ?? []) as Goal[];
});

export const getUpcomingReminders = cache(async (days = 60): Promise<Reminder[]> => {
  const until = new Date();
  until.setDate(until.getDate() + days);
  const { data } = await db()
    .from("reminders")
    .select("*")
    .eq("done", false)
    .lte("due_date", until.toISOString().slice(0, 10))
    .order("due_date");
  return (data ?? []) as Reminder[];
});

export const getSettings = cache(async () => {
  const { data } = await db().from("settings").select("*").eq("id", 1).single();
  return data as { buffer_months: number; default_monthly_spend: number };
});

// ONE transaction query (last 90 days) feeds both this-month totals and avg spend.
// Selects only the two columns needed, and is date-bounded so it stays cheap as
// history grows. cache() means the dashboard + computePlan share this single query.
export const getTxStats = cache(async () => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const { data } = await db()
    .from("transactions")
    .select("amount, occurred_on")
    .gte("occurred_on", since.toISOString().slice(0, 10));
  return reduceTxStats(data ?? [], firstOfMonth);
});

// The Plan brain — one honest rule, all inputs fetched in parallel (each cached).
export const computePlan = cache(async () => {
  const [accounts, settings, stats] = await Promise.all([
    getAccounts(), getSettings(), getTxStats(),
  ]);
  const avgSpend = stats.hasData ? stats.avgSpendRaw : settings.default_monthly_spend;
  const emergencyFund = accounts
    .filter((a) => a.type === "savings")
    .reduce((s, a) => s + Number(a.balance), 0);
  const { target, safe, surplus, toGo } = planMath(emergencyFund, avgSpend, settings.buffer_months);
  return { emergencyFund, target, surplus, toGo, safe, avgSpend, bufferMonths: settings.buffer_months };
});

export type RecentTx = {
  id: string; amount: number; category: string | null; note: string | null;
  occurred_on: string; accounts: { name: string } | null;
};

export const getRecentTransactions = cache(async (limit = 10): Promise<RecentTx[]> => {
  const { data } = await db()
    .from("transactions")
    .select("id, amount, category, note, occurred_on, accounts(name)")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as RecentTx[];
});

export function money(n: number, currency = "MYR") {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency }).format(n);
}
