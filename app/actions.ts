"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { signedAmount } from "@/lib/money";
import { saveAttachment, removeAttachment } from "@/lib/files";
import { scanReceiptImage, type ReceiptGuess } from "@/lib/receipt";

function num(v: FormDataEntryValue | null): number {
  return Number(v ?? 0) || 0;
}
function str(v: FormDataEntryValue | null): string {
  return (v ?? "").toString().trim();
}
// Normalize category casing so "food" and "Food" don't split the stats.
function cat(v: FormDataEntryValue | null): string | null {
  const s = str(v);
  return s ? s[0].toUpperCase() + s.slice(1) : null;
}

// Adjust an account's balance by delta (read+write; fine for one user).
async function bumpBalance(supabase: ReturnType<typeof db>, accountId: string, delta: number) {
  const { data } = await supabase.from("accounts").select("balance").eq("id", accountId).single();
  if (data) {
    await supabase.from("accounts").update({ balance: Number(data.balance) + delta }).eq("id", accountId);
  }
}

// Add a spend, income, or transfer. kind=spend stores a negative amount.
// kind=transfer writes a -/+ pair tagged category 'Transfer' (excluded from stats).
export async function addTransaction(form: FormData) {
  const raw = Math.abs(num(form.get("amount")));
  if (raw === 0) return;
  const kind = str(form.get("kind")); // spend | income | transfer
  const account_id = str(form.get("account_id")) || null;
  const supabase = db();

  if (kind === "transfer") {
    const to_id = str(form.get("account_to")) || null;
    if (!account_id || !to_id || account_id === to_id) return;
    const occurred_on = str(form.get("occurred_on")) || new Date().toISOString().slice(0, 10);
    const note = str(form.get("note")) || "Transfer";
    await supabase.from("transactions").insert([
      { amount: -raw, account_id, category: "Transfer", note, life_area: "money", occurred_on },
      { amount: raw, account_id: to_id, category: "Transfer", note, life_area: "money", occurred_on },
    ]);
    await bumpBalance(supabase, account_id, -raw);
    await bumpBalance(supabase, to_id, raw);
    revalidatePath("/");
    revalidatePath("/accounts");
    return;
  }

  const amount = signedAmount(kind, raw);
  const { data: tx } = await supabase.from("transactions").insert({
    amount,
    account_id,
    category: cat(form.get("category")),
    note: str(form.get("note")) || null,
    life_area: str(form.get("life_area")) || "money",
    occurred_on: str(form.get("occurred_on")) || new Date().toISOString().slice(0, 10),
  }).select("id").single();

  // If a receipt photo came along, store it linked to this transaction.
  const receipt = form.get("receipt");
  if (tx && receipt instanceof File && receipt.size > 0) {
    await saveAttachment(receipt, {
      life_area: str(form.get("life_area")) || "money",
      note: str(form.get("note")) || "receipt",
      linked_table: "transactions",
      linked_id: tx.id,
    });
  }

  // ponytail: two-step balance update (read+write), not atomic. Fine for one user;
  // move to a Postgres function/trigger if concurrent writes ever matter.
  if (account_id) await bumpBalance(supabase, account_id, amount);
  revalidatePath("/");
  revalidatePath("/accounts");
}

