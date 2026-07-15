import Link from "next/link";
import { getAccounts, getTransactionsForMonth, getTxAttachments, getUsedCategories, money } from "@/lib/data";
import TxRow from "../tx-row";

export const dynamic = "force-dynamic";

const shift = (ym: string, by: number) => {
  const d = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + by, 1));
  return d.toISOString().slice(0, 7);
};
const label = (ym: string) =>
  new Date(ym + "-01").toLocaleString("en", { month: "long", year: "numeric" });

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const ym = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : new Date().toISOString().slice(0, 7);
  const [txs, accounts] = await Promise.all([getTransactionsForMonth(ym), getAccounts()]);
  const [receipts, usedCategories] = await Promise.all([
    getTxAttachments(txs.map((t) => t.id)), getUsedCategories(),
  ]);

  let spend = 0, income = 0;
  for (const t of txs) {
    if (t.category === "Transfer") continue;
    const a = Number(t.amount);
    if (a < 0) spend += -a; else income += a;
  }

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between pt-2">
        <Link href={`/history?month=${shift(ym, -1)}`} className="rounded-lg border px-3 py-1 text-sm">←</Link>
        <h1 className="text-lg font-semibold">{label(ym)}</h1>
        <Link href={`/history?month=${shift(ym, 1)}`} className="rounded-lg border px-3 py-1 text-sm">→</Link>
      </div>

      <div className="flex justify-around rounded-xl border bg-white p-3 text-sm">
        <span>Spent <b className="text-red-600">{money(spend)}</b></span>
        <span>Income <b className="text-green-600">{money(income)}</b></span>
        <span>Net <b className={income - spend >= 0 ? "text-green-600" : "text-red-600"}>{money(income - spend)}</b></span>
      </div>

      {txs.length === 0 && (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-neutral-500">
          No records in {label(ym)}.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {txs.map((t) => (
          <TxRow key={t.id} t={t} accounts={accounts} categories={usedCategories} receiptUrl={receipts[t.id]} />
        ))}
      </div>
      <p className="text-xs text-neutral-400">{txs.length} records · transfers excluded from totals.</p>
    </main>
  );
}
