import type { Device, Garden, ShareLink, GardenAccess } from "~/models";

export interface StorageAdapter {
  // Device
  getDevice(): Promise<Device | undefined>;
  saveDevice(device: Device): Promise<void>;

  // Gardens
  getAllGardens(): Promise<Garden[]>;
  getGarden(id: string): Promise<Garden | undefined>;
  saveGarden(garden: Garden): Promise<void>;
  deleteGarden(id: string): Promise<void>;

  // Share Links
  getShareLinksForGarden(gardenId: string): Promise<ShareLink[]>;
  getShareLink(id: string): Promise<ShareLink | undefined>;
  saveShareLink(link: ShareLink): Promise<void>;
  deleteShareLink(id: string): Promise<void>;

  // Garden Access
  getAccessForGarden(gardenId: string): Promise<GardenAccess[]>;
  getAccessForDevice(deviceId: string): Promise<GardenAccess[]>;
  saveAccess(access: GardenAccess): Promise<void>;
  deleteAccess(id: string): Promise<void>;

  // Images (blob storage)
  saveImage(id: string, blob: Blob): Promise<void>;
  getImage(id: string): Promise<Blob | undefined>;
  deleteImage(id: string): Promise<void>;
}
