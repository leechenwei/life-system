import { NextRequest, NextResponse } from "next/server";

const SESSION_SECONDS = 15 * 60;

// Privacy lock: session cookie lives 15 minutes, refreshed on every request
// while you're using the app. Walk away >15 min and it locks itself; unlock
// with Face ID (passkey) or password. Single shared secret is fine for one user.
export function proxy(req: NextRequest) {
  const cookie = req.cookies.get("ls_auth")?.value;
  if (cookie && cookie === process.env.APP_PASSWORD) {
    const res = NextResponse.next();
    res.cookies.set("ls_auth", cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return res;
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

// Protect every app page. Excludes only: the login page, Next internals, and
// files ending in a known static extension (anchored with $ so an app route that
// merely contains a dot is still gated — avoids an allowlist-bypass auth hole).
export const config = {
  matcher: [
    "/((?!login|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest|txt|xml)$).*)",
  ],
};
