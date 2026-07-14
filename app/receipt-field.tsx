"use client";

import { useState } from "react";
import { compressImage, swapInputFile } from "./compress";

// Client leaf for server-rendered edit forms: compresses a picked photo in
// place (HEIC->JPEG, under the 4MB action limit) before the form submits it.
export default function ReceiptField({ hasExisting }: { hasExisting: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);

  async function onPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const small = await compressImage(file);
      swapInputFile(input, small);
      setMsg(`Ready (${Math.round(small.size / 1024)} KB) — will ${hasExisting ? "replace the current" : "attach as"} receipt on Save.`);
    } else if (file.size > 4 * 1024 * 1024) {
      input.value = "";
      setMsg("Max 4 MB — snap a photo of it instead.");
    }
  }

  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-500">
      {hasExisting ? "Replace receipt (optional)" : "Attach receipt (optional)"}
      <input type="file" name="receipt" accept="image/*,application/pdf" onChange={onPicked}
        className="text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-200 file:px-2 file:py-1" />
      {msg && <span>{msg}</span>}
    </label>
  );
}
