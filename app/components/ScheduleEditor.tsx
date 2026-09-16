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
      className="flex scroll-mt-24 flex-col gap-3 rounded-xl border-[0.5px] border-card-border bg-card-background p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold leading-6 tracking-[-0.2px] text-text-primary">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
            <Icon name="edit_calendar" className="text-[18px]" />
          </span>
          Mi semana
        </h2>
        <span
          className={`tabular rounded-full px-3 py-1 text-xs font-medium ${
            trainDays === 0
              ? "bg-background-gray-secondary text-text-tertiary"
              : "bg-brand-500/10 text-brand-500"
          }`}
        >
          {trainDays}/7 entreno · {7 - trainDays} descanso
        </span>
      </div>
      <p className="text-xs text-text-tertiary">
        Elige qué rutina toca cada día o márcalo como descanso. Las
        recomendadas y las tuyas sirven igual.
      </p>

      <ul className="flex flex-col gap-2">
        {DAY_NAMES.map((day, w) => (
          <li
            key={day}
            className="flex items-center gap-2 rounded-xl bg-background-gray-secondary p-2.5"
          >
            <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wider text-text-tertiary">
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
              className="w-full rounded-lg border border-card-border bg-input-background px-2 py-2 text-sm text-text-primary focus:border-input-primary-focus-border focus:outline-none"
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
        <p role="status" className="rounded-lg bg-background-gray-secondary p-2.5 text-center text-sm text-text-primary">
          {msg}
        </p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={onSave}
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-button-primary-background px-5 text-sm font-medium text-white transition-colors hover:bg-button-primary-hover-background disabled:opacity-50"
      >
        <Icon name="save" className="text-[20px]" />
        {pending ? "Guardando…" : "Guardar mi semana"}
      </button>
    </div>
  );
}
