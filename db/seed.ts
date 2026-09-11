import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { exercises, routines } from "./schema";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";

if (!url) throw new Error("Falta DATABASE_URL_UNPOOLED o DATABASE_URL.");

const sql = neon(url);
const db = drizzle(sql);

type SeedExercise = {
  name: string;
  sets: number;
  reps: string;
  muscle?: string;
};

const WEEK: { weekday: number; title: string; focus: string; exercises: SeedExercise[] }[] = [
  {
    weekday: 0,
    title: "Lunes — Pecho + Tríceps",
    focus: "Empuje tren superior",
    exercises: [
      { name: "Press banca con barra", sets: 4, reps: "6-8", muscle: "pecho" },
      { name: "Press inclinado con mancuernas", sets: 3, reps: "8-10", muscle: "pecho" },
      { name: "Aperturas en polea", sets: 3, reps: "10-12", muscle: "pecho" },
      { name: "Fondos en paralelas", sets: 3, reps: "8-10", muscle: "tríceps" },
      { name: "Extensión de tríceps en polea", sets: 3, reps: "10-12", muscle: "tríceps" },
    ],
  },
  {
    weekday: 1,
    title: "Martes — Espalda + Bíceps",
    focus: "Tirón tren superior",
    exercises: [
      { name: "Dominadas (o jalón al pecho)", sets: 4, reps: "6-8", muscle: "espalda" },
      { name: "Remo con barra", sets: 4, reps: "6-8", muscle: "espalda" },
      { name: "Remo en polea baja", sets: 3, reps: "8-10", muscle: "espalda" },
      { name: "Curl con barra", sets: 3, reps: "8-10", muscle: "bíceps" },
      { name: "Curl martillo", sets: 3, reps: "10-12", muscle: "bíceps" },
    ],
  },
  {
    weekday: 2,
    title: "Miércoles — Pierna (cuádriceps)",
    focus: "Tren inferior",
    exercises: [
      { name: "Sentadilla con barra", sets: 4, reps: "5-6", muscle: "cuádriceps" },
      { name: "Prensa de piernas", sets: 3, reps: "8-10", muscle: "cuádriceps" },
      { name: "Zancadas con mancuernas", sets: 3, reps: "10-12", muscle: "cuádriceps" },
      { name: "Extensión de cuádriceps", sets: 3, reps: "12-15", muscle: "cuádriceps" },
      { name: "Gemelos de pie", sets: 4, reps: "12-15", muscle: "gemelos" },
    ],
  },
  {
    weekday: 3,
    title: "Jueves — Hombro + Core",
    focus: "Empuje vertical y zona media",
    exercises: [
      { name: "Press militar con barra", sets: 4, reps: "6-8", muscle: "hombro" },
      { name: "Elevaciones laterales", sets: 3, reps: "12-15", muscle: "hombro" },
      { name: "Pájaros (deltoides posterior)", sets: 3, reps: "12-15", muscle: "hombro" },
      { name: "Plancha", sets: 3, reps: "45-60s", muscle: "core" },
      { name: "Crunch en polea", sets: 3, reps: "12-15", muscle: "core" },
    ],
  },
  {
    weekday: 4,
    title: "Viernes — Full-body fuerza",
    focus: "Básicos pesados",
    exercises: [
      { name: "Peso muerto", sets: 4, reps: "5-6", muscle: "cadena posterior" },
      { name: "Press banca con barra", sets: 3, reps: "6-8", muscle: "pecho" },
      { name: "Remo con barra", sets: 3, reps: "6-8", muscle: "espalda" },
      { name: "Sentadilla frontal", sets: 3, reps: "6-8", muscle: "cuádriceps" },
    ],
  },
  {
    weekday: 5,
    title: "Sábado — Posterior + Glúteo",
    focus: "Tren inferior",
    exercises: [
      { name: "Hip thrust", sets: 4, reps: "8-10", muscle: "glúteo" },
      { name: "Peso muerto rumano", sets: 3, reps: "8-10", muscle: "isquios" },
      { name: "Curl femoral tumbado", sets: 3, reps: "10-12", muscle: "isquios" },
      { name: "Búlgaras", sets: 3, reps: "8-10", muscle: "glúteo" },
      { name: "Gemelos sentado", sets: 3, reps: "12-15", muscle: "gemelos" },
    ],
  },
  {
    weekday: 6,
    title: "Domingo — Movilidad + Core suave",
    focus: "Recuperación activa",
    exercises: [
      { name: "Movilidad de cadera 10'", sets: 1, reps: "10 min", muscle: "movilidad" },
      { name: "Gato-camello + thread the needle", sets: 2, reps: "10-12", muscle: "movilidad" },
      { name: "Dead bug", sets: 3, reps: "8-10", muscle: "core" },
      { name: "Paseo del granjero ligero", sets: 3, reps: "40 m", muscle: "core" },
    ],
  },
];

async function main() {
  for (const day of WEEK) {
    const existing = await db
      .select()
      .from(routines)
      .where(eq(routines.weekday, day.weekday));

    let routineId: number;
    if (existing.length > 0) {
      routineId = existing[0].id;
      console.log(`· ${day.title}: ya existe (id ${routineId}), omito`);
      continue;
    }

    const inserted = await db
      .insert(routines)
      .values({
        weekday: day.weekday,
        title: day.title,
        focus: day.focus,
      })
      .returning({ id: routines.id });
    routineId = inserted[0].id;

    await db.insert(exercises).values(
      day.exercises.map((e, i) => ({
        routineId,
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        sortOrder: i,
        muscle: e.muscle ?? null,
      })),
    );
    console.log(`+ ${day.title}: ${day.exercises.length} ejercicios`);
  }
  console.log("Seed OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
