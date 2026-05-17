/**
 * Polygon union: merges two overlapping polygons into one.
 *
 * Algorithm:
 * 1. Find all intersection points between edges of R1 and R2
 * 2. Walk along R1's boundary; at each intersection, switch to R2's
 *    boundary (the portion outside R1), then switch back at the next intersection
 * 3. Produces the outer union boundary
 *
 * Polygons are arrays of [x, y] points. They may or may not be "closed"
 * (last point === first point). This code handles both.
 */

const EPSILON = 1e-10;

/** Ensure polygon is closed (last point equals first). Returns a new array. */
function ensureClosed(poly: number[][]): number[][] {
  if (poly.length < 2) return [...poly];
  const first = poly[0];
  const last = poly[poly.length - 1];
  if (Math.abs(first[0] - last[0]) < EPSILON && Math.abs(first[1] - last[1]) < EPSILON) {
    return [...poly];
  }
  return [...poly, [first[0], first[1]]];
}

/** Remove closing point if present. */
function ensureOpen(poly: number[][]): number[][] {
  if (poly.length < 2) return [...poly];
  const first = poly[0];
  const last = poly[poly.length - 1];
  if (Math.abs(first[0] - last[0]) < EPSILON && Math.abs(first[1] - last[1]) < EPSILON) {
    return poly.slice(0, -1);
  }
  return [...poly];
}

/** Compute the signed area of a polygon (positive = CCW, negative = CW). */
function signedArea(poly: number[][]): number {
  let area = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += poly[i][0] * poly[j][1];
    area -= poly[j][0] * poly[i][1];
  }
  return area / 2;
}

/** Ensure polygon is counter-clockwise. */
function ensureCCW(poly: number[][]): number[][] {
  const open = ensureOpen(poly);
  if (signedArea(open) < 0) {
    open.reverse();
  }
  return open;
}

/** Point-in-polygon test (ray casting). */
export function pointInPolygon(px: number, py: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

interface Intersection {
  point: number[];
  /** Parameter along edge of polygon A (0..1) */
  tA: number;
  /** Index of the edge in polygon A */
  edgeA: number;
  /** Parameter along edge of polygon B (0..1) */
  tB: number;
  /** Index of the edge in polygon B */
  edgeB: number;
}

/**
 * Find intersection point of two line segments.
 * Segment 1: p1 -> p2, Segment 2: p3 -> p4
 * Returns { point, t1, t2 } or null if no intersection.
 */
function segmentIntersection(
  p1: number[], p2: number[],
  p3: number[], p4: number[],
): { point: number[]; t1: number; t2: number } | null {
  const dx1 = p2[0] - p1[0];
  const dy1 = p2[1] - p1[1];
  const dx2 = p4[0] - p3[0];
  const dy2 = p4[1] - p3[1];

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < EPSILON) return null; // Parallel or collinear

  const t1 = ((p3[0] - p1[0]) * dy2 - (p3[1] - p1[1]) * dx2) / denom;
  const t2 = ((p3[0] - p1[0]) * dy1 - (p3[1] - p1[1]) * dx1) / denom;

  if (t1 < EPSILON || t1 > 1 - EPSILON || t2 < EPSILON || t2 > 1 - EPSILON) {
    return null; // Intersection outside segment bounds
  }

  return {
    point: [p1[0] + t1 * dx1, p1[1] + t1 * dy1],
    t1,
    t2,
  };
}

/**
 * Find all intersection points between edges of polyA and polyB.
 * Both polygons should be open (not closed).
 */
function findAllIntersections(polyA: number[][], polyB: number[][]): Intersection[] {
  const intersections: Intersection[] = [];

  for (let i = 0; i < polyA.length; i++) {
    const a1 = polyA[i];
    const a2 = polyA[(i + 1) % polyA.length];

    for (let j = 0; j < polyB.length; j++) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % polyB.length];

      const result = segmentIntersection(a1, a2, b1, b2);
      if (result) {
        intersections.push({
          point: result.point,
          tA: result.t1,
          edgeA: i,
          tB: result.t2,
          edgeB: j,
        });
      }
    }
  }

  return intersections;
}

/**
 * Build an augmented polygon: insert intersection points into the polygon's
 * edge list at the correct positions.
 * Returns a new point array with intersections inserted.
 * Also returns a map from intersection index to position in the augmented array.
 */
function augmentPolygon(
  poly: number[][],
  intersections: Intersection[],
  edgeKey: "edgeA" | "edgeB",
  tKey: "tA" | "tB",
): { points: number[][]; intersectionIndices: Map<number, number> } {
  // Group intersections by edge
  const byEdge = new Map<number, { idx: number; t: number; point: number[] }[]>();
  intersections.forEach((ix, idx) => {
    const edge = ix[edgeKey];
    if (!byEdge.has(edge)) byEdge.set(edge, []);
    byEdge.get(edge)!.push({ idx, t: ix[tKey], point: ix.point });
  });

  const result: number[][] = [];
  const intersectionIndices = new Map<number, number>();

  for (let i = 0; i < poly.length; i++) {
    result.push(poly[i]);

    const edgeIntersections = byEdge.get(i);
    if (edgeIntersections) {
      // Sort by parameter t along the edge
      edgeIntersections.sort((a, b) => a.t - b.t);
      for (const ei of edgeIntersections) {
        intersectionIndices.set(ei.idx, result.length);
        result.push(ei.point);
      }
    }
  }

  return { points: result, intersectionIndices };
}

