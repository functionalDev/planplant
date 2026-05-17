import type { GroundType } from "~/models";

export interface GroundTypeConfig {
  id: GroundType;
  label: string;
  icon: string;
  color: string;
}

export const GROUND_TYPES: GroundTypeConfig[] = [
  { id: "bed", label: "Bed", icon: "🟫", color: "#8B4513" },
  { id: "grass", label: "Grass", icon: "🌿", color: "#4CAF50" },
  { id: "path", label: "Path", icon: "🛤️", color: "#9E9E9E" },
  { id: "water", label: "Water", icon: "💧", color: "#2196F3" },
  { id: "building", label: "Building", icon: "🏠", color: "#212121" },
];

/** Z-order for ground layer stacking (lower = rendered first / behind) */
const GROUND_Z_ORDER: Record<GroundType, number> = {
  grass: 0,
  bed: 1,
  water: 1,
  path: 2,
  building: 2,
};

export function getGroundColor(type: GroundType): string {
  return GROUND_TYPES.find((t) => t.id === type)?.color ?? "#9E9E9E";
}

export function getGroundZOrder(type: GroundType): number {
  return GROUND_Z_ORDER[type] ?? 1;
}
