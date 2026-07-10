import { getAccounts, getInvestments, money } from "@/lib/data";
import { addAccount, updateBalance } from "../actions";
import SubmitButton from "../submit-button";

export const dynamic = "force-dynamic";

const TYPES = ["bank", "savings", "ewallet", "investment", "epf", "cash"];

export default async function AccountsPage() {
  const [accounts, investments] = await Promise.all([getAccounts(), getInvestments()]);

  return (
    <main className="flex flex-col gap-6 p-4">
      <section className="flex flex-col gap-2">
        <h1 className="pt-2 text-xl font-semibold">Accounts</h1>
        {accounts.map((a) => (
          <form key={a.id} action={updateBalance}
            className="flex items-center gap-2 rounded-xl border bg-white p-3">
            <input type="hidden" name="id" value={a.id} />
            <div className="flex-1">
              <p className="text-sm font-medium">{a.name}</p>
              <p className="text-xs text-neutral-500">{a.type}</p>
            </div>
            <input name="balance" type="number" step="0.01" defaultValue={Number(a.balance)}
              className="w-28 rounded-lg border p-2 text-right" />
            <SubmitButton pendingLabel="…" className="rounded-lg border px-3 py-2 text-xs">Save</SubmitButton>
          </form>
        ))}

        <details className="rounded-xl border border-dashed bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium">＋ New account</summary>
          <form action={addAccount} className="mt-3 flex flex-col gap-2">
            <input name="name" placeholder="e.g. Maybank Savings" required className="rounded-lg border p-2" />
            <div className="grid grid-cols-2 gap-2">
              <select name="type" className="rounded-lg border p-2">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input name="balance" type="number" step="0.01" placeholder="Balance" className="rounded-lg border p-2" />
            </div>
            <SubmitButton pendingLabel="Adding…" className="rounded-lg bg-black p-2 text-sm text-white">Add account</SubmitButton>
          </form>
        </details>
        <p className="text-xs text-neutral-500">
          Tip: mark your emergency-fund accounts as type <b>savings</b> — the Plan uses those.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-500">Investments</h2>
        {investments.length === 0 && (
          <p className="text-xs text-neutral-500">
            None yet. Add Moomoo / Webull / ASNB / EPF-A3 rows in Supabase (or we wire a form next).
          </p>
        )}
        {investments.map((inv) => {
          const gain = Number(inv.current_value) - Number(inv.invested_amount);
          return (
            <div key={inv.id} className="flex justify-between rounded-xl border bg-white p-3 text-sm">
              <span className="font-medium">{inv.name}</span>
              <span>
                {money(Number(inv.current_value))}{" "}
                <span className={gain >= 0 ? "text-green-600" : "text-red-600"}>
                  ({gain >= 0 ? "+" : ""}{money(gain)})
                </span>
              </span>
            </div>
          );
        })}
      </section>
    </main>
  );
}
