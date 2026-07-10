import { hasPasskeys } from "../auth-actions";
import LoginClient from "./login-client";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const [{ e }, canFaceId] = await Promise.all([searchParams, hasPasskeys()]);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Life System</h1>
        <p className="text-sm text-neutral-500">Locked for your privacy.</p>
      </div>
      <LoginClient error={Boolean(e)} canFaceId={canFaceId} />
    </main>
  );
}
