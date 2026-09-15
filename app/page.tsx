import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { auth, googleConfigured, signIn } from "@/auth";
import { db } from "@/db";
import { sessions, setLogs, users } from "@/db/schema";
import { UnitToggle } from "@/app/components/UnitToggle";
import { Icon } from "@/app/components/Icon";
import { formatWeight } from "@/lib/units";
import { getWeekPlan } from "@/lib/schedule";
import { dateWeekday, shiftDateStr } from "@/lib/dates";
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

async function signInAction() {
  "use server";
  await signIn("google");
}

async function todayParts(): Promise<{ weekday: number; date: string }> {
  // "Hoy" según el navegador del usuario (no la hora UTC del servidor).
  const date = await getRequestToday();
  return { weekday: dateWeekday(date), date };
}

function weekAgoStr(today: string, days: number): string {
  return shiftDateStr(today, -days);
}

const MUSCLE_COLORS = [
  "bg-primary",
  "bg-secondary",
  "bg-tertiary",
  "bg-seccont",
  "bg-onvariant",
];
const MUSCLE_TEXT = [
  "text-primary",
  "text-secondary",
  "text-tertiary",
  "text-seccont",
  "text-onvariant",
];

export default async function Home() {
  const session = await auth();
  const { weekday: todayWeekday, date: todayDate } = await todayParts();

  // ---- Datos de usuario (solo login) ----
  let unit: "kg" | "lb" = "kg";
  let profileIncomplete = false;
  let volume7 = 0;
  let volumePrev7 = 0;
  let done7 = 0;
  let totalSessions = 0;
  let todaySets = 0;
  let todayDone = false;
  let otherToday: { routineId: number; title: string } | null = null;
  let pr: { name: string; kg: number } | null = null;
  let muscleVol: { name: string; kg: number }[] = [];
  let planConfigured = false;
  let todayRoutine: {
    id: number;
    title: string;
    focus: string | null;
    weekday: number | null;
    userId: string | null;
    exercises: { id: number; name: string; sets: number; reps: string; muscle: string | null }[];
  } | null = null;
  let isRestDay = false;

  if (session?.user?.id) {
    const userId = session.user.id;
    const rows = await db
      .select({
        unit: users.unit,
        weightKg: users.weightKg,
        heightCm: users.heightCm,
      })
      .from(users)
      .where(eq(users.id, userId));
    if (rows[0]?.unit === "lb") unit = "lb";
    profileIncomplete = !rows[0]?.weightKg || !rows[0]?.heightCm;

    const plan = await getWeekPlan(userId);
    planConfigured = plan.configured;
    const planned = plan.days[todayWeekday];
    todayRoutine = planned.routine;
    isRestDay = plan.configured && planned.routine === null;

    const todaySessions = await db.query.sessions.findMany({
      where: and(eq(sessions.userId, userId), eq(sessions.date, todayDate)),
      limit: 5,
      with: { routine: true, setLogs: true },
    });
    for (const s of todaySessions) {
      todaySets += s.setLogs.length;
      if (s.completed) todayDone = true;
      if (
        s.routine.userId !== null &&
        s.routineId !== todayRoutine?.id &&
        !otherToday
      ) {
        otherToday = { routineId: s.routineId, title: s.routine.title };
      }
    }

    const recent = await db.query.sessions.findMany({
      where: eq(sessions.userId, userId),
      orderBy: desc(sessions.date),
      limit: 60,
    });
    totalSessions = recent.length;
    const ids = recent.map((s) => s.id);
    const w7 = weekAgoStr(todayDate, 7);
    const w14 = weekAgoStr(todayDate, 14);
    const last7Ids = new Set(
      recent.filter((s) => s.date >= w7).map((s) => s.id),
    );
    const prev7Ids = new Set(
      recent.filter((s) => s.date >= w14 && s.date < w7).map((s) => s.id),
    );
    done7 = recent.filter((s) => s.date >= w7 && s.completed).length;

    if (ids.length > 0) {
      const logs = await db.query.setLogs.findMany({
        where: inArray(setLogs.sessionId, ids),
        orderBy: desc(setLogs.id),
        limit: 2000,
        with: { exercise: true },
      });
      const byMuscle = new Map<string, number>();
      for (const l of logs) {
        const kg = Number(l.weightKg);
        if (!pr || kg > pr.kg) pr = { name: l.exercise.name, kg };
        const vol = kg * l.reps;
        if (last7Ids.has(l.sessionId)) volume7 += vol;
        if (prev7Ids.has(l.sessionId)) volumePrev7 += vol;
        const m = l.exercise.muscle ?? "otros";
        byMuscle.set(m, (byMuscle.get(m) ?? 0) + vol);
      }
      muscleVol = [...byMuscle.entries()]
        .map(([name, kg]) => ({ name, kg }))
        .sort((a, b) => b.kg - a.kg)
        .slice(0, 5);
    }
  }

  const firstName = session?.user?.name?.split(" ")[0] ?? "Atleta";
  const deltaPct =
    volumePrev7 > 0 ? Math.round(((volume7 - volumePrev7) / volumePrev7) * 100) : null;
  const muscleTotal = Math.max(1, ...muscleVol.map((m) => m.kg));
  const templateSets =
    todayRoutine?.exercises.reduce((a, e) => a + e.sets, 0) ?? 0;
  const registerHref = todayRoutine
    ? todayRoutine.userId !== null
      ? `/rutinas/${todayRoutine.id}#registro`
      : `/rutina/${todayRoutine.weekday ?? todayWeekday}#registro`
    : "/semana";

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 pb-8">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute left-10 top-1/3 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />

      {!session?.user ? (
        /* ---- Onboarding ---- */
        <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-4">
          <div className="flex items-center justify-between rounded-full bg-slow/90 px-4 py-1.5 shadow-sm">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-onvariant">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
              Kinetix Engine · En línea
            </span>
            <span className="flex items-center gap-1 text-[10px] text-onvariant">
              <Icon name="lock" className="text-[14px] text-tertiary" />
              Cifrado de alto rendimiento
            </span>
          </div>

          <div className="flex flex-col gap-6 rounded-xl bg-slow p-6 shadow-xl sm:p-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-shigh shadow-md">
                <Icon name="fitness_center" className="text-[28px] text-primary" />
              </span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                High Performance Training Tracker
              </span>
              <h1 className="text-3xl font-bold tracking-tight">
                Bienvenido a Kinetix
              </h1>
              <p className="max-w-lg text-sm text-onvariant">
                Rutinas fijas de lunes a domingo. Tú solo registras pesos (se
                guardan en kg) y marcas tus sesiones.
              </p>
              {!googleConfigured && (
                <p className="mt-2 rounded-lg bg-error/10 p-3 text-sm text-error">
                  Falta configurar Google login: añade GOOGLE_CLIENT_ID y
                  GOOGLE_CLIENT_SECRET en .env.local (ver .env.example).
                </p>
              )}
            </div>

            <form action={signInAction}>
              <button
                type="submit"
                disabled={!googleConfigured}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-sbright px-5 py-3.5 text-sm font-bold tracking-tight shadow-md transition-all hover:scale-[1.01] disabled:opacity-50"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    fill="#EA4335"
                  />
                </svg>
                Iniciar sesión con Google
                <Icon name="arrow_forward" className="text-[18px] text-onvariant" />
              </button>
            </form>

            <div className="grid grid-cols-3 gap-2 rounded-lg bg-scont/60 p-2">
              {[
                { icon: "bolt", label: "Zero latencia", sub: "Entrada táctil veloz" },
                { icon: "monitoring", label: "Analítica", sub: "Volumen y récords" },
                { icon: "cloud_done", label: "Cloud sync", sub: "Postgres Neon" },
              ].map((f) => (
                <div key={f.label} className="flex flex-col items-center p-1 text-center">
                  <Icon
                    name={f.icon}
                    className={`mb-1 text-[20px] ${f.icon === "bolt" ? "text-primary" : f.icon === "monitoring" ? "text-secondary" : "text-tertiary"}`}
                  />
                  <span className="text-[10px] font-bold uppercase">{f.label}</span>
                  <span className="mt-0.5 text-xs text-onvariant">{f.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {profileIncomplete && (
            <Link
              href="/perfil"
              className="relative z-10 flex items-center justify-between gap-3 rounded-xl border border-secondary/30 bg-secondary/10 p-4"
            >
              <span className="flex items-center gap-3">
                <Icon name="person_add" className="text-[24px] text-secondary" />
                <span className="flex flex-col">
                  <span className="text-sm font-bold">
                    Completa tu perfil de atleta
                  </span>
                  <span className="text-xs text-onvariant">
                    Añade tu peso y altura para calcular tu IMC y seguir tu
                    progreso corporal.
                  </span>
                </span>
              </span>
              <Icon name="chevron_right" className="text-[20px] text-secondary" />
            </Link>
          )}
          {otherToday && (
            <Link
              href={`/rutinas/${otherToday.routineId}#registro`}
              className="relative z-10 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4"
            >
              <span className="flex items-center gap-3">
                <Icon name="fitness_center" className="text-[24px] text-primary" />
                <span className="flex flex-col">
                  <span className="text-sm font-bold">
                    Hoy estás entrenando: {otherToday.title}
                  </span>
                  <span className="text-xs text-onvariant">
                    Sesión de hoy en tu rutina propia. Toca para continuar ahí.
                  </span>
                </span>
              </span>
              <Icon name="chevron_right" className="text-[20px] text-primary" />
            </Link>
          )}

          {/* ---- Hero ---- */}
          <section className="relative overflow-hidden rounded-xl bg-slow p-5 shadow-xl sm:p-6">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex w-2/5 items-center justify-end opacity-15">
              <svg
                className="h-full w-full text-primary"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 400 200"
              >
                <path
                  d="M0 160 Q 60 180, 120 110 T 240 70 T 360 40 L 400 20 L 400 200 L 0 200 Z"
                  fill="currentColor"
                  opacity="0.12"
                />
                <path
                  d="M0 160 Q 60 180, 120 110 T 240 70 T 360 40 L 400 20"
                  stroke="currentColor"
                  strokeDasharray="6 6"
                  strokeWidth="2.5"
                />
                <circle cx="240" cy="70" fill="currentColor" r="5" />
                <circle cx="360" cy="40" fill="currentColor" r="5" />
              </svg>
            </div>
            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex max-w-2xl flex-col">
                <span className="mb-2 flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
                  {DAYS[todayWeekday]} · Dashboard
                </span>
                <h1 className="text-3xl font-extrabold leading-none tracking-tight sm:text-4xl">
                  {isRestDay ? (
                    <>
                      Hoy toca <span className="text-secondary">descanso</span>
                      <span className="ml-2">😌</span>
                    </>
                  ) : (
                    <>
                      Hola, <span className="text-primary">{firstName}</span>
                    </>
                  )}
                </h1>
                <p className="mb-4 mt-2 text-onvariant">
                  {isRestDay ? (
                    <>
                      Recuperar también es entrenar.{" "}
                      <Link
                        href="/rutinas#mi-semana"
                        className="text-primary underline underline-offset-4"
                      >
                        Cambiar mi plan
                      </Link>
                    </>
                  ) : (
                    <>
                      Rutina de hoy:{" "}
                      <strong className="font-semibold text-onsurface">
                        {todayRoutine?.title ?? "Descanso"}
                      </strong>
                    </>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-2 rounded-lg bg-scont px-4 py-1.5 shadow-sm">
                    <Icon name="fitness_center" className="text-[20px] text-secondary" />
                    <span className="flex flex-col">
                      <span className="text-[10px] leading-none text-onvariant">
                        Hoy
                      </span>
                      <span className="tabular text-xs font-bold">
                        {todayRoutine?.exercises.length ?? 0} ejercicios · {templateSets} series
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2 rounded-lg bg-scont px-4 py-1.5 shadow-sm">
                    <Icon name="bolt" className="text-[20px] text-tertiary" />
                    <span className="flex flex-col">
                      <span className="text-[10px] leading-none text-onvariant">
                        Volumen 7 días
                      </span>
                      <span className="tabular text-xs font-bold">
                        {formatWeight(volume7, unit)}
                      </span>
                    </span>
                  </span>
                </div>
              </div>
              {isRestDay ? (
                <div className="flex flex-col items-start gap-2 lg:items-end">
                  <Link
                    href="/semana"
                    className="group flex items-center justify-center gap-2 rounded-xl bg-shigh px-6 py-3.5 tracking-tight transition-all hover:scale-[1.02] hover:bg-sbright"
                  >
                    <Icon name="calendar_month" className="text-[26px] text-secondary" />
                    <span className="text-base font-extrabold">Ver mi semana</span>
                  </Link>
                  <span className="text-xs text-onvariant">
                    {planConfigured
                      ? "Día de descanso según tu plan"
                      : "Sin rutina programada"}
                  </span>
                </div>
              ) : (
                todayRoutine && (
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <Link
                      href={registerHref}
                      className="group flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 tracking-tight text-onprimary shadow-[0_0_24px_-2px_rgba(132,204,22,0.45)] transition-all hover:scale-[1.02]"
                    >
                      <Icon
                        name="play_arrow"
                        className="text-[26px] transition-transform group-hover:rotate-45"
                      />
                      <span className="text-base font-extrabold">
                        Registrar hoy
                      </span>
                    </Link>
                    <span className="text-xs text-onvariant">
                      {todayDone
                        ? "Sesión completada. Ver en Semana."
                        : "Te lleva al registro de hoy"}
                    </span>
                  </div>
                )
              )}
            </div>
          </section>

          {/* ---- Métricas ---- */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col justify-between rounded-xl bg-slow p-4 shadow-md">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-onvariant">
                  Volumen semanal
                </span>
                <span className="rounded-lg bg-shigh p-1.5 text-primary">
                  <Icon name="fitness_center" className="text-[18px]" />
                </span>
              </div>
              <div className="tabular my-1 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold leading-10 tracking-tight">
                  {formatWeight(volume7, unit).split(" ")[0]}
                </span>
                <span className="text-sm font-bold text-primary">{unit}</span>
              </div>
              <span
                className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  (deltaPct ?? 0) >= 0
                    ? "bg-primary/15 text-primary"
                    : "bg-error/15 text-error"
                }`}
              >
                <Icon name="trending_up" className="text-[14px]" />
                {deltaPct === null
                  ? "primera semana"
                  : `${deltaPct >= 0 ? "+" : ""}${deltaPct}% vs ant.`}
              </span>
            </div>

            <div className="flex flex-col justify-between rounded-xl bg-slow p-4 shadow-md">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-onvariant">
                  Entrenamientos
                </span>
                <span className="rounded-lg bg-shigh p-1.5 text-secondary">
                  <Icon name="event_available" className="text-[18px]" />
                </span>
              </div>
              <div className="tabular my-1 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold leading-10 tracking-tight">
                  {done7}
                </span>
                <span className="text-[22px] font-semibold text-onvariant">
                  / 7 días
                </span>
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-shighest">
                  <div
                    className="h-full rounded-full bg-secondary"
                    style={{ width: `${Math.min(100, Math.round((done7 / 7) * 100))}%` }}
                  />
                </div>
                <span className="text-xs text-onvariant">
                  {totalSessions} sesiones en total
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-xl bg-slow p-4 shadow-md">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-onvariant">
                  Sesión de hoy
                </span>
                <span className="rounded-lg bg-shigh p-1.5 text-tertiary">
                  <Icon name="pace" className="text-[18px]" />
                </span>
              </div>
              <div className="tabular my-1 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold leading-10 tracking-tight">
                  {todaySets}
                </span>
                <span className="text-sm text-onvariant">series registradas</span>
              </div>
              <span
                className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  todayDone
                    ? "bg-tertiary/15 text-tertiary"
                    : "bg-shigh text-onvariant"
                }`}
              >
                <Icon
                  name={todayDone ? "verified" : "hourglass_top"}
                  className="text-[14px]"
                />
                {todayDone ? "Completada" : "Pendiente"}
              </span>
            </div>

            <div className="flex flex-col justify-between rounded-xl bg-slow p-4 shadow-md">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-onvariant">
                  Marca personal
                </span>
                <span className="rounded-lg bg-shigh p-1.5 text-primary">
                  <Icon name="military_tech" className="text-[18px]" />
                </span>
              </div>
              <div className="tabular my-1 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold leading-10 tracking-tight">
                  {pr ? formatWeight(pr.kg, unit).split(" ")[0] : "—"}
                </span>
                {pr && (
                  <span className="text-sm font-bold text-primary">{unit}</span>
                )}
              </div>
              <span className="truncate text-xs font-bold">
                {pr?.name ?? "Registra tu primera serie"}
              </span>
            </div>
          </section>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* ---- Hoy (compacto) ---- */}
            <div className="flex flex-col gap-3 rounded-xl bg-scont p-5 shadow-lg lg:col-span-8">
              {isRestDay || !todayRoutine ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                      Hoy · {DAYS[todayWeekday]} · descanso
                    </span>
                    <h2 className="text-xl font-bold">Recupera y vuelve fuerte</h2>
                    <p className="text-sm text-onvariant">
                      Movilidad suave, caminata o descanso total.
                    </p>
                  </div>
                  <Link
                    href="/semana"
                    className="flex items-center justify-center gap-2 rounded-xl bg-shigh px-5 py-3 text-sm font-bold hover:bg-sbright"
                  >
                    <Icon name="calendar_month" className="text-[20px]" />
                    Ver semana
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                        Hoy · {DAYS[todayWeekday]}
                        {todayRoutine.userId !== null ? " · mi rutina" : ""}
                      </span>
                      <h2 className="text-xl font-bold">{todayRoutine.title}</h2>
                      {todayRoutine.focus && (
                        <p className="text-sm text-onvariant">{todayRoutine.focus}</p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        todayDone
                          ? "bg-tertiary/15 text-tertiary"
                          : "bg-shigh text-onvariant"
                      }`}
                    >
                      {todayDone ? "✓ hecha" : `${todaySets} series hoy`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={registerHref}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-pcont px-5 py-3 text-sm font-extrabold text-onpcont shadow-[0_0_24px_-2px_rgba(132,204,22,0.4)] transition-all hover:scale-[1.01]"
                    >
                      <Icon name="edit" className="text-[20px]" />
                      Registrar hoy
                    </Link>
                    <Link
                      href="/semana"
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-shigh px-5 py-3 text-sm font-bold hover:bg-sbright"
                    >
                      <Icon name="calendar_month" className="text-[20px]" />
                      Ver semana
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* ---- Rail derecho ---- */}
            <div className="flex flex-col gap-4 lg:col-span-4">
              <div className="flex flex-col gap-3 rounded-xl bg-slow p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Icon name="tune" className="text-[20px] text-primary" />
                    Unidades de carga
                  </span>
                  <span
                    className={`rounded-full bg-shigh px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${unit === "kg" ? "text-primary" : "text-secondary"}`}
                  >
                    {unit} activo
                  </span>
                </div>
                <div className="rounded-xl bg-scont p-1">
                  <UnitToggle unit={unit} />
                </div>
                <span className="flex items-center gap-1 text-[10px] text-onvariant">
                  <Icon name="check_circle" className="text-[14px] text-tertiary" />
                  Factor: 1 kg = 2.20462 lb
                </span>
              </div>

              {muscleVol.length > 0 && (
                <div className="flex flex-col gap-3 rounded-xl bg-slow p-4 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="flex flex-col">
                      <span className="font-semibold">Distribución de carga</span>
                      <span className="text-[10px] uppercase tracking-wider text-onvariant">
                        Volumen por músculo
                      </span>
                    </span>
                    <span className="rounded-lg bg-shigh p-1.5 text-secondary">
                      <Icon name="bar_chart" className="text-[18px]" />
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5 pt-1">
                    {muscleVol.map((m, i) => (
                      <div key={m.name} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold capitalize">{m.name}</span>
                          <span className={`tabular font-bold ${MUSCLE_TEXT[i % MUSCLE_TEXT.length]}`}>
                            {formatWeight(m.kg, unit)} (
                            {Math.round((m.kg / muscleTotal) * 100)}%)
                          </span>
                        </div>
                        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-scont">
                          <div
                            className={`h-full rounded-full ${MUSCLE_COLORS[i % MUSCLE_COLORS.length]}`}
                            style={{
                              width: `${Math.max(4, Math.round((m.kg / muscleTotal) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link
                href="/progreso"
                className="flex items-center justify-between rounded-xl bg-slow p-4 shadow-md transition-all hover:bg-scont"
              >
                <span className="flex items-center gap-2">
                  <span className="rounded-lg bg-shigh p-2 text-tertiary">
                    <Icon name="monitoring" className="text-[22px]" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-bold">Historial y progreso</span>
                    <span className="text-xs text-tertiary">
                      Volumen, récords y rachas
                    </span>
                  </span>
                </span>
                <Icon name="arrow_forward" className="text-[18px] text-onvariant" />
              </Link>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