/**
 * Union two polygons. Returns the merged polygon points.
 * If the polygons don't actually intersect, returns null.
 */
export function unionPolygons(rawA: number[][], rawB: number[][]): number[][] | null {
  // Normalize: ensure CCW, open
  const polyA = ensureCCW(ensureOpen(rawA));
  const polyB = ensureCCW(ensureOpen(rawB));

  // Find intersections
  const intersections = findAllIntersections(polyA, polyB);

  if (intersections.length < 2) {
    // No proper intersection — check containment
    // If B is entirely inside A, return A
    if (polyB.every(p => pointInPolygon(p[0], p[1], polyA))) {
      return ensureClosed(polyA);
    }
    // If A is entirely inside B, return B
    if (polyA.every(p => pointInPolygon(p[0], p[1], polyB))) {
      return ensureClosed(polyB);
    }
    // No overlap
    return null;
  }

  // Augment both polygons with intersection points
  const augA = augmentPolygon(polyA, intersections, "edgeA", "tA");
  const augB = augmentPolygon(polyB, intersections, "edgeB", "tB");

  // Build lookup: for each intersection index, where is it in augA and augB?
  // We need to be able to jump from augA to augB and vice versa at intersection points.

  // Walk the union boundary:
  // Start from a point of A that is outside B (guaranteed to be on the union boundary)
  // Walk along A. When we hit an intersection point, switch to B (walking the part outside A).
  // When we hit the next intersection on B, switch back to A.

  // Find a starting point on A that is outside B
  let startIdx = -1;
  for (let i = 0; i < augA.points.length; i++) {
    const p = augA.points[i];
    // Check if this is an intersection point
    let isIntersection = false;
    for (const [, idx] of augA.intersectionIndices) {
      if (idx === i) { isIntersection = true; break; }
    }
    if (!isIntersection && !pointInPolygon(p[0], p[1], polyB)) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) {
    // All points of A are inside B — return B
    return ensureClosed(polyB);
  }

  // Build reverse lookup: augA index -> intersection index, augB index -> intersection index
  const augAToIx = new Map<number, number>();
  for (const [ixIdx, augIdx] of augA.intersectionIndices) {
    augAToIx.set(augIdx, ixIdx);
  }
  const augBToIx = new Map<number, number>();
  for (const [ixIdx, augIdx] of augB.intersectionIndices) {
    augBToIx.set(augIdx, ixIdx);
  }
  // Reverse: intersection index -> augB index
  const ixToAugB = new Map<number, number>();
  for (const [ixIdx, augIdx] of augB.intersectionIndices) {
    ixToAugB.set(ixIdx, augIdx);
  }
  const ixToAugA = new Map<number, number>();
  for (const [ixIdx, augIdx] of augA.intersectionIndices) {
    ixToAugA.set(ixIdx, augIdx);
  }

  const result: number[][] = [];
  const maxSteps = augA.points.length + augB.points.length + intersections.length * 2;
  let steps = 0;

  let currentPoly: "A" | "B" = "A";
  let currentIdx = startIdx;
  const visited = new Set<string>();

  while (steps < maxSteps) {
    steps++;
    const key = `${currentPoly}:${currentIdx}`;
    if (visited.has(key) && result.length > 2) break;
    visited.add(key);

    if (currentPoly === "A") {
      const pt = augA.points[currentIdx];
      result.push(pt);

      // Move to next point in A
      const nextIdx = (currentIdx + 1) % augA.points.length;

      // Check if next point is an intersection — if so, switch to B
      const ixIdx = augAToIx.get(nextIdx);
      if (ixIdx !== undefined) {
        // Add the intersection point
        result.push(augA.points[nextIdx]);

        // Jump to B at this intersection, advance one step on B
        const bIdx = ixToAugB.get(ixIdx)!;
        // Walk B from the intersection point, skipping points inside A
        currentIdx = (bIdx + 1) % augB.points.length;
        currentPoly = "B";
      } else {
        currentIdx = nextIdx;
      }
    } else {
      // Walking on B
      const pt = augB.points[currentIdx];

      // Check if this point is an intersection — if so, switch back to A
      const ixIdx = augBToIx.get(currentIdx);
      if (ixIdx !== undefined) {
        // Add the intersection point
        result.push(pt);

        // Jump back to A
        const aIdx = ixToAugA.get(ixIdx)!;
        currentIdx = (aIdx + 1) % augA.points.length;
        currentPoly = "A";
      } else {
        // Only add B points that are outside A
        if (!pointInPolygon(pt[0], pt[1], polyA)) {
          result.push(pt);
        }
        currentIdx = (currentIdx + 1) % augB.points.length;
      }
    }

    // Check if we've returned to start
    if (currentPoly === "A" && currentIdx === startIdx && result.length > 2) {
      break;
    }
  }

  if (result.length < 3) return null;

  // Close the polygon
  const first = result[0];
  const last = result[result.length - 1];
  if (Math.abs(first[0] - last[0]) > EPSILON || Math.abs(first[1] - last[1]) > EPSILON) {
    result.push([first[0], first[1]]);
  }

  return result;
}

