<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Training App — agent notes

Fresh `create-next-app` scaffold (Next 16.3.4 + React 19 + TS5 + Tailwind 4).
DB base lista (2026-09-11): Drizzle + Neon (proyecto `blue-dream-00362098`,
branch `production`), 7 tablas (`users`, `routines`, `exercises`, `sessions`,
`set_logs`, `body_weights`, `schedule`), migraciones en `drizzle/`, seed de 7
rutinas Lun–Dom aplicado. `README.md` describe el target completo; hecho Auth.js
v5 Google login (JWT + sync a `users` en `auth.ts`, ruta
`app/api/auth/[...nextauth]`), front Stitch "Kinetic Dark Athletic"
(sidebar/topbar/nav móvil + Dashboard `/`, calendario `/semana`, registro con
fecha en `/rutina/[weekday]` y `/rutinas/[id]`, `/rutinas` con builder + plan
semanal, `/progreso`, `/perfil` con peso/altura/IMC), actions en
`app/actions.ts`, catálogo de imágenes en `lib/exerciseMedia.ts`
(free-exercise-db). `AUTH_SECRET` en `.env.local`, faltan
`GOOGLE_CLIENT_ID/SECRET` del usuario).
Pendiente: deploy Vercel.
Trust `package.json` over `README.md` hasta que aterricen.

## Commands (verified in `package.json`)

- `npm run dev` / `npm run build` / `npm run start` / `npm run lint` (`lint` = bare `eslint`)
- Typecheck has no script: `npx tsc --noEmit` — verify order: `tsc` → `lint` → `build`
- Single file: `npx eslint <file>`
- No tests, no CI (`.github/` absent), no `opencode.json`; `CLAUDE.md` just points here.
- Shell here is Windows PowerShell 5.1: chain with `; if ($?) { ... }`, never `&&`.

## Structure

- Only source files: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`; `app/favicon.ico` (App Router convention).
- No `src/` — path alias `@/*` maps to repo root (`./`), e.g. `@/app/page`.
- Styling is Tailwind 4 CSS-first: `@import "tailwindcss"` in `globals.css` via `@tailwindcss/postcss`. No `tailwind.config.*` — don't create one.
- `next.config.ts` is empty default; `.env*` + `.next/` + `next-env.d.ts` ignored per `.gitignore`, no env files exist — don't edit `next-env.d.ts`.

## Next 16 gotchas

- `app/layout.tsx` uses typed route props `LayoutProps<"/">` + `next/font/google` (Geist). Keep that signature when editing layout.
- Read the local guide in `node_modules/next/dist/docs/` before writing App Router code and heed deprecation notices. The `BEGIN/END:nextjs-agent-rules` block is re-added by `next dev` — leave it alone.

## Product intent (planned, not code yet)

Fixed routine templates per weekday (user edits only weights/schedule);
weights stored canonical in **kg**, UI converts to lb per user preference.
