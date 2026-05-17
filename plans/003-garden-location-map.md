# Garden Location & Map Feature

## Overview
Add location-based features to gardens: address input, GPS locate, satellite/street map view using Leaflet with free tile providers. Location data is privacy-stripped for read-only shares.

## Tech Stack (all free, no API keys)
- **Leaflet.js** — Open-source map rendering
- **OpenStreetMap** — Street/plan view tiles
- **Esri World Imagery** — Satellite view tiles (free for personal use)
- **OpenAerialMap** — Optional overlay if coverage exists
- **Nominatim** — Address geocoding (OpenStreetMap)
- **Browser Geolocation API** — GPS locate

## Data Model

### GardenLocation (new type)
```typescript
interface GardenLocation {
  lat: number;
  lng: number;
  address: string;
  zoom: number; // typically 18-20 for a garden
}
```

### Garden (updated)
```typescript
interface Garden {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  location?: GardenLocation; // NEW - optional
  createdAt: Date;
  updatedAt: Date;
}
```

## Privacy Model

When sharing in read-only mode, location data is stripped:

| Field | owner | readwrite | readonly | temp-readonly |
|-------|-------|-----------|----------|---------------|
| location.lat | visible | visible | STRIPPED | STRIPPED |
| location.lng | visible | visible | STRIPPED | STRIPPED |
| location.address | visible | visible | STRIPPED | STRIPPED |
| location.zoom | visible | visible | visible | visible |
| Garden name | visible | visible | visible | visible |
| Plants on map | visible | visible | visible | visible |

## User Flow

1. **Create Garden** → Enter address OR tap GPS locate
2. Address geocoded via Nominatim → lat/lng
3. Map preview shown with satellite imagery
4. User can adjust pin position and zoom
5. Save garden with location
6. **Garden View** → Interactive map with layer toggle (Satellite/Street/OAM)

## Tile Layer Configuration

| Layer | URL | Attribution |
|-------|-----|-------------|
| OpenStreetMap | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | © OpenStreetMap contributors |
| Esri World Imagery | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | © Esri |
| OpenAerialMap | Dynamic via OAM API | © OpenAerialMap contributors |

## New Files

```
src/
├── components/
│   └── GardenMap/
│       ├── GardenMap.tsx          # Leaflet map wrapper
│       ├── GardenMap.module.css
│       └── layers.ts             # Tile layer definitions
├── services/
│   └── geocoding.service.ts      # Nominatim geocoding
├── models/
│   └── garden.ts                 # Updated with GardenLocation
```

## Dependencies
- `leaflet` (map library)
- `@types/leaflet` (TypeScript types)

## Nominatim API Usage
- Endpoint: `https://nominatim.openstreetmap.org/search`
- Rate limit: 1 request/second (we debounce)
- No API key required
- Must include User-Agent header per ToS
