"use client";

// Shrink a photo before upload: decode (Safari handles HEIC natively), downscale
// to maxDim, re-encode as JPEG. A 6MB camera shot becomes ~300-600KB, safely under
// the 4MB server-action limit — and HEIC comes out as JPEG as a side effect.
// Non-images (PDFs etc) pass through untouched.
export async function compressImage(file: File, maxDim = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // decode failed (odd format) — send original, server still size-guards
  }
}

// Replace the chosen file inside a real <input type=file> so the normal form
// submit carries the compressed version.
export function swapInputFile(input: HTMLInputElement, file: File) {
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
}
