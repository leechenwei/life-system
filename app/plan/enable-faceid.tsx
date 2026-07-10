"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { passkeyRegisterOptions, passkeyRegisterVerify } from "../auth-actions";

export default function EnableFaceId({ registered }: { registered: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(registered);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const optionsJSON = await passkeyRegisterOptions();
      const response = await startRegistration({ optionsJSON });
      const { ok } = await passkeyRegisterVerify(response);
      if (ok) { setDone(true); setMsg("✓ Face ID enabled on this device."); }
      else setMsg("Registration failed — try again.");
    } catch {
      setMsg("Cancelled or not supported on this device/browser.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-white p-4">
      <h2 className="text-sm font-semibold">Security</h2>
      <p className="text-xs text-neutral-500">
        The app locks itself 15 minutes after you stop using it.
        {done ? " Face ID is set up for quick unlock." : " Enable Face ID so unlocking is instant."}
      </p>
      <button
        onClick={enable}
        disabled={busy}
        className="rounded-lg bg-black p-2 text-sm text-white disabled:opacity-60"
      >
        {busy ? "Waiting for Face ID…" : done ? "Add this device too" : "Enable Face ID on this device"}
      </button>
      {msg && <p className="text-xs text-neutral-500">{msg}</p>}
    </div>
  );
}
