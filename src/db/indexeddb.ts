import { openDB, type IDBPDatabase } from "idb";
import type { PlanPlantDB } from "./schema";
import { DB_NAME, DB_VERSION } from "./schema";
import type { StorageAdapter } from "./adapter";
import type { Device, Garden, ShareLink, GardenAccess } from "~/models";

let dbInstance: IDBPDatabase<PlanPlantDB> | null = null;

async function getDB(): Promise<IDBPDatabase<PlanPlantDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PlanPlantDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Version 1: base stores
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains("device")) {
          db.createObjectStore("device", { keyPath: "deviceId" });
        }
        if (!db.objectStoreNames.contains("gardens")) {
          const gardenStore = db.createObjectStore("gardens", {
            keyPath: "id",
          });
          gardenStore.createIndex("by-owner", "ownerId");
        }
        if (!db.objectStoreNames.contains("shareLinks")) {
          const shareStore = db.createObjectStore("shareLinks", {
            keyPath: "id",
          });
          shareStore.createIndex("by-garden", "gardenId");
        }
        if (!db.objectStoreNames.contains("gardenAccess")) {
          const accessStore = db.createObjectStore("gardenAccess", {
            keyPath: "id",
          });
          accessStore.createIndex("by-garden", "gardenId");
          accessStore.createIndex("by-device", "deviceId");
        }
      }

      // Version 2: add images store
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains("images")) {
          db.createObjectStore("images");
        }
      }
    },
  });

  return dbInstance;
}

export const indexedDBAdapter: StorageAdapter = {
  // Device
  async getDevice(): Promise<Device | undefined> {
    const db = await getDB();
    const all = await db.getAll("device");
    return all[0];
  },

  async saveDevice(device: Device): Promise<void> {
    const db = await getDB();
    await db.put("device", device);
  },

  // Gardens
  async getAllGardens(): Promise<Garden[]> {
    const db = await getDB();
    return db.getAll("gardens");
  },

  async getGarden(id: string): Promise<Garden | undefined> {
    const db = await getDB();
    return db.get("gardens", id);
  },

  async saveGarden(garden: Garden): Promise<void> {
    const db = await getDB();
    await db.put("gardens", garden);
  },

  async deleteGarden(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("gardens", id);
  },

  // Share Links
  async getShareLinksForGarden(gardenId: string): Promise<ShareLink[]> {
    const db = await getDB();
    return db.getAllFromIndex("shareLinks", "by-garden", gardenId);
  },

  async getShareLink(id: string): Promise<ShareLink | undefined> {
    const db = await getDB();
    return db.get("shareLinks", id);
  },

  async saveShareLink(link: ShareLink): Promise<void> {
    const db = await getDB();
    await db.put("shareLinks", link);
  },

  async deleteShareLink(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("shareLinks", id);
  },

  // Garden Access
  async getAccessForGarden(gardenId: string): Promise<GardenAccess[]> {
    const db = await getDB();
    return db.getAllFromIndex("gardenAccess", "by-garden", gardenId);
  },

  async getAccessForDevice(deviceId: string): Promise<GardenAccess[]> {
    const db = await getDB();
    return db.getAllFromIndex("gardenAccess", "by-device", deviceId);
  },

  async saveAccess(access: GardenAccess): Promise<void> {
    const db = await getDB();
    await db.put("gardenAccess", access);
  },

  async deleteAccess(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("gardenAccess", id);
  },

  // Images (blob storage)
  async saveImage(id: string, blob: Blob): Promise<void> {
    const db = await getDB();
    await db.put("images", blob, id);
  },

  async getImage(id: string): Promise<Blob | undefined> {
    const db = await getDB();
    return db.get("images", id);
  },

  async deleteImage(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("images", id);
  },
};
