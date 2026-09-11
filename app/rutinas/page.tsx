import Link from "next/link";
import { asc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { exercises, routines } from "@/db/schema";
import { Icon } from "@/app/components/Icon";
import { ExerciseThumb } from "@/app/components/ExerciseThumb";
import { RoutineBuilder } from "@/app/components/RoutineBuilder";
import { DeleteRoutineButton } from "@/app/components/DeleteRoutineButton";
import { ScheduleEditor } from "@/app/components/ScheduleEditor";
import { normalizeExerciseName } from "@/lib/exerciseMedia";
import { getWeekPlan } from "@/lib/schedule";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default async function RutinasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;

  const templates = await db.query.routines.findMany({
    where: isNull(routines.userId),
    orderBy: asc(routines.weekday),
    with: { exercises: { orderBy: asc(exercises.sortOrder) } },
  });

  const mine = await db.query.routines.findMany({
    where: eq(routines.userId, userId),
    orderBy: asc(routines.id),
    with: { exercises: { orderBy: asc(exercises.sortOrder) } },
  });

  // Biblioteca: ejercicios distintos de las plantillas.
  const seen = new Set<string>();
  const library: { name: string; muscle: string | null; sets: number; reps: string }[] = [];
  for (const r of templates) {
    for (const e of r.exercises) {
      const key = normalizeExerciseName(e.name);
      if (seen.has(key)) continue;
      seen.add(key);
      library.push({ name: e.name, muscle: e.muscle, sets: e.sets, reps: e.reps });
    }
  }
  library.sort((a, b) => a.name.localeCompare(b.name, "es"));

  const plan = await getWeekPlan(userId);
  const scheduleInitial = plan.days.map((d) => d.routine?.id ?? null);
  const scheduleOptions = [
    ...templates.map((r) => ({
      id: r.id,
      title: r.weekday !== null ? `${DAYS[r.weekday]} — ${r.title}` : r.title,
      kind: "template" as const,
      weekday: r.weekday,
    })),
    ...mine.map((r) => ({
      id: r.id,
      title: r.title,
      kind: "custom" as const,
      weekday: null as number | null,
    })),
  ];

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 pb-8">
      <div className="pointer-events-none absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 flex flex-col">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Mis rutinas
        </h1>
        <p className="text-sm text-onvariant">
          Las recomendadas son fijas. Crea las tuyas desde la lista o añade un
          ejercicio “Otro”.
        </p>
      </div>

      <div className="relative z-10">
        <ScheduleEditor initial={scheduleInitial} options={scheduleOptions} />
      </div>

      <div className="relative z-10 grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Icon name="verified" className="text-[20px] text-tertiary" />
              Recomendadas (fijas)
            </h2>
            {templates.map((r) => (
              <Link
                key={r.id}
                href={`/rutina/${r.weekday}#registro`}
                className="flex items-center justify-between gap-3 rounded-xl bg-slow p-4 shadow-md transition-all hover:bg-scont"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-bold">
                    {r.weekday !== null && (
                      <span className="mr-2 rounded bg-shigh px-1.5 py-0.5 text-[10px] uppercase text-primary">
                        {DAYS[r.weekday]}
                      </span>
                    )}
                    {r.title}
                  </span>
                  <span className="text-xs text-onvariant">
                    {r.exercises.length} ejercicios · {r.focus ?? ""}
                  </span>
                </span>
                <Icon name="chevron_right" className="text-[20px] text-onvariant" />
              </Link>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Icon name="person" className="text-[20px] text-secondary" />
              Las mías ({mine.length})
            </h2>
            {mine.length === 0 && (
              <p className="rounded-xl bg-slow p-4 text-sm text-onvariant">
                Aún no tienes rutinas propias. Créala aquí al lado 👉
              </p>
            )}
            {mine.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-scont p-4 shadow-md"
              >
                <Link href={`/rutinas/${r.id}#registro`} className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold">{r.title}</span>
                  <span className="text-xs text-onvariant">
                    {r.exercises.length} ejercicios
                    {r.focus ? ` · ${r.focus}` : ""}
                  </span>
                </Link>
                <DeleteRoutineButton id={r.id} title={r.title} />
                <Link
                  href={`/rutinas/${r.id}#registro`}
                  aria-label={`Registrar ${r.title}`}
                  className="rounded-lg bg-pcont px-3 py-1.5 text-xs font-extrabold text-onpcont"
                >
                  Registrar
                </Link>
              </div>
            ))}
          </section>
        </div>

        <div className="lg:col-span-5">
          <RoutineBuilder library={library} />
          <p className="mt-3 text-[10px] text-onvariant">
            Imágenes de ejercicios: free-exercise-db (GitHub, CC).
          </p>
        </div>
      </div>

      {/* Vista previa de la biblioteca con imágenes */}
      <section className="relative z-10 rounded-xl bg-slow p-5 shadow-md sm:p-6">
        <h2 className="text-lg font-semibold">
          Biblioteca de ejercicios ({library.length})
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {library.map((e) => (
            <li
              key={e.name}
              className="flex items-center gap-3 rounded-xl bg-scont p-3"
            >
              <ExerciseThumb name={e.name} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">{e.name}</span>
                <span className="tabular text-xs capitalize text-onvariant">
                  {e.sets} × {e.reps}
                  {e.muscle ? ` · ${e.muscle}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
