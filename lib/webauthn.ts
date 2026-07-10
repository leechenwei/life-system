import { headers } from "next/headers";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { db } from "./supabase";

// rpID = the domain; derived per-request so localhost and Vercel both work.
export async function rp() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { rpID: host.split(":")[0], origin: `${proto}://${host}` };
}

type PasskeyRow = { id: string; public_key: string; counter: number; transports: string | null };

export async function listPasskeys(): Promise<PasskeyRow[]> {
  const { data } = await db().from("passkeys").select("*");
  return (data ?? []) as PasskeyRow[];
}

export async function registrationOptions() {
  const { rpID } = await rp();
  const existing = await listPasskeys();
  return generateRegistrationOptions({
    rpName: "Life System",
    rpID,
    userName: "owner",
    // platform authenticator = Face ID / Touch ID on this device
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
    excludeCredentials: existing.map((p) => ({ id: p.id })),
  });
}

export async function verifyRegistration(response: RegistrationResponseJSON, expectedChallenge: string) {
  const { rpID, origin } = await rp();
  const v = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });
  if (!v.verified || !v.registrationInfo) return false;
  const { credential } = v.registrationInfo;
  await db().from("passkeys").insert({
    id: credential.id,
    public_key: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    transports: credential.transports?.join(",") ?? null,
  });
  return true;
}

export async function authenticationOptions() {
  const { rpID } = await rp();
  const existing = await listPasskeys();
  return generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: existing.map((p) => ({ id: p.id })),
  });
}

export async function verifyAuthentication(response: AuthenticationResponseJSON, expectedChallenge: string) {
  const { rpID, origin } = await rp();
  const { data } = await db().from("passkeys").select("*").eq("id", response.id).single();
  if (!data) return false;
  const v = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: data.id,
      publicKey: Buffer.from(data.public_key, "base64url"),
      counter: Number(data.counter),
    },
  });
  if (!v.verified) return false;
  await db().from("passkeys").update({ counter: v.authenticationInfo.newCounter }).eq("id", data.id);
  return true;
}
