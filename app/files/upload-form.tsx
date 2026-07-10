"use client";

import { useState } from "react";
import { compressImage, swapInputFile } from "../compress";
import SubmitButton from "../submit-button";

const AREAS = ["car", "money", "travel", "career", "family", "health", "general"];
const MAX_BYTES = 4 * 1024 * 1024; // matches server-action bodySizeLimit

export default function UploadForm({
  action,
  defaultArea,
}: {
  action: (form: FormData) => Promise<void>;
  defaultArea?: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setMsg(null);
    if (file.type.startsWith("image/")) {
      setBusy(true);
      const small = await compressImage(file);
      swapInputFile(input, small);
      setBusy(false);
      setMsg(`Photo ready (${Math.round(small.size / 1024)} KB).`);
    } else if (file.size > MAX_BYTES) {
      input.value = ""; // reject oversized non-images up front, no mystery errors
      setMsg(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — max is 4 MB. Try a smaller PDF or a photo of it.`);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-400 bg-white p-3">
      <input
        type="file" name="file" required onChange={onPicked}
        className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-black file:px-3 file:py-2 file:text-white"
      />
      {busy && <p className="text-xs text-neutral-500">Compressing photo…</p>}
      {msg && <p className="text-xs text-neutral-500">{msg}</p>}
      <div className="grid grid-cols-2 gap-2">
        <select name="life_area" className="rounded-lg border p-2 text-sm" defaultValue={defaultArea || "car"}>
          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input name="note" placeholder="e.g. Roadtax 2026" className="rounded-lg border p-2 text-sm" />
      </div>
      <SubmitButton pendingLabel="Uploading…" className="rounded-lg bg-black p-2 text-sm text-white">
        Upload
      </SubmitButton>
    </form>
  );
}
