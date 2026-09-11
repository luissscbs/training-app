export const KG_TO_LB = 2.20462;

export function kgToLb(kg: number): number {
  return kg * KG_TO_LB;
}

export function lbToKg(lb: number): number {
  return lb / KG_TO_LB;
}

export function formatWeight(weightKg: number, unit: "kg" | "lb"): string {
  const value = unit === "kg" ? weightKg : kgToLb(weightKg);
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} ${unit}`;
}
