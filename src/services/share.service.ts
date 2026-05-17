import type { StorageAdapter } from "~/db";
import type { Permission, ShareLink, GardenAccess } from "~/models";
import {
  createShareLink,
  createGardenAccess,
  TEMP_SHARE_DURATION_MS,
} from "~/models";

/**
 * Share service - currently stubbed for local-only mode.
 * Share links are stored locally but won't actually work
 * until a cloud backend is connected.
 */
export function createShareService(storage: StorageAdapter) {
  return {
    async generateShareLink(
      gardenId: string,
      permission: Exclude<Permission, "owner">,
    ): Promise<ShareLink> {
      const expiresAt =
        permission === "temp-readonly"
          ? new Date(Date.now() + TEMP_SHARE_DURATION_MS)
          : null;

      const link = createShareLink(gardenId, permission, expiresAt);
      await storage.saveShareLink(link);
      return link;
    },

    async getShareLinksForGarden(gardenId: string): Promise<ShareLink[]> {
      const links = await storage.getShareLinksForGarden(gardenId);
      // Filter out expired links
      const now = new Date();
      return links.filter(
        (link) => !link.expiresAt || link.expiresAt > now,
      );
    },

    async revokeShareLink(linkId: string): Promise<void> {
      await storage.deleteShareLink(linkId);
    },

    async getAccessForGarden(gardenId: string): Promise<GardenAccess[]> {
      const records = await storage.getAccessForGarden(gardenId);
      // Filter out expired temp-readonly access
      const now = new Date();
      return records.filter((record) => {
        if (record.permission !== "temp-readonly") return true;
        // For temp-readonly, check if 15 days have passed since grant
        const expiresAt = new Date(
          record.grantedAt.getTime() + TEMP_SHARE_DURATION_MS,
        );
        return expiresAt > now;
      });
    },

    async revokeAccess(accessId: string): Promise<void> {
      await storage.deleteAccess(accessId);
    },

    async updateAccessPermission(
      accessId: string,
      newPermission: Permission,
    ): Promise<GardenAccess> {
      const records = await storage.getAccessForGarden("");
      // We need to find the access record - this is a simplified approach
      // In a real implementation, we'd have a getAccess(id) method
      const allAccess = await storage.getAccessForDevice("");
      const access = [...records, ...allAccess].find(
        (a) => a.id === accessId,
      );
      if (!access) throw new Error(`Access record ${accessId} not found`);

      const updated: GardenAccess = { ...access, permission: newPermission };
      await storage.saveAccess(updated);
      return updated;
    },

    /**
     * Build a shareable URL for a garden.
     * NOTE: This is stubbed - the URL won't work without a backend.
     */
    buildShareUrl(shareLinkId: string): string {
      const baseUrl = window.location.origin;
      return `${baseUrl}/join/${shareLinkId}`;
    },
  };
}

export type ShareService = ReturnType<typeof createShareService>;
