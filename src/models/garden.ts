export interface GardenLocation {
  lat: number;
  lng: number;
  address: string;
  zoom: number;
}

export interface GardenGeoReference {
  /** GPS coordinates of the top-left corner of the captured area */
  topLeft: { lat: number; lng: number };
  /** GPS coordinates of the bottom-right corner of the captured area */
  bottomRight: { lat: number; lng: number };
  /** Canvas dimensions in pixels */
  canvasWidth: number;
  canvasHeight: number;
  /** Real-world dimensions in meters */
  realWidth: number;
  realHeight: number;
}

export type GardenElementType = "plant" | "bed" | "path" | "marker" | "note";

// ── Ground Layer ──

export type GroundType = "bed" | "grass" | "path" | "water" | "building";

export interface GroundRegion {
  id: string;
  type: GroundType;
  /** Outer polygon points as [x, y] canvas coordinates */
  points: number[][];
  /** Holes (inner rings) — each is a polygon of [x, y] points */
  holes?: number[][][];
  createdAt: Date;
}

export function createGroundRegion(
  type: GroundType,
  points: number[][],
): GroundRegion {
  return {
    id: crypto.randomUUID(),
    type,
    points,
    createdAt: new Date(),
  };
}

export interface GardenElement {
  id: string;
  type: GardenElementType;
  /** Position on the canvas in pixel coordinates */
  position: { x: number; y: number };
  label?: string;
  icon?: string;
  /** For beds/paths: array of [x, y] coordinate pairs */
  polygon?: number[][];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface GardenPhoto {
  id: string;
  /** Image blob ID stored in IndexedDB images store */
  imageId: string;
  /** GPS coordinates where the photo was taken */
  gps: { lat: number; lng: number };
  /** Canvas position (computed from GPS + geoReference) */
  position: { x: number; y: number };
  /** Optional label/note */
  label?: string;
  createdAt: Date;
}

export interface Garden {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  location?: GardenLocation;
  geoReference?: GardenGeoReference;
  backgroundImageId?: string;
  /** Property border polygon as array of [x, y] canvas coordinates */
  border?: number[][];
  elements: GardenElement[];
  /** Ground layer regions (beds, grass, paths, water, buildings) */
  groundRegions: GroundRegion[];
  /** Geo-tagged photos placed on the garden map */
  photos: GardenPhoto[];
  createdAt: Date;
  updatedAt: Date;
}

export function createGarden(
  ownerId: string,
  overrides?: Partial<Omit<Garden, "ownerId">>,
): Garden {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    name: "My Garden",
    description: "",
    ownerId,
    elements: [],
    groundRegions: [],
    photos: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createGardenElement(
  type: GardenElementType,
  position: { x: number; y: number },
  overrides?: Partial<Omit<GardenElement, "id" | "type" | "position">>,
): GardenElement {
  return {
    id: crypto.randomUUID(),
    type,
    position,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Strip location data from a garden for privacy (read-only sharing).
 * Removes GPS coordinates but keeps the background image and elements.
 */
export function stripLocationForPrivacy(garden: Garden): Garden {
  const stripped = { ...garden };
  delete stripped.location;
  delete stripped.geoReference;
  return stripped;
}
