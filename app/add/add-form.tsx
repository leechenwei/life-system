"use client";

import { useRef, useState } from "react";
import { scanReceipt } from "../actions";
import SubmitButton from "../submit-button";
import type { Account } from "@/lib/data";

const CATEGORIES = ["Food", "Transport", "Groceries", "Bills", "Shopping", "Health", "Fun", "Other"];

export default function AddForm({
  accounts,
  action,
}: {
  accounts: Pick<Account, "id" | "name" | "type">[];
  action: (form: FormData) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onReceiptPicked(file: File | undefined) {
    if (!file) return;
    setScanning(true);
    setScanMsg(null);
    const fd = new FormData();
    fd.set("receipt", file);
    const r = await scanReceipt(fd);
    setScanning(false);
    if ("error" in r) { setScanMsg(r.error); return; }
    if (r.amount) setAmount(String(r.amount));
    if (r.merchant) setNote(r.merchant);
    if (r.category) setCategory(r.category);
    if (r.date) setDate(r.date);
    setScanMsg(r.amount ? "✓ Scanned — check the details, then Save." : "Couldn't read it confidently — fill in manually.");
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      {/* Scan receipt: photo/library -> Gemini vision -> prefill. The same file
          is submitted with the form and stored linked to the transaction. */}
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-400 p-3 text-sm text-neutral-600 active:scale-[0.98]">
        {scanning ? (
          <><span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" /> Reading receipt…</>
        ) : (
          <>📷 Scan receipt / payment screenshot</>
        )}
        <input
          ref={fileRef}
          type="file"
          name="receipt"
          accept="image/*"
          className="hidden"
          onChange={(e) => onReceiptPicked(e.target.files?.[0])}
        />
      </label>
      {scanMsg && <p className="text-xs text-neutral-500">{scanMsg}</p>}

      <input
        name="amount" type="number" step="0.01" inputMode="decimal" placeholder="0.00"
        required value={amount} onChange={(e) => setAmount(e.target.value)}
        className="rounded-xl border p-4 text-2xl"
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="flex cursor-pointer items-center justify-center rounded-xl border p-3 has-checked:border-red-400 has-checked:bg-red-50">
          <input type="radio" name="kind" value="spend" defaultChecked className="mr-2" /> Spend
        </label>
        <label className="flex cursor-pointer items-center justify-center rounded-xl border p-3 has-checked:border-green-400 has-checked:bg-green-50">
          <input type="radio" name="kind" value="income" className="mr-2" /> Income
        </label>
      </div>

      <select name="account_id" className="rounded-xl border p-3" defaultValue="">
        <option value="">— account (optional) —</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
        ))}
      </select>

      <input
        name="category" list="cats" placeholder="Category"
        value={category} onChange={(e) => setCategory(e.target.value)}
        className="rounded-xl border p-3"
      />
      <datalist id="cats">
        {CATEGORIES.map((c) => <option key={c} value={c} />)}
      </datalist>

      <input
        name="note" placeholder="Note (optional)"
        value={note} onChange={(e) => setNote(e.target.value)}
        className="rounded-xl border p-3"
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          name="occurred_on" type="date"
          value={date} onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border p-3"
        />
        <select name="life_area" className="rounded-xl border p-3" defaultValue="money">
          {["money", "car", "family", "career", "travel", "health"].map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
      </div>

      <SubmitButton className="rounded-xl bg-black p-4 text-lg font-medium text-white">
        Save
      </SubmitButton>
    </form>
  );
}
