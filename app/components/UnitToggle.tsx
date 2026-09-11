"use client";

import { useTransition } from "react";
import { updateUnit } from "@/app/actions";

export function UnitToggle({ unit }: { unit: "kg" | "lb" }) {
  const [pending, start] = useTransition();
  return (
    <div
      className="flex items-center rounded-full bg-slowest p-1"
      role="group"
      aria-label="Unidad de peso"
    >
      {(["kg", "lb"] as const).map((u) => {
        const isActive = u === unit;
        const accent = u === "kg" ? "text-primary" : "text-secondary";
        const glow =
          u === "kg"
            ? "shadow-[0_0_12px_-2px_rgba(132,204,22,0.3)]"
            : "shadow-[0_0_12px_-2px_rgba(6,182,212,0.3)]";
        return (
          <button
            key={u}
            type="button"
            disabled={pending || isActive}
            onClick={() => start(async () => void (await updateUnit(u)))}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase transition-all sm:px-4 ${
              isActive
                ? `bg-shigh ${accent} ${glow}`
                : "text-onvariant hover:text-onsurface"
            }`}
          >
            {u}
          </button>
        );
      })}
    </div>
  );
}
