import { computePlan, getSettings, money } from "@/lib/data";
import { saveSettings } from "../actions";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const [plan, settings] = await Promise.all([computePlan(), getSettings()]);
  const pct = plan.target > 0
    ? Math.min(100, Math.round((plan.emergencyFund / plan.target) * 100)) : 0;

  return (
    <main className="flex flex-col gap-5 p-4">
      <h1 className="pt-2 text-xl font-semibold">Plan</h1>

      <section className="rounded-xl border bg-white p-4">
        <p className="text-sm text-neutral-500">Emergency buffer</p>
        <p className="text-2xl font-semibold">
          {money(plan.emergencyFund)} <span className="text-base text-neutral-400">/ {money(plan.target)}</span>
        </p>
        <div className="mt-3 h-2 rounded-full bg-neutral-100">
          <div className={`h-2 rounded-full ${plan.safe ? "bg-green-500" : "bg-black"}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-sm text-neutral-700">
          {plan.safe ? (
            <>
              You&apos;re covered for {plan.bufferMonths} months.{" "}
              <b>{money(plan.surplus)}</b> is sitting idle above your buffer — that&apos;s money you
              could move to your <b>Japan goal</b> or <b>investments</b> (ASNB / Moomoo / Webull)
              instead of losing value to inflation.
            </>
          ) : (
            <>
              Keep saving. <b>{money(plan.toGo)}</b> to go until you&apos;ve got{" "}
              {plan.bufferMonths} months of expenses set aside. Stay the course.
            </>
          )}
        </p>
        <p className="mt-2 text-xs text-neutral-400">
          Based on avg spend {money(plan.avgSpend)}/mo (last 90 days, or your fallback below).
        </p>
      </section>

      <form action={saveSettings} className="flex flex-col gap-3 rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold">Your knobs</h2>
        <label className="text-sm">
          Buffer months
          <input name="buffer_months" type="number" min={1} defaultValue={settings.buffer_months}
            className="mt-1 w-full rounded-lg border p-2" />
        </label>
        <label className="text-sm">
          Fallback monthly spend (used until enough real data)
          <input name="default_monthly_spend" type="number" step="0.01"
            defaultValue={Number(settings.default_monthly_spend)}
            className="mt-1 w-full rounded-lg border p-2" />
        </label>
        <button className="rounded-lg bg-black p-2 text-sm text-white">Save</button>
      </form>
    </main>
  );
}
