import { toPng } from "html-to-image";
import type { GardenGeoReference } from "~/models";

/**
 * Capture the visible area of a Leaflet map container as a PNG blob.
 * Hides UI elements (zoom controls, attribution, etc.) during capture.
 */
export async function captureMapAsImage(
  mapContainer: HTMLElement,
): Promise<Blob> {
  // Hide Leaflet UI elements during capture
  const uiElements = mapContainer.querySelectorAll(
    ".leaflet-control-container",
  );
  const hiddenElements: HTMLElement[] = [];

  uiElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style.display !== "none") {
      hiddenElements.push(htmlEl);
      htmlEl.style.display = "none";
    }
  });

  // Hide markers (blue pin, etc.)
  const markerPane = mapContainer.querySelectorAll(
    ".leaflet-marker-pane, .leaflet-shadow-pane, .leaflet-popup-pane",
  );
  markerPane.forEach((el) => {
    const htmlEl = el as HTMLElement;
    hiddenElements.push(htmlEl);
    htmlEl.style.display = "none";
  });

  // Also hide any custom overlays (layer switcher, etc.)
  const customOverlays = mapContainer.querySelectorAll(
    "[data-capture-hide]",
  );
  customOverlays.forEach((el) => {
    const htmlEl = el as HTMLElement;
    hiddenElements.push(htmlEl);
    htmlEl.style.display = "none";
  });

  try {
    const dataUrl = await toPng(mapContainer, {
      cacheBust: true,
      pixelRatio: 2,
      filter: (node) => {
        // Filter out any remaining control/marker elements
        if (node instanceof HTMLElement) {
          if (node.classList?.contains("leaflet-control-container")) return false;
          if (node.classList?.contains("leaflet-marker-pane")) return false;
          if (node.classList?.contains("leaflet-shadow-pane")) return false;
          if (node.classList?.contains("leaflet-popup-pane")) return false;
          if (node.getAttribute?.("data-capture-hide") !== null) return false;
        }
        return true;
      },
    });

    const response = await fetch(dataUrl);
    return response.blob();
  } finally {
    // Restore hidden elements
    hiddenElements.forEach((el) => {
      el.style.display = "";
    });
  }
}

/**
 * Capture a cropped area of a Leaflet map as a PNG blob.
 * The crop rect is in pixel coordinates relative to the map container.
 */
export async function captureMapCropped(
  mapContainer: HTMLElement,
  cropRect: { x: number; y: number; width: number; height: number },
): Promise<Blob> {
  // First capture the full map
  const fullBlob = await captureMapAsImage(mapContainer);

  // Create a canvas to crop
  const img = new Image();
  const imgUrl = URL.createObjectURL(fullBlob);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(imgUrl);

      const canvas = document.createElement("canvas");
      const pixelRatio = 2; // Must match the pixelRatio used in toPng
      canvas.width = cropRect.width * pixelRatio;
      canvas.height = cropRect.height * pixelRatio;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(
        img,
        cropRect.x * pixelRatio,
        cropRect.y * pixelRatio,
        cropRect.width * pixelRatio,
        cropRect.height * pixelRatio,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob from canvas"));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(imgUrl);
      reject(new Error("Failed to load captured image"));
    };
    img.src = imgUrl;
  });
}

/**
 * Calculate the geo-reference from Leaflet map bounds.
 */
export function calculateGeoReference(
  bounds: {
    northWest: { lat: number; lng: number };
    southEast: { lat: number; lng: number };
  },
  canvasWidth: number,
  canvasHeight: number,
): GardenGeoReference {
  const { northWest, southEast } = bounds;

  const latDiff = Math.abs(northWest.lat - southEast.lat);
  const lngDiff = Math.abs(southEast.lng - northWest.lng);

  const avgLat = (northWest.lat + southEast.lat) / 2;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((avgLat * Math.PI) / 180);

  const realHeight = latDiff * metersPerDegreeLat;
  const realWidth = lngDiff * metersPerDegreeLng;

  return {
    topLeft: { lat: northWest.lat, lng: northWest.lng },
    bottomRight: { lat: southEast.lat, lng: southEast.lng },
    canvasWidth,
    canvasHeight,
    realWidth,
    realHeight,
  };
}

/**
 * Calculate geo-reference for a cropped area within the full map bounds.
 */
export function calculateCroppedGeoReference(
  fullBounds: {
    northWest: { lat: number; lng: number };
    southEast: { lat: number; lng: number };
  },
  mapSize: { width: number; height: number },
  cropRect: { x: number; y: number; width: number; height: number },
): GardenGeoReference {
  const { northWest, southEast } = fullBounds;

  const latRange = northWest.lat - southEast.lat;
  const lngRange = southEast.lng - northWest.lng;

  // Calculate the GPS bounds of the cropped area
  const cropNorthWest = {
    lat: northWest.lat - (cropRect.y / mapSize.height) * latRange,
    lng: northWest.lng + (cropRect.x / mapSize.width) * lngRange,
  };
  const cropSouthEast = {
    lat:
      northWest.lat -
      ((cropRect.y + cropRect.height) / mapSize.height) * latRange,
    lng:
      northWest.lng +
      ((cropRect.x + cropRect.width) / mapSize.width) * lngRange,
  };

  return calculateGeoReference(
    { northWest: cropNorthWest, southEast: cropSouthEast },
    cropRect.width,
    cropRect.height,
  );
}
