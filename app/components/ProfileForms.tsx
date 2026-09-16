"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logBodyWeight, updateProfile } from "@/app/actions";
import { Icon } from "@/app/components/Icon";

export function ProfileForm({
  unit,
  initialWeight,
  initialHeightCm,
}: {
  unit: "kg" | "lb";
  initialWeight: string;
  initialHeightCm: string;
}) {
  const [weight, setWeight] = useState(initialWeight);
  const [height, setHeight] = useState(initialHeightCm);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSave() {
    setMsg(null);
    start(async () => {
      try {
        const w = weight.trim() === "" ? null : Number(weight.replace(",", "."));
        const h = height.trim() === "" ? null : Number(height.replace(",", "."));
        if (w !== null && (!Number.isFinite(w) || w <= 0)) {
          throw new Error("Peso inválido");
        }
        if (h !== null && (!Number.isFinite(h) || h <= 0)) {
          throw new Error("Altura inválida");
        }
        await updateProfile({ weight: w, unit, heightCm: h });
        // Refresca los Server Components (tarjetas IMC / Peso actual)
        // para que muestren los valores recién guardados sin recarga manual.
        router.refresh();
        setMsg("Perfil guardado.");
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Peso corporal ({unit})
          </span>
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            inputMode="decimal"
            placeholder="p. ej. 78"
            className="tabular mt-1 w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary placeholder:text-input-placeholder-text focus:border-input-primary-focus-border focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Altura (cm)
          </span>
          <input
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            inputMode="decimal"
            placeholder="p. ej. 178"
            className="tabular mt-1 w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary placeholder:text-input-placeholder-text focus:border-input-primary-focus-border focus:outline-none"
          />
        </label>
      </div>
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
        {pending ? "Guardando…" : "Guardar perfil"}
      </button>
    </div>
  );
}

export function WeightLogForm({ unit, today }: { unit: "kg" | "lb"; today: string }) {
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onLog() {
    setMsg(null);
    start(async () => {
      try {
        const w = Number(weight.replace(",", "."));
        if (!Number.isFinite(w) || w <= 0) throw new Error("Peso inválido");
        await logBodyWeight(date, w, unit);
        setWeight("");
        router.refresh();
        setMsg(`Registrado ${w} ${unit} el ${date}.`);
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "No se pudo registrar");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Fecha del pesaje"
          className="rounded-lg border border-card-border bg-input-background px-2 py-2 text-xs text-text-primary [color-scheme:light_dark] focus:border-input-primary-focus-border focus:outline-none"
        />
        <input
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          inputMode="decimal"
          placeholder={`Peso (${unit})`}
          aria-label={`Peso en ${unit}`}
          className="tabular w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary placeholder:text-input-placeholder-text focus:border-input-primary-focus-border focus:outline-none"
        />
        <button
          type="button"
          disabled={pending || !weight}
          onClick={onLog}
          className="shrink-0 rounded-lg bg-background-gray-secondary px-4 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-background-gray-tertiary disabled:opacity-50"
        >
          {pending ? "…" : "Añadir"}
        </button>
      </div>
      {msg && (
        <p role="status" className="rounded-lg bg-background-gray-secondary p-2 text-center text-xs text-text-primary">
          {msg}
        </p>
      )}
    </div>
  );
}
