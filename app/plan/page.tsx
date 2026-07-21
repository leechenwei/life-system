import { computePlan, getSettings, getGoals, money } from "@/lib/data";
import { saveSettings, addGoal, updateGoal, deleteGoal } from "../actions";
import { hasPasskeys } from "../auth-actions";
import SubmitButton from "../submit-button";
import EnableFaceId from "./enable-faceid";
import { Amount } from "../amount";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const [plan, settings, registered, goals] = await Promise.all([
    computePlan(), getSettings(), hasPasskeys(), getGoals(),
  ]);
  const pct = plan.target > 0
    ? Math.min(100, Math.round((plan.emergencyFund / plan.target) * 100)) : 0;

  return (
    <main className="flex flex-col gap-5 p-4">
      <h1 className="pt-2 text-xl font-semibold">Plan</h1>

      <section className="rounded-xl border bg-white p-4">
        <p className="text-sm text-neutral-500">Emergency buffer</p>
        <p className="text-2xl font-semibold">
          <Amount>{money(plan.emergencyFund)}</Amount> <span className="text-base text-neutral-400">/ <Amount>{money(plan.target)}</Amount></span>
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

      {/* Goals */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-500">Goals</h2>
        {goals.map((g) => {
          const pct = g.target_amount > 0
            ? Math.min(100, Math.round((Number(g.saved_amount) / Number(g.target_amount)) * 100)) : 0;
          return (
            <details key={g.id} className="rounded-xl border bg-white">
              <summary className="cursor-pointer p-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-neutral-500">
                    <Amount>{money(Number(g.saved_amount))}</Amount> / <Amount>{money(Number(g.target_amount))}</Amount>
                    {g.target_date ? ` · by ${g.target_date}` : ""}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-neutral-100">
                  <div className="h-2 rounded-full bg-black" style={{ width: `${pct}%` }} />
                </div>
              </summary>
              <div className="border-t p-3">
                <form action={updateGoal} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={g.id} />
                  <input name="name" defaultValue={g.name} required className="rounded-lg border p-2 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-neutral-500">Saved so far
                      <input name="saved_amount" type="number" step="0.01" defaultValue={Number(g.saved_amount)}
                        className="mt-1 w-full rounded-lg border p-2 text-sm" />
                    </label>
                    <label className="text-xs text-neutral-500">Target
                      <input name="target_amount" type="number" step="0.01" defaultValue={Number(g.target_amount)}
                        className="mt-1 w-full rounded-lg border p-2 text-sm" />
                    </label>
                  </div>
                  <label className="text-xs text-neutral-500">Target date (optional)
                    <input name="target_date" type="date" defaultValue={g.target_date ?? ""}
                      className="mt-1 w-full rounded-lg border p-2 text-sm" />
                  </label>
                  <SubmitButton className="rounded-lg bg-black p-2 text-sm text-white">Save goal</SubmitButton>
                </form>
                <form action={deleteGoal} className="mt-2">
                  <input type="hidden" name="id" value={g.id} />
                  <SubmitButton pendingLabel="…" className="w-full rounded-lg border border-red-200 p-2 text-xs text-red-600">
                    Delete goal
                  </SubmitButton>
                </form>
              </div>
            </details>
          );
        })}

        <details className="rounded-xl border border-dashed bg-white p-3" open={goals.length === 0}>
          <summary className="cursor-pointer text-sm font-medium">＋ New goal (e.g. Japan trip 2027)</summary>
          <form action={addGoal} className="mt-3 flex flex-col gap-2">
            <input name="name" placeholder="Goal name" required className="rounded-lg border p-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input name="target_amount" type="number" step="0.01" placeholder="Target RM" required className="rounded-lg border p-2 text-sm" />
              <input name="saved_amount" type="number" step="0.01" placeholder="Saved so far (0)" className="rounded-lg border p-2 text-sm" />
            </div>
            <input name="target_date" type="date" className="rounded-lg border p-2 text-sm" />
            <SubmitButton pendingLabel="Adding…" className="rounded-lg bg-black p-2 text-sm text-white">Add goal</SubmitButton>
          </form>
        </details>
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
        <label className="text-sm">
          About you — the AI Advisor reads this for personalized advice
          <textarea name="about_me" rows={3}
            defaultValue={settings.about_me ?? ""}
            placeholder="e.g. 24, software engineer in KL, RM3.5k/mo from own SSM business, girlfriend, planning Japan trip Apr 2027, saving for car loan eligibility"
            className="mt-1 w-full rounded-lg border p-2 text-sm" />
        </label>
        <SubmitButton className="rounded-lg bg-black p-2 text-sm text-white">Save</SubmitButton>
      </form>

      <EnableFaceId registered={registered} />
    </main>
  );
}
