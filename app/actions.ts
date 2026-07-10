"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { signedAmount } from "@/lib/money";

function num(v: FormDataEntryValue | null): number {
  return Number(v ?? 0) || 0;
}
function str(v: FormDataEntryValue | null): string {
  return (v ?? "").toString().trim();
}

// Add a spend or income. kind=spend stores a negative amount.
export async function addTransaction(form: FormData) {
  const raw = Math.abs(num(form.get("amount")));
  if (raw === 0) return;
  const kind = str(form.get("kind")); // spend | income
  const amount = signedAmount(kind, raw);
  const account_id = str(form.get("account_id")) || null;

  const supabase = db();
  await supabase.from("transactions").insert({
    amount,
    account_id,
    category: str(form.get("category")) || null,
    note: str(form.get("note")) || null,
    life_area: str(form.get("life_area")) || "money",
    occurred_on: str(form.get("occurred_on")) || new Date().toISOString().slice(0, 10),
  });

  // ponytail: two-step balance update (read+write), not atomic. Fine for one user;
  // move to a Postgres function/trigger if concurrent writes ever matter.
  if (account_id) {
    const { data } = await supabase.from("accounts").select("balance").eq("id", account_id).single();
    if (data) {
      await supabase.from("accounts")
        .update({ balance: Number(data.balance) + amount })
        .eq("id", account_id);
    }
  }
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

export async function updateBalance(form: FormData) {
  const id = str(form.get("id"));
  if (!id) return;
  await db().from("accounts").update({ balance: num(form.get("balance")) }).eq("id", id);
  revalidatePath("/accounts");
  revalidatePath("/");
  revalidatePath("/plan");
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
  }).eq("id", 1);
  revalidatePath("/plan");
}
