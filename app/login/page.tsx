import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function login(formData: FormData) {
  "use server";
  const pw = (formData.get("password") ?? "").toString();
  if (pw && pw === process.env.APP_PASSWORD) {
    (await cookies()).set("ls_auth", pw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90, // 90 days
    });
    redirect("/");
  }
  redirect("/login?e=1");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Life System</h1>
      <form action={login} className="flex flex-col gap-3">
        <input
          name="password"
          type="password"
          placeholder="Password"
          autoFocus
          className="rounded-lg border p-3"
        />
        {e && <p className="text-sm text-red-600">Wrong password.</p>}
        <button className="rounded-lg bg-black p-3 font-medium text-white">Enter</button>
      </form>
    </main>
  );
}
