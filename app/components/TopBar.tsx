import { desc, eq, isNull, or } from "drizzle-orm";
import { auth, googleConfigured, signIn, signOut } from "@/auth";
import { db } from "@/db";
import { routines, sessions, users } from "@/db/schema";
import { HeaderBar, type HeaderNotification } from "@/app/components/HeaderBar";
import { formatWeight } from "@/lib/units";
import { parseDateStr, shiftDateStr } from "@/lib/dates";
import { getRequestToday } from "@/lib/requestDate";

async function signInAction() {
  "use server";
  await signIn("google");
}

async function signOutAction() {
  "use server";
  await signOut();
}

const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export async function TopBar() {
  const session = await auth();
  // "Hoy" según el navegador del usuario (no la hora UTC del servidor),
  // igual que el resto de la app. 0=Lun … 6=Dom.
  const today = await getRequestToday();
  const now = parseDateStr(today);
  const dateLabel = `${WEEKDAYS[(now.getDay() + 6) % 7]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;

  let unit: "kg" | "lb" = "kg";
  let notifications: HeaderNotification[] = [];
  let user: { name: string | null; email: string | null; image: string | null } | null =
    null;

  if (session?.user?.id) {
    const userId = session.user.id;
    const rows = await db
      .select({ unit: users.unit })
      .from(users)
      .where(eq(users.id, userId));
    if (rows[0]?.unit === "lb") unit = "lb";
    user = {
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
    };

    const [recent, allRoutines] = await Promise.all([
      db.query.sessions.findMany({
        where: eq(sessions.userId, userId),
        orderBy: desc(sessions.date),
        limit: 8,
        with: { routine: true, setLogs: true },
      }),
      db.query.routines.findMany({
        where: or(isNull(routines.userId), eq(routines.userId, userId)),
        columns: { id: true, userId: true, weekday: true },
      }),
    ]);
    const routineById = new Map(allRoutines.map((r) => [r.id, r]));
    const yesterday = shiftDateStr(today, -1);

    notifications = recent.map((s) => {
      const vol = s.setLogs.reduce((a, l) => a + Number(l.weightKg) * l.reps, 0);
      const r = routineById.get(s.routineId);
      const wd = r?.weekday;
      const href = r
        ? r.userId !== null
          ? `/rutinas/${r.id}?date=${s.date}#registro`
          : `/rutina/${wd ?? 0}?date=${s.date}#registro`
        : "/semana";
      return {
        id: s.id,
        title: s.routine.title,
        desc:
          s.setLogs.length > 0
            ? `${s.setLogs.length} series · ${formatWeight(vol, unit)}${s.completed ? " · completada" : ""}`
            : "Sesión abierta",
        dateLabel:
          s.date === today
            ? "Hoy"
            : s.date === yesterday
              ? "Ayer"
              : s.date,
        href,
        done: s.completed,
      };
    });
  }

  return (
    <HeaderBar
      dateLabel={dateLabel}
      unit={unit}
      user={user}
      notifications={notifications}
      signOut={signOutAction}
      signIn={signInAction}
      googleConfigured={googleConfigured}
    />
  );
}
