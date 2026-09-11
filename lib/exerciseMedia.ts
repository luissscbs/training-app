// Imágenes de ejercicios (free-exercise-db, CC — ver crédito en la app).
// Clave: nombre normalizado en español. Si no hay entrada → icono fallback.
const RAW =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

const BY_FILE: Record<string, string> = {
  "press banca con barra": "Barbell_Bench_Press_-_Medium_Grip",
  "press inclinado con mancuernas": "Incline_Dumbbell_Press",
  "aperturas en polea": "Cable_Crossover",
  "fondos en paralelas": "Dips_-_Triceps_Version",
  "extensión de tríceps en polea": "Cable_One_Arm_Tricep_Extension",
  "dominadas": "Chin-Up",
  "remo con barra": "Bent_Over_Barbell_Row",
  "remo en polea baja": "Elevated_Cable_Rows",
  "curl con barra": "Barbell_Curl",
  "curl martillo": "Hammer_Curls",
  "sentadilla con barra": "Barbell_Squat",
  "prensa de piernas": "Leg_Press",
  "zancadas con mancuernas": "Dumbbell_Lunges",
  "extensión de cuádriceps": "Leg_Extensions",
  "gemelos de pie": "Donkey_Calf_Raises",
  "press militar con barra": "Barbell_Shoulder_Press",
  "elevaciones laterales": "Alternating_Deltoid_Raise",
  "pájaros": "Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench",
  "crunch en polea": "Cable_Crunch",
  "peso muerto": "Barbell_Deadlift",
  "sentadilla frontal": "Front_Squat_Clean_Grip",
  "hip thrust": "Barbell_Hip_Thrust",
  "curl femoral tumbado": "Lying_Leg_Curls",
  "búlgaras": "Dumbbell_Rear_Lunge",
  "gemelos sentado": "Barbell_Seated_Calf_Raise",
  "movilidad de cadera 10'": "90_90_Hamstring",
  "dead bug": "Dead_Bug",
  "paseo del granjero ligero": "Farmers_Walk",
};

export function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** URL de imagen o null si no hay foto para ese ejercicio. */
export function exerciseImage(name: string): string | null {
  const base = BY_FILE[normalizeExerciseName(name)];
  return base ? `${RAW}/${base}/0.jpg` : null;
}

export const IMAGE_CREDIT =
  "Imágenes de ejercicios: free-exercise-db (GitHub, CC).";
