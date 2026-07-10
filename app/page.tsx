import Link from "next/link";
import {
  getAccounts, getGoals, getTxStats, getUpcomingReminders, computePlan, money,
} from "@/lib/data";
import { completeReminder } from "./actions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [accounts, stats, goals, reminders, plan] = await Promise.all([
    getAccounts(), getTxStats(), getGoals(), getUpcomingReminders(), computePlan(),
  ]);
  const month = stats.month;
  const netWorth = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <main className="flex flex-col gap-5 p-4">
      <header className="pt-2">
        <p className="text-sm text-neutral-500">Net worth</p>
        <p className="text-3xl font-semibold">{money(netWorth)}</p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Card label="Spent this month" value={money(month.spend)} tone="text-red-600" />
        <Card label="Income this month" value={money(month.income)} tone="text-green-600" />
      </section>

      {/* Plan snapshot */}
      <Link href="/plan" className="rounded-xl border bg-white p-4">
        <p className="text-sm font-medium">
          {plan.safe ? "✅ Buffer is safe" : "🟡 Building buffer"}
        </p>
        <p className="text-sm text-neutral-600">
          {plan.safe
            ? `${money(plan.surplus)} sitting idle above your ${plan.bufferMonths}-month buffer → consider Japan / investing.`
            : `${money(plan.toGo)} to go until your ${plan.bufferMonths}-month emergency buffer.`}
        </p>
      </Link>

      {goals.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-500">Goals</h2>
          {goals.map((g) => {
            const pct = g.target_amount > 0
              ? Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100)) : 0;
            return (
              <div key={g.id} className="rounded-xl border bg-white p-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-neutral-500">
                    {money(g.saved_amount)} / {money(g.target_amount)}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-neutral-100">
                  <div className="h-2 rounded-full bg-black" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {reminders.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-500">Coming up</h2>
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border bg-white p-3">
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-neutral-500">
                  {r.due_date} · {r.life_area}
                  {r.amount ? ` · ${money(Number(r.amount))}` : ""}
                </p>
              </div>
              <form action={completeReminder}>
                <input type="hidden" name="id" value={r.id} />
                <button className="rounded-lg border px-3 py-1 text-xs">Done</button>
              </form>
            </div>
          ))}
        </section>
      )}

      {accounts.length === 0 && (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-neutral-500">
          No accounts yet. <Link href="/accounts" className="underline">Add one</Link> to start.
        </p>
      )}
    </main>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`text-lg font-semibold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