/**
 * Difference: subtract polygon B (the eraser) from polygon A (the region).
 * Returns the part of A that is NOT inside B.
 *
 * Algorithm: Walk along A's boundary. When entering B (at an intersection),
 * switch to walking B's boundary in reverse (the part that clips A),
 * then switch back to A at the next intersection.
 *
 * Returns null if A is entirely inside B (region fully erased).
 * Returns A unchanged if there's no overlap.
 */
export function differencePolygons(rawA: number[][], rawB: number[][]): number[][] | null | "no-overlap" {
  const polyA = ensureCCW(ensureOpen(rawA));
  const polyB = ensureCCW(ensureOpen(rawB));

  const intersections = findAllIntersections(polyA, polyB);

  if (intersections.length < 2) {
    // No proper intersection — check containment
    // If A is entirely inside B, it's fully erased
    if (polyA.every(p => pointInPolygon(p[0], p[1], polyB))) {
      return null;
    }
    // If B is entirely inside A or no overlap, A is unchanged
    return "no-overlap";
  }

  // Augment both polygons with intersection points
  const augA = augmentPolygon(polyA, intersections, "edgeA", "tA");
  const augB = augmentPolygon(polyB, intersections, "edgeB", "tB");

  // Find a starting point on A that is OUTSIDE B (this is part of the result)
  let startIdx = -1;
  for (let i = 0; i < augA.points.length; i++) {
    const p = augA.points[i];
    let isIntersection = false;
    for (const [, idx] of augA.intersectionIndices) {
      if (idx === i) { isIntersection = true; break; }
    }
    if (!isIntersection && !pointInPolygon(p[0], p[1], polyB)) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) {
    // All points of A are inside B — fully erased
    return null;
  }

  // Build lookups
  const augAToIx = new Map<number, number>();
  for (const [ixIdx, augIdx] of augA.intersectionIndices) {
    augAToIx.set(augIdx, ixIdx);
  }
  const augBToIx = new Map<number, number>();
  for (const [ixIdx, augIdx] of augB.intersectionIndices) {
    augBToIx.set(augIdx, ixIdx);
  }
  const ixToAugB = new Map<number, number>();
  for (const [ixIdx, augIdx] of augB.intersectionIndices) {
    ixToAugB.set(ixIdx, augIdx);
  }
  const ixToAugA = new Map<number, number>();
  for (const [ixIdx, augIdx] of augA.intersectionIndices) {
    ixToAugA.set(ixIdx, augIdx);
  }

  const result: number[][] = [];
  const maxSteps = augA.points.length + augB.points.length + intersections.length * 2;
  let steps = 0;

  let currentPoly: "A" | "B" = "A";
  let currentIdx = startIdx;
  const visited = new Set<string>();

  while (steps < maxSteps) {
    steps++;
    const key = `${currentPoly}:${currentIdx}`;
    if (visited.has(key) && result.length > 2) break;
    visited.add(key);

    if (currentPoly === "A") {
      const pt = augA.points[currentIdx];
      result.push(pt);

      const nextIdx = (currentIdx + 1) % augA.points.length;
      const ixIdx = augAToIx.get(nextIdx);

      if (ixIdx !== undefined) {
        // Hit an intersection — we're entering B. Add the intersection point.
        result.push(augA.points[nextIdx]);

        // Switch to B, but walk BACKWARDS (CW) along B's boundary
        // to trace the clipping edge
        const bIdx = ixToAugB.get(ixIdx)!;
        // Walk B in reverse (subtract direction)
        currentIdx = (bIdx - 1 + augB.points.length) % augB.points.length;
        currentPoly = "B";
      } else {
        currentIdx = nextIdx;
      }
    } else {
      // Walking on B in reverse (tracing the cut boundary)
      const pt = augB.points[currentIdx];

      const ixIdx = augBToIx.get(currentIdx);
      if (ixIdx !== undefined) {
        // Hit another intersection — switch back to A
        result.push(pt);
        const aIdx = ixToAugA.get(ixIdx)!;
        currentIdx = (aIdx + 1) % augA.points.length;
        currentPoly = "A";
      } else {
        result.push(pt);
        // Continue walking B in reverse
        currentIdx = (currentIdx - 1 + augB.points.length) % augB.points.length;
      }
    }

    if (currentPoly === "A" && currentIdx === startIdx && result.length > 2) {
      break;
    }
  }

  if (result.length < 3) return null;

  // Close
  const first = result[0];
  const last = result[result.length - 1];
  if (Math.abs(first[0] - last[0]) > EPSILON || Math.abs(first[1] - last[1]) > EPSILON) {
    result.push([first[0], first[1]]);
  }

  return result;
}
