import {
  onMount,
  onCleanup,
  createSignal,
  createEffect,
  Show,
} from "solid-js";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Garden, GardenElement, GroundRegion, GroundType } from "~/models";
import { createGardenElement, createGroundRegion } from "~/models";
import Toolbar, { type EditorTool, type GroundViewMode } from "./Toolbar";
import GroundToolbar from "./GroundToolbar";
import { getGroundColor, getGroundZOrder, GROUND_TYPES } from "./ground-types";
import { FreehandDrawingEngine, type DrawStyle } from "./GroundDrawing";
import { unionPolygons, differencePolygons, pointInPolygon } from "./polygon-union";
import styles from "./GardenEditor.module.css";

interface GardenEditorProps {
  garden: Garden;
  backgroundImageUrl?: string;
  onElementAdd?: (element: GardenElement) => void;
  onElementMove?: (id: string, position: { x: number; y: number }) => void;
  onElementDelete?: (id: string) => void;
  onGroundRegionAdd?: (region: GroundRegion) => void;
  onGroundRegionDelete?: (id: string) => void;
  onGroundRegionsReplace?: (regions: GroundRegion[]) => void;
}

export default function GardenEditor(props: GardenEditorProps) {
  let mapContainer!: HTMLDivElement;
  let map: L.Map | null = null;
  let imageOverlay: L.ImageOverlay | null = null;
  let borderLayer: L.Polygon | null = null;
  let elementsLayer: L.LayerGroup | null = null;
  let groundLayer: L.LayerGroup | null = null;
  let freehandEngine: FreehandDrawingEngine | null = null;

  const [activeTool, setActiveTool] = createSignal<EditorTool>("select");
  const [backgroundVisible, setBackgroundVisible] = createSignal(true);
  const [fullscreen, setFullscreen] = createSignal(false);
  const [groundEditMode, setGroundEditMode] = createSignal(false);
  const [groundViewMode, setGroundViewMode] = createSignal<GroundViewMode>("filled");
  const [groundType, setGroundType] = createSignal<GroundType>("bed");
  const [selectedRegionId, setSelectedRegionId] = createSignal<string | null>(null);
  const [mapReady, setMapReady] = createSignal(false);
  const [brushSize, setBrushSize] = createSignal(12);
  const [groundDrawMode, setGroundDrawMode] = createSignal<"draw" | "grab" | "erase">("draw");
  const [drawStyle, setDrawStyle] = createSignal<DrawStyle>("paint");
  const [eraserTarget, setEraserTarget] = createSignal<GroundType | "all">("all");

  // ── Undo / Redo ──
  // Stores snapshots of groundRegions array
  let undoStack: GroundRegion[][] = [];
  let redoStack: GroundRegion[][] = [];
  const [canUndo, setCanUndo] = createSignal(false);
  const [canRedo, setCanRedo] = createSignal(false);

  function pushUndoSnapshot() {
    const current = [...(props.garden.groundRegions ?? [])];
    undoStack.push(current);
    redoStack = []; // Clear redo on new action
    setCanUndo(true);
    setCanRedo(false);
  }

  function undo() {
    if (undoStack.length === 0) return;
    const current = [...(props.garden.groundRegions ?? [])];
    redoStack.push(current);
    const prev = undoStack.pop()!;
    props.onGroundRegionsReplace?.(prev);
    setCanUndo(undoStack.length > 0);
    setCanRedo(true);
  }

  function redo() {
    if (redoStack.length === 0) return;
    const current = [...(props.garden.groundRegions ?? [])];
    undoStack.push(current);
    const next = redoStack.pop()!;
    props.onGroundRegionsReplace?.(next);
    setCanRedo(redoStack.length > 0);
    setCanUndo(true);
  }

  const canvasWidth = () => props.garden.geoReference?.canvasWidth ?? 800;
  const canvasHeight = () => props.garden.geoReference?.canvasHeight ?? 600;

  // Is the editor in fullscreen (either manual fullscreen or ground edit mode)
  const isFullscreen = () => fullscreen() || groundEditMode();

  function initMap() {
    const w = canvasWidth();
    const h = canvasHeight();

    map = L.map(mapContainer, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 4,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      attributionControl: false,
    });

    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [h, w],
    ];
    map.fitBounds(bounds);
    map.setMaxBounds([
      [-h * 0.2, -w * 0.2],
      [h * 1.2, w * 1.2],
    ]);

    // Layer 1: Background image
    if (props.backgroundImageUrl) {
      imageOverlay = L.imageOverlay(props.backgroundImageUrl, bounds).addTo(map);
    }

    // Layer 2: Ground regions
    groundLayer = L.layerGroup().addTo(map);
    renderGroundRegions();

    // Layer 3: Border polygon
    if (props.garden.border && props.garden.border.length > 0) {
      const borderCoords = props.garden.border.map(
        ([x, y]) => [y, x] as L.LatLngTuple,
      );
      borderLayer = L.polygon(borderCoords, {
        color: "#2e7d32",
        weight: 2,
        dashArray: "8, 4",
        fillOpacity: 0.05,
      }).addTo(map);
    }

    // Layer 4: Elements
    elementsLayer = L.layerGroup().addTo(map);
    renderElements();

    // Click handler for element placement
    map.on("click", handleMapClick);
  }

  // ── Ground Region Rendering ──

  function renderGroundRegions() {
    if (!groundLayer || !map) return;
    groundLayer.clearLayers();

    const regions = [...(props.garden.groundRegions ?? [])];
    const viewMode = groundViewMode();

    // Sort by z-order: grass (0) → bed/water (1) → path/building (2)
    regions.sort((a, b) => getGroundZOrder(a.type) - getGroundZOrder(b.type));

    for (const region of regions) {
      const color = getGroundColor(region.type);
      const isSelected = selectedRegionId() === region.id;

      const style: L.PathOptions = {
        color,
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fillColor: color,
        fillOpacity: viewMode === "filled" ? 0.45 : 0,
      };

      if (isSelected) {
        style.dashArray = "6, 4";
      }

      const outerRing = region.points.map(
        ([x, y]) => [y, x] as L.LatLngTuple,
      );
      // Build multi-ring array: [outer, hole1, hole2, ...]
      const rings: L.LatLngTuple[][] = [outerRing];
      if (region.holes && region.holes.length > 0) {
        for (const hole of region.holes) {
          rings.push(hole.map(([x, y]) => [y, x] as L.LatLngTuple));
        }
      }
      const layer = L.polygon(rings, style);

      // Click to select — works in normal select mode only
      layer.on("click", (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        if (!groundEditMode() && activeTool() === "select") {
          setSelectedRegionId(
            selectedRegionId() === region.id ? null : region.id,
          );
          renderGroundRegions();
        }
      });

      layer.addTo(groundLayer!);
    }
  }

  // ── Element Rendering ──

  function renderElements() {
    if (!elementsLayer || !map) return;
    elementsLayer.clearLayers();

    for (const element of props.garden.elements) {
      const { x, y } = element.position;
      const icon = L.divIcon({
        className: styles.elementMarker,
        html: `<span class="${styles.elementIcon}">${element.icon ?? "📍"}</span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([y, x], {
        icon,
        draggable: activeTool() === "select" && !groundEditMode(),
      }).addTo(elementsLayer);

      if (element.label) {
        marker.bindTooltip(element.label, {
          direction: "top",
          offset: [0, -16],
        });
      }

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        props.onElementMove?.(element.id, { x: pos.lng, y: pos.lat });
      });
    }
  }

  // ── Map Click Handler (for element placement only, not in ground edit mode) ──

  function handleMapClick(e: L.LeafletMouseEvent) {
    if (groundEditMode()) return; // Ground mode uses DOM events

    const tool = activeTool();

    if (tool === "select") {
      if (selectedRegionId()) {
        setSelectedRegionId(null);
        renderGroundRegions();
      }
      return;
    }

    if (tool === "plant" || tool === "note") {
      const position = { x: e.latlng.lng, y: e.latlng.lat };
      const iconMap: Record<string, string> = {
        plant: "🌱",
        note: "📝",
      };
      const element = createGardenElement(
        tool as GardenElement["type"],
        position,
        {
          icon: iconMap[tool] ?? "📍",
          label: tool.charAt(0).toUpperCase() + tool.slice(1),
        },
      );
      props.onElementAdd?.(element);
    }
  }

  // ── Polygon Merging ──
  // Uses proper polygon union (edge intersection + boundary walking)

  /**
   * Try to merge a new region with existing same-type regions.
   * Uses unionPolygons for accurate boundary merging.
   * Returns the merged region if overlap found, or null if no merge needed.
   */
  function tryMergeWithExisting(newRegion: GroundRegion): { merged: GroundRegion; removedIds: string[] } | null {
    const regions = props.garden.groundRegions ?? [];
    const sameType = regions.filter(r => r.type === newRegion.type);

    if (sameType.length === 0) return null;

    let mergedPoints = newRegion.points;
    const removedIds: string[] = [];

    for (const existing of sameType) {
      const result = unionPolygons(mergedPoints, existing.points);
      if (result) {
        // Union succeeded — polygons overlap
        mergedPoints = result;
        removedIds.push(existing.id);
      }
    }

    if (removedIds.length === 0) return null;

    const merged = createGroundRegion(newRegion.type, mergedPoints);
    return { merged, removedIds };
  }

  // ── Freehand Drawing ──

  function finishFreehandRegion(points: number[][]) {
    pushUndoSnapshot();

    const newRegion = createGroundRegion(groundType(), points);

    // Try to merge with existing same-type regions
    const mergeResult = tryMergeWithExisting(newRegion);

    if (mergeResult) {
      // Remove overlapping regions and add the merged one
      const currentRegions = props.garden.groundRegions ?? [];
      const filtered = currentRegions.filter(r => !mergeResult.removedIds.includes(r.id));
      filtered.push(mergeResult.merged);
      props.onGroundRegionsReplace?.(filtered);
    } else {
      props.onGroundRegionAdd?.(newRegion);
    }
  }

  function startFreehandDrawing() {
    if (!map) return;
    stopFreehandDrawing();
    const color = getGroundColor(groundType());
    freehandEngine = new FreehandDrawingEngine(map, color, (points) => {
      finishFreehandRegion(points);
      // Restart freehand after completing a shape (stay in drawing mode)
      setTimeout(() => {
        if (groundEditMode() && groundDrawMode() === "draw") {
          startFreehandDrawing();
        }
      }, 50);
    }, brushSize(), drawStyle());
    freehandEngine.start();
  }

  function stopFreehandDrawing() {
    if (freehandEngine) {
      freehandEngine.stop();
      freehandEngine = null;
    }
  }

  // ── Enter/Exit Ground Edit Mode ──

  function enterGroundEditMode() {
    // Reset undo/redo stacks when entering
    undoStack = [];
    redoStack = [];
    setCanUndo(false);
    setCanRedo(false);

    setGroundEditMode(true);
    setGroundDrawMode("draw");
    setSelectedRegionId(null);
    setActiveTool("ground");
    // Disable all map interaction for drawing
    if (map) {
      map.dragging.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      map.getContainer().style.cursor = "crosshair";
    }
    startFreehandDrawing();
    // Invalidate map size after fullscreen transition
    setTimeout(() => map?.invalidateSize(), 320);
  }

  function exitGroundEditMode() {
    stopFreehandDrawing();
    setGroundEditMode(false);
    setGroundDrawMode("draw");
    setSelectedRegionId(null);
    setActiveTool("select");
    // Re-enable map interaction
    if (map) {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      map.getContainer().style.cursor = "";
    }
    // Invalidate map size after exiting fullscreen
    setTimeout(() => map?.invalidateSize(), 320);
  }

  function switchToDrawMode() {
    setGroundDrawMode("draw");
    setSelectedRegionId(null);
    if (map) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.getContainer().style.cursor = "crosshair";
    }
    startFreehandDrawing();
    renderGroundRegions();
  }

  function switchToGrabMode() {
    stopFreehandDrawing();
    setGroundDrawMode("grab");
    setSelectedRegionId(null);
    if (map) {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.getContainer().style.cursor = "grab";
    }
    renderGroundRegions();
  }

  function switchToEraseMode() {
    stopFreehandDrawing();
    setGroundDrawMode("erase");
    setSelectedRegionId(null);
    if (map) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.getContainer().style.cursor = "crosshair";
    }
    startEraserDrawing();
    renderGroundRegions();
  }

  function startEraserDrawing() {
    if (!map) return;
    stopFreehandDrawing();
    // Eraser uses a red/transparent stroke to show what's being erased
    freehandEngine = new FreehandDrawingEngine(map, "#ff0000", (eraserPoints) => {
      applyEraser(eraserPoints);
      // Restart eraser after completing a stroke
      setTimeout(() => {
        if (groundEditMode() && groundDrawMode() === "erase") {
          startEraserDrawing();
        }
      }, 50);
    }, brushSize(), "paint");
    freehandEngine.start();
  }

  function isEraserFullyInside(eraserPolygon: number[][], regionPoints: number[][]): boolean {
    // Check if ALL eraser points are inside the region's outer boundary
    for (const [x, y] of eraserPolygon) {
      if (!pointInPolygon(x, y, regionPoints)) return false;
    }
    return true;
  }

  function applyEraser(eraserPolygon: number[][]) {
    if (eraserPolygon.length < 3) return;

    const regions = props.garden.groundRegions ?? [];
    if (regions.length === 0) return;

    const target = eraserTarget();
    pushUndoSnapshot();

    const newRegions: GroundRegion[] = [];
    let changed = false;

    for (const region of regions) {
      // Skip regions that don't match the eraser target
      if (target !== "all" && region.type !== target) {
        newRegions.push(region);
        continue;
      }

      // Check if eraser is fully inside the region (creates a hole)
      if (isEraserFullyInside(eraserPolygon, region.points)) {
        changed = true;
        const existingHoles = region.holes ? [...region.holes] : [];
        existingHoles.push(eraserPolygon);
        newRegions.push({ ...region, holes: existingHoles });
        continue;
      }

      const result = differencePolygons(region.points, eraserPolygon);
      if (result === null) {
        // Region fully erased — don't include it
        changed = true;
      } else if (result === "no-overlap") {
        // No overlap — keep region as-is
        newRegions.push(region);
      } else {
        // Partial erase — replace with clipped region
        changed = true;
        if (result.length >= 3) {
          newRegions.push({ ...region, points: result, holes: undefined });
        }
      }
    }

    if (changed) {
      props.onGroundRegionsReplace?.(newRegions);
    }
  }

  function deleteSelectedAndContinue() {
    const id = selectedRegionId();
    if (!id) return;
    pushUndoSnapshot();
    props.onGroundRegionDelete?.(id);
    setSelectedRegionId(null);
  }

  // ── Tool Change Effects ──

  createEffect(() => {
    const tool = activeTool();
    const ready = mapReady();
    const inGroundMode = groundEditMode();

    if (!ready) return;

    // If ground edit mode is active, the enter/exit functions handle everything
    if (inGroundMode) return;

    // Outside ground edit mode, just make sure freehand is stopped
    stopFreehandDrawing();
  });

  // Update freehand color when ground type changes
  createEffect(() => {
    const type = groundType();
    if (freehandEngine) {
      freehandEngine.setColor(getGroundColor(type));
    }
  });

  // Update brush size on the engine when it changes
  createEffect(() => {
    const size = brushSize();
    if (freehandEngine) {
      freehandEngine.setBrushSize(size);
    }
  });

  // Update draw style on the engine when it changes
  createEffect(() => {
    const style = drawStyle();
    if (freehandEngine) {
      freehandEngine.setDrawStyle(style);
    }
  });

  // Re-render ground regions when view mode or regions change
  createEffect(() => {
    const _ = groundViewMode();
    const __ = props.garden.groundRegions;
    const ___ = selectedRegionId();
    renderGroundRegions();
  });

  // Re-render elements when garden changes
  createEffect(() => {
    const _ = props.garden.elements;
    renderElements();
  });

  // ── Background Toggle ──

  function toggleBackground() {
    if (!map || !imageOverlay) return;
    const visible = !backgroundVisible();
    setBackgroundVisible(visible);
    if (visible) {
      imageOverlay.addTo(map);
    } else {
      imageOverlay.remove();
    }
  }

  // ── Fullscreen ──

  function toggleFullscreen() {
    const entering = !fullscreen();
    setFullscreen(entering);
    setTimeout(() => map?.invalidateSize(), 320);
  }

  // ── Ground View Mode ──

  function toggleGroundView() {
    setGroundViewMode((m: GroundViewMode) => (m === "filled" ? "outline" : "filled"));
  }

  // ── Delete Selected Region ──

  function deleteSelectedRegion() {
    const id = selectedRegionId();
    if (!id) return;
    props.onGroundRegionDelete?.(id);
    setSelectedRegionId(null);
  }

  // ── Keyboard ──

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (groundEditMode()) {
        exitGroundEditMode();
      } else if (fullscreen()) {
        toggleFullscreen();
      } else if (selectedRegionId()) {
        setSelectedRegionId(null);
        renderGroundRegions();
      }
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      if (selectedRegionId() && activeTool() === "select" && !groundEditMode()) {
        deleteSelectedRegion();
      }
    }
    // Ctrl+Z / Ctrl+Shift+Z for undo/redo in ground edit mode
    if (groundEditMode() && (e.ctrlKey || e.metaKey)) {
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      }
    }
  };

  // ── Lifecycle ──

  onMount(() => {
    initMap();
    setMapReady(true);
    document.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
    stopFreehandDrawing();
    if (map) {
      map.remove();
      map = null;
    }
  });

  return (
    <div class={`${styles.editorWrapper} ${isFullscreen() ? styles.editorFullscreen : ""}`}>
      <div ref={mapContainer} class={styles.editorCanvas} />

      {/* ── Ground Edit Mode UI ── */}
      <Show when={groundEditMode()}>
        {/* Draw / Grab / Erase mode toggle — top edge */}
        <div class={styles.groundModeToggle}>
          <button
            class={`${styles.modeToggleBtn} ${groundDrawMode() === "draw" ? styles.modeToggleActive : ""}`}
            onClick={switchToDrawMode}
          >
            🖌️ Draw
          </button>
          <button
            class={`${styles.modeToggleBtn} ${groundDrawMode() === "grab" ? styles.modeToggleActive : ""}`}
            onClick={switchToGrabMode}
          >
            ✋ Move
          </button>
          <button
            class={`${styles.modeToggleBtn} ${groundDrawMode() === "erase" ? styles.modeToggleActive : ""}`}
            onClick={switchToEraseMode}
          >
            🗑️ Erase
          </button>
          <div class={styles.toggleSeparator} />
          <button
            class={styles.modeToggleBtn}
            onClick={toggleGroundView}
            title={groundViewMode() === "outline" ? "Show filled" : "Show outline only"}
          >
            {groundViewMode() === "outline" ? "⬡" : "🎨"}
          </button>
          <button
            class={styles.modeToggleBtn}
            onClick={undo}
            disabled={!canUndo()}
            title="Undo (Ctrl+Z)"
          >
            ↩️
          </button>
          <button
            class={styles.modeToggleBtn}
            onClick={redo}
            disabled={!canRedo()}
            title="Redo (Ctrl+Shift+Z)"
          >
            ↪️
          </button>
        </div>

        {/* Draw mode: surface type picker + brush size + draw style */}
        <Show when={groundDrawMode() === "draw"}>
          <GroundToolbar
            activeType={groundType}
            onTypeChange={setGroundType}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            drawStyle={drawStyle}
            onDrawStyleChange={(s) => {
              setDrawStyle(s);
              // Restart engine with new style
              if (groundEditMode() && groundDrawMode() === "draw") {
                startFreehandDrawing();
              }
            }}
          />
        </Show>

        {/* Erase mode: terrain type filter */}
        <Show when={groundDrawMode() === "erase"}>
          <div class={styles.eraserToolbar}>
            <button
              class={`${styles.eraserTargetBtn} ${eraserTarget() === "all" ? styles.eraserTargetActive : ""}`}
              onClick={() => setEraserTarget("all")}
            >
              All
            </button>
            {GROUND_TYPES.map((gt) => (
              <button
                class={`${styles.eraserTargetBtn} ${eraserTarget() === gt.id ? styles.eraserTargetActive : ""}`}
                onClick={() => setEraserTarget(gt.id)}
                style={{ "--ground-color": gt.color } as any}
              >
                {gt.icon}
              </button>
            ))}
          </div>
        </Show>

        <button
          class={styles.groundModeDone}
          onClick={exitGroundEditMode}
        >
          ✓ Done
        </button>
      </Show>

      {/* ── Normal Mode UI ── */}
      <Show when={!groundEditMode()}>
        {/* Delete button for selected region */}
        <Show when={selectedRegionId() && activeTool() === "select"}>
          <button
            class={styles.deleteButton}
            onClick={deleteSelectedRegion}
            title="Delete selected region"
          >
            🗑️ Delete
          </button>
        </Show>

        <Toolbar
          activeTool={activeTool}
          onToolChange={(tool) => {
            if (tool === "ground") {
              enterGroundEditMode();
            } else {
              setActiveTool(tool);
            }
          }}
          onToggleBackground={toggleBackground}
          backgroundVisible={backgroundVisible}
          onToggleFullscreen={toggleFullscreen}
          fullscreen={fullscreen}
          groundViewMode={groundViewMode}
          onToggleGroundView={toggleGroundView}
        />
      </Show>
    </div>
  );
}
