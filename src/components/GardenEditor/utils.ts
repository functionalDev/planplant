import type { GardenGeoReference } from "~/models";

/**
 * Convert GPS coordinates to canvas pixel coordinates.
 * Returns null if the GPS point is outside the garden bounds.
 */
export function gpsToCanvas(
  gps: { lat: number; lng: number },
  ref: GardenGeoReference,
): { x: number; y: number } | null {
  const latRange = ref.topLeft.lat - ref.bottomRight.lat;
  const lngRange = ref.bottomRight.lng - ref.topLeft.lng;

  if (latRange === 0 || lngRange === 0) return null;

  const relLat = (ref.topLeft.lat - gps.lat) / latRange;
  const relLng = (gps.lng - ref.topLeft.lng) / lngRange;

  // Check if point is within bounds (with small tolerance)
  const tolerance = 0.05;
  if (
    relLat < -tolerance ||
    relLat > 1 + tolerance ||
    relLng < -tolerance ||
    relLng > 1 + tolerance
  ) {
    return null;
  }

  return {
    x: Math.max(0, Math.min(ref.canvasWidth, relLng * ref.canvasWidth)),
    y: Math.max(0, Math.min(ref.canvasHeight, relLat * ref.canvasHeight)),
  };
}

/**
 * Convert canvas pixel coordinates to GPS coordinates.
 */
export function canvasToGps(
  point: { x: number; y: number },
  ref: GardenGeoReference,
): { lat: number; lng: number } {
  const relX = point.x / ref.canvasWidth;
  const relY = point.y / ref.canvasHeight;

  const latRange = ref.topLeft.lat - ref.bottomRight.lat;
  const lngRange = ref.bottomRight.lng - ref.topLeft.lng;

  return {
    lat: ref.topLeft.lat - relY * latRange,
    lng: ref.topLeft.lng + relX * lngRange,
  };
}

/**
 * Calculate the scale: meters per pixel.
 */
export function getMetersPerPixel(ref: GardenGeoReference): {
  x: number;
  y: number;
} {
  return {
    x: ref.realWidth / ref.canvasWidth,
    y: ref.realHeight / ref.canvasHeight,
  };
}
