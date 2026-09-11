# Training App 🏋️

App web para registrar entrenamientos: rutinas predefinidas por día de la semana, calendario de sesiones, registro de pesos y unidades configurables (kg/lb). Con dashboard de progreso e inicio de sesión con Google.

> Proyecto en construcción (MVP).

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **Auth.js v5** — login con Google
- **Neon Postgres + Drizzle** — base de datos serverless y ORM
- **Vercel** — deploy continuo desde `main`

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completar DATABASE_URL, GOOGLE_CLIENT_ID/SECRET, AUTH_SECRET
npm run db:migrate           # aplicar migraciones
npm run db:seed              # rutinas Lun–Dom predefinidas
npm run dev                  # http://localhost:3000
```

## Scripts

| Comando           | Qué hace                              |
| ----------------- | ------------------------------------- |
| `npm run dev`     | servidor de desarrollo                |
| `npm run build`   | build de producción (lo que usa Vercel)|
| `npm run start`   | sirve el build de producción          |
| `npm run lint`    | ESLint                                |
| `npm run db:migrate` | aplica migraciones Drizzle         |
| `npm run db:seed` | carga las 7 rutinas predefinidas      |

## Decisiones clave

- Las rutinas son **plantillas fijas** (ejercicios, series, reps); el usuario solo edita **pesos y horarios** de sus sesiones.
- Los pesos se guardan en **kg** (unidad canónica) y la UI convierte a lb según la preferencia del usuario.
- `.env.local` nunca se commitea; en Vercel las vars se configuran en el dashboard del proyecto.
