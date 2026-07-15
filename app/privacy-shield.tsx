"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Two jobs:
// 1. Cover the screen the instant the app is backgrounded, so the iOS
//    app-switcher snapshot shows the cover instead of your money.
// 2. In the installed PWA (iPhone home-screen app): ANY swipe-away locks —
//    returning does a HARD navigation to /lock (clears session -> /login).
//    A hard navigation can't silently fail at wake-time like a fetch, and it
//    resets all client state, so the cover can never get stuck.
//    In a plain browser tab (desktop), tab-switching only covers; the 15-min
//    server TTL still backstops.
export default function PrivacyShield() {
  const [covered, setCovered] = useState(false);
  const wasHidden = useRef(false);
  const path = usePathname();
  const onLogin = path === "/login";

  useEffect(() => {
    if (onLogin) return;
    // Effect (re)attached while visible (fresh mount or route change):
    // never start covered — this was the "stuck logo after Face ID" bug,
    // where covered=true survived the login round-trip in layout state.
    if (document.visibilityState === "visible") {
      wasHidden.current = false;
      setCovered(false);
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    const onReturn = () => {
      if (!wasHidden.current) return;
      wasHidden.current = false;
      if (standalone) {
        window.location.replace("/lock"); // hard lock: cookie cleared server-side
      } else {
        setCovered(false);
      }
    };
    const onChange = () => {
      if (document.visibilityState === "hidden") {
        wasHidden.current = true;
        setCovered(true);
      } else {
        onReturn();
      }
    };
    const onHide = () => { wasHidden.current = true; setCovered(true); };

    document.addEventListener("visibilitychange", onChange);
    // iOS fires pagehide/pageshow on some paths where visibilitychange is skipped
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onReturn);
    };
  }, [onLogin]);

  if (onLogin || !covered) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-neutral-50">
      <span className="inline-block h-10 w-10 rounded-xl bg-black" />
      <p className="text-sm font-semibold">Life System</p>
    </div>
  );
}
