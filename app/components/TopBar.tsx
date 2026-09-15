import { eq } from "drizzle-orm";
import Link from "next/link";
import { auth, googleConfigured, signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Icon } from "@/app/components/Icon";
import { UnitToggle } from "@/app/components/UnitToggle";
import { parseDateStr } from "@/lib/dates";
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
  const now = parseDateStr(await getRequestToday());
  const dateLabel = `${WEEKDAYS[(now.getDay() + 6) % 7]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;

  let unit: "kg" | "lb" = "kg";
  if (session?.user?.id) {
    const rows = await db
      .select({ unit: users.unit })
      .from(users)
      .where(eq(users.id, session.user.id));
    if (rows[0]?.unit === "lb") unit = "lb";
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between bg-surface/80 px-4 backdrop-blur-xl sm:px-6 lg:left-72 lg:px-8">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Ir al inicio"
          className="flex items-center gap-1.5 rounded-full bg-slow px-3 py-1.5 transition-opacity hover:opacity-80 lg:hidden"
        >
          <Icon name="fitness_center" className="text-[16px] text-primary" />
          <span className="text-sm font-extrabold tracking-tight">KINETIX</span>
        </Link>
        <span className="hidden items-center gap-1.5 rounded-full bg-slow px-4 py-1.5 sm:flex">
          <Icon name="calendar_today" className="text-[16px] text-primary" />
          <span className="text-xs font-semibold">{dateLabel}</span>
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {session?.user && <UnitToggle unit={unit} />}
        {session?.user ? (
          <form action={signOutAction} className="flex items-center gap-2">
            <Link href="/perfil" className="hidden flex-col text-right md:flex">
              <span className="text-sm font-bold leading-tight hover:text-primary">
                {session.user.name ?? session.user.email}
              </span>
              <span className="text-[10px] text-onvariant">Ver perfil</span>
            </Link>
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Perfil"
                src={session.user.image}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-shigh text-sm font-bold text-primary ring-2 ring-primary/20">
                {(session.user.name ?? session.user.email ?? "?")[0]?.toUpperCase()}
              </span>
            )}
            <button
              type="submit"
              title="Salir"
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-onvariant hover:bg-shigh hover:text-onsurface"
            >
              Salir
            </button>
          </form>
        ) : googleConfigured ? (
          <form action={signInAction}>
            <button
              type="submit"
              className="rounded-lg bg-pcont px-4 py-2 text-sm font-extrabold text-onpcont shadow-[0_0_24px_-2px_rgba(132,204,22,0.45)] transition-all hover:scale-[1.02]"
            >
              Entrar con Google
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
