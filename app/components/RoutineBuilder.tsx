"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCustomRoutine } from "@/app/actions";
import { Icon } from "@/app/components/Icon";

export type LibraryExercise = {
  name: string;
  muscle: string | null;
  sets: number;
  reps: string;
};

export const MUSCLE_OPTIONS = [
  "pecho",
  "espalda",
  "bíceps",
  "tríceps",
  "hombro",
  "cuádriceps",
  "isquios",
  "glúteo",
  "gemelos",
  "core",
  "cadena posterior",
  "movilidad",
  "otros",
];

type Item = {
  key: number;
  name: string;
  sets: string;
  reps: string;
  muscle: string;
  custom: boolean;
};

let nextKey = 1;

export function RoutineBuilder({ library }: { library: LibraryExercise[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [focus, setFocus] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [otro, setOtro] = useState({ name: "", sets: "3", reps: "10", muscle: "otros" });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return library.slice(0, 8);
    return library.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, library]);

  const addedNames = useMemo(
    () => new Set(items.map((i) => i.name.toLowerCase())),
    [items],
  );

  function addFromLibrary(e: LibraryExercise) {
    if (addedNames.has(e.name.toLowerCase())) return;
    setItems((prev) => [
      ...prev,
      {
        key: nextKey++,
        name: e.name,
        sets: String(e.sets),
        reps: e.reps,
        muscle: e.muscle ?? "otros",
        custom: false,
      },
    ]);
  }

  function addOtro() {
    const name = otro.name.trim();
    if (!name) {
      setMsg("Escribe el nombre del ejercicio personalizado");
      return;
    }
    if (addedNames.has(name.toLowerCase())) {
      setMsg("Ese ejercicio ya está en la rutina");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        key: nextKey++,
        name,
        sets: otro.sets,
        reps: otro.reps,
        muscle: otro.muscle,
        custom: true,
      },
    ]);
    setOtro({ name: "", sets: "3", reps: "10", muscle: "otros" });
    setMsg(null);
  }

  function patchItem(key: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: number) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function onSave() {
    setMsg(null);
    start(async () => {
      try {
        const { id } = await createCustomRoutine(
          title,
          focus,
          items.map((i) => ({
            name: i.name,
            sets: Number.parseInt(i.sets, 10),
            reps: i.reps,
            muscle: i.muscle,
          })),
        );
        router.push(`/rutinas/${id}`);
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border-[0.5px] border-card-border bg-card-background p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-semibold leading-6 tracking-[-0.2px] text-text-primary">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
          <Icon name="add_circle" className="text-[18px]" />
        </span>
        Nueva rutina personalizada
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Título
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="p. ej. Torso en casa"
            maxLength={80}
            className="mt-1 w-full rounded-lg border border-card-border bg-input-background text-text-primary placeholder:text-input-placeholder-text px-3 py-2 text-sm focus:border-input-primary-focus-border focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Enfoque (opcional)
          </span>
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="p. ej. Hipertrofia tren superior"
            maxLength={120}
            className="mt-1 w-full rounded-lg border border-card-border bg-input-background text-text-primary placeholder:text-input-placeholder-text px-3 py-2 text-sm focus:border-input-primary-focus-border focus:outline-none"
          />
        </label>
      </div>

      {/* Biblioteca */}
      <div>
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Añadir de la lista ({items.length} seleccionados)
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar ejercicio…"
          className="mt-1 w-full rounded-lg border border-card-border bg-input-background text-text-primary placeholder:text-input-placeholder-text px-3 py-2 text-sm focus:border-input-primary-focus-border focus:outline-none"
        />
        <ul className="mt-2 flex max-h-56 flex-col gap-1.5 overflow-y-auto">
          {results.map((e) => {
            const added = addedNames.has(e.name.toLowerCase());
            return (
                <li
                key={e.name}
                className="flex items-center justify-between gap-2 rounded-lg bg-background-gray-secondary px-3 py-2 text-sm"
              >
                <span className="flex flex-col">
                  <span className="font-medium leading-snug text-text-primary">{e.name}</span>
                  <span className="tabular text-xs capitalize text-text-tertiary">
                    {e.sets} × {e.reps}
                    {e.muscle ? ` · ${e.muscle}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => addFromLibrary(e)}
                  className="rounded-lg bg-background-gray-tertiary px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-background-gray-secondary disabled:opacity-40"
                >
                  {added ? "Añadido" : "Añadir"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Otro */}
      <div className="rounded-xl border border-dashed border-card-border p-3">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-tertiary">
          <Icon name="edit" className="text-[16px] text-[#0EA5E9]" />
          Otro: ejercicio no listado
        </span>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_5rem_6rem_8rem_auto]">
          <input
            value={otro.name}
            onChange={(e) => setOtro({ ...otro, name: e.target.value })}
            placeholder="Nombre del ejercicio"
            maxLength={80}
            className="rounded-lg border border-card-border bg-input-background text-text-primary placeholder:text-input-placeholder-text px-3 py-2 text-sm focus:border-input-primary-focus-border focus:outline-none"
          />
          <input
            value={otro.sets}
            onChange={(e) => setOtro({ ...otro, sets: e.target.value })}
            inputMode="numeric"
            placeholder="Series"
            aria-label="Series"
            className="tabular rounded-lg border border-card-border bg-input-background text-text-primary placeholder:text-input-placeholder-text px-3 py-2 text-sm focus:border-input-primary-focus-border focus:outline-none"
          />
          <input
            value={otro.reps}
            onChange={(e) => setOtro({ ...otro, reps: e.target.value })}
            placeholder="Reps"
            aria-label="Reps"
            maxLength={20}
            className="rounded-lg border border-card-border bg-input-background text-text-primary placeholder:text-input-placeholder-text px-3 py-2 text-sm focus:border-input-primary-focus-border focus:outline-none"
          />
          <select
            value={otro.muscle}
            onChange={(e) => setOtro({ ...otro, muscle: e.target.value })}
            aria-label="Músculo"
            className="rounded-lg border border-card-border bg-input-background text-text-primary placeholder:text-input-placeholder-text px-2 py-2 text-sm focus:border-input-primary-focus-border focus:outline-none"
          >
            {MUSCLE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addOtro}
            className="rounded-lg bg-[rgba(14,165,233,0.10)] px-3 py-2 text-xs font-medium text-[#0EA5E9] transition-colors hover:bg-[rgba(14,165,233,0.20)]"
          >
            Añadir
          </button>
        </div>
      </div>

      {/* Seleccionados */}
      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {items.map((i, idx) => (
            <li
              key={i.key}
              className="flex items-center gap-2 rounded-lg bg-background-gray-secondary px-3 py-2 text-sm"
            >
              <span className="tabular w-6 shrink-0 text-xs font-medium text-brand-500">
                {idx + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 truncate font-medium text-text-primary">
                  {i.name}
                  {i.custom && (
                    <span className="rounded bg-[rgba(14,165,233,0.10)] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[#0EA5E9]">
                      Otro
                    </span>
                  )}
                </span>
              </span>
              <input
                value={i.sets}
                onChange={(e) => patchItem(i.key, { sets: e.target.value })}
                inputMode="numeric"
                aria-label="Series"
                className="tabular w-14 rounded border border-card-border bg-input-background px-2 py-1 text-center text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-input-primary-focus-border"
              />
              <span className="text-xs text-text-tertiary">×</span>
              <input
                value={i.reps}
                onChange={(e) => patchItem(i.key, { reps: e.target.value })}
                aria-label="Reps"
                maxLength={20}
                className="w-20 rounded border border-card-border bg-input-background px-2 py-1 text-center text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-input-primary-focus-border"
              />
              <button
                type="button"
                onClick={() => removeItem(i.key)}
                aria-label={`Quitar ${i.name}`}
                className="rounded p-1 text-text-tertiary transition-colors hover:text-red-600"
              >
                <Icon name="delete" className="text-[18px]" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {msg && (
        <p role="status" className="rounded-lg bg-background-gray-secondary p-2.5 text-center text-sm text-text-primary">
          {msg}
        </p>
      )}

      <button
        type="button"
        disabled={pending || items.length === 0 || !title.trim()}
        onClick={onSave}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-button-primary-background px-5 text-sm font-medium text-white transition-colors hover:bg-button-primary-hover-background disabled:opacity-50"
      >
        <Icon name="save" className="text-[20px]" />
        {pending ? "Guardando…" : `Guardar rutina (${items.length})`}
      </button>
    </div>
  );
}
