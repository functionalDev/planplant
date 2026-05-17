import { createSignal, createResource } from "solid-js";
import type { Device } from "~/models";
import { indexedDBAdapter } from "~/db";
import { createDeviceService } from "~/services";

const deviceService = createDeviceService(indexedDBAdapter);

const [deviceResource] = createResource(async () => {
  return deviceService.getOrCreateDevice();
});

export function useDevice() {
  return {
    device: deviceResource,
    loading: () => deviceResource.loading,
    error: () => deviceResource.error,
  };
}

export async function updateDeviceDisplayName(
  displayName: string,
): Promise<Device> {
  const device = deviceResource();
  if (!device) throw new Error("Device not initialized");
  return deviceService.updateDisplayName(device.deviceId, displayName);
}
