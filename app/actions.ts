"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  bodyWeights,
  exercises,
  routines,
  schedule,
  sessions,
  setLogs,
  users,
} from "@/db/schema";
import { lbToKg } from "@/lib/units";
import { dateWeekday } from "@/lib/dates";

function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return todayStr(d);
}

/** Fecha YYYY-MM-DD válida, no futura y de como mucho un año atrás. */
function assertLoggableDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Fecha inválida");
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  const today = todayStr();
  if (date > today) throw new Error("No se puede registrar en el futuro");
  if (date < daysAgoStr(365)) throw new Error("Fecha demasiado antigua");
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

async function getRoutineOrThrow(routineId: number, userId: string) {
  const routine = await db.query.routines.findFirst({
    where: eq(routines.id, routineId),
  });
  if (!routine) throw new Error("Rutina no encontrada");
  if (routine.userId !== null && routine.userId !== userId) {
    throw new Error("Forbidden");
  }
  return routine;
}

function refreshAll() {
  revalidatePath("/", "layout");
}

export async function startSession(routineId: number, date?: string) {
  const userId = await requireUserId();
  const day = date ?? todayStr();
  assertLoggableDate(day);

  const routine = await getRoutineOrThrow(routineId, userId);
  // Las plantillas fijas solo se registran en su día de la semana.
  if (routine.userId === null && routine.weekday !== null) {
    if (dateWeekday(day) !== routine.weekday) {
      throw new Error("Esa plantilla corresponde a otro día de la semana");
    }
  }

  const existing = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.userId, userId),
      eq(sessions.date, day),
      eq(sessions.routineId, routineId),
    ),
  });
  if (existing) return { id: existing.id };

  const inserted = await db
    .insert(sessions)
    .values({ userId, routineId, date: day, completed: false })
    .returning({ id: sessions.id });
  refreshAll();
  return { id: inserted[0].id };
}

export type SetInput = {
  exerciseId: number;
  setNo: number;
  weight: number; // en la unidad visible (kg o lb)
  reps: number;
};

export async function saveSetLogs(
  sessionId: number,
  unit: "kg" | "lb",
  sets: SetInput[],
  opts?: { completed?: boolean; notes?: string },
) {
  const userId = await requireUserId();

  const owned = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.userId, userId)),
  });
  if (!owned) throw new Error("Forbidden");

  const routineExercises = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(eq(exercises.routineId, owned.routineId));
  const validIds = new Set(routineExercises.map((e) => e.id));
  const clean = sets.filter(
    (s) =>
      validIds.has(s.exerciseId) &&
      Number.isFinite(s.weight) &&
      s.weight >= 0 &&
      s.weight <= 1000 &&
      Number.isInteger(s.reps) &&
      s.reps >= 0 &&
      s.reps <= 1000 &&
      Number.isInteger(s.setNo) &&
      s.setNo >= 1 &&
      s.setNo <= 20,
  );
  if (clean.length === 0 && (opts?.completed || opts?.notes !== undefined)) {
    // Permitir marcar completada / notas sin sets.
  } else if (clean.length === 0) {
    throw new Error("Sin series válidas");
  }

  // Estrategia simple y predecible: reemplazar todos los logs de la sesión.
  await db.delete(setLogs).where(eq(setLogs.sessionId, sessionId));
  if (clean.length > 0) {
    await db.insert(setLogs).values(
      clean.map((s) => ({
        sessionId,
        exerciseId: s.exerciseId,
        setNo: s.setNo,
        weightKg: (unit === "kg" ? s.weight : lbToKg(s.weight)).toFixed(2),
        reps: s.reps,
      })),
    );
  }
  await db
    .update(sessions)
    .set({
      ...(opts?.completed !== undefined ? { completed: opts.completed } : {}),
      ...(opts?.notes !== undefined ? { notes: opts.notes } : {}),
    })
    .where(eq(sessions.id, sessionId));

  refreshAll();
  return { ok: true, count: clean.length };
}

export async function toggleSessionCompleted(
  sessionId: number,
  completed: boolean,
) {
  const userId = await requireUserId();
  const owned = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.userId, userId)),
  });
  if (!owned) throw new Error("Forbidden");
  await db
    .update(sessions)
    .set({ completed })
    .where(eq(sessions.id, sessionId));
  refreshAll();
  return { ok: true };
}

export async function updateUnit(unit: "kg" | "lb") {
  const userId = await requireUserId();
  if (unit !== "kg" && unit !== "lb") throw new Error("Unidad inválida");
  await db.update(users).set({ unit }).where(eq(users.id, userId));
  refreshAll();
  return { ok: true };
}

export type CustomExerciseInput = {
  name: string;
  sets: number;
  reps: string;
  muscle?: string;
};

