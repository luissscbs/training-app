import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { bodyWeights, users } from "@/db/schema";
import { Icon } from "@/app/components/Icon";
import { ProfileForm, WeightLogForm } from "@/app/components/ProfileForms";
import { formatWeight, kgToLb } from "@/lib/units";
import { getRequestToday } from "@/lib/requestDate";

function bmiCategory(bmi: number): { label: string; cls: string } {
  if (bmi < 18.5) return { label: "Bajo peso", cls: "text-secondary" };
  if (bmi < 25) return { label: "Saludable", cls: "text-tertiary" };
  if (bmi < 30) return { label: "Sobrepeso", cls: "text-primary" };
  return { label: "Obesidad", cls: "text-error" };
}

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;

  const rows = await db
    .select({
      unit: users.unit,
      weightKg: users.weightKg,
      heightCm: users.heightCm,
    })
    .from(users)
    .where(eq(users.id, userId));
  const unit: "kg" | "lb" = rows[0]?.unit === "lb" ? "lb" : "kg";
  const weightKg = rows[0]?.weightKg ? Number(rows[0].weightKg) : null;
  const heightCm = rows[0]?.heightCm ? Number(rows[0].heightCm) : null;

  const history = await db.query.bodyWeights.findMany({
    where: eq(bodyWeights.userId, userId),
    orderBy: asc(bodyWeights.date),
    limit: 180,
  });

  const bmi =
    weightKg && heightCm ? weightKg / Math.pow(heightCm / 100, 2) : null;
  const cat = bmi !== null ? bmiCategory(bmi) : null;

  const first = history[0] ? Number(history[0].weightKg) : null;
  const last = history.length > 0 ? Number(history[history.length - 1].weightKg) : null;
  const delta = first !== null && last !== null ? last - first : null;

  // Mini-gráfica SVG con los últimos 30 registros.
  const points = history.slice(-30);
  const vals = points.map((p) => Number(p.weightKg));
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 0;
  const span = Math.max(0.5, max - min);
  const W = 600;
  const H = 120;
  const path =
    points.length > 1
      ? points
          .map((p, i) => {
            const x = (i / (points.length - 1)) * W;
            const y = H - 10 - ((Number(p.weightKg) - min) / span) * (H - 20);
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ")
      : "";

  const displayWeight =
    weightKg !== null
      ? unit === "kg"
        ? String(Math.round(weightKg * 10) / 10)
        : String(Math.round(kgToLb(weightKg) * 10) / 10)
      : "";

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 pb-8">
      <div className="pointer-events-none absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-tertiary/10 blur-3xl" />

      <div className="relative z-10 flex flex-col">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Perfil de atleta
        </h1>
        <p className="text-sm text-onvariant">
          Peso, altura e IMC. El peso se guarda en kg y se convierte a tu unidad.
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-5">
          <section className="rounded-xl bg-slow p-5 shadow-md sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Icon name="person" className="text-[20px] text-primary" />
              Mis datos
            </h2>
            <div className="mt-3">
              <ProfileForm
                key={unit}
                unit={unit}
                initialWeight={displayWeight}
                initialHeightCm={heightCm !== null ? String(heightCm) : ""}
              />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slow p-4 shadow-md">
              <span className="text-xs font-semibold uppercase tracking-wider text-onvariant">
                IMC
              </span>
              <p className="tabular mt-1 text-3xl font-extrabold">
                {bmi !== null ? bmi.toFixed(1) : "—"}
              </p>
              {cat && <p className={`text-xs font-bold ${cat.cls}`}>{cat.label}</p>}
              {!bmi && (
                <p className="text-xs text-onvariant">Faltan peso y altura</p>
              )}
            </div>
            <div className="rounded-xl bg-slow p-4 shadow-md">
              <span className="text-xs font-semibold uppercase tracking-wider text-onvariant">
                Peso actual
              </span>
              <p className="tabular mt-1 text-3xl font-extrabold">
                {weightKg !== null ? formatWeight(weightKg, unit).split(" ")[0] : "—"}
                {weightKg !== null && (
                  <span className="ml-1 text-sm font-bold text-primary">{unit}</span>
                )}
              </p>
              {delta !== null && history.length > 1 && (
                <p className="tabular text-xs text-onvariant">
                  {delta >= 0 ? "+" : ""}
                  {(unit === "kg" ? delta : delta * 2.20462).toFixed(1)} {unit}{" "}
                  desde el primer registro
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-7">
          <section className="rounded-xl bg-slow p-5 shadow-md sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Icon name="monitoring" className="text-[20px] text-secondary" />
              Peso corporal
            </h2>
            <div className="mt-3">
                <WeightLogForm key={unit} unit={unit} today={await getRequestToday()} />
            </div>
            {points.length > 1 ? (
              <div className="mt-4 rounded-xl bg-scont p-3">
                <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full" preserveAspectRatio="none">
                  <path d={path} fill="none" stroke="#9ee939" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <div className="tabular flex justify-between text-[10px] text-onvariant">
                  <span>{points[0].date}</span>
                  <span>
                    mín. {formatWeight(min, unit)} · máx. {formatWeight(max, unit)}
                  </span>
                  <span>{points[points.length - 1].date}</span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-onvariant">
                Registra tu peso cada mañana para ver la curva aquí.
              </p>
            )}
            {history.length > 0 && (
              <ul className="mt-3 flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                {[...history].reverse().slice(0, 30).map((h) => (
                  <li
                    key={h.id}
                    className="tabular flex justify-between rounded-lg bg-scont px-3 py-1.5 text-sm"
                  >
                    <span>{h.date}</span>
                    <span className="font-bold">
                      {formatWeight(Number(h.weightKg), unit)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
