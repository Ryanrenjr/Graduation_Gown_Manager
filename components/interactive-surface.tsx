"use client";

import { type PointerEvent, type ReactNode, useRef } from "react";

export function InteractiveSurface({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  function updatePointer(event: PointerEvent<HTMLElement>) {
    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    element.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    element.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }

  return (
    <section
      ref={ref}
      className={`interactive-surface ${className}`}
      onPointerMove={updatePointer}
    >
      <div className="surface-cursor" aria-hidden="true" />
      {children}
    </section>
  );
}