export async function addAccount(form: FormData) {
  const name = str(form.get("name"));
  if (!name) return;
  await db().from("accounts").insert({
    name,
    type: str(form.get("type")) || "bank",
    balance: num(form.get("balance")),
  });
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function updateAccount(form: FormData) {
  const id = str(form.get("id"));
  const name = str(form.get("name"));
  if (!id || !name) return;
  await db().from("accounts").update({
    name,
    type: str(form.get("type")) || "bank",
    balance: num(form.get("balance")),
  }).eq("id", id);
  revalidatePath("/accounts");
  revalidatePath("/");
  revalidatePath("/plan");
}

// FK on transactions is ON DELETE SET NULL, so history survives account deletion.
export async function deleteAccount(form: FormData) {
  const id = str(form.get("id"));
  if (!id) return;
  await db().from("accounts").delete().eq("id", id);
  revalidatePath("/accounts");
  revalidatePath("/");
  revalidatePath("/plan");
}

// Soft-delete a transaction (restorable) and reverse its balance effect.
export async function deleteTransaction(form: FormData) {
  const id = str(form.get("id"));
  if (!id) return;
  const supabase = db();
  const { data: tx } = await supabase.from("transactions")
    .select("amount, account_id, deleted_at").eq("id", id).single();
  if (!tx || tx.deleted_at) return; // already deleted — don't double-reverse
  await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (tx.account_id) await bumpBalance(supabase, tx.account_id, -Number(tx.amount));
  revalidatePath("/");
  revalidatePath("/accounts");
}

// Edit a transaction. Sign is preserved from the original (spend stays spend);
// balance effects are reversed on the old account and applied on the new one.
// Transfers are excluded (paired rows — delete and re-add instead).
export async function updateTransaction(form: FormData) {
  const id = str(form.get("id"));
  const rawAmount = Math.abs(num(form.get("amount")));
  if (!id || rawAmount === 0) return;
  const supabase = db();
  const { data: old } = await supabase.from("transactions")
    .select("amount, account_id, category, deleted_at").eq("id", id).single();
  if (!old || old.deleted_at || old.category === "Transfer") return;

  const sign = Number(old.amount) < 0 ? -1 : 1;
  const newAmount = sign * rawAmount;
  const newAccount = str(form.get("account_id")) || null;

  await supabase.from("transactions").update({
    amount: newAmount,
    account_id: newAccount,
    category: cat(form.get("category")),
    note: str(form.get("note")) || null,
    occurred_on: str(form.get("occurred_on")) || undefined,
  }).eq("id", id);

  // Rebalance: undo old effect, apply new (handles account changes too).
  if (old.account_id) await bumpBalance(supabase, old.account_id, -Number(old.amount));
  if (newAccount) await bumpBalance(supabase, newAccount, newAmount);

  // Receipt: a new file replaces the old one; the "remove receipt" box deletes it.
  const receipt = form.get("receipt");
  const removeReceipt = form.get("remove_receipt") === "on";
  if (removeReceipt || (receipt instanceof File && receipt.size > 0)) {
    await removeTxReceipt(supabase, id);
  }
  if (!removeReceipt && receipt instanceof File && receipt.size > 0) {
    await saveAttachment(receipt, {
      life_area: str(form.get("life_area")) || "money",
      note: str(form.get("note")) || "receipt",
      linked_table: "transactions",
      linked_id: id,
    });
  }

  revalidatePath("/");
  revalidatePath("/accounts");
}

// Delete all attachments (storage + rows) linked to a transaction.
async function removeTxReceipt(supabase: ReturnType<typeof db>, txId: string) {
  const { data: rows } = await supabase.from("attachments")
    .select("id, storage_path").eq("linked_table", "transactions").eq("linked_id", txId);
  if (!rows?.length) return;
  await supabase.storage.from("attachments").remove(rows.map((r) => r.storage_path));
  await supabase.from("attachments").delete().in("id", rows.map((r) => r.id));
}

// Undo: bring a soft-deleted transaction back and re-apply its balance effect.
export async function restoreTransaction(form: FormData) {
  const id = str(form.get("id"));
  if (!id) return;
  const supabase = db();
  const { data: tx } = await supabase.from("transactions")
    .select("amount, account_id, deleted_at").eq("id", id).single();
  if (!tx || !tx.deleted_at) return; // not deleted — don't double-apply
  await supabase.from("transactions").update({ deleted_at: null }).eq("id", id);
  if (tx.account_id) await bumpBalance(supabase, tx.account_id, Number(tx.amount));
  revalidatePath("/");
  revalidatePath("/accounts");
}

export async function addGoal(form: FormData) {
  const name = str(form.get("name"));
  if (!name) return;
  await db().from("goals").insert({
    name,
    target_amount: num(form.get("target_amount")),
    saved_amount: num(form.get("saved_amount")),
    target_date: str(form.get("target_date")) || null,
  });
  revalidatePath("/");
  revalidatePath("/plan");
}

export async function updateGoal(form: FormData) {
  const id = str(form.get("id"));
  if (!id) return;
  await db().from("goals").update({
    name: str(form.get("name")) || undefined,
    target_amount: num(form.get("target_amount")),
    saved_amount: num(form.get("saved_amount")),
    target_date: str(form.get("target_date")) || null,
  }).eq("id", id);
  revalidatePath("/");
  revalidatePath("/plan");
}

export async function deleteGoal(form: FormData) {
  const id = str(form.get("id"));
  if (!id) return;
  await db().from("goals").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/plan");
}

export async function addReminder(form: FormData) {
  const title = str(form.get("title"));
  const due_date = str(form.get("due_date"));
  if (!title || !due_date) return;
  await db().from("reminders").insert({
    title,
    due_date,
    life_area: str(form.get("life_area")) || "general",
    recur: str(form.get("recur")) || "none",
    amount: form.get("amount") ? num(form.get("amount")) : null,
  });
  revalidatePath("/");
}

export async function completeReminder(form: FormData) {
  const id = str(form.get("id"));
  if (!id) return;
  await db().from("reminders").update({ done: true }).eq("id", id);
  revalidatePath("/");
}

export async function saveSettings(form: FormData) {
  await db().from("settings").update({
    buffer_months: Math.max(1, Math.round(num(form.get("buffer_months")))),
    default_monthly_spend: num(form.get("default_monthly_spend")),
    about_me: str(form.get("about_me")) || null,
  }).eq("id", 1);
  revalidatePath("/plan");
}

// Receipt photo -> {amount, merchant, date, category} via Gemini vision.
export async function scanReceipt(form: FormData): Promise<ReceiptGuess | { error: string }> {
  const file = form.get("receipt");
  if (!(file instanceof File) || file.size === 0) return { error: "No image received." };
  if (file.size > 10 * 1024 * 1024) return { error: "Image too large (max 10MB)." };
  return scanReceiptImage(await file.arrayBuffer(), file.type || "image/jpeg");
}

export async function uploadFile(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > 10 * 1024 * 1024) return;
  await saveAttachment(file, {
    life_area: str(form.get("life_area")) || "general",
    note: str(form.get("note")) || null,
  });
  revalidatePath("/files");
}

export async function deleteFile(form: FormData) {
  const id = str(form.get("id"));
  if (!id) return;
  await removeAttachment(id);
  revalidatePath("/files");
}
