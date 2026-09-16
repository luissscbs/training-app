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
  if (!session?.user?.id) redirect("/login");

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
    <main className="mt-6 space-y-5">
      <div className="px-2 lg:px-6">
        <Link
          href="/semana"
          className="flex w-fit items-center gap-1 text-sm font-medium text-text-tertiary transition-colors hover:text-text-primary"
        >
          <Icon name="chevron_left" className="text-[18px]" />
          Semana
        </Link>
        <h1 className="mb-1 mt-2 text-[28px] font-medium leading-8 text-text-primary">
          {DAYS[weekday]} — {routine.title}
        </h1>
        {routine.focus && (
          <p className="text-sm leading-5 text-text-tertiary">{routine.focus}</p>
        )}
      </div>

      <div className="space-y-5 px-2 lg:px-5">
      {/* Selector de fecha: permite registrar días pasados */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border-[0.5px] border-card-border bg-card-background p-4">
        <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          <Icon name="calendar_month" className="text-[20px] text-brand-500" />
          Sesión del
        </span>
        <div className="flex flex-wrap gap-1.5">
          {occurrences.map((d) => (
            <Link
              key={d}
              href={`/rutina/${weekday}?date=${d}#registro`}
              className={`tabular rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                d === date
                  ? "bg-button-primary-background text-white"
                  : "bg-background-gray-secondary text-text-secondary hover:text-text-primary"
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
            className="rounded-lg border border-card-border bg-input-background px-2 py-1.5 text-xs text-text-primary [color-scheme:light_dark] focus:border-input-primary-focus-border focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-background-gray-secondary px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-background-gray-tertiary"
          >
            Ir
          </button>
        </form>
        {!isToday && (
          <span className="text-xs text-text-tertiary">
            Registrando un día pasado — nada se bloquea.
          </span>
        )}
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

        <div className="flex flex-col gap-5 lg:col-span-4">
          <section className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
            <h2 className="flex items-center gap-2 font-semibold leading-6 tracking-[-0.2px] text-text-primary">
              <Icon name="lock" className="text-[18px] text-text-tertiary" />
              Plantilla fija
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {routine.exercises.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <ExerciseThumb name={e.name} className="h-14 w-14" />
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm font-medium leading-snug text-text-primary">
                      {e.name}
                    </span>
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

          <section className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
            <h2 className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">Últimas sesiones</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-text-tertiary">
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
                      className="flex items-center justify-between rounded-xl border border-card-border p-3 text-sm"
                    >
                      <div>
                        <p className="tabular font-medium text-text-primary">{s.date}</p>
                        <p className="tabular text-xs text-text-tertiary">
                          {s.setLogs.length} series · {formatWeight(vol, unit)}{" "}
                          volumen
                          {top > 0 && ` · top ${formatWeight(top, unit)}`}
                        </p>
                      </div>
                      <span
                        className={
                          s.completed
                            ? "rounded-full bg-[rgba(34,197,94,0.10)] px-3 py-1 text-xs font-medium text-[#22C55E]"
                            : "rounded-full bg-background-gray-secondary px-3 py-1 text-xs text-text-tertiary"
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
      </div>
    </main>
  );
}
