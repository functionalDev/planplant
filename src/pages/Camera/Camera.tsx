import { createSignal, Show, For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useGardens, addPhoto, loadGarden } from "~/stores";
import { getCurrentPosition } from "~/services/geocoding.service";
import { gpsToCanvas } from "~/components/GardenEditor/utils";
import type { Garden, GardenPhoto } from "~/models";
import styles from "./Camera.module.css";

export default function Camera() {
  const { gardens } = useGardens();
  const navigate = useNavigate();

  const [photo, setPhoto] = createSignal<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = createSignal<string>("");
  const [gps, setGps] = createSignal<{ lat: number; lng: number } | null>(null);
  const [selectedGardenId, setSelectedGardenId] = createSignal<string>("");
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal("");
  const [gpsStatus, setGpsStatus] = createSignal<"idle" | "loading" | "done" | "error">("idle");

  // Set default garden to last opened
  const lastGardenId = localStorage.getItem("planplant:lastGarden") ?? "";

  let fileInputRef: HTMLInputElement | undefined;

  function handleCapture() {
    fileInputRef?.click();
  }

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
    setSuccess("");

    // Set default garden
    if (!selectedGardenId()) {
      setSelectedGardenId(lastGardenId);
    }

    // Get GPS location
    setGpsStatus("loading");
    try {
      const position = await getCurrentPosition();
      setGps({ lat: position.coords.latitude, lng: position.coords.longitude });
      setGpsStatus("done");
    } catch {
      setGpsStatus("error");
      setError("Could not get GPS location. The photo won't be placed on the map.");
    }
  }

  async function handleSave() {
    const blob = photo();
    const gardenId = selectedGardenId();
    if (!blob || !gardenId) return;

    setSaving(true);
    setError("");

    try {
      const garden = await loadGarden(gardenId);
      if (!garden) {
        setError("Garden not found.");
        setSaving(false);
        return;
      }

      const gpsCoords = gps();
      let position = { x: 0, y: 0 };

      if (gpsCoords && garden.geoReference) {
        const canvasPos = gpsToCanvas(gpsCoords, garden.geoReference);
        if (canvasPos) {
          position = canvasPos;
        } else {
          // GPS is outside garden bounds — place at center
          position = {
            x: garden.geoReference.canvasWidth / 2,
            y: garden.geoReference.canvasHeight / 2,
          };
        }
      } else if (garden.geoReference) {
        // No GPS — place at center
        position = {
          x: garden.geoReference.canvasWidth / 2,
          y: garden.geoReference.canvasHeight / 2,
        };
      }

      const imageId = crypto.randomUUID();
      const gardenPhoto: GardenPhoto = {
        id: crypto.randomUUID(),
        imageId,
        gps: gpsCoords ?? { lat: 0, lng: 0 },
        position,
        createdAt: new Date(),
      };

      await addPhoto(gardenId, gardenPhoto, blob);

      setSuccess("Photo saved!");
      setPhoto(null);
      setPhotoPreview("");
      setGps(null);
      setGpsStatus("idle");

      // Navigate to garden after short delay
      setTimeout(() => {
        navigate(`/garden/${gardenId}`);
      }, 800);
    } catch (err) {
      setError("Failed to save photo. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (photoPreview()) {
      URL.revokeObjectURL(photoPreview());
    }
    setPhoto(null);
    setPhotoPreview("");
    setGps(null);
    setGpsStatus("idle");
    setError("");
    setSuccess("");
  }

  return (
    <div class={styles.container}>
      <h1 class={styles.title}>📷 Camera</h1>

      <Show when={!photo()}>
        <p class={styles.description}>
          Take a photo and it will be placed as a marker on your garden map at
          your current GPS location.
        </p>
        <button class={styles.captureBtn} onClick={handleCapture}>
          📸 Take Photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          class={styles.hiddenInput}
          onChange={handleFileChange}
        />
      </Show>

      <Show when={photo()}>
        <div class={styles.preview}>
          <img src={photoPreview()} alt="Captured" class={styles.previewImage} />

          <div class={styles.gpsInfo}>
            <Show when={gpsStatus() === "loading"}>
              <span class={styles.gpsLoading}>📍 Getting location...</span>
            </Show>
            <Show when={gpsStatus() === "done"}>
              <span class={styles.gpsDone}>
                📍 {gps()!.lat.toFixed(5)}, {gps()!.lng.toFixed(5)}
              </span>
            </Show>
            <Show when={gpsStatus() === "error"}>
              <span class={styles.gpsError}>📍 No GPS (will place at center)</span>
            </Show>
          </div>

          <div class={styles.gardenSelect}>
            <label>Add to garden:</label>
            <select
              value={selectedGardenId()}
              onChange={(e) => setSelectedGardenId(e.currentTarget.value)}
            >
              <option value="">— Select garden —</option>
              <For each={gardens() ?? []}>
                {(g: Garden) => (
                  <option value={g.id}>{g.name}</option>
                )}
              </For>
            </select>
          </div>

          <Show when={error()}>
            <p class={styles.error}>{error()}</p>
          </Show>
          <Show when={success()}>
            <p class={styles.success}>{success()}</p>
          </Show>

          <div class={styles.actions}>
            <button
              class={styles.saveBtn}
              onClick={handleSave}
              disabled={saving() || !selectedGardenId()}
            >
              {saving() ? "Saving..." : "💾 Save to Garden"}
            </button>
            <button class={styles.discardBtn} onClick={handleDiscard}>
              ✕ Discard
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
