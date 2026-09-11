"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSchedule } from "@/app/actions";
import { Icon } from "@/app/components/Icon";

export type ScheduleOption = {
  id: number;
  title: string;
  kind: "template" | "custom";
  weekday: number | null;
};

const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export function ScheduleEditor({
  initial,
  options,
}: {
  /** routineId por día (0=Lun), null = descanso */
  initial: (number | null)[];
  options: ScheduleOption[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<(number | null)[]>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const trainDays = values.filter((v) => v !== null).length;

  function onSave() {
    setMsg(null);
    start(async () => {
      try {
        await saveSchedule(
          values.map((routineId, weekday) => ({ weekday, routineId })),
        );
        setMsg(
          trainDays === 0
            ? "Guardado: semana de descanso total."
            : `Guardado: entrenas ${trainDays} día${trainDays === 1 ? "" : "s"} a la semana.`,
        );
        router.refresh();
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div
      id="mi-semana"
      className="flex scroll-mt-24 flex-col gap-3 rounded-xl bg-slow p-5 shadow-md sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Icon name="edit_calendar" className="text-[22px] text-primary" />
          Mi semana
        </h2>
        <span
          className={`tabular rounded-full px-3 py-1 text-xs font-bold ${
            trainDays === 0
              ? "bg-shigh text-onvariant"
              : "bg-primary/15 text-primary"
          }`}
        >
          {trainDays}/7 entreno · {7 - trainDays} descanso
        </span>
      </div>
      <p className="text-xs text-onvariant">
        Elige qué rutina toca cada día o márcalo como descanso. Las
        recomendadas y las tuyas sirven igual.
      </p>

      <ul className="flex flex-col gap-2">
        {DAY_NAMES.map((day, w) => (
          <li
            key={day}
            className="flex items-center gap-2 rounded-xl bg-scont p-2.5"
          >
            <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-onvariant">
              {day}
            </span>
            <select
              value={values[w] === null ? "" : String(values[w])}
              onChange={(e) =>
                setValues((prev) =>
                  prev.map((v, i) =>
                    i === w ? (e.target.value === "" ? null : Number(e.target.value)) : v,
                  ),
                )
              }
              aria-label={`Rutina del ${day}`}
              className="w-full rounded-lg border border-white/10 bg-slowest px-2 py-2 text-sm focus:border-pcont focus:outline-none"
            >
              <option value="">😌 Descanso</option>
              <optgroup label="Recomendadas">
                {options
                  .filter((o) => o.kind === "template")
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
              </optgroup>
              {options.some((o) => o.kind === "custom") && (
                <optgroup label="Mis rutinas">
                  {options
                    .filter((o) => o.kind === "custom")
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </li>
        ))}
      </ul>

      {msg && (
        <p role="status" className="rounded-lg bg-scont p-2.5 text-center text-sm">
          {msg}
        </p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={onSave}
        className="flex items-center justify-center gap-2 rounded-xl bg-pcont px-5 py-2.5 text-sm font-extrabold text-onpcont transition-all hover:scale-[1.01] disabled:opacity-50"
      >
        <Icon name="save" className="text-[20px]" />
        {pending ? "Guardando…" : "Guardar mi semana"}
      </button>
    </div>
  );
}
