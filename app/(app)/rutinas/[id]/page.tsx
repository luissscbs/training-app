import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { exercises, routines, sessions, setLogs, users } from "@/db/schema";
import { SessionTracker } from "@/app/components/SessionTracker";
import { ExerciseThumb } from "@/app/components/ExerciseThumb";
import { Icon } from "@/app/components/Icon";
import { IMAGE_CREDIT } from "@/lib/exerciseMedia";
import { formatWeight } from "@/lib/units";
import { getRequestToday } from "@/lib/requestDate";

export default async function RutinaCustomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id: idParam } = await params;
  const { date: dateParam } = await searchParams;
  const routineId = Number.parseInt(idParam, 10);
  if (!Number.isInteger(routineId)) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const routine = await db.query.routines.findFirst({
    where: eq(routines.id, routineId),
    with: { exercises: { orderBy: asc(exercises.sortOrder) } },
  });
  if (!routine || routine.userId !== userId) notFound();

  const userRows = await db
    .select({ unit: users.unit })
    .from(users)
    .where(eq(users.id, userId));
  const unit: "kg" | "lb" = userRows[0]?.unit === "lb" ? "lb" : "kg";

  // "Hoy" según el navegador del usuario (no la hora UTC del servidor).
  const today = await getRequestToday();
  const date =
    dateParam &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateParam) &&
    dateParam <= today
      ? dateParam
      : today;

  const found = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.userId, userId),
      eq(sessions.date, date),
      eq(sessions.routineId, routine.id),
    ),
  });
  const sess = found
    ? { id: found.id, completed: found.completed, notes: found.notes }
    : null;
  const logs = found
    ? await db.query.setLogs.findMany({
        where: eq(setLogs.sessionId, found.id),
        orderBy: asc(setLogs.id),
      })
    : [];

  const recentSessions = await db.query.sessions.findMany({
    where: eq(sessions.userId, userId),
    orderBy: desc(sessions.id),
    limit: 20,
  });
  const lastByExercise: Record<number, number> = {};
  if (recentSessions.length > 0) {
    const recentLogs = await db.query.setLogs.findMany({
      where: inArray(
        setLogs.sessionId,
        recentSessions.map((s) => s.id),
      ),
      orderBy: desc(setLogs.id),
      limit: 300,
    });
    for (const l of recentLogs) {
      if (lastByExercise[l.exerciseId] === undefined) {
        lastByExercise[l.exerciseId] = Number(l.weightKg);
      }
    }
  }

  return (
    <main className="mt-6 space-y-5">
      <div className="px-2 lg:px-6">
        <Link
          href="/rutinas"
          className="flex w-fit items-center gap-1 text-sm font-medium text-text-tertiary transition-colors hover:text-text-primary"
        >
          <Icon name="chevron_left" className="text-[18px]" />
          Mis rutinas
        </Link>
        <h1 className="mb-1 mt-2 text-[28px] font-medium leading-8 text-text-primary">
          {routine.title}
        </h1>
        {routine.focus && (
          <p className="text-sm leading-5 text-text-tertiary">{routine.focus}</p>
        )}
      </div>

      <div className="space-y-5 px-2 lg:px-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border-[0.5px] border-card-border bg-card-background p-4">
        <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          <Icon name="calendar_month" className="text-[20px] text-brand-500" />
          Sesión del
        </span>
        <form method="get" action={`/rutinas/${routine.id}`} className="flex items-center gap-1.5">
          <input
            type="date"
            name="date"
            defaultValue={date}
            max={today}
            className="rounded-lg border border-card-border bg-input-background px-2 py-1.5 text-xs text-text-primary [color-scheme:light_dark] focus:border-input-primary-focus-border focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-background-gray-secondary px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-background-gray-tertiary"
          >
            Ir
          </button>
        </form>
        <span className="tabular text-xs text-text-tertiary">
          {date === today ? "Hoy" : date} · puedes registrar días pasados
        </span>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <SessionTracker
            key={`${routine.id}-${date}-${unit}`}
            routineId={routine.id}
            routineTitle={routine.title}
            routineDate={date}
            exercises={routine.exercises.map((e) => ({
              id: e.id,
              name: e.name,
              sets: e.sets,
              reps: e.reps,
              muscle: e.muscle,
            }))}
            unit={unit}
            sessionId={sess?.id ?? null}
            initialLogs={logs}
            initialCompleted={sess?.completed ?? false}
            initialNotes={sess?.notes ?? ""}
            lastByExercise={lastByExercise}
          />
        </div>
        <div className="lg:col-span-4">
          <section className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
            <h2 className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">Ejercicios</h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {routine.exercises.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <ExerciseThumb name={e.name} className="h-14 w-14" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-text-primary">{e.name}</span>
                    <span className="tabular text-xs text-text-tertiary">
                      {e.sets} × {e.reps}
                      {e.muscle ? ` · ${e.muscle}` : ""}
                      {lastByExercise[e.id] !== undefined &&
                        ` · últ. ${formatWeight(lastByExercise[e.id], unit)}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[10px] text-text-tertiary">{IMAGE_CREDIT}</p>
          </section>
        </div>
      </div>
      </div>
    </main>
  );
}
