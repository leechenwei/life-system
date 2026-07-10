import { cache } from "react";
import { db } from "./supabase";

export type Attachment = {
  id: string; storage_path: string; linked_table: string | null; linked_id: string | null;
  life_area: string; note: string | null; created_at: string;
  url?: string; // signed URL added at read time
};

const BUCKET = "attachments";

// Upload a file to the private bucket + record it. Returns the attachment id.
export async function saveAttachment(
  file: File,
  opts: { life_area: string; note?: string | null; linked_table?: string; linked_id?: string },
): Promise<string | null> {
  const supabase = db();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${opts.life_area}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (up.error) return null;
  const ins = await supabase.from("attachments").insert({
    storage_path: path,
    life_area: opts.life_area,
    note: opts.note || file.name,
    linked_table: opts.linked_table ?? null,
    linked_id: opts.linked_id ?? null,
  }).select("id").single();
  return ins.data?.id ?? null;
}

// List attachments (optionally by area) with 1-hour signed view URLs.
export const getAttachments = cache(async (area?: string): Promise<Attachment[]> => {
  const supabase = db();
  let q = supabase.from("attachments").select("*").order("created_at", { ascending: false });
  if (area) q = q.eq("life_area", area);
  const { data } = await q;
  const rows = (data ?? []) as Attachment[];
  if (rows.length === 0) return rows;
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), 3600);
  return rows.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? undefined }));
});

export async function removeAttachment(id: string): Promise<void> {
  const supabase = db();
  const { data } = await supabase.from("attachments").select("storage_path").eq("id", id).single();
  if (!data) return;
  await supabase.storage.from(BUCKET).remove([data.storage_path]);
  await supabase.from("attachments").delete().eq("id", id);
}
