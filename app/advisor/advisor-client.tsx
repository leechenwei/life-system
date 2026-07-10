"use client";

import { useActionState } from "react";
import { adviseAction, type AdviceState } from "./actions";

const PROMPTS = [
  "What should I do next with my money?",
  "How much can I safely invest this month?",
  "Am I on track for my Japan trip?",
  "Where am I overspending?",
];

const initial: AdviceState = { advice: null, question: "" };

export default function Advisor() {
  const [state, formAction, pending] = useActionState(adviseAction, initial);

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-col gap-2">
        <textarea
          name="question"
          rows={2}
          defaultValue={state.question}
          placeholder="Ask anything about your finances…"
          className="rounded-xl border border-neutral-300 p-3 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <button
              key={p}
              type="submit"
              name="question"
              value={p}
              disabled={pending}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-600 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
        <button
          disabled={pending}
          className="rounded-xl bg-black p-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Thinking…" : "Get advice"}
        </button>
      </form>

      {state.advice && (
        <div className="whitespace-pre-wrap rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed">
          {state.advice}
        </div>
      )}
    </div>
  );
}
