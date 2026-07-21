import { getAccounts, getInvestments, money } from "@/lib/data";
import { addAccount, updateAccount, deleteAccount } from "../actions";
import SubmitButton from "../submit-button";
import { Amount } from "../amount";

export const dynamic = "force-dynamic";

const TYPES = ["bank", "savings", "ewallet", "investment", "epf", "cash"];

export default async function AccountsPage() {
  const [accounts, investments] = await Promise.all([getAccounts(), getInvestments()]);

  return (
    <main className="flex flex-col gap-6 p-4">
      <section className="flex flex-col gap-2">
        <h1 className="pt-2 text-xl font-semibold">Accounts</h1>
        {accounts.map((a) => (
          <details key={a.id} className="rounded-xl border bg-white">
            <summary className="flex cursor-pointer items-center justify-between p-3">
              <span>
                <span className="text-sm font-medium">{a.name}</span>
                <span className="ml-2 text-xs text-neutral-500">{a.type}</span>
              </span>
              <span className="text-sm font-semibold"><Amount>{money(Number(a.balance))}</Amount></span>
            </summary>
            <div className="border-t p-3">
              <form action={updateAccount} className="flex flex-col gap-2">
                <input type="hidden" name="id" value={a.id} />
                <input name="name" defaultValue={a.name} required className="rounded-lg border p-2 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <select name="type" defaultValue={a.type} className="rounded-lg border p-2 text-sm">
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input name="balance" type="number" step="0.01" defaultValue={Number(a.balance)}
                    className="rounded-lg border p-2 text-right text-sm" />
                </div>
                <SubmitButton className="rounded-lg bg-black p-2 text-sm text-white">Save changes</SubmitButton>
              </form>
              <form action={deleteAccount} className="mt-2">
                <input type="hidden" name="id" value={a.id} />
                <SubmitButton pendingLabel="Deleting…" className="w-full rounded-lg border border-red-200 p-2 text-sm text-red-600">
                  Delete account (history is kept)
                </SubmitButton>
              </form>
            </div>
          </details>
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

      <a href="/payslip" className="flex items-center justify-between rounded-xl border bg-white p-4">
        <span>
          <span className="text-sm font-medium">🧾 Payslips (SSM business)</span>
          <span className="block text-xs text-neutral-500">Issue payslips · income proof for loans</span>
        </span>
        <span className="text-neutral-400">→</span>
      </a>

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
                <Amount>{money(Number(inv.current_value))}</Amount>{" "}
                <span className={gain >= 0 ? "text-green-600" : "text-red-600"}>
                  (<Amount>{`${gain >= 0 ? "+" : ""}${money(gain)}`}</Amount>)
                </span>
              </span>
            </div>
          );
        })}
      </section>
    </main>
  );
}
