import Link from "next/link";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { sessions, setLogs, users } from "@/db/schema";
import { Icon } from "@/app/components/Icon";
import { WeekDayCard, type DayCardData } from "@/app/components/WeekDayCard";
import { getWeekPlan } from "@/lib/schedule";
import { formatWeight } from "@/lib/units";
import { parseDateStr } from "@/lib/dates";
import { getRequestToday } from "@/lib/requestDate";

const DAY_ABBR = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function bmiCategory(bmi: number): { label: string; cls: string } {
  if (bmi < 18.5) return { label: "Bajo peso", cls: "text-secondary" };
  if (bmi < 25) return { label: "Saludable", cls: "text-tertiary" };
  if (bmi < 30) return { label: "Sobrepeso", cls: "text-primary" };
  return { label: "Obesidad", cls: "text-error" };
}

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function SemanaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;

  const userRows = await db
    .select({ unit: users.unit, weightKg: users.weightKg, heightCm: users.heightCm })
    .from(users)
    .where(eq(users.id, userId));
  const unit: "kg" | "lb" = userRows[0]?.unit === "lb" ? "lb" : "kg";
  const weightKg = userRows[0]?.weightKg ? Number(userRows[0].weightKg) : null;
  const heightCm = userRows[0]?.heightCm ? Number(userRows[0].heightCm) : null;
  const bmi =
    weightKg && heightCm ? weightKg / Math.pow(heightCm / 100, 2) : null;
  const bmiCat = bmi !== null ? bmiCategory(bmi) : null;

  // "Hoy" según el navegador del usuario (no la hora UTC del servidor).
  const now = parseDateStr(await getRequestToday());
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
    // Series registradas por ejercicio (programado vs hecho en el desplegable).
    const loggedByExercise: Record<number, { count: number; topKg: number }> =
      {};
    if (sess) {
      for (const l of sess.setLogs) {
        const cur = loggedByExercise[l.exerciseId] ?? { count: 0, topKg: 0 };
        cur.count += 1;
        cur.topKg = Math.max(cur.topKg, Number(l.weightKg));
        loggedByExercise[l.exerciseId] = cur;
      }
    }
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
        loggedByExercise,
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
  const weekVolumeKg = items.reduce(
    (a, it) => a + (it.kind === "day" ? it.day.volumeKg : 0),
    0,
  );
  const todayItem = items.find((it) =>
    it.kind === "day"
      ? it.day.weekday === todayWeekday
      : it.weekday === todayWeekday,
  );

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

      {/* ---- Hoy toca ---- */}
      {todayItem ? (
        todayItem.kind === "day" ? (
          <section className="relative z-10 flex flex-col gap-3 rounded-xl bg-scont p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Hoy · {DAY_NAMES[todayWeekday]}
                {todayItem.day.custom ? " · mi rutina" : ""}
              </span>
              <h2 className="truncate text-xl font-bold">
                {todayItem.day.title}
              </h2>
              {todayItem.day.focus && (
                <p className="truncate text-sm text-onvariant">
                  {todayItem.day.focus}
                </p>
              )}
              <span className="tabular mt-1 text-xs font-bold">
                {todayItem.day.completed ? (
                  <span className="text-tertiary">
                    ✓ Hecha
                    {todayItem.day.volumeKg > 0 &&
                      ` · ${formatWeight(todayItem.day.volumeKg, unit)}`}
                  </span>
                ) : todayItem.day.hasSession ? (
                  <span className="text-onvariant">
                    {formatWeight(todayItem.day.volumeKg, unit)} · en curso
                  </span>
                ) : (
                  <span className="text-onvariant">Pendiente</span>
                )}
              </span>
            </div>
            <div className="flex shrink-0 gap-2">
              {todayItem.day.loggable && !todayItem.day.completed && (
                <Link
                  href={todayItem.day.registerHref}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-pcont px-5 py-2.5 text-sm font-extrabold text-onpcont transition-all hover:scale-[1.01]"
                >
                  <Icon name="edit" className="text-[18px]" />
                  Registrar hoy
                </Link>
              )}
              <Link
                href={todayItem.day.detailHref}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-shigh px-4 py-2.5 text-sm font-bold hover:bg-sbright"
              >
                <Icon name="visibility" className="text-[18px]" />
                Ver ejercicios
              </Link>
            </div>
          </section>
        ) : (
          <section className="relative z-10 flex flex-col gap-3 rounded-xl bg-scont p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                Hoy · {DAY_NAMES[todayWeekday]} · descanso
              </span>
              <h2 className="text-xl font-bold">Recupera y vuelve fuerte</h2>
              <p className="text-sm text-onvariant">
                Día libre según tu plan.
              </p>
            </div>
            <Link
              href="/rutinas#mi-semana"
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-shigh px-4 py-2.5 text-sm font-bold hover:bg-sbright"
            >
              <Icon name="edit_calendar" className="text-[18px]" />
              Cambiar plan
            </Link>
          </section>
        )
      ) : null}

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

      {/* ---- Mi estado: peso, IMC y volumen de la semana ---- */}
      <section className="relative z-10 rounded-xl bg-slow p-4 shadow-md sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Icon name="favorite" className="text-[20px] text-tertiary" />
          Mi estado
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="flex flex-col rounded-xl bg-scont p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-onvariant">
              Peso
            </span>
            <span className="tabular mt-1 text-xl font-extrabold sm:text-2xl">
              {weightKg !== null
                ? formatWeight(weightKg, unit).split(" ")[0]
                : "—"}
              {weightKg !== null && (
                <span className="ml-1 text-xs font-bold text-primary">
                  {unit}
                </span>
              )}
            </span>
          </div>
          <div className="flex flex-col rounded-xl bg-scont p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-onvariant">
              IMC
            </span>
            <span className="tabular mt-1 text-xl font-extrabold sm:text-2xl">
              {bmi !== null ? bmi.toFixed(1) : "—"}
            </span>
            {bmiCat ? (
              <span className={`text-[11px] font-bold ${bmiCat.cls}`}>
                {bmiCat.label}
              </span>
            ) : (
              <Link
                href="/perfil"
                className="text-[11px] font-bold text-secondary underline underline-offset-2"
              >
                Completa tu perfil
              </Link>
            )}
          </div>
          <div className="flex flex-col rounded-xl bg-scont p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-onvariant">
              Volumen sem.
            </span>
            <span className="tabular mt-1 text-xl font-extrabold sm:text-2xl">
              {formatWeight(weekVolumeKg, unit).split(" ")[0]}
              <span className="ml-1 text-xs font-bold text-primary">{unit}</span>
            </span>
            <span className="tabular text-[11px] text-onvariant">
              {doneCount}/{trainDays} sesiones
            </span>
          </div>
        </div>
      </section>

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
