"use client";

import { useEffect, useState } from "react";

export function CursorToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem("brp-pizza-cursor");
    const shouldEnable = saved !== "off";
    setEnabled(shouldEnable);
    document.documentElement.classList.toggle("pizza-cursor", shouldEnable);
    return () => document.documentElement.classList.remove("pizza-cursor");
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    document.documentElement.classList.toggle("pizza-cursor", next);
    window.localStorage.setItem("brp-pizza-cursor", next ? "on" : "off");
  }

  return (
    <button className="footer-button" type="button" onClick={toggle} aria-pressed={enabled}>
      Pizza cursor {enabled ? "on" : "off"}
    </button>
  );
}
