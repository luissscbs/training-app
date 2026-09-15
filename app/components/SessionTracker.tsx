"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { saveSetLogs, startSession, type SetInput } from "@/app/actions";
import { ExerciseThumb } from "@/app/components/ExerciseThumb";
import { Icon } from "@/app/components/Icon";
import { kgToLb } from "@/lib/units";

export type TrackerExercise = {
  id: number;
  name: string;
  sets: number;
  reps: string;
  muscle: string | null;
};

export type TrackerLog = {
  exerciseId: number;
  setNo: number;
  weightKg: string | number;
  reps: number;
};

function toDisplay(weightKg: number, unit: "kg" | "lb"): string {
  const v = unit === "kg" ? weightKg : kgToLb(weightKg);
  const r = Math.round(v * 10) / 10;
  return Number.isFinite(r) ? String(r) : "";
}

/** Reps por defecto desde la plantilla ("8-12" → "8", "10" → "10"). */
function defaultReps(template: string): string {
  const m = template.match(/\d+/);
  return m ? m[0] : "";
}

export function SessionTracker({
  routineId,
  routineTitle,
  routineDate,
  exercises,
  unit,
  sessionId: initialSessionId,
  initialLogs,
  initialCompleted,
  initialNotes,
  lastByExercise,
}: {
  routineId: number;
  routineTitle: string;
  /** fecha YYYY-MM-DD de la sesión que se registra */
  routineDate: string;
  exercises: TrackerExercise[];
  unit: "kg" | "lb";
  sessionId: number | null;
  initialLogs: TrackerLog[];
  initialCompleted: boolean;
  initialNotes: string;
  /** último peso registrado por ejercicio (kg) para precargar */
  lastByExercise: Record<number, number>;
}) {
  const [sessionId, setSessionId] = useState<number | null>(initialSessionId);
  const [completed, setCompleted] = useState(initialCompleted);
  const [notes, setNotes] = useState(initialNotes);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const fieldRefs = useRef(new Map<string, HTMLInputElement>());
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [rowCounts, setRowCounts] = useState<Record<number, number>>(() => {
    const counts: Record<number, number> = {};
    for (const e of exercises) {
      const maxLogged = initialLogs
        .filter((l) => l.exerciseId === e.id)
        .reduce((m, l) => Math.max(m, l.setNo), 0);
      counts[e.id] = Math.min(10, Math.max(e.sets, maxLogged, 1));
    }
    return counts;
  });

  const [cells, setCells] = useState<Record<string, { w: string; r: string }>>(
    () => {
      const c: Record<string, { w: string; r: string }> = {};
      const byKey = new Map(
        initialLogs.map((l) => [`${l.exerciseId}:${l.setNo}`, l]),
      );
      for (const e of exercises) {
        const maxLogged = initialLogs
          .filter((l) => l.exerciseId === e.id)
          .reduce((m, l) => Math.max(m, l.setNo), 0);
        const rows = Math.min(10, Math.max(e.sets, maxLogged, 1));
        const lastKg = lastByExercise[e.id];
        for (let s = 1; s <= rows; s++) {
          const key = `${e.id}:${s}`;
          const log = byKey.get(key);
          const kg =
            log !== undefined
              ? Number(log.weightKg)
              : lastKg !== undefined
                ? lastKg
                : NaN;
          c[key] = {
            w: Number.isFinite(kg) ? toDisplay(kg, unit) : "",
            r: log !== undefined ? String(log.reps) : "",
          };
        }
      }
      return c;
    },
  );

  const setCell = (
    exId: number,
    setNo: number,
    patch: { w?: string; r?: string },
  ) => {
    const key = `${exId}:${setNo}`;
    setCells((prev) => {
      const cur = prev[key] ?? { w: "", r: "" };
      return { ...prev, [key]: { ...cur, ...patch } };
    });
  };

  const stepCell = (
    exId: number,
    setNo: number,
    field: "w" | "r",
    delta: number,
  ) => {
    const key = `${exId}:${setNo}`;
    setCells((prev) => {
      const cur = prev[key] ?? { w: "", r: "" };
      const current = Number((cur[field] ?? "").replace(",", ".")) || 0;
      const next = Math.max(0, Math.round((current + delta) * 10) / 10);
      return { ...prev, [key]: { ...cur, [field]: String(next) } };
    });
  };

  const changeRows = (exId: number, delta: number) => {
    setRowCounts((prev) => {
      const next = Math.min(10, Math.max(1, (prev[exId] ?? 1) + delta));
      return { ...prev, [exId]: next };
    });
  };

  function fieldRef(key: string) {
    return (el: HTMLInputElement | null) => {
      if (el) fieldRefs.current.set(key, el);
      else fieldRefs.current.delete(key);
    };
  }

  // Tocar el estado (○/✓) completa la serie y la envía a la BD al momento:
  // rellena peso/reps por defecto, guarda todo lo rellenado y lo confirma
  // con un mensaje ("Serie enviada"). Si falta un valor sin defecto,
  // lleva el cursor a ese campo en vez de guardar.
  function quickComplete(exId: number, setNo: number) {
    const key = `${exId}:${setNo}`;
    const cur = cells[key] ?? { w: "", r: "" };
    setMsg(null);
    setBusyKey(key);
    start(async () => {
      try {
        const ex = exercises.find((x) => x.id === exId);
        const lastKg = lastByExercise[exId];
        const w =
          cur.w.trim() !== ""
            ? cur.w
            : lastKg !== undefined
              ? toDisplay(lastKg, unit)
              : "";
        const r = cur.r.trim() !== "" ? cur.r : ex ? defaultReps(ex.reps) : "";
        let merged = cells;
        if (w !== cur.w || r !== cur.r) {
          merged = { ...cells, [key]: { w, r } };
          setCells(merged);
        }
        if (!w.trim() || !r.trim()) {
          const target = !w.trim() ? `w:${key}` : `r:${key}`;
          requestAnimationFrame(() => {
            fieldRefs.current.get(target)?.focus();
          });
          setMsg("Completa peso y reps para enviar la serie.");
          return;
        }
        const sets = collectSetsFrom(merged);
        const id = await ensureSession();
        const res = await saveSetLogs(id, unit, sets, {
          completed,
          notes,
        });
        setMsg(`Serie enviada ✓ · ${res.count} guardadas.`);
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "No se pudo guardar");
      } finally {
        setBusyKey(null);
      }
    });
  }

  const filledSets = useMemo(() => {
    let n = 0;
    for (const key of Object.keys(cells)) {
      const c = cells[key];
      if (c.w.trim() !== "" && c.r.trim() !== "") n++;
    }
    return n;
  }, [cells]);

  const totalSets = useMemo(
    () => Object.values(rowCounts).reduce((a, b) => a + b, 0),
    [rowCounts],
  );

  async function ensureSession(): Promise<number> {
    if (sessionId) return sessionId;
    const { id } = await startSession(routineId, routineDate);
    setSessionId(id);
    return id;
  }

  function collectSetsFrom(
    c: Record<string, { w: string; r: string }>,
  ): SetInput[] {
    const out: SetInput[] = [];
    for (const e of exercises) {
      const rows = rowCounts[e.id] ?? e.sets;
      for (let s = 1; s <= rows; s++) {
        const cell = c[`${e.id}:${s}`];
        if (!cell) continue;
        const w = Number(cell.w.replace(",", "."));
        const r = Number.parseInt(cell.r, 10);
        if (cell.w.trim() === "" && cell.r.trim() === "") continue;
        if (!Number.isFinite(w) || !Number.isInteger(r)) {
          throw new Error(`Revisa ${e.name} serie ${s}: peso y reps numéricos`);
        }
        out.push({ exerciseId: e.id, setNo: s, weight: w, reps: r });
      }
    }
    return out;
  }

  function collectSets(): SetInput[] {
    return collectSetsFrom(cells);
  }

  function onSave(markCompleted?: boolean) {
    setMsg(null);
    start(async () => {
      try {
        const sets = collectSets();
        const id = await ensureSession();
        const nextCompleted = markCompleted ?? completed;
        const res = await saveSetLogs(id, unit, sets, {
          completed: nextCompleted,
          notes,
        });
        setCompleted(nextCompleted);
        setMsg(
          res.count === 0 && nextCompleted
            ? "Sesión marcada como completada."
            : `Guardado · ${res.count} series.`,
        );
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  const wStep = unit === "kg" ? 2.5 : 5;

  return (
    <section id="registro" className="scroll-mt-24">
      {/* Live header bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slowest/90 px-4 py-3 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pcont text-onpcont shadow-[0_0_16px_-2px_rgba(132,204,22,0.4)]">
            <Icon name="timer" className="text-[24px]" />
          </span>
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              <span className="inline-block h-2 w-2 animate-ping rounded-full bg-primary" />
              {sessionId ? `Sesión #${sessionId} en vivo` : "Sesión sin empezar"}
            </span>
            <h2 className="text-[22px] font-semibold leading-7 tracking-tight">
              {routineTitle}
            </h2>
            <span className="tabular text-xs text-onvariant">{routineDate}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slow px-4 py-2">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider text-onvariant">
              Series listas
            </span>
            <span className="tabular text-lg font-extrabold leading-none text-primary">
              {filledSets}
              <span className="text-xs font-normal text-onvariant">
                {" "}
                / {totalSets}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {exercises.map((e) => {
          const rows = rowCounts[e.id] ?? e.sets;
          const lastKg = lastByExercise[e.id];
          return (
            <div
              key={e.id}
              className="flex flex-col gap-3 rounded-xl bg-scont p-4 shadow-lg sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <ExerciseThumb name={e.name} />
                  <div className="flex flex-col">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[22px] font-semibold leading-7">
                        {e.name}
                      </span>
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {e.sets} × {e.reps}
                      </span>
                    </span>
                    <span className="text-xs text-onvariant">
                      {e.muscle ? `${e.muscle} · ` : ""}
                      {lastKg !== undefined
                        ? `Anterior ${toDisplay(lastKg, unit)} ${unit}`
                        : "Sin registros previos"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Quitar serie a ${e.name}`}
                    onClick={() => changeRows(e.id, -1)}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-sm hover:bg-shigh"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    aria-label={`Añadir serie a ${e.name}`}
                    onClick={() => changeRows(e.id, 1)}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-sm hover:bg-shigh"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Header row (desktop) */}
              <div className="hidden grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-2 rounded-lg bg-slow/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-onvariant sm:grid">
                <span>Serie</span>
                <span>
                  Carga real ({unit})
                </span>
                <span>Reps</span>
                <span className="text-center">OK</span>
              </div>

              <div className="flex flex-col gap-2">
                {Array.from({ length: rows }, (_, i) => i + 1).map((s) => {
                  const cell = cells[`${e.id}:${s}`] ?? { w: "", r: "" };
                  const done =
                    cell.w.trim() !== "" && cell.r.trim() !== "";
                  const setKey = `${e.id}:${s}`;
                  const busy = busyKey === setKey;
                  return (
                    <div
                      key={s}
                      className={`grid grid-cols-[2.5rem_1fr_1fr_2.5rem] items-center gap-2 rounded-lg px-2 py-1 transition-colors ${
                        done ? "bg-shigh/60" : ""
                      }`}
                    >
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold ${
                          done
                            ? "bg-pcont text-onpcont shadow-[0_0_10px_-2px_rgba(132,204,22,0.5)]"
                            : "bg-shighest text-onsurface"
                        }`}
                      >
                        {s}
                      </span>
                      <div className="flex items-center rounded-lg bg-slowest p-1 shadow-inner focus-within:ring-2 focus-within:ring-pcont">
                        <button
                          type="button"
                          aria-label="Bajar peso"
                          onClick={() => stepCell(e.id, s, "w", -wStep)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-shigh font-bold hover:text-primary"
                        >
                          −
                        </button>
                        <input
                          inputMode="decimal"
                          aria-label={`Peso serie ${s} de ${e.name}`}
                          placeholder="—"
                          value={cell.w}
                          ref={fieldRef(`w:${e.id}:${s}`)}
                          onChange={(ev) =>
                            setCell(e.id, s, { w: ev.target.value })
                          }
                          className="tabular w-full bg-transparent text-center text-sm font-bold focus:outline-none"
                        />
                        <button
                          type="button"
                          aria-label="Subir peso"
                          onClick={() => stepCell(e.id, s, "w", wStep)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-shigh font-bold hover:text-primary"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex items-center rounded-lg bg-slowest p-1 shadow-inner focus-within:ring-2 focus-within:ring-pcont">
                        <button
                          type="button"
                          aria-label="Bajar reps"
                          onClick={() => stepCell(e.id, s, "r", -1)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-shigh font-bold hover:text-primary"
                        >
                          −
                        </button>
                        <input
                          inputMode="numeric"
                          aria-label={`Reps serie ${s} de ${e.name}`}
                          placeholder="—"
                          value={cell.r}
                          ref={fieldRef(`r:${e.id}:${s}`)}
                          onChange={(ev) =>
                            setCell(e.id, s, { r: ev.target.value })
                          }
                          className="tabular w-full bg-transparent text-center text-sm font-bold focus:outline-none"
                        />
                        <button
                          type="button"
                          aria-label="Subir reps"
                          onClick={() => stepCell(e.id, s, "r", 1)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-shigh font-bold hover:text-primary"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => quickComplete(e.id, s)}
                        disabled={pending}
                        aria-label={
                          done
                            ? `Serie ${s} de ${e.name} lista, tocar para enviar`
                            : `Completar y enviar serie ${s} de ${e.name}`
                        }
                        title={
                          done
                            ? "Serie lista · tocar para enviar"
                            : "Tocar para completar y enviar"
                        }
                        className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center justify-self-center rounded-lg transition-all hover:ring-2 hover:ring-pcont disabled:opacity-60 ${
                          done
                            ? "bg-primary text-onprimary shadow-[0_0_12px_-2px_rgba(132,204,22,0.4)]"
                            : "bg-slow text-outlinevar"
                        }`}
                      >
                        <Icon
                          name={
                            busy
                              ? "hourglass_top"
                              : done
                                ? "check"
                                : "radio_button_unchecked"
                          }
                          className="text-[20px]"
                          filled={done && !busy}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl bg-scont p-4 shadow-lg sm:p-5">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-onvariant">
            Notas (opcional)
          </span>
          <input
            value={notes}
            onChange={(ev) => setNotes(ev.target.value)}
            placeholder="Cómo fue, molestias, horario…"
            maxLength={500}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slowest px-3 py-2 text-sm focus:border-pcont focus:outline-none"
          />
        </label>

        {msg && (
          <p
            role="status"
            className="rounded-lg bg-slow p-2.5 text-center text-sm"
          >
            {msg}
          </p>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={() => onSave(false)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-pcont px-5 py-3 text-sm font-extrabold text-onpcont shadow-[0_0_24px_-2px_rgba(132,204,22,0.4)] transition-all hover:scale-[1.01] disabled:opacity-50"
        >
          <Icon name="save" className="text-[20px]" />
          {pending
            ? "Guardando…"
            : sessionId
              ? "Guardar progreso"
              : "Empezar y guardar"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => onSave(!completed)}
            className="flex items-center justify-center gap-2 rounded-xl bg-shigh px-4 py-2.5 text-sm font-semibold transition-all hover:bg-sbright disabled:opacity-50"
          >
            <Icon name={completed ? "replay" : "flag"} className="text-[18px]" />
            {completed ? "Reabrir" : "Completar"}
          </button>
          <span
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
              completed
                ? "bg-tercont/15 font-bold text-tertiary"
                : "bg-slow text-onvariant"
            }`}
          >
            <Icon
              name={completed ? "verified" : "hourglass_top"}
              className="text-[18px]"
            />
            {completed ? "Completada" : "En curso"}
          </span>
        </div>
      </div>
    </section>
  );
}
