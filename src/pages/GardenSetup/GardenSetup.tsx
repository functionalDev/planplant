import { createSignal, Show } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { loadGarden, updateGarden, saveGardenImage } from "~/stores";
import GardenMap from "~/components/GardenMap/GardenMap";
import {
  captureMapAsImage,
  calculateGeoReference,
} from "~/services/capture.service";
import styles from "./GardenSetup.module.css";

export default function GardenSetup() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [capturing, setCapturing] = createSignal(false);
  const [error, setError] = createSignal("");
  let mapContainerRef: HTMLDivElement | undefined;
  let mapInstanceRef: L.Map | undefined;

  const handleCapture = async () => {
    if (!mapContainerRef || !mapInstanceRef) {
      setError("Map not ready. Please wait and try again.");
      return;
    }

    setCapturing(true);
    setError("");

    try {
      // Get the map container element (the actual Leaflet tile container)
      const mapEl = mapContainerRef.querySelector(
        ".leaflet-container",
      ) as HTMLElement;
      if (!mapEl) {
        setError("Map container not found.");
        setCapturing(false);
        return;
      }

      // Capture the map as PNG
      const blob = await captureMapAsImage(mapEl);

      // Get map bounds for geo-reference
      const bounds = mapInstanceRef.getBounds();
      const northWest = bounds.getNorthWest();
      const southEast = bounds.getSouthEast();
      const size = mapInstanceRef.getSize();

      const geoReference = calculateGeoReference(
        {
          northWest: { lat: northWest.lat, lng: northWest.lng },
          southEast: { lat: southEast.lat, lng: southEast.lng },
        },
        size.x,
        size.y,
      );

      // Save image to IndexedDB
      const imageId = `garden-bg-${params.id}`;
      await saveGardenImage(imageId, blob);

      // Update garden with geo-reference and image ID
      await updateGarden(params.id, {
        geoReference,
        backgroundImageId: imageId,
      });

      // Navigate to the garden editor
      navigate(`/garden/${params.id}`);
    } catch (err) {
      console.error("Capture failed:", err);
      setError("Failed to capture map. Please try again.");
    } finally {
      setCapturing(false);
    }
  };

  const handleMapReady = (map: L.Map) => {
    mapInstanceRef = map;
  };

  return (
    <div class={styles.container}>
      <h1 class={styles.title}>Set Up Garden Map</h1>
      <p class={styles.instructions}>
        Navigate to your garden location and zoom in until you can see your
        property clearly. Then click "Capture" to save the satellite image as
        your garden background.
      </p>

      <Show when={error()}>
        <p class={styles.error}>{error()}</p>
      </Show>

      <div class={styles.mapWrapper} ref={mapContainerRef}>
        <GardenMap
          interactive={true}
          onMapReady={handleMapReady}
        />
      </div>

      <div class={styles.actions}>
        <button
          class={styles.captureButton}
          onClick={handleCapture}
          disabled={capturing()}
        >
          {capturing() ? "Capturing..." : "📸 Capture Garden Area"}
        </button>
        <button
          class={styles.cancelButton}
          onClick={() => navigate(`/garden/${params.id}`)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
