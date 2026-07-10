import { getAccounts, getGoals, getInvestments, getTxStats, computePlan, money } from "./data";

export type Snapshot = {
  netWorth: number;
  month: { spend: number; income: number; net: number };
  plan: Awaited<ReturnType<typeof computePlan>>;
  accounts: { name: string; type: string; balance: number }[];
  investments: { name: string; current_value: number; gain: number }[];
  goals: { name: string; target: number; saved: number; date: string | null }[];
};

export async function buildSnapshot(): Promise<Snapshot> {
  const [accounts, investments, goals, stats, plan] = await Promise.all([
    getAccounts(), getInvestments(), getGoals(), getTxStats(), computePlan(),
  ]);
  return {
    netWorth: accounts.reduce((s, a) => s + Number(a.balance), 0),
    month: stats.month,
    plan,
    accounts: accounts.map((a) => ({ name: a.name, type: a.type, balance: Number(a.balance) })),
    investments: investments.map((i) => ({
      name: i.name,
      current_value: Number(i.current_value),
      gain: Number(i.current_value) - Number(i.invested_amount),
    })),
    goals: goals.map((g) => ({
      name: g.name, target: Number(g.target_amount), saved: Number(g.saved_amount), date: g.target_date,
    })),
  };
}

// Pure: turn the snapshot + question into the prompt. Tested.
export function buildPrompt(s: Snapshot, question: string): string {
  const lines = [
    "You are a practical personal-finance coach for a young Malaysian professional.",
    "Give specific, encouraging, concise advice (max ~180 words). Amounts are in MYR (RM).",
    "Do not repeat all the numbers back; focus on 2-4 concrete next actions.",
    "",
    "THEIR CURRENT SNAPSHOT:",
    `- Net worth: ${money(s.netWorth)}`,
    `- This month: spent ${money(s.month.spend)}, earned ${money(s.month.income)} (net ${money(s.month.net)})`,
    `- Emergency buffer: ${money(s.plan.emergencyFund)} of ${money(s.plan.target)} target (${s.plan.bufferMonths} months). ` +
      (s.plan.safe ? `Surplus above buffer: ${money(s.plan.surplus)}.` : `Still ${money(s.plan.toGo)} to go.`),
    `- Avg monthly spend: ${money(s.plan.avgSpend)}`,
    s.accounts.length ? `- Accounts: ${s.accounts.map((a) => `${a.name} (${a.type}) ${money(a.balance)}`).join("; ")}` : "- No accounts yet.",
    s.investments.length ? `- Investments: ${s.investments.map((i) => `${i.name} ${money(i.current_value)} (${i.gain >= 0 ? "+" : ""}${money(i.gain)})`).join("; ")}` : "- No investments yet.",
    s.goals.length ? `- Goals: ${s.goals.map((g) => `${g.name} ${money(g.saved)}/${money(g.target)}${g.date ? ` by ${g.date}` : ""}`).join("; ")}` : "- No goals set.",
    "",
    `THEIR QUESTION: ${question || "What should I do next with my money?"}`,
  ];
  return lines.join("\n");
}

// One fetch to Gemini's free-tier REST endpoint. Server-only (uses GEMINI_API_KEY).
export async function askGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return "⚠️ No GEMINI_API_KEY set yet. Add a free key from aistudio.google.com to .env.local (and Vercel) to enable AI advice.";
  }
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    cache: "no-store",
  });
  if (!res.ok) {
    return `AI request failed (${res.status}). Check your GEMINI_API_KEY or free-tier quota.`;
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() || "No advice returned — try rephrasing your question.";
}
