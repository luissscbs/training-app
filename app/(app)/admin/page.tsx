import Link from "next/link";
import { desc } from "drizzle-orm";
import { Bolt1, CheckCircle1, Muscles, UserMultiple1 } from "@tailgrids/icons";
import { auth } from "@/auth";
import { db } from "@/db";
import { sessions, setLogs, users } from "@/db/schema";
import { Icon } from "@/app/components/Icon";
import { StatCard } from "@/app/components/StatCard";
import { getAdminEmails, isAdminEmail } from "@/lib/admin";
import { shiftDateStr } from "@/lib/dates";
import { getRequestToday } from "@/lib/requestDate";

export const metadata = {
  title: "Admin · Forge",
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
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <div className="rounded-xl border-[0.5px] border-card-border bg-card-background p-6 text-center">
          <Icon name="lock" className="mx-auto text-[32px] text-brand-500" />
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-text-primary">
            Zona admin
          </h1>
          <p className="mt-1 text-sm text-text-tertiary">
            Inicia sesión con una cuenta administradora para ver quién se
            registra y su actividad.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-button-primary-background px-5 text-sm font-medium text-white transition-colors hover:bg-button-primary-hover-background"
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
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <div className="rounded-xl border-[0.5px] border-card-border bg-card-background p-6">
          <h1 className="flex items-center gap-2 text-2xl font-medium tracking-tight text-text-primary">
            <Icon name="shield" className="text-[26px] text-brand-500" />
            Sin acceso admin
          </h1>
          <p className="mt-2 text-sm text-text-tertiary">
            Tu cuenta <strong className="text-text-primary">{email}</strong> no
            está en la lista de admins.
            {!configured && (
              <>
                {" "}
                Además <code>ADMIN_EMAILS</code> está vacío en el servidor.
              </>
            )}
          </p>
          <div className="mt-4 rounded-xl bg-background-gray-secondary p-4 text-sm">
            <p className="font-medium text-text-primary">Cómo habilitarte (tu Gmail normal vale):</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-text-tertiary">
              <li>
                En <code>.env.local</code> añade:{" "}
                <code className="text-text-primary">
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
            className="mt-4 inline-flex items-center gap-1 text-sm text-text-tertiary transition-colors hover:text-text-primary"
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
    <main className="mt-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 px-2 lg:px-6">
        <div>
          <span className="mb-1 flex w-fit items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-0.5 text-[10px] font-medium uppercase tracking-widest text-brand-500">
            <Icon name="shield" className="text-[14px]" />
            Admin
          </span>
          <h1 className="text-[28px] font-medium leading-8 text-text-primary">
            Quién se registra
          </h1>
          <p className="mt-1 text-sm leading-5 text-text-tertiary">
            {totalUsers} atletas · {active7} activos (7d) · tú entras como{" "}
            {email}
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar email o nombre…"
            className="w-64 rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary placeholder:text-input-placeholder-text focus:border-input-primary-focus-border focus:outline-none"
          />
          <button
            type="submit"
            className="h-10 rounded-lg bg-background-gray-secondary px-4 text-sm font-medium text-text-primary transition-colors hover:bg-background-gray-tertiary"
          >
            Buscar
          </button>
        </form>
      </div>

      <div className="space-y-5 px-2 lg:px-5">
      <section className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <StatCard
          icon={<UserMultiple1 size={18} />}
          iconClass="bg-[rgba(59,130,246,0.10)] text-[#3B82F6]"
          value={String(totalUsers)}
          label="Atletas totales"
          delta={<span className="text-sm font-medium leading-5 text-text-tertiary">+{new7} en 7 días</span>}
        />
        <StatCard
          icon={<Muscles size={18} />}
          iconClass="bg-[rgba(168,85,247,0.10)] text-[#A855F7]"
          value={String(allSessions.length)}
          label="Sesiones totales"
          delta={<span className="text-sm font-medium leading-5 text-text-tertiary">{sess7.length} en 7 días</span>}
        />
        <StatCard
          icon={<CheckCircle1 size={18} />}
          iconClass="bg-[rgba(34,197,94,0.10)] text-[#22C55E]"
          value={String(allSessions.filter((s) => s.completed).length)}
          label="Completadas"
          delta={<span className="text-sm font-medium leading-5 text-text-tertiary">{sess7.filter((s) => s.completed).length} en 7 días</span>}
        />
        <StatCard
          icon={<Bolt1 size={18} />}
          iconClass="bg-[rgba(249,115,22,0.10)] text-[#F97316]"
          value={String(active7)}
          label="Activos 7d"
          delta={<span className="text-sm font-medium leading-5 text-text-tertiary">≥ 1 sesión</span>}
        />
      </section>

      <section className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
        <h2 className="flex items-center gap-2 font-semibold leading-6 tracking-[-0.2px] text-text-primary">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[rgba(59,130,246,0.10)] text-[#3B82F6]">
            <Icon name="bar_chart" className="text-[18px]" />
          </span>
          Altas por día · últimos 30 días
        </h2>
        <div className="mt-3 flex h-24 items-end gap-1">
          {last30.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.count}`}
              className={`flex-1 rounded-t ${d.count > 0 ? "bg-brand-500" : "bg-background-gray-tertiary"}`}
              style={{ height: `${Math.max(6, Math.round((d.count / maxDay) * 100))}%` }}
            />
          ))}
        </div>
        <div className="tabular mt-1 flex justify-between text-[10px] text-text-tertiary">
          <span>{last30[0].date.slice(5)}</span>
          <span>{last30[29].date.slice(5)}</span>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <section className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5 lg:col-span-8">
          <h2 className="flex items-center gap-2 font-semibold leading-6 tracking-[-0.2px] text-text-primary">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[rgba(168,85,247,0.10)] text-[#A855F7]">
              <Icon name="group" className="text-[18px]" />
            </span>
            Usuarios ({rows.length})
          </h2>
          {rows.length === 0 ? (
            <p className="mt-2 text-sm text-text-tertiary">
              Sin resultados{query ? ` para “${query}”` : ""}.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-card-border p-3"
                >
                  {r.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      src={r.image}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background-gray-secondary text-sm font-medium text-text-primary">
                      {(r.name ?? r.email)[0]?.toUpperCase()}
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-text-primary">
                      {r.name ?? r.email}
                    </span>
                    <span className="truncate text-xs text-text-tertiary">
                      {r.email} · alta {toDayStr(r.createdAt)}
                      {r.lastDate ? ` · última ${r.lastDate}` : " · sin sesiones"}
                    </span>
                  </span>
                  <span className="tabular hidden shrink-0 text-right text-xs text-text-tertiary sm:block">
                    {r.sessionsCount} ses · {r.completed} ✓
                    <br /> {(r.volumeKg / 1000).toFixed(1)} t vol
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-xl border-[0.5px] border-card-border bg-card-background p-5 lg:col-span-4">
          <h2 className="flex items-center gap-2 font-semibold leading-6 tracking-[-0.2px] text-text-primary">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[rgba(34,197,94,0.10)] text-[#22C55E]">
              <Icon name="history" className="text-[18px]" />
            </span>
            Actividad reciente
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-text-tertiary">Aún no hay sesiones.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recent.map((s) => {
                const u = byUser.get(s.userId);
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-background-gray-secondary p-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-text-primary">
                        {u?.name ?? u?.email ?? s.userId.slice(0, 8)}
                      </span>
                      <span className="tabular text-xs text-text-tertiary">
                        {s.date} · rutina #{s.routineId}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${s.completed ? "bg-[rgba(34,197,94,0.10)] text-[#22C55E]" : "bg-background-gray-tertiary text-text-tertiary"}`}
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
      </div>
    </main>
  );
}
