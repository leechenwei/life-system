"use client";

import { useFormStatus } from "react-dom";

// Shared submit button for all server-action forms:
// - disables itself the instant the form is pending => double-click can't double-insert
// - shows a spinner + label swap so the user sees the tap landed
// - active:scale gives immediate tactile feedback even before pending kicks in
export default function SubmitButton({
  children,
  pendingLabel = "Saving…",
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] disabled:opacity-60 ${className}`}
    >
      {pending && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
