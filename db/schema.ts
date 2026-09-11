import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Preferencia de unidad canónica: los pesos se guardan en kg.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  unit: text("unit", { enum: ["kg", "lb"] }).notNull().default("kg"),
  // Perfil de atleta (opcionales hasta que el usuario los complete).
  weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
  heightCm: numeric("height_cm", { precision: 5, scale: 1 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Plantillas fijas globales (userId NULL, weekday 0=Lun … 6=Dom)
// + rutinas personalizadas del atleta (userId propio, weekday NULL).
export const routines = pgTable(
  "routines",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    weekday: integer("weekday"),
    title: text("title").notNull(),
    focus: text("focus"),
    description: text("description"),
  },
  (t) => [uniqueIndex("routines_weekday_unique").on(t.weekday)],
);

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  routineId: integer("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sets: integer("sets").notNull(),
  reps: text("reps").notNull(), // p.ej. "8-12" — plantilla, no se edita en sesión
  sortOrder: integer("sort_order").notNull().default(0),
  muscle: text("muscle"),
});

// Sesión del usuario: solo edita pesos/horario, no la plantilla.
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  routineId: integer("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "restrict" }),
  date: date("date").notNull(),
  completed: boolean("completed").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Pesos en kg (canónico). La UI convierte a lb según users.unit.
export const setLogs = pgTable("set_logs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  setNo: integer("set_no").notNull(),
  weightKg: numeric("weight_kg", { precision: 6, scale: 2 }).notNull(),
  reps: integer("reps").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  routines: many(routines),
  bodyWeights: many(bodyWeights),
  schedule: many(schedule),
}));

export const routinesRelations = relations(routines, ({ one, many }) => ({
  user: one(users, { fields: [routines.userId], references: [users.id] }),
  exercises: many(exercises),
  sessions: many(sessions),
}));

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  routine: one(routines, {
    fields: [exercises.routineId],
    references: [routines.id],
  }),
  setLogs: many(setLogs),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  routine: one(routines, {
    fields: [sessions.routineId],
    references: [routines.id],
  }),
  setLogs: many(setLogs),
}));

export const setLogsRelations = relations(setLogs, ({ one }) => ({
  session: one(sessions, {
    fields: [setLogs.sessionId],
    references: [sessions.id],
  }),
  exercise: one(exercises, {
    fields: [setLogs.exerciseId],
    references: [exercises.id],
  }),
}));

// Peso corporal del atleta (canónico kg). Un registro por día (se actualiza).
export const bodyWeights = pgTable(
  "body_weights",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    weightKg: numeric("weight_kg", { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("body_weights_user_date_unique").on(t.userId, t.date)],
);

export const bodyWeightsRelations = relations(bodyWeights, ({ one }) => ({
  user: one(users, { fields: [bodyWeights.userId], references: [users.id] }),
}));

// Plan semanal del atleta: qué rutina toca cada día (0=Lun … 6=Dom).
// routineId NULL = descanso. Sin filas = plantillas por defecto.
export const schedule = pgTable(
  "schedule",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    routineId: integer("routine_id").references(() => routines.id, {
      onDelete: "set null",
    }),
  },
  (t) => [uniqueIndex("schedule_user_weekday_unique").on(t.userId, t.weekday)],
);

export const scheduleRelations = relations(schedule, ({ one }) => ({
  user: one(users, { fields: [schedule.userId], references: [users.id] }),
  routine: one(routines, {
    fields: [schedule.routineId],
    references: [routines.id],
  }),
}));
