"use client";

import { useRef, useState } from "react";
import { scanReceipt } from "../actions";
import SubmitButton from "../submit-button";
import { compressImage, swapInputFile } from "../compress";
import { evalAmountExpr } from "@/lib/money";
import type { Account } from "@/lib/data";

const DEFAULT_CATEGORIES = ["Food", "Transport", "Groceries", "Bills", "Shopping", "Health", "Fun", "Other"];

export default function AddForm({
  accounts,
  usedCategories = [],
  action,
}: {
  accounts: Pick<Account, "id" | "name" | "type">[];
  usedCategories?: string[];
  action: (form: FormData) => Promise<void>;
}) {
  // Pick-don't-type: existing categories first, defaults fill the gaps.
  const CATEGORIES = (() => {
    const seen = new Set(usedCategories.map((c) => c.toLowerCase()));
    return [...usedCategories, ...DEFAULT_CATEGORIES.filter((c) => !seen.has(c.toLowerCase()))];
  })();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<"spend" | "income" | "transfer">("spend");
  const [newCat, setNewCat] = useState(false);
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

      <div className="flex flex-col gap-2">
        {/* inputMode="none": our keypad below replaces the iOS keyboard
            (hardware keyboards still type into it on desktop) */}
        <div className="relative">
          <input
            name="amount" type="text" inputMode="none" placeholder="0.00"
            required value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border p-4 pr-24 text-2xl"
          />
          {hasExpr && (
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium ${Number.isFinite(evaluated) ? "text-neutral-500" : "text-red-500"}`}>
              {Number.isFinite(evaluated) ? `= ${evaluated.toFixed(2)}` : "…"}
            </span>
          )}
        </div>

        {/* Calculator keypad */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            ["7", "7"], ["8", "8"], ["9", "9"], ["÷", "/"],
            ["4", "4"], ["5", "5"], ["6", "6"], ["×", "*"],
            ["1", "1"], ["2", "2"], ["3", "3"], ["−", "-"],
            [".", "."], ["0", "0"], ["⌫", "BS"], ["+", "+"],
          ].map(([label, key]) => {
            const isOp = ["/", "*", "-", "+", "BS"].includes(key);
            return (
              <button
                key={key} type="button"
                onClick={() =>
                  setAmount((a) => (key === "BS" ? a.slice(0, -1) : a + key))
                }
                className={`h-12 rounded-xl border text-xl transition-transform active:scale-95 ${
                  isOp ? "bg-neutral-100 text-neutral-600" : "bg-white font-medium"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {amount && (
          <button type="button" onClick={() => setAmount("")}
            className="self-end text-xs text-neutral-400 underline">
            clear
          </button>
        )}
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
        <div className="flex flex-col gap-2">
          <input type="hidden" name="category" value={category} />
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const active = category.toLowerCase() === c.toLowerCase();
              return (
                <button key={c} type="button"
                  onClick={() => { setCategory(active ? "" : c); setNewCat(false); }}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors active:scale-95 ${
                    active ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600"
                  }`}>
                  {c}
                </button>
              );
            })}
            <button type="button"
              onClick={() => { setNewCat(true); setCategory(""); }}
              className={`rounded-full border border-dashed px-3 py-1.5 text-sm ${newCat ? "border-black" : "border-neutral-300 text-neutral-400"}`}>
              ＋ New
            </button>
          </div>
          {newCat && (
            <input
              autoFocus placeholder="New category name"
              value={category} onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border p-3"
            />
          )}
        </div>
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
