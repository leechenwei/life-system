"use client";

import { useRef, useState } from "react";
import { scanReceipt } from "../actions";
import SubmitButton from "../submit-button";
import { compressImage, swapInputFile } from "../compress";
import { evalAmountExpr } from "@/lib/money";
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
  const [kind, setKind] = useState<"spend" | "income" | "transfer">("spend");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isTransfer = kind === "transfer";

  async function onReceiptPicked(file: File | undefined) {
    if (!file) return;
    setScanning(true);
    setScanMsg(null);
    // Compress first: camera shots are 3-8MB (over the 4MB action limit) and
    // HEIC becomes JPEG. The compressed file replaces the input's file so the
    // form submit stores the small version too.
    const small = await compressImage(file);
    if (fileRef.current) swapInputFile(fileRef.current, small);
    const fd = new FormData();
    fd.set("receipt", small);
    const r = await scanReceipt(fd);
    setScanning(false);
    if ("error" in r) { setScanMsg(r.error); return; }
    if (r.amount) setAmount(String(r.amount));
    if (r.merchant) setNote(r.merchant);
    if (r.category) setCategory(r.category);
    if (r.date) setDate(r.date);
    setScanMsg(r.amount ? "✓ Scanned — check the details, then Save." : "Couldn't read it confidently — fill in manually.");
  }

  // Calculator support: "12+7.5-3" in the amount field evaluates on Save.
  const hasExpr = /[+\-×÷*/]/.test(amount.slice(1)); // slice: leading '-' alone isn't an expression
  const evaluated = hasExpr ? evalAmountExpr(amount) : NaN;

  async function submit(fd: FormData) {
    const v = evalAmountExpr(String(fd.get("amount") ?? ""));
    if (Number.isFinite(v) && v > 0) fd.set("amount", String(v));
    await action(fd);
  }

  return (
    <form action={submit} className="flex flex-col gap-3">
      {/* Scan receipt: photo/library -> Gemini vision -> prefill. The same file
          is submitted with the form and stored linked to the transaction. */}
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-400 p-3 text-sm text-neutral-600 active:scale-[0.98]">
        {scanning ? (
          <><span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" /> Reading receipt…</>
        ) : (
          <>📎 Attach receipt / proof (auto-reads the details)</>
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

      <div className="flex flex-col gap-1">
        <input
          name="amount" type="text" inputMode="decimal" placeholder="0.00  (or 12+7.50-3)"
          required value={amount} onChange={(e) => setAmount(e.target.value)}
          className="rounded-xl border p-4 text-2xl"
        />
        <div className="flex items-center gap-2">
          {/* Operator chips — the iPhone decimal keypad has no + − × ÷ */}
          {["+", "−", "×", "÷"].map((op) => (
            <button key={op} type="button"
              onClick={() => setAmount((a) => a + (op === "−" ? "-" : op))}
              className="h-8 w-10 rounded-lg border text-base text-neutral-600 active:scale-95">
              {op}
            </button>
          ))}
          {hasExpr && (
            <span className={`ml-auto text-sm font-medium ${Number.isFinite(evaluated) ? "text-neutral-600" : "text-red-500"}`}>
              {Number.isFinite(evaluated) ? `= RM ${evaluated.toFixed(2)}` : "…"}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="flex cursor-pointer items-center justify-center rounded-xl border p-3 text-sm has-checked:border-red-400 has-checked:bg-red-50">
          <input type="radio" name="kind" value="spend" checked={kind === "spend"}
            onChange={() => setKind("spend")} className="mr-1.5" /> Spend
        </label>
        <label className="flex cursor-pointer items-center justify-center rounded-xl border p-3 text-sm has-checked:border-green-400 has-checked:bg-green-50">
          <input type="radio" name="kind" value="income" checked={kind === "income"}
            onChange={() => setKind("income")} className="mr-1.5" /> Income
        </label>
        <label className="flex cursor-pointer items-center justify-center rounded-xl border p-3 text-sm has-checked:border-blue-400 has-checked:bg-blue-50">
          <input type="radio" name="kind" value="transfer" checked={isTransfer}
            onChange={() => setKind("transfer")} className="mr-1.5" /> Transfer
        </label>
      </div>

      <select name="account_id" required={isTransfer} className="rounded-xl border p-3" defaultValue="">
        <option value="">{isTransfer ? "— from account —" : "— account (optional) —"}</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
        ))}
      </select>

      {isTransfer && (
        <select name="account_to" required className="rounded-xl border p-3" defaultValue="">
          <option value="">— to account (e.g. TnG eWallet) —</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
          ))}
        </select>
      )}

      {!isTransfer && (
        <>
          <input
            name="category" list="cats" placeholder="Category"
            value={category} onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border p-3"
          />
          <datalist id="cats">
            {CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </>
      )}

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