export async function createCustomRoutine(
  title: string,
  focus: string,
  items: CustomExerciseInput[],
) {
  const userId = await requireUserId();
  const cleanTitle = title.trim().slice(0, 80);
  if (!cleanTitle) throw new Error("La rutina necesita un título");
  const cleanFocus = focus.trim().slice(0, 120) || null;
  if (items.length < 1 || items.length > 30) {
    throw new Error("Añade entre 1 y 30 ejercicios");
  }
  const clean = items.map((it, i) => {
    const name = it.name.trim().slice(0, 80);
    if (!name) throw new Error(`Ejercicio ${i + 1} sin nombre`);
    if (!Number.isInteger(it.sets) || it.sets < 1 || it.sets > 20) {
      throw new Error(`Series inválidas en ${name}`);
    }
    const reps = it.reps.trim().slice(0, 20);
    if (!reps) throw new Error(`Reps vacías en ${name}`);
    return {
      name,
      sets: it.sets,
      reps,
      muscle: it.muscle?.trim().slice(0, 40) || null,
      sortOrder: i,
    };
  });

  const inserted = await db
    .insert(routines)
    .values({ userId, weekday: null, title: cleanTitle, focus: cleanFocus })
    .returning({ id: routines.id });
  const routineId = inserted[0].id;
  await db.insert(exercises).values(
    clean.map((e) => ({ ...e, routineId })),
  );
  refreshAll();
  return { id: routineId };
}

export async function deleteCustomRoutine(routineId: number) {
  const userId = await requireUserId();
  const routine = await db.query.routines.findFirst({
    where: eq(routines.id, routineId),
  });
  if (!routine || routine.userId !== userId) throw new Error("Forbidden");
  try {
    await db.delete(exercises).where(eq(exercises.routineId, routineId));
    await db.delete(routines).where(eq(routines.id, routineId));
  } catch {
    throw new Error("Tiene sesiones registradas y no se puede borrar");
  }
  refreshAll();
  return { ok: true };
}

export async function updateProfile(opts: {
  weight: number | null; // en la unidad visible
  unit: "kg" | "lb";
  heightCm: number | null;
}) {
  const userId = await requireUserId();
  let weightKg: string | null = null;
  if (opts.weight !== null) {
    if (!Number.isFinite(opts.weight) || opts.weight < 20 || opts.weight > 500) {
      throw new Error("Peso corporal inválido");
    }
    weightKg = (opts.unit === "kg" ? opts.weight : lbToKg(opts.weight)).toFixed(2);
  }
  let heightCm: string | null = null;
  if (opts.heightCm !== null) {
    if (!Number.isFinite(opts.heightCm) || opts.heightCm < 100 || opts.heightCm > 250) {
      throw new Error("Altura inválida");
    }
    heightCm = opts.heightCm.toFixed(1);
  }
  await db
    .update(users)
    .set({ weightKg, heightCm })
    .where(eq(users.id, userId));
  refreshAll();
  return { ok: true };
}

export async function logBodyWeight(date: string, weight: number, unit: "kg" | "lb") {
  const userId = await requireUserId();
  assertLoggableDate(date);
  if (!Number.isFinite(weight) || weight < 20 || weight > 500) {
    throw new Error("Peso inválido");
  }
  const weightKg = (unit === "kg" ? weight : lbToKg(weight)).toFixed(2);
  await db
    .insert(bodyWeights)
    .values({ userId, date, weightKg })
    .onConflictDoUpdate({
      target: [bodyWeights.userId, bodyWeights.date],
      set: { weightKg },
    });
  // Sincroniza también el peso actual del perfil.
  await db.update(users).set({ weightKg }).where(eq(users.id, userId));
  refreshAll();
  return { ok: true };
}

export async function saveSchedule(
  items: { weekday: number; routineId: number | null }[],
) {
  const userId = await requireUserId();
  if (items.length !== 7) throw new Error("La semana tiene 7 días");
  const wds = items.map((i) => i.weekday);
  if (
    new Set(wds).size !== 7 ||
    wds.some((w) => !Number.isInteger(w) || w < 0 || w > 6)
  ) {
    throw new Error("Semana inválida");
  }
  const ids = [
    ...new Set(
      items.map((i) => i.routineId).filter((x): x is number => x !== null),
    ),
  ];
  if (ids.length > 0) {
    const found = await db
      .select({ id: routines.id, userId: routines.userId })
      .from(routines)
      .where(inArray(routines.id, ids));
    if (found.length !== ids.length) throw new Error("Rutina no encontrada");
    if (found.some((r) => r.userId !== null && r.userId !== userId)) {
      throw new Error("Forbidden");
    }
  }
  for (const it of items) {
    await db
      .insert(schedule)
      .values({ userId, weekday: it.weekday, routineId: it.routineId })
      .onConflictDoUpdate({
        target: [schedule.userId, schedule.weekday],
        set: { routineId: it.routineId },
      });
  }
  refreshAll();
  return { ok: true };
}
