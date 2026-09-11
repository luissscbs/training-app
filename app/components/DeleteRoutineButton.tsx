"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCustomRoutine } from "@/app/actions";
import { Icon } from "@/app/components/Icon";

export function DeleteRoutineButton({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`¿Borrar "${title}"? No se puede si tiene sesiones.`)) return;
        start(async () => {
          try {
            await deleteCustomRoutine(id);
            router.refresh();
          } catch (err) {
            window.alert(err instanceof Error ? err.message : "No se pudo borrar");
          }
        });
      }}
      aria-label={`Borrar ${title}`}
      className="rounded-lg p-2 text-onvariant hover:bg-shigh hover:text-error disabled:opacity-50"
    >
      <Icon name="delete" className="text-[20px]" />
    </button>
  );
}
