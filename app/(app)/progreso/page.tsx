import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Bolt1, Calendar, CheckCircle1, Muscles } from "@tailgrids/icons";
import { auth } from "@/auth";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { UnitToggle } from "@/app/components/UnitToggle";
import { StatCard } from "@/app/components/StatCard";
import { Icon } from "@/app/components/Icon";
import { formatWeight } from "@/lib/units";
import { shiftDateStr } from "@/lib/dates";
import { getRequestToday } from "@/lib/requestDate";

export default async function ProgresoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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

  // "Hoy" según el navegador del usuario (no la hora UTC del servidor).
  const weekAgoStr = shiftDateStr(await getRequestToday(), -7);
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

  return (
    <main className="mt-6 space-y-5">
      <div className="flex items-center justify-between px-2 lg:px-6">
        <div>
          <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary">
            Historial y progreso
          </h1>
          <p className="text-sm leading-5 text-text-tertiary">
            Volumen, récords y consistencia de tus sesiones
          </p>
        </div>
        <UnitToggle unit={unit} />
      </div>

      <div className="space-y-5 px-2 lg:px-5">
      <section className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <StatCard
          icon={<Calendar size={18} />}
          iconClass="bg-[rgba(59,130,246,0.10)] text-[#3B82F6]"
          value={String(rows.length)}
          label="Sesiones"
        />
        <StatCard
          icon={<CheckCircle1 size={18} />}
          iconClass="bg-[rgba(34,197,94,0.10)] text-[#22C55E]"
          value={String(completed.length)}
          label="Completadas"
        />
        <StatCard
          icon={<Bolt1 size={18} />}
          iconClass="bg-[rgba(249,115,22,0.10)] text-[#F97316]"
          value={String(lastWeek)}
          label="Últimos 7 días"
        />
        <StatCard
          icon={<Muscles size={18} />}
          iconClass="bg-[rgba(168,85,247,0.10)] text-[#A855F7]"
          value={formatWeight(totalVolumeKg, unit)}
          label="Volumen total"
        />
      </section>

      <section className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
        <h2 className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">Volumen por sesión</h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-text-tertiary">
            Aún no hay sesiones. Registra la de hoy desde{" "}
            <Link href="/semana" className="font-medium text-brand-500 underline underline-offset-4">
              Semana
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
                    r.completed ? "bg-brand-500" : "bg-background-gray-tertiary"
                  }`}
                  style={{
                    height: `${Math.max(6, Math.round((r.volumeKg / maxVolume) * 100))}%`,
                  }}
                />
              ))}
            </div>
            {best && best.volumeKg > 0 && (
              <p className="mt-2 text-xs text-text-tertiary">
                Mejor sesión: {formatWeight(best.volumeKg, unit)}
              </p>
            )}
          </>
        )}
      </section>

      {topPrs.length > 0 && (
        <section className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
          <h2 className="flex items-center gap-2 font-semibold leading-6 tracking-[-0.2px] text-text-primary">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[rgba(168,85,247,0.10)] text-[#A855F7]">
              <Icon name="military_tech" className="text-[18px]" />
            </span>
            Récords por ejercicio
          </h2>
          <ul className="mt-3 divide-y divide-card-border text-sm">
            {topPrs.map(([name, kg]) => (
              <li key={name} className="flex justify-between py-2">
                <span className="text-text-primary">{name}</span>
                <span className="tabular font-medium text-text-primary">
                  {formatWeight(kg, unit)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
        <h2 className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">Historial</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-card-border p-3 text-sm"
            >
              <div>
                <p className="font-medium text-text-primary">
                  {r.date} — {r.title}
                </p>
                <p className="tabular text-xs text-text-tertiary">
                  {r.sets} series · {formatWeight(r.volumeKg, unit)} volumen
                </p>
              </div>
              <span
                className={
                  r.completed
                    ? "rounded-full bg-[rgba(34,197,94,0.10)] px-3 py-1 text-xs font-medium text-[#22C55E]"
                    : "rounded-full bg-background-gray-secondary px-3 py-1 text-xs text-text-tertiary"
                }
              >
                {r.completed ? "✓ hecha" : "abierta"}
              </span>
            </li>
          ))}
        </ul>
      </section>
      </div>
    </main>
  );
}
