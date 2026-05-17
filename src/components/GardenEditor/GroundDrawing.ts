import L from "leaflet";

/**
 * Ramer-Douglas-Peucker algorithm for polyline simplification.
 */
export function simplifyPoints(
  points: number[][],
  epsilon: number = 2,
): number[][] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIndex = 0;

  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPoints(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyPoints(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [start, end];
}

function perpendicularDistance(
  point: number[],
  lineStart: number[],
  lineEnd: number[],
): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];

  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      (point[0] - lineStart[0]) ** 2 + (point[1] - lineStart[1]) ** 2,
    );
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) /
        (dx * dx + dy * dy),
    ),
  );

  const projX = lineStart[0] + t * dx;
  const projY = lineStart[1] + t * dy;

  return Math.sqrt((point[0] - projX) ** 2 + (point[1] - projY) ** 2);
}

/**
 * Convert pixel distance to map units at the current zoom level.
 * This ensures the visual brush stroke matches the final polygon size.
 */
function pixelsToMapUnits(map: L.Map, pixels: number): number {
  const center = map.getCenter();
  const centerPoint = map.latLngToContainerPoint(center);
  const offsetPoint = L.point(centerPoint.x + pixels, centerPoint.y);
  const offsetLatLng = map.containerPointToLatLng(offsetPoint);
  // Use lng difference as the map unit distance (CRS.Simple uses x=lng, y=lat)
  return Math.abs(offsetLatLng.lng - center.lng);
}

/**
 * Expand a polyline into a polygon by offsetting it by brushRadius (in map units).
 * Creates a "thick stroke" polygon from a center line.
 */
