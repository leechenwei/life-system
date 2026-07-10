"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { passkeyLoginOptions, passkeyLoginVerify, passwordLogin } from "../auth-actions";
import SubmitButton from "../submit-button";

export default function LoginClient({ error, canFaceId }: { error?: boolean; canFaceId: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function faceId() {
    setBusy(true);
    setMsg(null);
    try {
      const optionsJSON = await passkeyLoginOptions();
      const response = await startAuthentication({ optionsJSON });
      const { ok } = await passkeyLoginVerify(response);
      if (ok) { router.push("/"); router.refresh(); return; }
      setMsg("Face ID check failed — use your password.");
    } catch {
      setMsg("Face ID cancelled or unavailable — use your password.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {canFaceId && (
        <button
          onClick={faceId}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-xl bg-black p-4 font-medium text-white disabled:opacity-60"
        >
          {busy
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : "🔓"} Unlock with Face ID
        </button>
      )}
      {canFaceId && <p className="text-center text-xs text-neutral-400">or</p>}

      <form action={passwordLogin} className="flex flex-col gap-3">
        <input
          name="password"
          type="password"
          placeholder="Password"
          autoFocus={!canFaceId}
          className="rounded-xl border p-3"
        />
        {error && <p className="text-sm text-red-600">Wrong password.</p>}
        {msg && <p className="text-sm text-neutral-500">{msg}</p>}
        <SubmitButton pendingLabel="Checking…" className={`rounded-xl p-3 font-medium ${canFaceId ? "border" : "bg-black text-white"}`}>
          Enter
        </SubmitButton>
      </form>
    </div>
  );
}
