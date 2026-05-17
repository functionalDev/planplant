import { createSignal, createResource, createMemo } from "solid-js";
import type { Garden, GardenLocation, GardenElement, GroundRegion } from "~/models";
import { indexedDBAdapter } from "~/db";
import { createGardenService } from "~/services";

const gardenService = createGardenService(indexedDBAdapter);

const [gardenVersion, setGardenVersion] = createSignal(0);

function invalidateGardens() {
  setGardenVersion((v) => v + 1);
}

const [gardensResource, { refetch: refetchGardens }] = createResource(
  gardenVersion,
  async () => {
    return gardenService.getAllGardens();
  },
);

const [activeGardenId, setActiveGardenId] = createSignal<string | null>(null);

export function useGardens() {
  return {
    gardens: gardensResource,
    loading: () => gardensResource.loading,
    error: () => gardensResource.error,
    refetch: refetchGardens,
  };
}

export function useActiveGarden() {
  const garden = createMemo(() => {
    const id = activeGardenId();
    const gardens = gardensResource();
    if (!id || !gardens) return undefined;
    return gardens.find((g: Garden) => g.id === id);
  });

  return {
    garden,
    gardenId: activeGardenId,
    setActiveGardenId,
  };
}

export async function addGarden(
  ownerId: string,
  name: string,
  description: string = "",
  location?: GardenLocation,
): Promise<Garden> {
  const garden = await gardenService.createGarden(
    ownerId,
    name,
    description,
    location,
  );
  invalidateGardens();
  return garden;
}

export async function updateGarden(
  id: string,
  updates: Partial<Pick<Garden, "name" | "description" | "location" | "geoReference" | "backgroundImageId" | "border" | "elements" | "groundRegions">>,
): Promise<Garden> {
  const garden = await gardenService.updateGarden(id, updates);
  invalidateGardens();
  return garden;
}

export async function removeGarden(id: string): Promise<void> {
  await gardenService.deleteGarden(id);
  if (activeGardenId() === id) {
    setActiveGardenId(null);
  }
  invalidateGardens();
}

export async function loadGarden(
  id: string,
): Promise<Garden | undefined> {
  return gardenService.getGarden(id);
}

// Element operations
export async function addElement(
  gardenId: string,
  element: GardenElement,
): Promise<void> {
  const garden = await gardenService.getGarden(gardenId);
  if (!garden) return;
  const elements = [...garden.elements, element];
  await gardenService.updateGarden(gardenId, { elements });
  invalidateGardens();
}

export async function moveElement(
  gardenId: string,
  elementId: string,
  position: { x: number; y: number },
): Promise<void> {
  const garden = await gardenService.getGarden(gardenId);
  if (!garden) return;
  const elements = garden.elements.map((el) =>
    el.id === elementId ? { ...el, position } : el,
  );
  await gardenService.updateGarden(gardenId, { elements });
  invalidateGardens();
}

export async function deleteElement(
  gardenId: string,
  elementId: string,
): Promise<void> {
  const garden = await gardenService.getGarden(gardenId);
  if (!garden) return;
  const elements = garden.elements.filter((el) => el.id !== elementId);
  await gardenService.updateGarden(gardenId, { elements });
  invalidateGardens();
}

// Ground region operations
export async function addGroundRegion(
  gardenId: string,
  region: GroundRegion,
): Promise<void> {
  const garden = await gardenService.getGarden(gardenId);
  if (!garden) return;
  const groundRegions = [...(garden.groundRegions ?? []), region];
  await gardenService.updateGarden(gardenId, { groundRegions });
  invalidateGardens();
}

export async function deleteGroundRegion(
  gardenId: string,
  regionId: string,
): Promise<void> {
  const garden = await gardenService.getGarden(gardenId);
  if (!garden) return;
  const groundRegions = (garden.groundRegions ?? []).filter(
    (r) => r.id !== regionId,
  );
  await gardenService.updateGarden(gardenId, { groundRegions });
  invalidateGardens();
}

export async function updateGroundRegions(
  gardenId: string,
  groundRegions: GroundRegion[],
): Promise<void> {
  await gardenService.updateGarden(gardenId, { groundRegions });
  invalidateGardens();
}

// Image operations
export async function saveGardenImage(
  imageId: string,
  blob: Blob,
): Promise<void> {
  await indexedDBAdapter.saveImage(imageId, blob);
}

export async function loadGardenImage(
  imageId: string,
): Promise<string | undefined> {
  const blob = await indexedDBAdapter.getImage(imageId);
  if (!blob) return undefined;
  return URL.createObjectURL(blob);
}
