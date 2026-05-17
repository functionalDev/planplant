import { Show, createResource, createEffect, Suspense } from "solid-js";
import { useParams, A } from "@solidjs/router";
import {
  loadGarden,
  loadGardenImage,
  addElement,
  moveElement,
  addGroundRegion,
  deleteGroundRegion,
  updateGroundRegions,
  deletePhoto,
} from "~/stores";
import { GardenEditor } from "~/components/GardenEditor";
import type { Garden, GardenElement, GroundRegion } from "~/models";
import styles from "./Garden.module.css";

interface GardenData {
  garden: Garden;
  backgroundUrl?: string;
  photoImageUrls: Record<string, string>;
}

export default function GardenPage() {
  const params = useParams<{ id: string }>();

  const [data, { refetch }] = createResource(
    () => params.id,
    async (id): Promise<GardenData | undefined> => {
      const garden = await loadGarden(id);
      if (!garden) return undefined;

      let backgroundUrl: string | undefined;
      if (garden.backgroundImageId) {
        backgroundUrl = await loadGardenImage(garden.backgroundImageId);
      }

      // Load photo image URLs
      const photoImageUrls: Record<string, string> = {};
      for (const photo of garden.photos ?? []) {
        const url = await loadGardenImage(photo.imageId);
        if (url) {
          photoImageUrls[photo.imageId] = url;
        }
      }

      return { garden, backgroundUrl, photoImageUrls };
    },
  );

  // Remember last opened garden for root redirect
  createEffect(() => {
    const d = data();
    if (d) {
      localStorage.setItem("planplant:lastGarden", d.garden.id);
    }
  });

  const handleElementAdd = async (element: GardenElement) => {
    const d = data();
    if (!d) return;
    await addElement(d.garden.id, element);
    refetch();
  };

  const handleElementMove = async (
    id: string,
    position: { x: number; y: number },
  ) => {
    const d = data();
    if (!d) return;
    await moveElement(d.garden.id, id, position);
    refetch();
  };

  const handleGroundRegionAdd = async (region: GroundRegion) => {
    const d = data();
    if (!d) return;
    await addGroundRegion(d.garden.id, region);
    refetch();
  };

  const handleGroundRegionDelete = async (regionId: string) => {
    const d = data();
    if (!d) return;
    await deleteGroundRegion(d.garden.id, regionId);
    refetch();
  };

  const handleGroundRegionsReplace = async (regions: GroundRegion[]) => {
    const d = data();
    if (!d) return;
    await updateGroundRegions(d.garden.id, regions);
    refetch();
  };

  const handlePhotoDelete = async (photoId: string) => {
    const d = data();
    if (!d) return;
    await deletePhoto(d.garden.id, photoId);
    refetch();
  };

  return (
    <Suspense fallback={<div class={styles.loading}>Loading garden...</div>}>
      <Show
        when={data()}
        fallback={
          <div class={styles.notFound}>
            <h2>Garden not found</h2>
            <p>This garden doesn't exist or has been deleted.</p>
            <A href="/" class={styles.backLink}>
              ← Back to Home
            </A>
          </div>
        }
      >
        {(d: () => GardenData) => (
          <div class={styles.container}>
            <div class={styles.editorContainer}>
              {/* Floating header overlay */}
              <div class={styles.headerOverlay}>
                <div class={styles.titleGroup}>
                  <h1 class={styles.title}>{d().garden.name}</h1>
                  {d().garden.description && (
                    <p class={styles.description}>{d().garden.description}</p>
                  )}
                </div>
                <A
                  href={`/garden/${d().garden.id}/settings`}
                  class={styles.settingsLink}
                >
                  ⚙️
                </A>
              </div>

              <Show
                when={d().garden.geoReference}
                fallback={
                  <div class={styles.noSetup}>
                    <span>🛰️</span>
                    <h3>No satellite image captured</h3>
                    <p>
                      You can recapture a satellite image for this garden.
                    </p>
                    <A
                      href={`/garden/${d().garden.id}/setup`}
                      class={styles.setupLink}
                    >
                      Capture satellite image
                    </A>
                  </div>
                }
              >
                <GardenEditor
                  garden={d().garden}
                  backgroundImageUrl={d().backgroundUrl}
                  photoImageUrls={d().photoImageUrls}
                  onElementAdd={handleElementAdd}
                  onElementMove={handleElementMove}
                  onGroundRegionAdd={handleGroundRegionAdd}
                  onGroundRegionDelete={handleGroundRegionDelete}
                  onGroundRegionsReplace={handleGroundRegionsReplace}
                  onPhotoDelete={handlePhotoDelete}
                />
              </Show>
            </div>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
