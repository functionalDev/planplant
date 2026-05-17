import type { TileLayerOptions } from "leaflet";

export interface TileLayerConfig {
  name: string;
  url: string;
  options: TileLayerOptions;
}

export const OSM_LAYER: TileLayerConfig = {
  name: "Street",
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  options: {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

export const ESRI_SATELLITE_LAYER: TileLayerConfig = {
  name: "Satellite",
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  options: {
    attribution:
      '&copy; <a href="https://www.esri.com/">Esri</a> — Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 20,
  },
};

export const OAM_LAYER: TileLayerConfig = {
  name: "OpenAerialMap",
  url: "https://tiles.openaerialmap.org/mosaic/{z}/{x}/{y}.png",
  options: {
    attribution:
      '&copy; <a href="https://openaerialmap.org/">OpenAerialMap</a> contributors',
    maxZoom: 22,
  },
};

export const ALL_LAYERS: TileLayerConfig[] = [
  ESRI_SATELLITE_LAYER,
  OSM_LAYER,
  OAM_LAYER,
];

export const DEFAULT_LAYER = ESRI_SATELLITE_LAYER;
export const DEFAULT_ZOOM = 19;
export const DEFAULT_CENTER: [number, number] = [51.1657, 10.4515]; // Germany center
