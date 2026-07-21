"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Two jobs:
// 1. Cover the screen the INSTANT the app is backgrounded, so the iOS
//    app-switcher snapshot (freeze mode) shows a frosted splash, not your
//    balances. The cover is always mounted and flipped by DIRECT DOM writes
//    in the event handlers — a React setState render happens too late; iOS
//    snapshots before it paints. We also listen to every backgrounding signal
//    iOS emits (blur / pagehide / freeze / visibilitychange) to win the race.
// 2. In the installed PWA (home-screen app): any swipe-away locks — returning
//    hard-navigates to /lock (clears session -> /login). In a plain browser
//    tab, tab-switching only covers; the 15-min server TTL backstops.
export default function PrivacyShield() {
  const coverRef = useRef<HTMLDivElement>(null);
  const wasHidden = useRef(false);
  const path = usePathname();
  const onLogin = path === "/login";

  useEffect(() => {
    if (onLogin) return;
    const el = coverRef.current;
    if (!el) return;

    const show = () => { el.style.opacity = "1"; el.style.pointerEvents = "auto"; };
    const hide = () => { el.style.opacity = "0"; el.style.pointerEvents = "none"; };

    // Fresh mount / route change while visible: make sure we start uncovered
    // (guards the "stuck cover after Face ID" class of bug).
    if (document.visibilityState === "visible") { wasHidden.current = false; hide(); }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    const onLeave = () => { wasHidden.current = true; show(); };
    const onReturn = () => {
      if (!wasHidden.current) return;
      wasHidden.current = false;
      if (standalone) window.location.replace("/lock"); // hard lock on return
      else hide();
    };
    const onVis = () => (document.visibilityState === "hidden" ? onLeave() : onReturn());

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("blur", onLeave);          // fires earliest on iOS app-switch
    document.addEventListener("freeze", onLeave);      // Page Lifecycle API
    window.addEventListener("pageshow", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("freeze", onLeave);
      window.removeEventListener("pageshow", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [onLogin]);

  if (onLogin) return null;
  return (
    <div
      ref={coverRef}
      aria-hidden
      // Always mounted, starts invisible. No CSS transition = instant paint.
      style={{ opacity: 0, pointerEvents: "none" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-2 bg-neutral-50/95 backdrop-blur-2xl"
    >
      <span className="inline-block h-12 w-12 rounded-2xl bg-black" />
      <p className="text-sm font-semibold">Life System</p>
      <p className="text-xs text-neutral-400">Locked for privacy</p>
    </div>
  );
}
