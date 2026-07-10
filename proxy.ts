import { NextRequest, NextResponse } from "next/server";

// ponytail: single shared password in an httpOnly+secure cookie. Fine for one user.
// Upgrade path: swap for Supabase Auth if you ever add your girlfriend / multi-user.
export function proxy(req: NextRequest) {
  const cookie = req.cookies.get("ls_auth")?.value;
  if (cookie && cookie === process.env.APP_PASSWORD) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

// Protect every app page. Excludes: the login page, Next internals (_next),
// and any path with a file extension (manifest.webmanifest, icon-*.png, favicon.ico …)
// so PWA assets stay publicly fetchable.
export const config = {
  matcher: ["/((?!login|_next|.*\\.).*)"],
};
