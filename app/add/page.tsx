import { getAccounts } from "@/lib/data";
import { addTransaction } from "../actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Food", "Transport", "Groceries", "Bills", "Shopping", "Health", "Fun", "Other"];

export default async function AddPage() {
  const accounts = await getAccounts();

  async function submit(form: FormData) {
    "use server";
    await addTransaction(form);
    redirect("/");
  }

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="pt-2 text-xl font-semibold">Add transaction</h1>
      <form action={submit} className="flex flex-col gap-3">
        <input
          name="amount" type="number" step="0.01" inputMode="decimal" placeholder="0.00"
          autoFocus required
          className="rounded-xl border p-4 text-2xl"
        />

        <div className="grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center justify-center rounded-xl border p-3 has-checked:bg-red-50 has-checked:border-red-400">
            <input type="radio" name="kind" value="spend" defaultChecked className="mr-2" /> Spend
          </label>
          <label className="flex cursor-pointer items-center justify-center rounded-xl border p-3 has-checked:bg-green-50 has-checked:border-green-400">
            <input type="radio" name="kind" value="income" className="mr-2" /> Income
          </label>
        </div>

        <select name="account_id" className="rounded-xl border p-3" defaultValue="">
          <option value="">— account (optional) —</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
          ))}
        </select>

        <input name="category" list="cats" placeholder="Category" className="rounded-xl border p-3" />
        <datalist id="cats">
          {CATEGORIES.map((c) => <option key={c} value={c} />)}
        </datalist>

        <input name="note" placeholder="Note (optional)" className="rounded-xl border p-3" />

        <div className="grid grid-cols-2 gap-2">
          <input name="occurred_on" type="date" className="rounded-xl border p-3" />
          <select name="life_area" className="rounded-xl border p-3" defaultValue="money">
            {["money", "car", "family", "career", "travel", "health"].map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </div>

        <button className="rounded-xl bg-black p-4 text-lg font-medium text-white">Save</button>
      </form>
    </main>
  );
}
