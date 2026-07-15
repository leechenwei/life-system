import { money, type Account, type RecentTx } from "@/lib/data";
import { deleteTransaction, updateTransaction } from "./actions";
import SubmitButton from "./submit-button";
import ReceiptField from "./receipt-field";

// One editable transaction row (used by Home Recent and /history).
export default function TxRow({
  t, accounts, receiptUrl,
}: {
  t: RecentTx;
  accounts: Pick<Account, "id" | "name">[];
  receiptUrl?: string;
}) {
  const amt = Number(t.amount);
  const isTransfer = t.category === "Transfer";
  return (
    <details className="rounded-xl border bg-white">
      <summary className="flex cursor-pointer items-center justify-between p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {t.note || t.category || (amt < 0 ? "Spend" : "Income")}
          </p>
          <p className="text-xs text-neutral-500">
            {t.occurred_on}
            {t.category ? ` · ${t.category}` : ""}
            {t.accounts?.name ? ` · ${t.accounts.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${isTransfer ? "text-neutral-500" : amt < 0 ? "text-red-600" : "text-green-600"}`}>
            {amt < 0 ? "−" : "+"}{money(Math.abs(amt))}
          </span>
          {receiptUrl && (
            <a href={receiptUrl} target="_blank" rel="noreferrer"
              className="rounded-lg border px-2 py-1 text-xs" title="View receipt">
              🧾
            </a>
          )}
        </div>
      </summary>
      <div className="border-t p-3">
        {isTransfer ? (
          <p className="mb-2 text-xs text-neutral-500">
            Transfers are paired (out + in) — to change one, delete it and add again.
          </p>
        ) : (
          <form action={updateTransaction} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={t.id} />
            <div className="grid grid-cols-2 gap-2">
              <input name="amount" type="number" step="0.01" inputMode="decimal"
                defaultValue={Math.abs(amt)} required className="rounded-lg border p-2 text-sm" />
              <input name="category" defaultValue={t.category ?? ""} placeholder="Category"
                className="rounded-lg border p-2 text-sm" />
            </div>
            <input name="note" defaultValue={t.note ?? ""} placeholder="Note"
              className="rounded-lg border p-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input name="occurred_on" type="date" defaultValue={t.occurred_on}
                className="rounded-lg border p-2 text-sm" />
              <select name="account_id" defaultValue={t.account_id ?? ""}
                className="rounded-lg border p-2 text-sm">
                <option value="">— no account —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <ReceiptField hasExisting={Boolean(receiptUrl)} />
            {receiptUrl && (
              <label className="flex items-center gap-2 text-xs text-red-600">
                <input type="checkbox" name="remove_receipt" /> Remove current receipt
              </label>
            )}
            <SubmitButton className="rounded-lg bg-black p-2 text-sm text-white">
              Save changes
            </SubmitButton>
          </form>
        )}
        <form action={deleteTransaction} className="mt-2">
          <input type="hidden" name="id" value={t.id} />
          <SubmitButton pendingLabel="…" className="w-full rounded-lg border border-red-200 p-2 text-xs text-red-600">
            Delete (restorable on Home for 7 days)
          </SubmitButton>
        </form>
      </div>
    </details>
  );
}
