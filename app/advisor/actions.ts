"use server";

import { buildSnapshot, buildPrompt, askGemini } from "@/lib/advisor";

export type AdviceState = { advice: string | null; question: string };

export async function adviseAction(_prev: AdviceState, form: FormData): Promise<AdviceState> {
  const question = (form.get("question") ?? "").toString().trim();
  const snapshot = await buildSnapshot();
  const advice = await askGemini(buildPrompt(snapshot, question));
  return { advice, question };
}
