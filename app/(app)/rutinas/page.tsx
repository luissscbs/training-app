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
  if (!session?.user?.id) redirect("/login");
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
      title: r.title,
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
    <main className="mt-6 space-y-5">
      <div className="px-2 lg:px-6">
        <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary">
          Mis rutinas
        </h1>
        <p className="text-sm leading-5 text-text-tertiary">
          Las recomendadas son fijas. Crea las tuyas desde la lista o añade un
          ejercicio “Otro”.
        </p>
      </div>

      <div className="space-y-5 px-2 lg:px-5">
      <div>
        <ScheduleEditor initial={scheduleInitial} options={scheduleOptions} />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 font-semibold leading-6 tracking-[-0.2px] text-text-primary">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[rgba(34,197,94,0.10)] text-[#22C55E]">
                <Icon name="verified" className="text-[18px]" />
              </span>
              Recomendadas (fijas)
            </h2>
            {templates.map((r) => (
              <Link
                key={r.id}
                href={`/rutina/${r.weekday}#registro`}
                className="flex items-center justify-between gap-3 rounded-xl border-[0.5px] border-card-border bg-card-background p-4 transition-colors hover:bg-background-gray-secondary"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-text-primary">
                    {r.weekday !== null && (
                      <span className="mr-2 rounded bg-background-gray-secondary px-1.5 py-0.5 text-[10px] uppercase text-brand-500">
                        {DAYS[r.weekday]}
                      </span>
                    )}
                    {r.title}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {r.exercises.length} ejercicios · {r.focus ?? ""}
                  </span>
                </span>
                <Icon name="chevron_right" className="text-[20px] text-text-tertiary" />
              </Link>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 font-semibold leading-6 tracking-[-0.2px] text-text-primary">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[rgba(14,165,233,0.10)] text-[#0EA5E9]">
                <Icon name="person" className="text-[18px]" />
              </span>
              Las mías ({mine.length})
            </h2>
            {mine.length === 0 && (
              <p className="rounded-xl border-[0.5px] border-card-border bg-card-background p-4 text-sm text-text-tertiary">
                Aún no tienes rutinas propias. Créala aquí al lado 👉
              </p>
            )}
            {mine.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border-[0.5px] border-card-border bg-card-background p-4"
              >
                <Link href={`/rutinas/${r.id}#registro`} className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-text-primary">{r.title}</span>
                  <span className="text-xs text-text-tertiary">
                    {r.exercises.length} ejercicios
                    {r.focus ? ` · ${r.focus}` : ""}
                  </span>
                </Link>
                <DeleteRoutineButton id={r.id} title={r.title} />
                <Link
                  href={`/rutinas/${r.id}#registro`}
                  aria-label={`Registrar ${r.title}`}
                  className="rounded-lg bg-button-primary-background px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-button-primary-hover-background"
                >
                  Registrar
                </Link>
              </div>
            ))}
          </section>
        </div>

        <div className="lg:col-span-5">
          <RoutineBuilder library={library} />
          <p className="mt-3 text-[10px] text-text-tertiary">
            Imágenes de ejercicios: free-exercise-db (GitHub, CC).
          </p>
        </div>
      </div>

      {/* Vista previa de la biblioteca con imágenes */}
      <section className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
        <h2 className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">
          Biblioteca de ejercicios ({library.length})
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {library.map((e) => (
            <li
              key={e.name}
              className="flex items-center gap-3 rounded-xl bg-background-gray-secondary p-3"
            >
              <ExerciseThumb name={e.name} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-text-primary">{e.name}</span>
                <span className="tabular text-xs capitalize text-text-tertiary">
                  {e.sets} × {e.reps}
                  {e.muscle ? ` · ${e.muscle}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      </div>
    </main>
  );
}
