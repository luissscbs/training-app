import Link from "next/link";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { exercises, routines, sessions, setLogs, users } from "@/db/schema";
import { SessionTracker } from "@/app/components/SessionTracker";
import { ExerciseThumb } from "@/app/components/ExerciseThumb";
import { Icon } from "@/app/components/Icon";
import { IMAGE_CREDIT } from "@/lib/exerciseMedia";
import { formatWeight } from "@/lib/units";
import { parseDateStr } from "@/lib/dates";
import { getRequestToday } from "@/lib/requestDate";

const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

export default async function RutinaPage({
  params,
  searchParams,
}: {
  params: Promise<{ weekday: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { weekday: weekdayParam } = await params;
  const { date: dateParam } = await searchParams;
  const weekday = Number.parseInt(weekdayParam, 10);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const userId = session.user.id;
  const userRows = await db
    .select({ unit: users.unit })
    .from(users)
    .where(eq(users.id, userId));
  const unit: "kg" | "lb" = userRows[0]?.unit === "lb" ? "lb" : "kg";

  const routine = await db.query.routines.findFirst({
    where: and(eq(routines.weekday, weekday), isNull(routines.userId)),
    with: { exercises: { orderBy: asc(exercises.sortOrder) } },
  });
  if (!routine) notFound();

  // Fecha a registrar: la pedida (?date=) si es válida y cae en este día,
  // si no la ocurrencia más reciente (hoy o días pasados, nunca futuro).
  // "Hoy" según el navegador del usuario (no la hora UTC del servidor).
  const today = await getRequestToday();
  const now = parseDateStr(today);
  const todayWeekday = (now.getDay() + 6) % 7;
  const recent = new Date(now);
  recent.setDate(now.getDate() - ((todayWeekday - weekday + 7) % 7));
  const defaultDate = toStr(recent);
  let date = defaultDate;
  if (
    dateParam &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateParam) &&
    dateParam <= today &&
    weekdayOf(dateParam) === weekday
  ) {
    date = dateParam;
  }
  const isToday = date === today;

  // Últimas 4 ocurrencias para el selector rápido.
  const occurrences = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(recent);
    d.setDate(recent.getDate() - i * 7);
    return toStr(d);
  });

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

  const history = await db.query.sessions.findMany({
    where: and(eq(sessions.userId, userId), eq(sessions.routineId, routine.id)),
    orderBy: desc(sessions.date),
    limit: 10,
    with: { setLogs: true },
  });

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 pb-8">
      <div className="pointer-events-none absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10">
        <Link
          href="/semana"
          className="flex w-fit items-center gap-1 text-sm text-onvariant hover:text-primary"
        >
          <Icon name="chevron_left" className="text-[18px]" />
          Semana
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {DAYS[weekday]} — {routine.title}
        </h1>
        {routine.focus && (
          <p className="mt-1 text-sm text-onvariant">{routine.focus}</p>
        )}
      </div>

      {/* Selector de fecha: permite registrar días pasados */}
      <div className="relative z-10 flex flex-wrap items-center gap-2 rounded-xl bg-slow p-4 shadow-md">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon name="calendar_month" className="text-[20px] text-primary" />
          Sesión del
        </span>
        <div className="flex flex-wrap gap-1.5">
          {occurrences.map((d) => (
            <Link
              key={d}
              href={`/rutina/${weekday}?date=${d}#registro`}
              className={`tabular rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                d === date
                  ? "bg-pcont text-onpcont shadow-[0_0_12px_-2px_rgba(132,204,22,0.4)]"
                  : "bg-shigh text-onvariant hover:text-onsurface"
              }`}
            >
              {d === today ? "Hoy" : d.slice(5)}
            </Link>
          ))}
        </div>
        <form method="get" action={`/rutina/${weekday}`} className="flex items-center gap-1.5">
          <input
            type="date"
            name="date"
            defaultValue={date}
            max={today}
            className="rounded-lg border border-white/10 bg-slowest px-2 py-1.5 text-xs text-onsurface [color-scheme:dark]"
          />
          <button
            type="submit"
            className="rounded-lg bg-shigh px-3 py-1.5 text-xs font-bold hover:bg-sbright"
          >
            Ir
          </button>
        </form>
        {!isToday && (
          <span className="text-xs text-onvariant">
            Registrando un día pasado — nada se bloquea.
          </span>
        )}
      </div>

      <div className="relative z-10 grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
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

        <div className="flex flex-col gap-5 lg:col-span-4">
          <section className="rounded-xl bg-scont p-5 shadow-lg">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Icon name="lock" className="text-[18px] text-onvariant" />
              Plantilla fija
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {routine.exercises.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <ExerciseThumb name={e.name} className="h-14 w-14" />
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold leading-snug">
                      {e.name}
                    </span>
                    <span className="tabular text-xs text-onvariant">
                      {e.sets} × {e.reps}
                      {e.muscle ? ` · ${e.muscle}` : ""}
                      {lastByExercise[e.id] !== undefined &&
                        ` · últ. ${formatWeight(lastByExercise[e.id], unit)}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[10px] text-onvariant">{IMAGE_CREDIT}</p>
          </section>

          <section className="rounded-xl bg-slow p-5 shadow-md">
            <h2 className="text-lg font-semibold">Últimas sesiones</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-onvariant">
                Sin registros para este día todavía.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {history.map((s) => {
                  const vol = s.setLogs.reduce(
                    (a, l) => a + Number(l.weightKg) * l.reps,
                    0,
                  );
                  const top = s.setLogs.reduce<number>(
                    (m, l) => Math.max(m, Number(l.weightKg)),
                    0,
                  );
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 p-3 text-sm"
                    >
                      <div>
                        <p className="tabular font-semibold">{s.date}</p>
                        <p className="tabular text-xs text-onvariant">
                          {s.setLogs.length} series · {formatWeight(vol, unit)}{" "}
                          volumen
                          {top > 0 && ` · top ${formatWeight(top, unit)}`}
                        </p>
                      </div>
                      <span
                        className={
                          s.completed
                            ? "rounded-full bg-tertiary/15 px-3 py-1 text-xs font-bold text-tertiary"
                            : "rounded-full bg-shigh px-3 py-1 text-xs text-onvariant"
                        }
                      >
                        {s.completed ? "✓ hecha" : "abierta"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
