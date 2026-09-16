"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/app/components/Icon";
import { ExerciseThumb } from "@/app/components/ExerciseThumb";
import { formatWeight } from "@/lib/units";

export type DayExercise = {
  id: number;
  name: string;
  sets: number;
  reps: string;
  muscle: string | null;
  lastKg: number | null;
};

export type DayCardData = {
  weekday: number;
  dayAbbr: string;
  dayNum: number;
  title: string;
  focus: string | null;
  custom: boolean;
  detailHref: string;
  registerHref: string;
  isToday: boolean;
  completed: boolean;
  loggable: boolean;
  hasSession: boolean;
  volumeKg: number;
  setsCount: number;
  topKg: number;
  unit: "kg" | "lb";
  exercises: DayExercise[];
  /** Por ejercicio: series registradas y top en kg (sesión de esa fecha). */
  loggedByExercise: Record<number, { count: number; topKg: number }>;
};

export function WeekDayCard({ day }: { day: DayCardData }) {
  const [open, setOpen] = useState(day.isToday);
  const { unit } = day;

  // Fila compacta: solo el resultado (o el estado), sin conteos.
  const metric =
    day.completed && !day.hasSession
      ? "Hecha"
      : day.hasSession
        ? day.topKg > 0
          ? `${formatWeight(day.volumeKg, unit)} · top ${formatWeight(day.topKg, unit)}`
          : formatWeight(day.volumeKg, unit)
        : day.loggable
          ? "Sin registrar"
          : "Programado";

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-xl border-[0.5px] bg-card-background transition-colors ${
        day.isToday ? "border-brand-500/50" : "border-card-border"
      }`}
    >
      {day.isToday && (
        <span className="absolute inset-x-0 top-0 h-1 bg-brand-500" />
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-3 p-3 text-left sm:p-4"
      >
        <span
          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${
            day.isToday
              ? "bg-brand-500/10 text-brand-500"
              : "bg-background-gray-secondary text-text-tertiary"
          }`}
        >
          <span className="text-[10px] font-medium uppercase tracking-wider">
            {day.dayAbbr}
          </span>
          <span className="tabular text-lg font-semibold leading-none">
            {day.dayNum}
          </span>
        </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-medium">{day.title}</span>
              {day.custom && (
                <span className="rounded-full bg-[rgba(14,165,233,0.10)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#0EA5E9]">
                  Mía
                </span>
              )}
            {day.isToday && (
              <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-500">
                Hoy
              </span>
            )}
            {day.completed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(34,197,94,0.10)] px-2 py-0.5 text-[10px] font-medium uppercase text-[#22C55E]">
                <Icon name="check_circle" className="text-[13px]" />
                Hecha
              </span>
            )}
          </span>
          <span className="tabular truncate text-xs text-text-tertiary">{metric}</span>
        </span>
        <Icon
          name="expand_more"
          className={`shrink-0 text-[24px] text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-card-border p-3 sm:p-4">
          {day.focus && (
            <p className="text-xs text-text-tertiary">{day.focus}</p>
          )}
          <ul className="flex flex-col gap-1.5">
            {day.exercises.map((e) => {
              const log = day.loggedByExercise[e.id];
              const count = log?.count ?? 0;
              const done = count >= e.sets;
              const partial = !done && count > 0;
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-2.5 rounded-lg bg-background-gray-secondary p-2"
                >
                  <ExerciseThumb name={e.name} className="h-11 w-11" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-xs font-medium leading-snug text-text-primary">
                      {e.name}
                    </span>
                    <span className="tabular text-[11px] text-text-tertiary">
                      Prog. {e.sets} × {e.reps}
                      {e.muscle ? ` · ${e.muscle}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span
                      className={`tabular inline-flex items-center gap-1 text-xs font-medium ${
                        done
                          ? "text-[#22C55E]"
                          : partial
                            ? "text-[#0EA5E9]"
                            : "text-text-tertiary"
                      }`}
                    >
                      <Icon
                        name={
                          done
                            ? "check_circle"
                            : partial
                              ? "hourglass_top"
                              : "radio_button_unchecked"
                        }
                        className="text-[14px]"
                      />
                      {count}/{e.sets}
                    </span>
                    <span className="tabular text-[11px] text-text-tertiary">
                      {log && log.topKg > 0
                        ? `top ${formatWeight(log.topKg, unit)}`
                        : e.lastKg !== null
                          ? `últ. ${formatWeight(e.lastKg, unit)}`
                          : "—"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-1 flex gap-2">
            {day.loggable && !day.completed && (
              <Link
                href={day.registerHref}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-button-primary-background px-3 text-xs font-medium text-white transition-colors hover:bg-button-primary-hover-background"
              >
                <Icon name="edit" className="text-[16px]" />
                {day.isToday ? "Registrar hoy" : "Registrar ese día"}
              </Link>
            )}
            <Link
              href={day.detailHref}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-lg border border-card-border bg-card-background px-3 text-xs font-medium text-text-primary transition-colors hover:bg-background-gray-secondary ${day.loggable && !day.completed ? "flex-1" : "flex-[2]"}`}
            >
              <Icon name="visibility" className="text-[16px]" />
              Ver completo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
