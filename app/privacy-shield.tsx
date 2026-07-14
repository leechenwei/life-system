"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { lockNow } from "./auth-actions";

// ponytail: 60s grace — long enough for the iOS camera/photo picker (which
// backgrounds the PWA during receipt scans), short enough for privacy.
const GRACE_MS = 60_000;

// Two jobs:
// 1. Cover the screen the instant the app is backgrounded, so the iOS
//    app-switcher snapshot shows the cover instead of your money.
// 2. If backgrounded longer than the grace period, force a full re-lock
//    (Face ID / password) on return.
export default function PrivacyShield() {
  const [covered, setCovered] = useState(false);
  const hiddenAt = useRef<number | null>(null);
  const path = usePathname();
  const onLogin = path === "/login";

  useEffect(() => {
    if (onLogin) return;
    const onChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        setCovered(true);
      } else {
        const away = hiddenAt.current ? Date.now() - hiddenAt.current : 0;
        hiddenAt.current = null;
        if (away > GRACE_MS) {
          lockNow(); // server action: clears session cookie + redirects to /login
        } else {
          setCovered(false);
        }
      }
    };
    document.addEventListener("visibilitychange", onChange);
    // pagehide fires on some iOS paths where visibilitychange doesn't
    const onHide = () => { hiddenAt.current = Date.now(); setCovered(true); };
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
