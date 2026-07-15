import { getAccounts, getGoals, getInvestments, getTxStats, getSettings, computePlan, money } from "./data";
import { geminiGenerate } from "./gemini";

export type Snapshot = {
  aboutMe: string | null;
  netWorth: number;
  month: { spend: number; income: number; net: number };
  plan: Awaited<ReturnType<typeof computePlan>>;
  accounts: { name: string; type: string; balance: number }[];
  investments: { name: string; current_value: number; gain: number }[];
  goals: { name: string; target: number; saved: number; date: string | null }[];
};

export async function buildSnapshot(): Promise<Snapshot> {
  const [accounts, investments, goals, stats, plan, settings] = await Promise.all([
    getAccounts(), getInvestments(), getGoals(), getTxStats(), computePlan(), getSettings(),
  ]);
  return {
    aboutMe: settings.about_me,
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
    ...(s.aboutMe ? ["ABOUT THEM (their own words):", s.aboutMe, ""] : []),
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

// Shared Gemini helper (model fallback lives in lib/gemini.ts).
export async function askGemini(prompt: string): Promise<string> {
  const r = await geminiGenerate([{ text: prompt }]);
  return "error" in r ? `⚠️ ${r.error}` : r.text;
}
