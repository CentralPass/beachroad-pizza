"use client";

import { useEffect, useRef } from "react";

export function ScrollBackdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const shift = Math.min(window.scrollY, 900) * 0.085;
      ref.current?.style.setProperty("--scroll-shift", `${shift}px`);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="scroll-backdrop" ref={ref} aria-hidden="true">
      <img src="/brand/beach-road-pizza-logo-v1.png" alt="" width="1433" height="1098" />
      <span>CHRISTIES BEACH · 29B BEACH ROAD ·</span>
    </div>
  );
}
