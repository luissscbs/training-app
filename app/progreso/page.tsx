import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { UnitToggle } from "@/app/components/UnitToggle";
import { Icon } from "@/app/components/Icon";
import { formatWeight } from "@/lib/units";

export default async function ProgresoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const userId = session.user.id;
  const userRows = await db
    .select({ unit: users.unit })
    .from(users)
    .where(eq(users.id, userId));
  const unit: "kg" | "lb" = userRows[0]?.unit === "lb" ? "lb" : "kg";

  const history = await db.query.sessions.findMany({
    where: eq(sessions.userId, userId),
    orderBy: desc(sessions.date),
    limit: 30,
    with: {
      routine: true,
      setLogs: { with: { exercise: true } },
    },
  });

  const rows = history.map((s) => {
    const volumeKg = s.setLogs.reduce(
      (acc, l) => acc + Number(l.weightKg) * l.reps,
      0,
    );
    return {
      id: s.id,
      date: s.date,
      title: s.routine.title,
      completed: s.completed,
      sets: s.setLogs.length,
      volumeKg,
    };
  });

  const completed = rows.filter((r) => r.completed);
  const totalVolumeKg = rows.reduce((a, r) => a + r.volumeKg, 0);
  const best = rows.reduce<{ id: number; volumeKg: number } | null>(
    (m, r) => (!m || r.volumeKg > m.volumeKg ? r : m),
    null,
  );
  const maxVolume = Math.max(1, ...rows.map((r) => r.volumeKg));

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);
  const lastWeek = rows.filter((r) => r.completed && r.date >= weekAgoStr).length;

  const prs = new Map<string, number>();
  for (const s of history) {
    for (const l of s.setLogs) {
      const name = l.exercise.name;
      const kg = Number(l.weightKg);
      if (!prs.has(name) || kg > (prs.get(name) ?? 0)) prs.set(name, kg);
    }
  }
  const topPrs = [...prs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const stats = [
    {
      label: "Sesiones",
      value: String(rows.length),
      icon: "event_available",
      accent: "text-secondary",
    },
    {
      label: "Completadas",
      value: String(completed.length),
      icon: "verified",
      accent: "text-tertiary",
    },
    {
      label: "Últimos 7 días",
      value: String(lastWeek),
      icon: "pace",
      accent: "text-primary",
    },
    {
      label: "Volumen total",
      value: formatWeight(totalVolumeKg, unit),
      icon: "fitness_center",
      accent: "text-primary",
    },
  ];

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 pb-8">
      <div className="pointer-events-none absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Historial y progreso
          </h1>
          <p className="text-sm text-onvariant">
            Volumen, récords y consistencia de tus sesiones
          </p>
        </div>
        <UnitToggle unit={unit} />
      </div>

      <section className="relative z-10 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col justify-between rounded-xl bg-slow p-4 shadow-md"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-onvariant">
                {s.label}
              </span>
              <span className={`rounded-lg bg-shigh p-1.5 ${s.accent}`}>
                <Icon name={s.icon} className="text-[18px]" />
              </span>
            </div>
            <p className="tabular text-xl font-extrabold">{s.value}</p>
          </div>
        ))}
      </section>

      <section className="relative z-10 rounded-xl bg-slow p-5 shadow-md sm:p-6">
        <h2 className="text-lg font-semibold">Volumen por sesión</h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-onvariant">
            Aún no hay sesiones. Registra la de hoy desde{" "}
            <Link href="/#registro" className="text-primary underline underline-offset-4">
              Registro
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="mt-4 flex h-32 items-end gap-1.5">
              {[...rows].reverse().map((r) => (
                <div
                  key={r.id}
                  title={`${r.date} · ${formatWeight(r.volumeKg, unit)}`}
                  className={`flex-1 rounded-t-md ${
                    r.completed ? "bg-pcont" : "bg-shighest"
                  }`}
                  style={{
                    height: `${Math.max(6, Math.round((r.volumeKg / maxVolume) * 100))}%`,
                  }}
                />
              ))}
            </div>
            {best && best.volumeKg > 0 && (
              <p className="mt-2 text-xs text-onvariant">
                Mejor sesión: {formatWeight(best.volumeKg, unit)}
              </p>
            )}
          </>
        )}
      </section>

      {topPrs.length > 0 && (
        <section className="relative z-10 rounded-xl bg-slow p-5 shadow-md sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Icon name="military_tech" className="text-[20px] text-primary" />
            Récords por ejercicio
          </h2>
          <ul className="mt-3 divide-y divide-shigh text-sm">
            {topPrs.map(([name, kg]) => (
              <li key={name} className="flex justify-between py-2">
                <span>{name}</span>
                <span className="tabular font-bold text-primary">
                  {formatWeight(kg, unit)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="relative z-10 rounded-xl bg-slow p-5 shadow-md sm:p-6">
        <h2 className="text-lg font-semibold">Historial</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-white/10 p-3 text-sm"
            >
              <div>
                <p className="font-semibold">
                  {r.date} — {r.title}
                </p>
                <p className="tabular text-xs text-onvariant">
                  {r.sets} series · {formatWeight(r.volumeKg, unit)} volumen
                </p>
              </div>
              <span
                className={
                  r.completed
                    ? "rounded-full bg-tertiary/15 px-3 py-1 text-xs font-bold text-tertiary"
                    : "rounded-full bg-shigh px-3 py-1 text-xs text-onvariant"
                }
              >
                {r.completed ? "✓ hecha" : "abierta"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
