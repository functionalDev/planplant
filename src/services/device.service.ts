import type { StorageAdapter } from "~/db";
import type { Device } from "~/models";
import { createDevice } from "~/models";

export function createDeviceService(storage: StorageAdapter) {
  return {
    async getOrCreateDevice(): Promise<Device> {
      const existing = await storage.getDevice();
      if (existing) return existing;

      const device = createDevice();
      await storage.saveDevice(device);
      return device;
    },

    async updateDisplayName(
      deviceId: string,
      displayName: string,
    ): Promise<Device> {
      const device = await storage.getDevice();
      if (!device || device.deviceId !== deviceId) {
        throw new Error("Device not found");
      }
      const updated = { ...device, displayName };
      await storage.saveDevice(updated);
      return updated;
    },
  };
}

export type DeviceService = ReturnType<typeof createDeviceService>;
