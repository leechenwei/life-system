import Link from "next/link";
import {
  getAccounts, getGoals, getTxStats, getUpcomingReminders, getRecentTransactions,
  getRecentlyDeleted, getTxAttachments, getUsedCategories, computePlan, money,
} from "@/lib/data";
import { completeReminder, restoreTransaction } from "./actions";
import SubmitButton from "./submit-button";
import TxRow from "./tx-row";
import { Amount } from "./amount";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [accounts, stats, goals, reminders, recent, deleted, plan] = await Promise.all([
    getAccounts(), getTxStats(), getGoals(), getUpcomingReminders(),
    getRecentTransactions(), getRecentlyDeleted(), computePlan(),
  ]);
  const [receipts, usedCategories] = await Promise.all([
    getTxAttachments(recent.map((t) => t.id)), getUsedCategories(),
  ]);
  const month = stats.month;
  const netWorth = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <main className="flex flex-col gap-5 p-4">
      <header className="pt-2">
        <p className="text-sm text-neutral-500">Net worth</p>
        <p className="text-3xl font-semibold"><Amount>{money(netWorth)}</Amount></p>
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
                    <Amount>{money(g.saved_amount)}</Amount> / <Amount>{money(g.target_amount)}</Amount>
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
                <SubmitButton pendingLabel="…" className="rounded-lg border px-3 py-1 text-xs">Done</SubmitButton>
              </form>
            </div>
          ))}
        </section>
      )}

      {recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-500">Recent</h2>
            <Link href="/history" className="text-xs text-neutral-500 underline">View all →</Link>
          </div>
          {recent.map((t) => (
            <TxRow key={t.id} t={t} accounts={accounts} categories={usedCategories} receiptUrl={receipts[t.id]} />
          ))}
        </section>
      )}

      {deleted.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-500">Recently deleted</h2>
          {deleted.map((t) => {
            const amt = Number(t.amount);
            return (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-dashed bg-neutral-50 p-3 opacity-80">
                <div className="min-w-0">
                  <p className="truncate text-sm text-neutral-500 line-through">
                    {t.note || t.category || (amt < 0 ? "Spend" : "Income")}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {t.occurred_on} · {amt < 0 ? "−" : "+"}{money(Math.abs(amt))}
                    {t.accounts?.name ? ` · ${t.accounts.name}` : ""}
                  </p>
                </div>
                <form action={restoreTransaction}>
                  <input type="hidden" name="id" value={t.id} />
                  <SubmitButton pendingLabel="…" className="rounded-lg border px-3 py-1 text-xs font-medium">
                    ↩ Restore
                  </SubmitButton>
                </form>
              </div>
            );
          })}
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
      <p className={`text-lg font-semibold ${tone ?? ""}`}><Amount>{value}</Amount></p>
    </div>
  );
}
