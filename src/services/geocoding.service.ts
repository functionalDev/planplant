export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "PlanPlant/0.1.0 (garden documentation app)";

/**
 * Search for an address using Nominatim (OpenStreetMap geocoder).
 * Rate limit: max 1 request per second.
 */
export async function geocodeAddress(
  query: string,
): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "5",
    addressdetails: "1",
  });

  const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.statusText}`);
  }

  const data = await response.json();

  return data.map(
    (item: { lat: string; lon: string; display_name: string }) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
    }),
  );
}

/**
 * Reverse geocode coordinates to an address using Nominatim.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    format: "json",
  });

  const response = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (!data || data.error) return null;

  return {
    lat: parseFloat(data.lat),
    lng: parseFloat(data.lon),
    displayName: data.display_name,
  };
}

/**
 * Get current position using the Browser Geolocation API.
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
}
