import type { DBSchema } from "idb";
import type { Device, Garden, ShareLink, GardenAccess } from "~/models";

export const DB_NAME = "planplant";
export const DB_VERSION = 2;

export interface PlanPlantDB extends DBSchema {
  device: {
    key: string;
    value: Device;
  };
  gardens: {
    key: string;
    value: Garden;
    indexes: {
      "by-owner": string;
    };
  };
  shareLinks: {
    key: string;
    value: ShareLink;
    indexes: {
      "by-garden": string;
    };
  };
  gardenAccess: {
    key: string;
    value: GardenAccess;
    indexes: {
      "by-garden": string;
      "by-device": string;
    };
  };
  images: {
    key: string;
    value: Blob;
  };
}
