import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bolt1,
  Calendar,
  Crown1,
  Muscles,
} from "@tailgrids/icons";
import { and, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { sessions, setLogs, users } from "@/db/schema";
import { UnitToggle } from "@/app/components/UnitToggle";
import { Icon } from "@/app/components/Icon";
import { StatCard } from "@/app/components/StatCard";
import { formatWeight } from "@/lib/units";
import { getWeekPlan } from "@/lib/schedule";
import { dateWeekday, shiftDateStr } from "@/lib/dates";
import { getRequestToday } from "@/lib/requestDate";
import { isAdminEmail } from "@/lib/admin";

const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

async function todayParts(): Promise<{ weekday: number; date: string }> {
  // "Hoy" según el navegador del usuario (no la hora UTC del servidor).
  const date = await getRequestToday();
  return { weekday: dateWeekday(date), date };
}

function weekAgoStr(today: string, days: number): string {
  return shiftDateStr(today, -days);
}

const MUSCLE_COLORS = [
  "bg-[#5750F1]",
  "bg-[#3B82F6]",
  "bg-[#22C55E]",
  "bg-[#F97316]",
  "bg-[#A855F7]",
];

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
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
  const deltaPositive = (deltaPct ?? 0) >= 0;
  const muscleTotal = Math.max(1, ...muscleVol.map((m) => m.kg));
  const templateSets =
    todayRoutine?.exercises.reduce((a, e) => a + e.sets, 0) ?? 0;
  const registerHref = todayRoutine
    ? todayRoutine.userId !== null
      ? `/rutinas/${todayRoutine.id}#registro`
      : `/rutina/${todayRoutine.weekday ?? todayWeekday}#registro`
    : "/semana";
  const shownExercises = todayRoutine?.exercises.slice(0, 6) ?? [];
  const hiddenCount = (todayRoutine?.exercises.length ?? 0) - shownExercises.length;

  return (
    <main className="mt-6 space-y-5">
      {/* ---- Encabezado estilo admin ---- */}
      <div className="px-2 lg:px-6">
        <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary">
          {isRestDay ? "Día de descanso" : `Hola, ${firstName}`}
        </h1>
        <p className="text-sm leading-5 text-text-tertiary">
          {DAYS[todayWeekday]} ·{" "}
          {isRestDay
            ? "Recuperar también es entrenar"
            : todayRoutine
              ? `Hoy toca: ${todayRoutine.title}`
              : "Sin rutina programada para hoy"}
        </p>
      </div>

      <div className="space-y-5 px-2 lg:px-5">
        {profileIncomplete && (
          <Link
            href="/perfil"
            className="flex items-center justify-between gap-3 rounded-xl border-[0.5px] border-card-border bg-card-background p-5"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[rgba(14,165,233,0.10)] text-[#0EA5E9]">
                <Icon name="person_add" className="text-[18px]" />
              </span>
              <span className="flex flex-col">
                <span className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                  Completa tu perfil de atleta
                </span>
                <span className="text-sm text-text-tertiary">
                  Añade tu peso y altura para calcular tu IMC y seguir tu
                  progreso corporal.
                </span>
              </span>
            </span>
            <Icon name="chevron_right" className="text-[20px] text-text-tertiary" />
          </Link>
        )}
        {otherToday && (
          <Link
            href={`/rutinas/${otherToday.routineId}#registro`}
            className="flex items-center justify-between gap-3 rounded-xl border-[0.5px] border-card-border bg-card-background p-5"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                <Icon name="fitness_center" className="text-[18px]" />
              </span>
              <span className="flex flex-col">
                <span className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                  Hoy estás entrenando: {otherToday.title}
                </span>
                <span className="text-sm text-text-tertiary">
                  Sesión de hoy en tu rutina propia. Toca para continuar ahí.
                </span>
              </span>
            </span>
            <Icon name="chevron_right" className="text-[20px] text-text-tertiary" />
          </Link>
        )}
        {isAdminEmail(session?.user?.email) && (
          <Link
            href="/admin"
            className="flex items-center justify-between gap-3 rounded-xl border-[0.5px] border-card-border bg-card-background p-5"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-background-gray-secondary text-text-primary">
                <Icon name="shield" className="text-[18px]" />
              </span>
              <span className="flex flex-col">
                <span className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                  Panel admin · quién se registra
                </span>
                <span className="text-sm text-text-tertiary">
                  Altas, actividad y sesiones de tus atletas.
                </span>
              </span>
            </span>
            <Icon name="chevron_right" className="text-[20px] text-text-tertiary" />
          </Link>
        )}

        {/* ---- Stats ---- */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Muscles size={18} />}
            iconClass="bg-[rgba(59,130,246,0.10)] text-[#3B82F6]"
            value={
              <>
                {formatWeight(volume7, unit).split(" ")[0]}{" "}
                <span className="text-base font-medium text-text-tertiary">{unit}</span>
              </>
            }
            label="Volumen semanal"
            delta={
              <span
                className={`flex items-center gap-1 text-sm font-medium leading-5 ${
                  deltaPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {deltaPct === null
                  ? "1ª semana"
                  : `${deltaPositive ? "+" : ""}${deltaPct}%`}
                <Icon
                  name={deltaPositive ? "arrow_upward" : "arrow_downward"}
                  className="text-[16px]"
                />
              </span>
            }
          />
          <StatCard
            icon={<Calendar size={18} />}
            iconClass="bg-[rgba(34,197,94,0.10)] text-[#22C55E]"
            value={
              <>
                {done7}
                <span className="text-base font-medium text-text-tertiary"> / 7 días</span>
              </>
            }
            label="Entrenamientos"
            delta={
              <span className="text-sm font-medium leading-5 text-text-tertiary">
                {totalSessions} en total
              </span>
            }
          />
          <StatCard
            icon={<Bolt1 size={18} />}
            iconClass="bg-[rgba(249,115,22,0.10)] text-[#F97316]"
            value={
              <>
                {todaySets}
                <span className="text-base font-medium text-text-tertiary"> series</span>
              </>
            }
            label="Sesión de hoy"
            delta={
              <span
                className={`flex items-center gap-1 text-sm font-medium leading-5 ${
                  todayDone ? "text-green-600" : "text-text-tertiary"
                }`}
              >
                <Icon
                  name={todayDone ? "verified" : "hourglass_top"}
                  className="text-[16px]"
                />
                {todayDone ? "Hecha" : "Pendiente"}
              </span>
            }
          />
          <StatCard
            icon={<Crown1 size={18} />}
            iconClass="bg-[rgba(168,85,247,0.10)] text-[#A855F7]"
            value={
              pr ? (
                <>
                  {formatWeight(pr.kg, unit).split(" ")[0]}{" "}
                  <span className="text-base font-medium text-text-tertiary">{unit}</span>
                </>
              ) : (
                "—"
              )
            }
            label={pr?.name ?? "Sin marcas aún"}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[519fr_558fr]">
          {/* ---- Rutina de hoy ---- */}
          <div className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
            {isRestDay || !todayRoutine ? (
              <div className="flex h-full flex-col justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                    Hoy · {DAYS[todayWeekday]} · descanso
                  </p>
                  <h2 className="mt-1 font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                    Recupera y vuelve fuerte
                  </h2>
                  <p className="mt-0.5 text-sm leading-6 text-text-secondary">
                    Movilidad suave, caminata o descanso total.{" "}
                    {planConfigured
                      ? "Día de descanso según tu plan."
                      : "Sin rutina programada."}
                  </p>
                </div>
                <Link
                  href="/semana"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-card-border bg-card-background px-3.5 text-sm font-medium text-text-primary transition-colors hover:bg-background-gray-secondary"
                >
                  <Icon name="calendar_month" className="text-[20px]" />
                  Ver semana
                </Link>
              </div>
            ) : (
              <div className="flex h-full flex-col gap-4">
                <div className="relative flex w-full flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                      Hoy · {DAYS[todayWeekday]}
                      {todayRoutine.userId !== null ? " · mi rutina" : ""}
                    </p>
                    <h2 className="mt-1 font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                      {todayRoutine.title}
                    </h2>
                    {todayRoutine.focus && (
                      <p className="mt-0.5 text-sm text-text-secondary">
                        {todayRoutine.focus}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      todayDone
                        ? "bg-[rgba(34,197,94,0.10)] text-[#22C55E]"
                        : "bg-background-gray-secondary text-text-secondary"
                    }`}
                  >
                    {todayDone ? "Hecha" : `${todaySets} series hoy`}
                  </span>
                </div>
                <ul className="divide-y divide-card-border rounded-lg border-[0.5px] border-card-border">
                  {shownExercises.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5"
                    >
                      <span className="truncate text-sm font-medium text-text-primary">
                        {e.name}
                      </span>
                      <span className="tabular shrink-0 text-sm text-text-tertiary">
                        {e.sets} × {e.reps}
                      </span>
                    </li>
                  ))}
                </ul>
                {hiddenCount > 0 && (
                  <p className="-mt-2 text-xs text-text-tertiary">
                    +{hiddenCount} ejercicios más · {templateSets} series en total
                  </p>
                )}
                <div className="mt-auto flex flex-wrap gap-2.5">
                  <Link
                    href={registerHref}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                  >
                    <Icon name="play_arrow" className="text-[20px]" />
                    Registrar hoy
                  </Link>
                  <Link
                    href="/semana"
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-card-border bg-card-background px-4 text-sm font-medium text-text-primary transition-colors hover:bg-background-gray-secondary"
                  >
                    <Icon name="calendar_month" className="text-[20px]" />
                    Ver semana
                  </Link>
                </div>
                {todayDone && (
                  <p className="text-xs text-text-tertiary">
                    Sesión completada. Puedes revisarla en Semana.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ---- Columna derecha ---- */}
          <div className="flex flex-col gap-5">
            <div className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
              <div className="relative flex w-full flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                  Unidades de carga
                </h2>
                <span className="rounded-full bg-background-gray-secondary px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                  {unit} activo
                </span>
              </div>
              <div className="mt-4">
                <UnitToggle unit={unit} />
              </div>
              <p className="mt-3 flex items-center gap-1 text-xs text-text-tertiary">
                <Icon name="check_circle" className="text-[14px] text-[#22C55E]" />
                Tus pesos se guardan en kg · 1 kg = 2.20462 lb
              </p>
            </div>

            {muscleVol.length > 0 && (
              <div className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
                <div className="relative flex w-full flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                      Volumen por músculo
                    </h2>
                    <p className="mt-0.5 text-sm text-text-tertiary">
                      Últimas sesiones registradas
                    </p>
                  </div>
                  <span className="flex size-8 items-center justify-center rounded-lg bg-[rgba(14,165,233,0.10)] text-[#0EA5E9]">
                    <Icon name="bar_chart" className="text-[18px]" />
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {muscleVol.map((m, i) => (
                    <div key={m.name} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium capitalize text-text-primary">
                          {m.name}
                        </span>
                        <span className="tabular font-medium text-text-secondary">
                          {formatWeight(m.kg, unit)} (
                          {Math.round((m.kg / muscleTotal) * 100)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-background-gray-secondary">
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
              className="flex items-center justify-between rounded-xl border-[0.5px] border-card-border bg-card-background p-5 transition-colors hover:bg-background-gray-secondary"
            >
              <span className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-[rgba(34,197,94,0.10)] text-[#22C55E]">
                  <Icon name="monitoring" className="text-[18px]" />
                </span>
                <span className="flex flex-col">
                  <span className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                    Historial y progreso
                  </span>
                  <span className="text-sm text-text-tertiary">
                    Volumen, récords y rachas
                  </span>
                </span>
              </span>
              <Icon name="arrow_forward" className="text-[18px] text-text-tertiary" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
