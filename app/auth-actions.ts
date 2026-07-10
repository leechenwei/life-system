"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  registrationOptions, verifyRegistration,
  authenticationOptions, verifyAuthentication,
  listPasskeys,
} from "@/lib/webauthn";
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from "@simplewebauthn/server";

const SESSION_SECONDS = 15 * 60; // lock after 15 min away; proxy rolls it while active

async function setSession() {
  (await cookies()).set("ls_auth", process.env.APP_PASSWORD!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

async function setChallenge(challenge: string) {
  (await cookies()).set("wa_chal", challenge, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 300,
  });
}
async function takeChallenge(): Promise<string | null> {
  const jar = await cookies();
  const c = jar.get("wa_chal")?.value ?? null;
  jar.delete("wa_chal");
  return c;
}

// --- password login ---
export async function passwordLogin(form: FormData) {
  const pw = (form.get("password") ?? "").toString();
  if (pw && pw === process.env.APP_PASSWORD) {
    await setSession();
    redirect("/");
  }
  redirect("/login?e=1");
}

// --- Face ID: register this device (must already be logged in; proxy gates it) ---
export async function passkeyRegisterOptions() {
  const opts = await registrationOptions();
  await setChallenge(opts.challenge);
  return opts;
}
export async function passkeyRegisterVerify(response: RegistrationResponseJSON) {
  const challenge = await takeChallenge();
  if (!challenge) return { ok: false };
  return { ok: await verifyRegistration(response, challenge) };
}

// --- Face ID: log in ---
export async function passkeyLoginOptions() {
  const opts = await authenticationOptions();
  await setChallenge(opts.challenge);
  return opts;
}
export async function passkeyLoginVerify(response: AuthenticationResponseJSON) {
  const challenge = await takeChallenge();
  if (!challenge) return { ok: false };
  const ok = await verifyAuthentication(response, challenge);
  if (ok) await setSession();
  return { ok };
}

export async function hasPasskeys(): Promise<boolean> {
  return (await listPasskeys()).length > 0;
}

// --- manual lock (header button) ---
export async function lockNow() {
  (await cookies()).delete("ls_auth");
  redirect("/login");
}
