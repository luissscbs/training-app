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
      className="flex items-center gap-1 rounded-lg bg-tab-background p-1"
      role="group"
      aria-label="Unidad de peso"
    >
      {(["kg", "lb"] as const).map((u) => {
        const isActive = u === optimisticUnit;
        return (
          <button
            key={u}
            type="button"
            disabled={pending || isActive}
            onClick={() => handleSelect(u)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium uppercase transition-colors sm:px-4 ${
              isActive
                ? "bg-tab-active-background text-text-primary shadow-xs"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            {u}
          </button>
        );
      })}
    </div>
  );
}
