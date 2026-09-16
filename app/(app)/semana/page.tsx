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
  if (bmi < 18.5) return { label: "Bajo peso", cls: "text-[#0EA5E9]" };
  if (bmi < 25) return { label: "Saludable", cls: "text-[#22C55E]" };
  if (bmi < 30) return { label: "Sobrepeso", cls: "text-brand-500" };
  return { label: "Obesidad", cls: "text-red-600" };
}

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function SemanaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
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
    <main className="mt-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 px-2 lg:px-6">
        <div>
          <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary">
            Semana
          </h1>
          <p className="text-sm capitalize leading-5 text-text-tertiary">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {plan.configured && (
            <Link
              href="/rutinas#mi-semana"
              className="tabular flex items-center gap-1.5 rounded-lg border border-card-border bg-card-background px-4 py-2 text-sm font-medium text-text-primary shadow-xs transition-colors hover:bg-background-gray-secondary"
            >
              <Icon name="edit_calendar" className="text-[18px] text-brand-500" />
              {trainDays}/7 entreno
            </Link>
          )}
          <span className="tabular flex items-center gap-1.5 rounded-lg border border-card-border bg-card-background px-4 py-2 text-sm font-medium text-text-primary shadow-xs">
            <Icon name="verified" className="text-[18px] text-[#22C55E]" />
            {doneCount}/7 hechas
          </span>
        </div>
      </div>

      <div className="space-y-5 px-2 lg:px-5">
      {/* ---- Hoy toca ---- */}
      {todayItem ? (
        todayItem.kind === "day" ? (
          <section className="flex flex-col gap-3 rounded-xl border-[0.5px] border-card-border bg-card-background p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col">
              <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Hoy · {DAY_NAMES[todayWeekday]}
                {todayItem.day.custom ? " · mi rutina" : ""}
              </span>
              <h2 className="mt-1 truncate font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                {todayItem.day.title}
              </h2>
              {todayItem.day.focus && (
                <p className="truncate text-sm text-text-tertiary">
                  {todayItem.day.focus}
                </p>
              )}
              <span className="tabular mt-1 text-xs font-medium">
                {todayItem.day.completed ? (
                  <span className="text-[#22C55E]">
                    ✓ Hecha
                    {todayItem.day.volumeKg > 0 &&
                      ` · ${formatWeight(todayItem.day.volumeKg, unit)}`}
                  </span>
                ) : todayItem.day.hasSession ? (
                  <span className="text-text-tertiary">
                    {formatWeight(todayItem.day.volumeKg, unit)} · en curso
                  </span>
                ) : (
                  <span className="text-text-tertiary">Pendiente</span>
                )}
              </span>
            </div>
            <div className="flex shrink-0 gap-2">
              {todayItem.day.loggable && !todayItem.day.completed && (
                <Link
                  href={todayItem.day.registerHref}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-button-primary-background px-5 text-sm font-medium text-white transition-colors hover:bg-button-primary-hover-background"
                >
                  <Icon name="edit" className="text-[18px]" />
                  Registrar hoy
                </Link>
              )}
              <Link
                href={todayItem.day.detailHref}
                className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-card-border bg-card-background px-4 text-sm font-medium text-text-primary transition-colors hover:bg-background-gray-secondary"
              >
                <Icon name="visibility" className="text-[18px]" />
                Ver ejercicios
              </Link>
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-3 rounded-xl border-[0.5px] border-card-border bg-card-background p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Hoy · {DAY_NAMES[todayWeekday]} · descanso
              </span>
              <h2 className="mt-1 font-semibold leading-6 tracking-[-0.2px] text-text-primary">Recupera y vuelve fuerte</h2>
              <p className="text-sm text-text-tertiary">
                Día libre según tu plan.
              </p>
            </div>
            <Link
              href="/rutinas#mi-semana"
              className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-card-border bg-card-background px-4 text-sm font-medium text-text-primary transition-colors hover:bg-background-gray-secondary"
            >
              <Icon name="edit_calendar" className="text-[18px]" />
              Cambiar plan
            </Link>
          </section>
        )
      ) : null}

      <div className="flex flex-col gap-2.5">
        {items.map((it) =>
          it.kind === "rest" ? (
            <div
              key={it.weekday}
              className="flex items-center gap-3 rounded-xl border border-dashed border-card-border bg-transparent p-3 opacity-80 sm:p-4"
            >
              <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-background-gray-secondary text-text-tertiary">
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {DAY_ABBR[it.weekday]}
                </span>
                <span className="tabular text-lg font-semibold leading-none">
                  {dayNums[it.weekday]}
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                  <Icon name="hotel" className="text-[18px]" />
                  Descanso
                </span>
                <span className="text-xs text-text-tertiary">
                  Día libre según tu plan
                </span>
              </span>
              <Link
                href="/rutinas#mi-semana"
                className="shrink-0 rounded-lg bg-background-gray-secondary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
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
      <section className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
        <h2 className="flex items-center gap-2 font-semibold leading-6 tracking-[-0.2px] text-text-primary">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[rgba(34,197,94,0.10)] text-[#22C55E]">
            <Icon name="favorite" className="text-[18px]" />
          </span>
          Mi estado
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="flex flex-col rounded-xl bg-background-gray-secondary p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              Peso
            </span>
            <span className="tabular mt-1 text-xl font-semibold sm:text-2xl text-text-primary">
              {weightKg !== null
                ? formatWeight(weightKg, unit).split(" ")[0]
                : "—"}
              {weightKg !== null && (
                <span className="ml-1 text-xs font-medium text-brand-500">
                  {unit}
                </span>
              )}
            </span>
          </div>
          <div className="flex flex-col rounded-xl bg-background-gray-secondary p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              IMC
            </span>
            <span className="tabular mt-1 text-xl font-semibold sm:text-2xl text-text-primary">
              {bmi !== null ? bmi.toFixed(1) : "—"}
            </span>
            {bmiCat ? (
              <span className={`text-[11px] font-medium ${bmiCat.cls}`}>
                {bmiCat.label}
              </span>
            ) : (
              <Link
                href="/perfil"
                className="text-[11px] font-medium text-[#0EA5E9] underline underline-offset-2"
              >
                Completa tu perfil
              </Link>
            )}
          </div>
          <div className="flex flex-col rounded-xl bg-background-gray-secondary p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              Volumen sem.
            </span>
            <span className="tabular mt-1 text-xl font-semibold sm:text-2xl text-text-primary">
              {formatWeight(weekVolumeKg, unit).split(" ")[0]}
              <span className="ml-1 text-xs font-medium text-brand-500">{unit}</span>
            </span>
            <span className="tabular text-[11px] text-text-tertiary">
              {doneCount}/{trainDays} sesiones
            </span>
          </div>
        </div>
      </section>

      {!plan.configured && (
        <Link
          href="/rutinas#mi-semana"
          className="flex items-center justify-between gap-3 rounded-xl border-[0.5px] border-card-border bg-card-background p-5"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
              <Icon name="edit_calendar" className="text-[18px]" />
            </span>
            <span className="flex flex-col">
              <span className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                ¿Entrenas menos días o quieres descansos?
              </span>
              <span className="text-sm text-text-tertiary">
                Configura qué días entrenas y cuáles descansas.
              </span>
            </span>
          </span>
          <Icon name="chevron_right" className="text-[20px] text-text-tertiary" />
        </Link>
      )}

      <p className="text-center text-[10px] text-text-tertiary">
        Imágenes de ejercicios: free-exercise-db (GitHub, CC).
      </p>
      </div>
    </main>
  );
}
