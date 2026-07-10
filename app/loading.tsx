// Shown instantly on navigation while the server component fetches data,
// so pages never feel frozen even if a query is slow.
export default function Loading() {
  return (
    <main className="flex animate-pulse flex-col gap-4 p-4" aria-busy="true">
      <div className="mt-2 h-8 w-40 rounded-lg bg-neutral-200" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-xl bg-neutral-200" />
        <div className="h-20 rounded-xl bg-neutral-200" />
      </div>
      <div className="h-24 rounded-xl bg-neutral-200" />
      <div className="h-16 rounded-xl bg-neutral-200" />
    </main>
  );
}
