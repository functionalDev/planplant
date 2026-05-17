# Garden Canvas Editor

## Overview
Redesign the garden view from a live Leaflet map to a **canvas editor** with a captured satellite image as background. Leaflet is used in two modes:
1. **Setup mode** (geo-map): For locating the garden, drawing property borders, and capturing the satellite image
2. **Editor mode** (CRS.Simple): For working on the garden — placing plants, drawing beds, adding notes — on top of the saved satellite image

## Key Concept: Geo-Reference
The garden stores GPS bounds so that:
- Photos taken with GPS can be placed approximately where they were taken on the canvas
- The real-world scale is known (meters per pixel)

## Data Model

### GardenGeoReference
Maps GPS coordinates to canvas pixel coordinates.
```typescript
interface GardenGeoReference {
  topLeft: { lat: number; lng: number };
  bottomRight: { lat: number; lng: number };
  canvasWidth: number;   // pixels
  canvasHeight: number;  // pixels
  realWidth: number;     // meters
  realHeight: number;    // meters
}
```

### GardenElement
Items placed on the garden canvas.
```typescript
interface GardenElement {
  id: string;
  type: 'plant' | 'bed' | 'path' | 'marker' | 'note';
  position: { x: number; y: number };
  label?: string;
  icon?: string;
  polygon?: number[][];   // For beds/paths
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
```

### Updated Garden
```typescript
interface Garden {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  location?: GardenLocation;
  geoReference?: GardenGeoReference;
  backgroundImageId?: string;   // Key to blob in IndexedDB
  border?: number[][];          // Property border polygon
  elements: GardenElement[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Architecture

### Setup Phase Flow
1. User enters address or uses GPS
2. Leaflet geo-map shows satellite tiles (Esri)
3. User adjusts view to show full garden area
4. User optionally draws property border polygon (leaflet-draw)
5. User clicks "Capture" button
6. Map area exported as PNG via html-to-image
7. Geo-reference calculated from map bounds
8. PNG blob + geo-reference + border saved to IndexedDB
9. Navigate to garden editor

### Editor Phase
- Leaflet with CRS.Simple (flat coordinate system, no geo projection)
- Satellite PNG as ImageOverlay background
- Layers (bottom to top):
  - Background satellite image
  - Property border (dashed polygon)
  - Garden beds (filled polygons)
  - Paths (polylines)
  - Plant markers (icons)
  - Notes (text markers)
- Toolbar with tools: Select, Place Plant, Draw Bed, Draw Path, Add Note, Toggle BG

### GPS to Canvas Mapping
```typescript
function gpsToCanvas(
  gps: { lat: number; lng: number },
  ref: GardenGeoReference
): { x: number; y: number } | null {
  const latRange = ref.topLeft.lat - ref.bottomRight.lat;
  const lngRange = ref.bottomRight.lng - ref.topLeft.lng;
  const relLat = (ref.topLeft.lat - gps.lat) / latRange;
  const relLng = (gps.lng - ref.topLeft.lng) / lngRange;
  if (relLat < 0 || relLat > 1 || relLng < 0 || relLng > 1) return null;
  return {
    x: relLng * ref.canvasWidth,
    y: relLat * ref.canvasHeight,
  };
}
```

## Dependencies
- `leaflet-draw` — Polygon drawing on the setup map
- `@types/leaflet-draw` — TypeScript types
- `html-to-image` — Capture map area as PNG

## File Structure

```
src/
├── components/
│   ├── GardenMap/              # Setup phase: geo-map with capture
│   │   ├── GardenMap.tsx       # Refactored: border drawing + capture
│   │   ├── GardenMap.module.css
│   │   └── layers.ts          # Tile layer configs
│   ├── GardenEditor/           # Editor phase: canvas workspace
│   │   ├── GardenEditor.tsx    # Leaflet CRS.Simple + ImageOverlay
│   │   ├── GardenEditor.module.css
│   │   ├── Toolbar.tsx         # Editor tools
│   │   ├── Toolbar.module.css
│   │   └── utils.ts           # GPS↔canvas mapping
├── models/
│   └── garden.ts              # Updated with new types
├── services/
│   └── capture.service.ts     # Map-to-PNG capture logic
├── db/
│   ├── schema.ts              # Updated: add images store
│   └── indexeddb.ts           # Updated: blob storage methods
```

## Privacy Note
When sharing in read-only mode:
- `geoReference` GPS bounds are stripped
- `location` is stripped
- `backgroundImageId` and the image blob ARE shared (the image itself doesn't reveal location without metadata)
- `elements` are shared (plant positions are relative to canvas, not GPS)
