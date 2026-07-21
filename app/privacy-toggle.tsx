"use client";

import { useEffect, useState } from "react";

// Eye button in the header: blurs all amounts on/off, persisted in
// localStorage. The no-flash script in layout sets the initial attribute
// before paint, so this just mirrors it into React state.
export default function PrivacyToggle() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(document.documentElement.dataset.hideAmounts === "1");
  }, []);

  function toggle() {
    const next = !hidden;
    setHidden(next);
    document.documentElement.dataset.hideAmounts = next ? "1" : "0";
    try { localStorage.setItem("hideAmounts", next ? "1" : "0"); } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={hidden ? "Show amounts" : "Hide amounts"}
      className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600"
    >
      {hidden ? "🙈" : "👁"}
    </button>
  );
}
