import Link from "next/link";
import { desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { sessions, setLogs, users } from "@/db/schema";
import { Icon } from "@/app/components/Icon";
import { getAdminEmails, isAdminEmail } from "@/lib/admin";
import { shiftDateStr } from "@/lib/dates";
import { getRequestToday } from "@/lib/requestDate";

export const metadata = {
  title: "Admin · Kinetix",
};

function toDayStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const configured = getAdminEmails().length > 0;
  const allowed = isAdminEmail(email);

  if (!session?.user) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-8">
        <div className="rounded-xl bg-slow p-6 text-center shadow-xl">
          <Icon name="lock" className="mx-auto text-[32px] text-primary" />
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            Zona admin
          </h1>
          <p className="mt-1 text-sm text-onvariant">
            Inicia sesión con una cuenta administradora para ver quién se
            registra y su actividad.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-pcont px-5 py-2.5 text-sm font-extrabold text-onpcont"
          >
            <Icon name="login" className="text-[18px]" />
            Ir a entrar
          </Link>
        </div>
      </main>
    );
  }

  if (!configured || !allowed) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-8">
        <div className="rounded-xl bg-slow p-6 shadow-xl">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <Icon name="shield" className="text-[26px] text-primary" />
            Sin acceso admin
          </h1>
          <p className="mt-2 text-sm text-onvariant">
            Tu cuenta <strong className="text-onsurface">{email}</strong> no
            está en la lista de admins.
            {!configured && (
              <>
                {" "}
                Además <code>ADMIN_EMAILS</code> está vacío en el servidor.
              </>
            )}
          </p>
          <div className="mt-4 rounded-xl bg-scont p-4 text-sm">
            <p className="font-bold">Cómo habilitarte (tu Gmail normal vale):</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-onvariant">
              <li>
                En <code>.env.local</code> añade:{" "}
                <code className="text-onsurface">
                  ADMIN_EMAILS=&quot;tu-email@gmail.com&quot;
                </code>
              </li>
              <li>
                En Vercel → Settings → Environment Variables añade la misma
                variable y redeploy.
              </li>
              <li>Recarga /admin con esa cuenta. Sigues usando la app normal.</li>
            </ol>
          </div>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1 text-sm text-onvariant hover:text-primary"
          >
            <Icon name="chevron_left" className="text-[18px]" />
            Volver al dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const today = await getRequestToday();
  const d7 = shiftDateStr(today, -7);
  const d30 = shiftDateStr(today, -30);

  const allUsers = await db.query.users.findMany({
    orderBy: desc(users.createdAt),
    limit: 500,
  });
  const allSessions = await db.query.sessions.findMany({
    orderBy: desc(sessions.date),
    limit: 1500,
  });
  const allLogs =
    allSessions.length > 0
      ? await db.query.setLogs.findMany({
          orderBy: desc(setLogs.id),
          limit: 5000,
        })
      : [];

  const volBySession = new Map<number, number>();
  for (const l of allLogs) {
    volBySession.set(
      l.sessionId,
      (volBySession.get(l.sessionId) ?? 0) +
        Number(l.weightKg) * l.reps,
    );
  }

  type Row = {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    createdAt: Date;
    sessionsCount: number;
    completed: number;
    lastDate: string | null;
    volumeKg: number;
  };
  const byUser = new Map<string, Row>();
  for (const u of allUsers) {
    byUser.set(u.id, {
      id: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      createdAt: u.createdAt,
      sessionsCount: 0,
      completed: 0,
      lastDate: null,
      volumeKg: 0,
    });
  }
  for (const s of allSessions) {
    const r = byUser.get(s.userId);
    if (!r) continue;
    r.sessionsCount += 1;
    if (s.completed) r.completed += 1;
    if (!r.lastDate || s.date > r.lastDate) r.lastDate = s.date;
    r.volumeKg += volBySession.get(s.id) ?? 0;
  }
  let rows = [...byUser.values()];
  if (query) {
    rows = rows.filter(
      (r) =>
        r.email.toLowerCase().includes(query) ||
        (r.name ?? "").toLowerCase().includes(query),
    );
  }

  const totalUsers = allUsers.length;
  const new7 = allUsers.filter((u) => toDayStr(u.createdAt) >= d7).length;
  const sess7 = allSessions.filter((s) => s.date >= d7);
  const active7 = new Set(sess7.map((s) => s.userId)).size;

  const signupsByDay = new Map<string, number>();
  for (const u of allUsers) {
    const d = toDayStr(u.createdAt);
    if (d >= d30) signupsByDay.set(d, (signupsByDay.get(d) ?? 0) + 1);
  }
  const last30: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = shiftDateStr(today, -i);
    last30.push({ date: d, count: signupsByDay.get(d) ?? 0 });
  }
  const maxDay = Math.max(1, ...last30.map((d) => d.count));
  const recent = allSessions.slice(0, 15);

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 pb-8">
      <div className="pointer-events-none absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-1 flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            <Icon name="shield" className="text-[14px]" />
            Admin
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Quién se registra
          </h1>
          <p className="mt-1 text-sm text-onvariant">
            {totalUsers} atletas · {active7} activos (7d) · tú entras como{" "}
            {email}
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar email o nombre…"
            className="w-64 rounded-xl border border-white/10 bg-slow px-3 py-2 text-sm text-onsurface placeholder:text-onvariant"
          />
          <button
            type="submit"
            className="rounded-xl bg-shigh px-4 py-2 text-sm font-bold hover:bg-sbright"
          >
            Buscar
          </button>
        </form>
      </div>

      <section className="relative z-10 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: "Atletas totales",
            value: String(totalUsers),
            icon: "group",
            sub: `+${new7} últimos 7 días`,
          },
          {
            label: "Sesiones totales",
            value: String(allSessions.length),
            icon: "fitness_center",
            sub: `${sess7.length} últimos 7 días`,
          },
          {
            label: "Completadas",
            value: String(allSessions.filter((s) => s.completed).length),
            icon: "verified",
            sub: `${sess7.filter((s) => s.completed).length} últimos 7 días`,
          },
          {
            label: "Activos 7d",
            value: String(active7),
            icon: "bolt",
            sub: "con al menos 1 sesión",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="flex flex-col gap-1 rounded-xl bg-slow p-4 shadow-md"
          >
            <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-onvariant">
              {c.label}
              <Icon name={c.icon} className="text-[18px] text-primary" />
            </span>
            <span className="text-3xl font-extrabold tabular">{c.value}</span>
            <span className="text-xs text-onvariant">{c.sub}</span>
          </div>
        ))}
      </section>

      <section className="relative z-10 rounded-xl bg-slow p-4 shadow-md sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Icon name="bar_chart" className="text-[20px] text-secondary" />
          Altas por día · últimos 30 días
        </h2>
        <div className="mt-3 flex h-24 items-end gap-1">
          {last30.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.count}`}
              className={`flex-1 rounded-t ${d.count > 0 ? "bg-primary" : "bg-shigh"}`}
              style={{ height: `${Math.max(6, Math.round((d.count / maxDay) * 100))}%` }}
            />
          ))}
        </div>
        <div className="tabular mt-1 flex justify-between text-[10px] text-onvariant">
          <span>{last30[0].date.slice(5)}</span>
          <span>{last30[29].date.slice(5)}</span>
        </div>
      </section>

      <div className="relative z-10 grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <section className="rounded-xl bg-slow p-4 shadow-md sm:p-5 lg:col-span-8">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Icon name="group" className="text-[20px] text-primary" />
            Usuarios ({rows.length})
          </h2>
          {rows.length === 0 ? (
            <p className="mt-2 text-sm text-onvariant">
              Sin resultados{query ? ` para “${query}”` : ""}.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 p-3"
                >
                  {r.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      src={r.image}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-shigh text-sm font-bold text-primary">
                      {(r.name ?? r.email)[0]?.toUpperCase()}
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-bold">
                      {r.name ?? r.email}
                    </span>
                    <span className="truncate text-xs text-onvariant">
                      {r.email} · alta {toDayStr(r.createdAt)}
                      {r.lastDate ? ` · última ${r.lastDate}` : " · sin sesiones"}
                    </span>
                  </span>
                  <span className="tabular hidden shrink-0 text-right text-xs text-onvariant sm:block">
                    {r.sessionsCount} ses · {r.completed} ✓
                    <br /> {(r.volumeKg / 1000).toFixed(1)} t vol
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-xl bg-slow p-4 shadow-md sm:p-5 lg:col-span-4">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Icon name="history" className="text-[20px] text-tertiary" />
            Actividad reciente
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-onvariant">Aún no hay sesiones.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recent.map((s) => {
                const u = byUser.get(s.userId);
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-scont p-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {u?.name ?? u?.email ?? s.userId.slice(0, 8)}
                      </span>
                      <span className="tabular text-xs text-onvariant">
                        {s.date} · rutina #{s.routineId}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${s.completed ? "bg-tertiary/15 text-tertiary" : "bg-shigh text-onvariant"}`}
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
    </main>
  );
}
