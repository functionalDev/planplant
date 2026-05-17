import type { Permission } from "./permissions";

export interface ShareLink {
  id: string;
  gardenId: string;
  permission: Exclude<Permission, "owner">;
  expiresAt: Date | null;
  createdAt: Date;
}

export type ShareOrigin = "owner" | "share-link";

export interface GardenAccess {
  id: string;
  gardenId: string;
  deviceId: string;
  permission: Permission;
  origin: ShareOrigin;
  grantedAt: Date;
}

export function createShareLink(
  gardenId: string,
  permission: Exclude<Permission, "owner">,
  expiresAt: Date | null,
): ShareLink {
  return {
    id: crypto.randomUUID(),
    gardenId,
    permission,
    expiresAt,
    createdAt: new Date(),
  };
}

export function createGardenAccess(
  gardenId: string,
  deviceId: string,
  permission: Permission,
  origin: ShareOrigin,
): GardenAccess {
  return {
    id: crypto.randomUUID(),
    gardenId,
    deviceId,
    permission,
    origin,
    grantedAt: new Date(),
  };
}
