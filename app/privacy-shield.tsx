"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { lockNow } from "./auth-actions";

// Two jobs:
// 1. Cover the screen the instant the app is backgrounded, so the iOS
//    app-switcher snapshot shows the cover instead of your money.
// 2. In the installed PWA (iPhone home-screen app): ANY swipe-away locks —
//    returning always requires Face ID / password. No grace, per owner's call.
//    In a plain browser tab (desktop), tab-switching only covers, so the app
//    stays usable next to other tabs; the 15-min server TTL still backstops.
export default function PrivacyShield() {
  const [covered, setCovered] = useState(false);
  const wasHidden = useRef(false);
  const path = usePathname();
  const onLogin = path === "/login";

  useEffect(() => {
    if (onLogin) return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari legacy flag
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    const onChange = () => {
      if (document.visibilityState === "hidden") {
        wasHidden.current = true;
        setCovered(true);
      } else if (wasHidden.current) {
        wasHidden.current = false;
        if (standalone) {
          lockNow(); // server action: clears session cookie + redirects to /login
        } else {
          setCovered(false);
        }
      }
    };
    document.addEventListener("visibilitychange", onChange);
    // pagehide fires on some iOS paths where visibilitychange doesn't
    const onHide = () => { wasHidden.current = true; setCovered(true); };
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      window.removeEventListener("pagehide", onHide);
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
