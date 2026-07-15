import { NextResponse } from "next/server";

// Hard lock endpoint: clears the session and lands on the login screen.
// A full navigation here is deliberate — unlike a background server-action
// fetch, it can't die silently at iOS wake-time and leave a stale session.
export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete("ls_auth");
  return res;
}
