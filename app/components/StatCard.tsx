import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Tarjeta de métrica estilo NextAdmin (overview-stats):
 * icono en pastilla, valor grande y pie con etiqueta + delta.
 */
export function StatCard({
  icon,
  iconClass,
  value,
  label,
  delta,
}: {
  icon: ReactNode;
  iconClass: string;
  value: ReactNode;
  label: string;
  delta?: ReactNode;
}) {
  return (
    <div className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
      <div className="relative flex w-full flex-wrap items-center justify-between gap-3">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg [&>svg]:size-[18px]",
            iconClass,
          )}
        >
          {icon}
        </div>
      </div>
      <div className="mt-6 p-0">
        <div className="tabular mb-1 text-xl font-semibold leading-7 text-text-primary md:text-2xl md:leading-8">
          {value}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 p-0">
        <span className="truncate text-sm font-medium leading-5 text-text-tertiary">
          {label}
        </span>
        {delta}
      </div>
    </div>
  );
}