function expandPathToPolygon(
  centerLine: number[][],
  brushRadius: number,
): number[][] {
  if (centerLine.length < 2) return centerLine;

  const left: number[][] = [];
  const right: number[][] = [];

  for (let i = 0; i < centerLine.length; i++) {
    const curr = centerLine[i];
    let dx: number, dy: number;

    if (i === 0) {
      dx = centerLine[1][0] - curr[0];
      dy = centerLine[1][1] - curr[1];
    } else if (i === centerLine.length - 1) {
      dx = curr[0] - centerLine[i - 1][0];
      dy = curr[1] - centerLine[i - 1][1];
    } else {
      dx = centerLine[i + 1][0] - centerLine[i - 1][0];
      dy = centerLine[i + 1][1] - centerLine[i - 1][1];
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;

    // Normal vector (perpendicular)
    const nx = -dy / len;
    const ny = dx / len;

    left.push([curr[0] + nx * brushRadius, curr[1] + ny * brushRadius]);
    right.push([curr[0] - nx * brushRadius, curr[1] - ny * brushRadius]);
  }

  // Combine: left forward + right reversed to form a closed polygon
  right.reverse();
  const polygon = [...left, ...right];
  // Close it
  if (polygon.length > 0) {
    polygon.push([...polygon[0]]);
  }
  return polygon;
}

/**
 * Drawing style: "paint" expands the stroke into a thick polygon,
 * "region" connects start to end forming a closed polygon outline.
 */
export type DrawStyle = "paint" | "region";

/**
 * Manages freehand drawing on a Leaflet CRS.Simple map.
 * Uses DOM events directly for reliable capture.
 *
 * Supports two styles:
 * - "paint": brush stroke expanded into a polygon (thick line)
 * - "region": freehand polygon where start and end are connected
 */
export class FreehandDrawingEngine {
  private map: L.Map;
  private points: number[][] = [];
  private isDrawing = false;
  private tempPolyline: L.Polyline | null = null;
  private color: string;
  private brushSize: number; // in pixels
  private drawStyle: DrawStyle;
  private onComplete: (points: number[][]) => void;

  constructor(
    map: L.Map,
    color: string,
    onComplete: (points: number[][]) => void,
    brushSize: number = 12,
    drawStyle: DrawStyle = "paint",
  ) {
    this.map = map;
    this.color = color;
    this.onComplete = onComplete;
    this.brushSize = brushSize;
    this.drawStyle = drawStyle;
  }

  start() {
    const container = this.map.getContainer();
    container.addEventListener("mousedown", this.handleDomMouseDown);
    container.addEventListener("touchstart", this.handleDomTouchStart, { passive: false });
  }

  stop() {
    const container = this.map.getContainer();
    container.removeEventListener("mousedown", this.handleDomMouseDown);
    container.removeEventListener("mousemove", this.handleDomMouseMove);
    container.removeEventListener("mouseup", this.handleDomMouseUp);
    container.removeEventListener("touchstart", this.handleDomTouchStart);
    container.removeEventListener("touchmove", this.handleDomTouchMove);
    container.removeEventListener("touchend", this.handleDomTouchEnd);
    this.cleanup();
  }

  setColor(color: string) {
    this.color = color;
  }

  setBrushSize(size: number) {
    this.brushSize = size;
  }

  setDrawStyle(style: DrawStyle) {
    this.drawStyle = style;
  }

  private containerToLatLng(e: MouseEvent | Touch): L.LatLng {
    const container = this.map.getContainer();
    const rect = container.getBoundingClientRect();
    const point = L.point(e.clientX - rect.left, e.clientY - rect.top);
    return this.map.containerPointToLatLng(point);
  }

  private handleDomMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const latlng = this.containerToLatLng(e);
    this.startDrawing(latlng);

    const container = this.map.getContainer();
    container.addEventListener("mousemove", this.handleDomMouseMove);
    container.addEventListener("mouseup", this.handleDomMouseUp);
  };

  private handleDomMouseMove = (e: MouseEvent) => {
    if (!this.isDrawing) return;
    e.preventDefault();
    const latlng = this.containerToLatLng(e);
    this.addPoint(latlng);
  };

  private handleDomMouseUp = () => {
    this.finishDrawing();
    const container = this.map.getContainer();
    container.removeEventListener("mousemove", this.handleDomMouseMove);
    container.removeEventListener("mouseup", this.handleDomMouseUp);
  };

  private handleDomTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const latlng = this.containerToLatLng(e.touches[0]);
      this.startDrawing(latlng);

      const container = this.map.getContainer();
      container.addEventListener("touchmove", this.handleDomTouchMove, { passive: false });
      container.addEventListener("touchend", this.handleDomTouchEnd);
    }
  };

  private handleDomTouchMove = (e: TouchEvent) => {
    if (!this.isDrawing) return;
    e.preventDefault();
    const latlng = this.containerToLatLng(e.touches[0]);
    this.addPoint(latlng);
  };

  private handleDomTouchEnd = () => {
    this.finishDrawing();
    const container = this.map.getContainer();
    container.removeEventListener("touchmove", this.handleDomTouchMove);
    container.removeEventListener("touchend", this.handleDomTouchEnd);
  };

  private startDrawing(latlng: L.LatLng) {
    this.isDrawing = true;
    this.points = [[latlng.lng, latlng.lat]];

    if (this.drawStyle === "paint") {
      // Paint mode: show thick stroke preview
      this.tempPolyline = L.polyline([], {
        color: this.color,
        weight: this.brushSize,
        opacity: 0.6,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(this.map);
    } else {
      // Region mode: show thin outline preview
      this.tempPolyline = L.polyline([], {
        color: this.color,
        weight: 2,
        opacity: 0.8,
        dashArray: "6, 4",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(this.map);
    }
  }

  private addPoint(latlng: L.LatLng) {
    this.points.push([latlng.lng, latlng.lat]);
    if (this.tempPolyline) {
      this.tempPolyline.addLatLng(latlng);
    }
  }

  private finishDrawing() {
    this.isDrawing = false;

    if (this.points.length < 3) {
      this.cleanup();
      return;
    }

    // Simplify the path
    const simplified = simplifyPoints(this.points, 1.5);

    let polygon: number[][];

    if (this.drawStyle === "paint") {
      // Paint mode: expand the center line into a polygon using brush radius in map units
      const brushRadiusMapUnits = pixelsToMapUnits(this.map, this.brushSize / 2);
      polygon = expandPathToPolygon(simplified, brushRadiusMapUnits);
    } else {
      // Region mode: close the polygon by connecting end to start
      polygon = [...simplified];
      // Ensure it's closed
      const first = polygon[0];
      const last = polygon[polygon.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        polygon.push([...first]);
      }
    }

    this.cleanup();

    if (polygon.length >= 3) {
      this.onComplete(polygon);
    }
  }

  private cleanup() {
    if (this.tempPolyline) {
      this.tempPolyline.remove();
      this.tempPolyline = null;
    }
    this.points = [];
  }
}
