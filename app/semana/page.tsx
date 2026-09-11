import Link from "next/link";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { sessions, setLogs, users } from "@/db/schema";
import { Icon } from "@/app/components/Icon";
import { WeekDayCard, type DayCardData } from "@/app/components/WeekDayCard";
import { getWeekPlan } from "@/lib/schedule";

const DAY_ABBR = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function SemanaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;

  const userRows = await db
    .select({ unit: users.unit })
    .from(users)
    .where(eq(users.id, userId));
  const unit: "kg" | "lb" = userRows[0]?.unit === "lb" ? "lb" : "kg";

  const now = new Date();
  const todayWeekday = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayWeekday);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toStr(d);
  });
  const dayNums = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.getDate();
  });

  const plan = await getWeekPlan(userId);

  const weekSessions = await db.query.sessions.findMany({
    where: and(
      eq(sessions.userId, userId),
      gte(sessions.date, weekDates[0]),
      lte(sessions.date, weekDates[6]),
    ),
    with: { setLogs: true },
  });
  const byDate = new Map(weekSessions.map((s) => [s.date, s]));

  const recent = await db.query.sessions.findMany({
    where: eq(sessions.userId, userId),
    orderBy: desc(sessions.date),
    limit: 20,
  });
  const lastByExercise: Record<number, number> = {};
  if (recent.length > 0) {
    const logs = await db.query.setLogs.findMany({
      where: inArray(
        setLogs.sessionId,
        recent.map((s) => s.id),
      ),
      orderBy: desc(setLogs.id),
      limit: 300,
    });
    for (const l of logs) {
      if (lastByExercise[l.exerciseId] === undefined) {
        lastByExercise[l.exerciseId] = Number(l.weightKg);
      }
    }
  }

  type Item =
    | { kind: "day"; day: DayCardData }
    | { kind: "rest"; weekday: number };

  const items: Item[] = plan.days.map((p) => {
    if (!p.routine) return { kind: "rest", weekday: p.weekday } as const;
    const r = p.routine;
    const custom = r.userId !== null;
    const sess = byDate.get(weekDates[p.weekday]);
    const volumeKg = sess
      ? sess.setLogs.reduce((a, l) => a + Number(l.weightKg) * l.reps, 0)
      : 0;
    const topKg = sess
      ? sess.setLogs.reduce((m, l) => Math.max(m, Number(l.weightKg)), 0)
      : 0;
    return {
      kind: "day",
      day: {
        weekday: p.weekday,
        dayAbbr: DAY_ABBR[p.weekday],
        dayNum: dayNums[p.weekday],
        title: r.title,
        focus: r.focus,
        custom,
        detailHref: custom ? `/rutinas/${r.id}` : `/rutina/${p.weekday}`,
        registerHref: custom
          ? `/rutinas/${r.id}#registro`
          : `/rutina/${p.weekday}#registro`,
        isToday: p.weekday === todayWeekday,
        completed: sess?.completed ?? false,
        loggable: p.weekday <= todayWeekday,
        hasSession: !!sess && sess.setLogs.length > 0,
        volumeKg,
        setsCount: sess?.setLogs.length ?? 0,
        topKg,
        unit,
        exercises: r.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          muscle: e.muscle,
          lastKg: lastByExercise[e.id] ?? null,
        })),
      },
    } as const;
  });

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const rangeLabel = `${monday.getDate()} – ${sunday.getDate()} ${sunday.toLocaleDateString("es-ES", { month: "long" })}`;
  const doneCount = weekSessions.filter((s) => s.completed).length;
  const trainDays = plan.configured
    ? plan.days.filter((d) => d.routine !== null).length
    : 7;

  return (
    <main className="relative mx-auto flex w-full max-w-3xl flex-col gap-5 pb-8">
      <div className="pointer-events-none absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 flex flex-wrap items-end justify-between gap-3">
        <div className="flex max-w-2xl flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Semana
          </h1>
          <p className="text-sm capitalize text-onvariant">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {plan.configured && (
            <Link
              href="/rutinas#mi-semana"
              className="tabular flex items-center gap-1.5 rounded-xl bg-slow px-4 py-2 text-sm font-bold hover:bg-scont"
            >
              <Icon name="edit_calendar" className="text-[18px] text-primary" />
              {trainDays}/7 entreno
            </Link>
          )}
          <span className="tabular flex items-center gap-1.5 rounded-xl bg-slow px-4 py-2 text-sm font-bold">
            <Icon name="verified" className="text-[18px] text-tertiary" />
            {doneCount}/7 hechas
          </span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-2.5">
        {items.map((it) =>
          it.kind === "rest" ? (
            <div
              key={it.weekday}
              className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 bg-transparent p-3 opacity-80 sm:p-4"
            >
              <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-slow text-onvariant">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {DAY_ABBR[it.weekday]}
                </span>
                <span className="tabular text-lg font-extrabold leading-none">
                  {dayNums[it.weekday]}
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-sm font-bold text-onvariant">
                  <Icon name="hotel" className="text-[18px]" />
                  Descanso
                </span>
                <span className="text-xs text-onvariant">
                  Día libre según tu plan
                </span>
              </span>
              <Link
                href="/rutinas#mi-semana"
                className="shrink-0 rounded-lg bg-shigh px-3 py-1.5 text-xs font-bold text-onvariant hover:text-onsurface"
              >
                Cambiar
              </Link>
            </div>
          ) : (
            <WeekDayCard key={it.day.weekday} day={it.day} />
          ),
        )}
      </div>

      {!plan.configured && (
        <Link
          href="/rutinas#mi-semana"
          className="relative z-10 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4"
        >
          <span className="flex items-center gap-3">
            <Icon name="edit_calendar" className="text-[24px] text-primary" />
            <span className="flex flex-col">
              <span className="text-sm font-bold">
                ¿Entrenas menos días o quieres descansos?
              </span>
              <span className="text-xs text-onvariant">
                Configura qué días entrenas y cuáles descansas.
              </span>
            </span>
          </span>
          <Icon name="chevron_right" className="text-[20px] text-primary" />
        </Link>
      )}

      <p className="relative z-10 text-center text-[10px] text-onvariant">
        Imágenes de ejercicios: free-exercise-db (GitHub, CC).
      </p>
    </main>
  );
}
