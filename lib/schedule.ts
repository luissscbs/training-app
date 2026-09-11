import { asc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { exercises, routines, schedule } from "@/db/schema";

export type PlanExercise = {
  id: number;
  name: string;
  sets: number;
  reps: string;
  muscle: string | null;
};

export type PlanRoutine = {
  id: number;
  title: string;
  focus: string | null;
  weekday: number | null;
  userId: string | null;
  exercises: PlanExercise[];
};

export type PlanDay = {
  weekday: number;
  routine: PlanRoutine | null; // null = descanso
  source: "schedule" | "template" | "rest";
};

const withExercises = {
  exercises: { orderBy: asc(exercises.sortOrder) },
} as const;

/**
 * Plan semanal efectivo del atleta. Si nunca configuró (sin filas),
 * devuelve las plantillas por defecto.
 */
export async function getWeekPlan(
  userId: string,
): Promise<{ days: PlanDay[]; configured: boolean }> {
  const rows = await db.query.schedule.findMany({
    where: eq(schedule.userId, userId),
  });

  if (rows.length === 0) {
    const templates = await db.query.routines.findMany({
      where: isNull(routines.userId),
      orderBy: asc(routines.weekday),
      with: withExercises,
    });
    const byWd = new Map(
      templates
        .filter((t): t is typeof t & { weekday: number } => t.weekday !== null)
        .map((t) => [t.weekday, t]),
    );
    return {
      configured: false,
      days: Array.from({ length: 7 }, (_, w) => ({
        weekday: w,
        routine: byWd.get(w) ?? null,
        source: "template" as const,
      })),
    };
  }

  const all = await db.query.routines.findMany({
    where: or(isNull(routines.userId), eq(routines.userId, userId)),
    with: withExercises,
  });
  const byId = new Map(all.map((r) => [r.id, r]));
  const templatesByWd = new Map(
    all
      .filter(
        (r): r is typeof r & { weekday: number } =>
          r.userId === null && r.weekday !== null,
      )
      .map((r) => [r.weekday, r]),
  );
  const rowMap = new Map(rows.map((r) => [r.weekday, r.routineId]));

  return {
    configured: true,
    days: Array.from({ length: 7 }, (_, w) => {
      if (!rowMap.has(w)) {
        // Fila ausente (no debería pasar): plantilla por defecto.
        return {
          weekday: w,
          routine: templatesByWd.get(w) ?? null,
          source: "template" as const,
        };
      }
      const routineId = rowMap.get(w);
      const routine =
        routineId === null || routineId === undefined
          ? null
          : (byId.get(routineId) ?? null);
      return {
        weekday: w,
        routine,
        source: routine ? ("schedule" as const) : ("rest" as const),
      };
    }),
  };
}
