import { redirect } from "next/navigation";
import { auth, googleConfigured, signIn } from "@/auth";
import { BrandLogo } from "@/app/components/BrandLogo";
import { Icon } from "@/app/components/Icon";

export const metadata = {
  title: "Entrar · Forge",
  description: "Inicia sesión para registrar tus entrenamientos",
};

async function signInAction() {
  "use server";
  await signIn("google", { redirectTo: "/" });
}

const FEATURES = [
  {
    icon: "calendar_month",
    title: "Tu semana planificada",
    sub: "Rutina asignada a cada día, sin pensar qué toca",
  },
  {
    icon: "fitness_center",
    title: "Registro en segundos",
    sub: "Anota pesos en kg o lb mientras entrenas",
  },
  {
    icon: "monitoring",
    title: "Progreso visible",
    sub: "Volumen, rachas y marcas personales por ejercicio",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const params = (await searchParams) ?? {};
  const authError = params.error === "OAuthAccountNotLinked";

  return (
    <main className="grid min-h-dvh bg-background-gray-secondary lg:grid-cols-[1.05fr_1fr]">
      {/* ---- Panel marca (se mantiene) ---- */}
      <section className="relative hidden overflow-hidden bg-brand-500 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 15%, rgba(255,255,255,.5), transparent 45%), radial-gradient(circle at 85% 80%, rgba(0,0,0,.35), transparent 50%)",
          }}
        />
        <div className="relative">
          <BrandLogo variant="dark-panel" />
        </div>

        <div className="relative flex max-w-md flex-col gap-3">
          <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
            Training Tracker
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
            Tu entrenamiento, bajo control.
          </h1>
          <p className="text-sm leading-relaxed text-white/80">
            Rutinas fijas de lunes a domingo. Tú solo registras pesos y marcas
            tus sesiones; Forge calcula volumen, rachas y récords.
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-2">
            {[
              { value: "7/7", label: "Días con rutina" },
              { value: "kg·lb", label: "A tu elección" },
              { value: "+∞", label: "Historial completo" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-white/10 p-3 backdrop-blur-sm"
              >
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-2xl font-extrabold tabular text-white">
                  {s.value}
                </dd>
                <dd className="mt-0.5 text-[11px] font-semibold text-white/70">
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative flex items-center gap-1.5 text-xs text-white/70">
          <Icon name="devices" className="text-[16px]" />
          Disponible en todos tus dispositivos
        </p>
      </section>

      {/* ---- Columna acceso ---- */}
      <section className="relative flex min-h-dvh flex-col justify-center gap-8 px-4 py-10 sm:px-8">
        <div className="mx-auto flex w-full max-w-md flex-col justify-center">
          <div className="mb-6 lg:hidden">
            <BrandLogo />
          </div>

          <div className="rounded-2xl border-[0.5px] border-card-border bg-card-background p-6 shadow-[0_32px_64px_-12px_rgba(16,24,40,0.14)] sm:p-8">
            <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Acceso
            </p>
            <h1 className="mt-1 text-[28px] font-medium leading-9 text-text-primary">
              Bienvenido a Forge
            </h1>
            <p className="mt-1 text-sm leading-5 text-text-tertiary">
              Entra con tu cuenta de Google para ver tu rutina de hoy.
            </p>

            {!googleConfigured ? (
              <p className="mt-6 rounded-lg border border-error-500/40 bg-error-500/10 p-3 text-sm text-error-500">
                Falta configurar Google login: añade{" "}
                <code className="font-mono text-xs">GOOGLE_CLIENT_ID</code> y{" "}
                <code className="font-mono text-xs">GOOGLE_CLIENT_SECRET</code>{" "}
                en <code className="font-mono text-xs">.env.local</code> (ver{" "}
                <code className="font-mono text-xs">.env.example</code>).
              </p>
            ) : (
              <form action={signInAction} className="mt-6">
                <button
                  type="submit"
                  className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-card-border bg-card-background px-5 text-sm font-medium text-text-primary shadow-xs transition-colors hover:bg-background-gray-secondary focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20"
                >
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                    <path
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continuar con Google
                </button>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-tertiary">
                  <Icon name="lock" className="text-[14px]" />
                  Conexión segura con tu cuenta de Google
                </p>
              </form>
            )}

            {authError && (
              <p className="mt-4 rounded-lg border border-error-500/40 bg-error-500/10 p-3 text-sm text-error-500">
                Esa cuenta ya está vinculada con otro método. Usa el acceso
                original o contacta al administrador.
              </p>
            )}

            <div className="mt-6 space-y-1 border-t-[0.5px] border-card-border pt-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-3 py-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                    <Icon name={f.icon} className="text-[18px]" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-text-primary">
                      {f.title}
                    </span>
                    <span className="text-sm text-text-tertiary">{f.sub}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-text-tertiary">
            Al continuar aceptas entrenar con constancia.
            <br />
            Tus pesos se guardan siempre en kg, los ves en kg o lb.
          </p>
        </div>
      </section>
    </main>
  );
}
