"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUnit } from "@/app/actions";

export function UnitToggle({ unit }: { unit: "kg" | "lb" }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  // Muestra el cambio al instante; al llegar el render del servidor
  // con la unidad real, el valor optimista se reconcilia solo.
  const [optimisticUnit, setOptimisticUnit] = useOptimistic(unit);

  function handleSelect(u: "kg" | "lb") {
    if (u === optimisticUnit) return;
    start(async () => {
      setOptimisticUnit(u);
      await updateUnit(u);
      // Garantiza que toda la ruta (TopBar, métricas, listas) pida
      // los datos frescos al servidor tras la mutación.
      router.refresh();
    });
  }

  return (
    <div
      className="flex items-center rounded-full bg-slowest p-1"
      role="group"
      aria-label="Unidad de peso"
    >
      {(["kg", "lb"] as const).map((u) => {
        const isActive = u === optimisticUnit;
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
            onClick={() => handleSelect(u)}
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
