import type { StorageAdapter } from "~/db";
import type { Garden, GardenLocation } from "~/models";
import { createGarden, createGardenAccess } from "~/models";

export function createGardenService(storage: StorageAdapter) {
  return {
    async getAllGardens(): Promise<Garden[]> {
      return storage.getAllGardens();
    },

    async getGarden(id: string): Promise<Garden | undefined> {
      return storage.getGarden(id);
    },

    async createGarden(
      ownerId: string,
      name: string,
      description: string = "",
      location?: GardenLocation,
    ): Promise<Garden> {
      const garden = createGarden(ownerId, { name, description, location });
      await storage.saveGarden(garden);

      // Create owner access record
      const access = createGardenAccess(
        garden.id,
        ownerId,
        "owner",
        "owner",
      );
      await storage.saveAccess(access);

      return garden;
    },

    async updateGarden(
      id: string,
      updates: Partial<Pick<Garden, "name" | "description" | "location" | "geoReference" | "backgroundImageId" | "border" | "elements" | "groundRegions" | "photos">>,
    ): Promise<Garden> {
      const garden = await storage.getGarden(id);
      if (!garden) throw new Error(`Garden ${id} not found`);

      const updated: Garden = {
        ...garden,
        ...updates,
        updatedAt: new Date(),
      };
      await storage.saveGarden(updated);
      return updated;
    },

    async deleteGarden(id: string): Promise<void> {
      // Delete all access records for this garden
      const accessRecords = await storage.getAccessForGarden(id);
      for (const access of accessRecords) {
        await storage.deleteAccess(access.id);
      }

      // Delete all share links for this garden
      const shareLinks = await storage.getShareLinksForGarden(id);
      for (const link of shareLinks) {
        await storage.deleteShareLink(link.id);
      }

      // Delete the garden itself
      await storage.deleteGarden(id);
    },
  };
}

export type GardenService = ReturnType<typeof createGardenService>;
