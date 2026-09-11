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
};

export function WeekDayCard({ day }: { day: DayCardData }) {
  const [open, setOpen] = useState(day.isToday);
  const { unit } = day;

  const metric = day.hasSession
    ? `${formatWeight(day.volumeKg, unit)} · ${day.setsCount} series${day.topKg > 0 ? ` · top ${formatWeight(day.topKg, unit)}` : ""}`
    : `${day.exercises.length} ejercicios · programado`;

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-xl shadow-md transition-all ${
        day.isToday
          ? "bg-scont shadow-[0_0_20px_-4px_rgba(158,233,57,0.25)]"
          : "bg-slow"
      }`}
    >
      {day.isToday && (
        <span className="absolute inset-x-0 top-0 h-1 bg-primary" />
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-3 p-3 text-left sm:p-4"
      >
        <span
          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${
            day.isToday ? "bg-primary/10 text-primary" : "bg-shigh text-onvariant"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {day.dayAbbr}
          </span>
          <span className="tabular text-lg font-extrabold leading-none">
            {day.dayNum}
          </span>
        </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-bold">{day.title}</span>
              {day.custom && (
                <span className="rounded-full bg-seccont/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
                  Mía
                </span>
              )}
            {day.isToday && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Hoy
              </span>
            )}
            {day.completed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-tertiary">
                <Icon name="check_circle" className="text-[13px]" />
                Hecha
              </span>
            )}
          </span>
          <span className="tabular truncate text-xs text-onvariant">{metric}</span>
        </span>
        <Icon
          name="expand_more"
          className={`shrink-0 text-[24px] text-onvariant transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-white/5 p-3 sm:p-4">
          {day.focus && (
            <p className="text-xs text-onvariant">{day.focus}</p>
          )}
          <ul className="flex flex-col gap-1.5">
            {day.exercises.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2.5 rounded-lg bg-shigh/60 p-2"
              >
                <ExerciseThumb name={e.name} className="h-11 w-11" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs font-bold leading-snug">
                    {e.name}
                  </span>
                  <span className="tabular text-[11px] text-onvariant">
                    {e.sets} × {e.reps}
                    {e.muscle ? ` · ${e.muscle}` : ""}
                  </span>
                </span>
                <span className="tabular shrink-0 text-xs font-bold text-primary">
                  {e.lastKg !== null ? formatWeight(e.lastKg, unit) : "—"}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex gap-2">
            {day.loggable && !day.completed && (
              <Link
                href={day.registerHref}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-pcont px-3 py-2 text-xs font-extrabold text-onpcont transition-all hover:scale-[1.01]"
              >
                <Icon name="edit" className="text-[16px]" />
                {day.isToday ? "Registrar hoy" : "Registrar ese día"}
              </Link>
            )}
            <Link
              href={day.detailHref}
              className={`flex items-center justify-center gap-1.5 rounded-lg bg-shigh px-3 py-2 text-xs font-bold hover:bg-sbright ${day.loggable && !day.completed ? "flex-1" : "flex-[2]"}`}
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
