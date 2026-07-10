import Advisor from "./advisor-client";

export const dynamic = "force-dynamic";

export default function AdvisorPage() {
  return (
    <main className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Advisor</h1>
        <p className="text-sm text-neutral-500">
          AI advice based on your live numbers. Nothing here is professional financial advice.
        </p>
      </div>
      <Advisor />
    </main>
  );
}
