import { createSignal, Show, For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useDevice, addGarden, updateGarden, saveGardenImage } from "~/stores";
import {
  geocodeAddress,
  reverseGeocode,
  getCurrentPosition,
  type GeocodingResult,
} from "~/services/geocoding.service";
import {
  captureMapAsImage,
  calculateCroppedGeoReference,
} from "~/services/capture.service";
import GardenMap from "~/components/GardenMap/GardenMap";
import CropOverlay, {
  type CropRect,
} from "~/components/CropOverlay/CropOverlay";
import type { GardenLocation } from "~/models";
import styles from "./CreateGarden.module.css";

type Phase = "form" | "crop";

export default function CreateGarden() {
  const navigate = useNavigate();
  const { device } = useDevice();

  const [phase, setPhase] = createSignal<Phase>("form");
  const [fullscreen, setFullscreen] = createSignal(false);

  // Garden info
  const [name, setName] = createSignal("");
  const [description, setDescription] = createSignal("");

  // Location
  const [addressQuery, setAddressQuery] = createSignal("");
  const [searchResults, setSearchResults] = createSignal<GeocodingResult[]>([]);
  const [searching, setSearching] = createSignal(false);
  const [locating, setLocating] = createSignal(false);
  const [location, setLocation] = createSignal<GardenLocation | null>(null);
  const [locationError, setLocationError] = createSignal("");

  // Capture state
  const [saving, setSaving] = createSignal(false);
  const [capturedImageUrl, setCapturedImageUrl] = createSignal<string | null>(null);
  const [capturedBlob, setCapturedBlob] = createSignal<Blob | null>(null);
  const [mapBoundsData, setMapBoundsData] = createSignal<{
    northWest: { lat: number; lng: number };
    southEast: { lat: number; lng: number };
    width: number;
    height: number;
  } | null>(null);
  const [cropRect, setCropRect] = createSignal<CropRect | null>(null);
  let mapInstanceRef: L.Map | undefined;
  const [cropContainerEl, setCropContainerEl] = createSignal<HTMLDivElement | undefined>();

  let searchTimeout: ReturnType<typeof setTimeout> | undefined;

  const handleAddressInput = (value: string) => {
    setAddressQuery(value);
    setLocationError("");
    if (searchTimeout) clearTimeout(searchTimeout);
    if (value.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    searchTimeout = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await geocodeAddress(value);
        setSearchResults(results);
      } catch {
        setLocationError("Search failed. Please try again.");
      } finally {
        setSearching(false);
      }
    }, 1000);
  };

  const selectResult = (result: GeocodingResult) => {
    setLocation({
      lat: result.lat,
      lng: result.lng,
      address: result.displayName,
      zoom: 19,
    });
    setAddressQuery(result.displayName);
    setSearchResults([]);
  };

  const handleGPSLocate = async () => {
    setLocating(true);
    setLocationError("");
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const result = await reverseGeocode(latitude, longitude);
      const address =
        result?.displayName ??
        `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      setLocation({ lat: latitude, lng: longitude, address, zoom: 19 });
      setAddressQuery(address);
    } catch (err) {
      const error = err as GeolocationPositionError;
      if (error.code === 1) {
        setLocationError("Location access denied.");
      } else {
        setLocationError("Location unavailable. Please try again.");
      }
    } finally {
      setLocating(false);
    }
  };

  const handleMapReady = (map: L.Map) => {
    mapInstanceRef = map;
  };

  const handleMapLocationChange = (lat: number, lng: number, zoom: number) => {
    setLocation((prev) => ({
      lat,
      lng,
      address: prev?.address ?? "",
      zoom,
    }));
  };

  // Capture the map and move to crop phase
  const handleCaptureAndCrop = async () => {
    if (!mapInstanceRef) return;
    setSaving(true);

    try {
      const mapEl = mapInstanceRef.getContainer();
      const blob = await captureMapAsImage(mapEl);
      const url = URL.createObjectURL(blob);

      const bounds = mapInstanceRef.getBounds();
      const size = mapInstanceRef.getSize();

      setCapturedBlob(blob);
      setCapturedImageUrl(url);
      setMapBoundsData({
        northWest: {
          lat: bounds.getNorthWest().lat,
          lng: bounds.getNorthWest().lng,
        },
        southEast: {
          lat: bounds.getSouthEast().lat,
          lng: bounds.getSouthEast().lng,
        },
        width: size.x,
        height: size.y,
      });

      setPhase("crop");
    } catch (err) {
      console.error("Capture failed:", err);
    } finally {
      setSaving(false);
    }
  };

  // Create garden without location
  const handleCreateWithoutLocation = async () => {
    const dev = device();
    if (!dev || !name().trim()) return;
    setSaving(true);
    try {
      const garden = await addGarden(dev.deviceId, name().trim(), description().trim());
      navigate(`/garden/${garden.id}`);
    } catch (err) {
      console.error("Failed to create garden:", err);
      setSaving(false);
    }
  };

  // Create garden with cropped image
  const handleCreateWithImage = async () => {
    const dev = device();
    const blob = capturedBlob();
    const boundsData = mapBoundsData();
    const crop = cropRect();
    if (!dev || !name().trim() || !blob || !boundsData) return;

    setSaving(true);
    try {
      const loc = location() ?? undefined;
      const garden = await addGarden(
        dev.deviceId,
        name().trim(),
        description().trim(),
        loc,
      );

      // Crop the captured image
      let finalBlob = blob;
      let geoReference;

      if (crop) {
        // Crop the image using canvas
        const img = new Image();
        const imgUrl = URL.createObjectURL(blob);
        finalBlob = await new Promise<Blob>((resolve, reject) => {
          img.onload = () => {
            URL.revokeObjectURL(imgUrl);
            const canvas = document.createElement("canvas");
            const pr = 2; // pixelRatio from capture
            canvas.width = crop.width * pr;
            canvas.height = crop.height * pr;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(
              img,
              crop.x * pr, crop.y * pr,
              crop.width * pr, crop.height * pr,
              0, 0,
              canvas.width, canvas.height,
            );
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else reject(new Error("Crop failed"));
            }, "image/png");
          };
          img.onerror = () => reject(new Error("Image load failed"));
          img.src = imgUrl;
        });

        geoReference = calculateCroppedGeoReference(
          boundsData,
          { width: boundsData.width, height: boundsData.height },
          crop,
        );
      } else {
        // Use full image
        const { calculateGeoReference } = await import("~/services/capture.service");
        geoReference = calculateGeoReference(
          boundsData,
          boundsData.width,
          boundsData.height,
        );
      }

      const imageId = `garden-bg-${garden.id}`;
      await saveGardenImage(imageId, finalBlob);
      await updateGarden(garden.id, {
        geoReference,
        backgroundImageId: imageId,
      });

      navigate(`/garden/${garden.id}`);
    } catch (err) {
      console.error("Failed to create garden:", err);
      setSaving(false);
    }
  };

  return (
    <div class={styles.container}>
      {/* Phase 1: Form with map */}
      <Show when={phase() === "form"}>
        <h1 class={styles.title}>Create a Garden</h1>
        <div class={styles.form}>
          <div class={styles.field}>
            <label class={styles.label} for="garden-name">Garden Name</label>
            <input
              id="garden-name"
              type="text"
              class={styles.input}
              placeholder="e.g. Back Yard, Balcony, Front Garden"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              required
              autofocus
            />
          </div>

          <div class={styles.field}>
            <label class={styles.label} for="garden-description">
              Description (optional)
            </label>
            <textarea
              id="garden-description"
              class={styles.textarea}
              placeholder="A short description..."
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
              rows={2}
            />
          </div>

          <div class={styles.field}>
            <label class={styles.label}>Location (optional)</label>
            <div class={styles.locationInputRow}>
              <div class={styles.addressInputWrapper}>
                <input
                  type="text"
                  class={styles.input}
                  placeholder="Enter address..."
                  value={addressQuery()}
                  onInput={(e) => handleAddressInput(e.currentTarget.value)}
                />
                <Show when={searching()}>
                  <span class={styles.searchingIndicator}>Searching...</span>
                </Show>
              </div>
              <button
                type="button"
                class={styles.gpsButton}
                onClick={handleGPSLocate}
                disabled={locating()}
              >
                {locating() ? "📍..." : "📍 GPS"}
              </button>
            </div>

            <Show when={locationError()}>
              <p class={styles.error}>{locationError()}</p>
            </Show>

            <Show when={searchResults().length > 0}>
              <div class={styles.searchResults}>
                <For each={searchResults()}>
                  {(result) => (
                    <button
                      type="button"
                      class={styles.searchResultItem}
                      onClick={() => selectResult(result)}
                    >
                      {result.displayName}
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>

          <Show when={location()}>
            {(loc) => (
              <div class={styles.field}>
                <label class={styles.label}>
                  Navigate to your garden, then capture
                </label>
                <div
                  class={`${styles.captureMap} ${fullscreen() ? styles.captureMapFullscreen : ""}`}
                >
                  <GardenMap
                    lat={loc().lat}
                    lng={loc().lng}
                    zoom={loc().zoom}
                    interactive={true}
                    onLocationChange={handleMapLocationChange}
                    onMapReady={handleMapReady}
                  />
                  {/* Fullscreen floating toolbar */}
                  <div
                    class={`${styles.mapOverlayBar} ${fullscreen() ? styles.mapOverlayBarVisible : ""}`}
                    data-capture-hide
                  >
                    <button
                      class={styles.mapOverlayButton}
                      onClick={() => setFullscreen(false)}
                    >
                      ✕ Exit
                    </button>
                    <button
                      class={`${styles.mapOverlayButton} ${styles.mapOverlayCapture}`}
                      onClick={async () => {
                        // Capture at fullscreen resolution for better quality
                        await handleCaptureAndCrop();
                        setFullscreen(false);
                      }}
                      disabled={saving() || !name().trim()}
                    >
                      {saving() ? "Capturing..." : "📸 Capture"}
                    </button>
                  </div>
                  {/* Fullscreen toggle (inline, bottom-right) */}
                  <Show when={!fullscreen()}>
                    <button
                      class={styles.fullscreenToggle}
                      onClick={() => {
                        setFullscreen(true);
                        // Invalidate map size after transition
                        setTimeout(() => mapInstanceRef?.invalidateSize(), 350);
                      }}
                      title="Fullscreen"
                    >
                      ⛶
                    </button>
                  </Show>
                </div>
              </div>
            )}
          </Show>

          <Show when={!fullscreen()}>
            <div class={styles.buttonRow}>
              <Show
                when={location()}
                fallback={
                  <button
                    class={styles.primaryButton}
                    onClick={handleCreateWithoutLocation}
                    disabled={saving() || !name().trim()}
                  >
                    {saving() ? "Creating..." : "Create Garden"}
                  </button>
                }
              >
                <button
                  class={styles.primaryButton}
                  onClick={handleCaptureAndCrop}
                  disabled={saving() || !name().trim()}
                >
                  {saving() ? "Capturing..." : "Next: Crop Image →"}
                </button>
              </Show>
            </div>
          </Show>
        </div>
      </Show>

      {/* Phase 2: Crop the captured image */}
      <Show when={phase() === "crop"}>
        <h1 class={styles.title}>Crop to your property</h1>
        <p class={styles.instructions}>
          Drag the edges to match your property borders.
        </p>
        <div class={styles.cropArea} ref={(el) => setCropContainerEl(el)}>
          <img
            src={capturedImageUrl()!}
            class={styles.cropImage}
            alt="Captured satellite view"
          />
          <Show when={cropContainerEl()}>
            {(container) => (
              <CropOverlay
                containerRef={container()}
                onCropChange={setCropRect}
              />
            )}
          </Show>
        </div>
        <div class={styles.buttonRow}>
          <button
            class={styles.secondaryButton}
            onClick={() => setPhase("form")}
          >
            ← Back
          </button>
          <button
            class={styles.primaryButton}
            onClick={handleCreateWithImage}
            disabled={saving()}
          >
            {saving() ? "Creating..." : "📸 Create Garden"}
          </button>
        </div>
      </Show>
    </div>
  );
}
