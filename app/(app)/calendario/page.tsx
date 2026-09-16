import { and, desc, eq, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { TrainingCalendar, type DayInfo } from "@/app/components/TrainingCalendar";
import { getWeekPlan } from "@/lib/schedule";
import { dateWeekday, shiftDateStr } from "@/lib/dates";
import { getRequestToday } from "@/lib/requestDate";
import { formatWeight } from "@/lib/units";

const PAST_DAYS = 120;
const FUTURE_DAYS = 60;

export default async function CalendarioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const today = await getRequestToday();
  const start = shiftDateStr(today, -PAST_DAYS);

  const userRows = await db.query.users.findMany({
    where: eq(users.id, userId),
    columns: { unit: true },
    limit: 1,
  });
  const unit: "kg" | "lb" = userRows[0]?.unit === "lb" ? "lb" : "kg";

  const plan = await getWeekPlan(userId);
  const weekSessions = await db.query.sessions.findMany({
    where: and(eq(sessions.userId, userId), gte(sessions.date, start)),
    orderBy: desc(sessions.date),
    limit: 500,
    with: { setLogs: true },
  });
  const byDate = new Map(weekSessions.map((s) => [s.date, s]));

  const days: Record<string, DayInfo> = {};
  for (let i = -PAST_DAYS; i <= FUTURE_DAYS; i++) {
    const d = shiftDateStr(today, i);
    const wd = dateWeekday(d);
    const planned = plan.days[wd]?.routine ?? null;
    if (!planned) {
      days[d] = { status: "rest" };
      continue;
    }

    const sess = byDate.get(d);
    const isPast = d < today;
    const sets = sess?.setLogs.length ?? 0;
    const volumeKg = sess
      ? sess.setLogs.reduce((a, l) => a + Number(l.weightKg) * l.reps, 0)
      : 0;

    const status = sess?.completed
      ? "done"
      : sets > 0
        ? "progress"
        : isPast
          ? "missed"
          : "planned";

    const custom = planned.userId !== null;
    days[d] = {
      status,
      title: planned.title,
      focus: planned.focus,
      sets,
      volume: sets > 0 ? formatWeight(volumeKg, unit) : undefined,
      url: custom
        ? `/rutinas/${planned.id}?date=${d}#registro`
        : `/rutina/${planned.weekday ?? wd}?date=${d}#registro`,
      detailUrl: custom ? `/rutinas/${planned.id}` : `/rutina/${planned.weekday ?? wd}`,
    };
  }

  return (
    <main className="mt-6 space-y-5">
      <div className="px-2 lg:px-6">
        <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary">
          Calendario
        </h1>
        <p className="text-sm leading-5 text-text-tertiary">
          Tus rutinas y sesiones día a día. Toca un día para verlo abajo
          y amplíalo para registrar.
        </p>
      </div>

      <div className="space-y-5 px-2 lg:px-5">
        <TrainingCalendar days={days} today={today} />

        <div className="flex flex-wrap gap-4 rounded-xl border-[0.5px] border-card-border bg-card-background p-5 text-sm text-text-secondary">
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#22C55E]" /> Hecha
          </span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#F97316]" /> En curso
          </span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#EF4444]" /> Pendiente
          </span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#3758F9]" /> Programada
          </span>
        </div>
      </div>
    </main>
  );
}
