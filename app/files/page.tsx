import Link from "next/link";
import { getAttachments } from "@/lib/files";
import { uploadFile, deleteFile } from "../actions";
import SubmitButton from "../submit-button";
import UploadForm from "./upload-form";

export const dynamic = "force-dynamic";

const AREAS = ["car", "money", "travel", "career", "family", "health", "general"];

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area } = await searchParams;
  const files = await getAttachments(area || undefined);

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="pt-2 text-xl font-semibold">Files</h1>
      <p className="-mt-3 text-sm text-neutral-500">
        Roadtax, insurance, registration cards, policies — upload once, find back anytime.
      </p>

      {/* Upload (client form: compresses photos, size-guards PDFs) */}
      <UploadForm action={uploadFile} defaultArea={area} />

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <Link href="/files" className={`rounded-full border px-3 py-1 text-xs ${!area ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600"}`}>
          all
        </Link>
        {AREAS.map((a) => (
          <Link key={a} href={`/files?area=${a}`} className={`rounded-full border px-3 py-1 text-xs ${area === a ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600"}`}>
            {a}
          </Link>
        ))}
      </div>

      {/* List */}
      {files.length === 0 && (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-neutral-500">
          Nothing here yet{area ? ` under “${area}”` : ""}.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {files.map((f) => (
          <li key={f.id} className="flex items-center gap-3 rounded-xl border bg-white p-3">
            <a href={f.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{f.note || f.storage_path.split("/").pop()}</p>
              <p className="text-xs text-neutral-500">
                {f.life_area} · {f.created_at.slice(0, 10)}
                {f.linked_table === "transactions" && " · 🧾 receipt"}
              </p>
            </a>
            <a href={f.url} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-1 text-xs">
              View
            </a>
            <form action={deleteFile}>
              <input type="hidden" name="id" value={f.id} />
              <SubmitButton pendingLabel="…" className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600">
                ✕
              </SubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
