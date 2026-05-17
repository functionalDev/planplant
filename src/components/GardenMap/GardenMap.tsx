import { onMount, onCleanup, createSignal, createEffect } from "solid-js";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ALL_LAYERS,
  DEFAULT_LAYER,
  DEFAULT_ZOOM,
  DEFAULT_CENTER,
  type TileLayerConfig,
} from "./layers";
import styles from "./GardenMap.module.css";

interface GardenMapProps {
  lat?: number;
  lng?: number;
  zoom?: number;
  interactive?: boolean;
  onLocationChange?: (lat: number, lng: number, zoom: number) => void;
  onMapReady?: (map: L.Map) => void;
  class?: string;
}

export default function GardenMap(props: GardenMapProps) {
  let mapContainer!: HTMLDivElement;
  let map: L.Map | null = null;
  let marker: L.Marker | null = null;
  let currentTileLayer: L.TileLayer | null = null;

  const [activeLayer, setActiveLayer] = createSignal<string>(
    DEFAULT_LAYER.name,
  );

  function setTileLayer(config: TileLayerConfig) {
    if (!map) return;
    if (currentTileLayer) {
      map.removeLayer(currentTileLayer);
    }
    currentTileLayer = L.tileLayer(config.url, config.options).addTo(map);
    setActiveLayer(config.name);
  }

  function updateMarker(lat: number, lng: number) {
    if (!map) return;
    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng], {
        draggable: props.interactive ?? false,
      }).addTo(map);

      if (props.interactive) {
        marker.on("dragend", () => {
          const pos = marker!.getLatLng();
          props.onLocationChange?.(pos.lat, pos.lng, map!.getZoom());
        });
      }
    }
  }

  onMount(() => {
    const center: [number, number] =
      props.lat && props.lng
        ? [props.lat, props.lng]
        : DEFAULT_CENTER;
    const zoom = props.zoom ?? DEFAULT_ZOOM;

    map = L.map(mapContainer, {
      center,
      zoom,
      zoomControl: true,
    });

    // Set default tile layer
    setTileLayer(DEFAULT_LAYER);

    // Add marker if we have coordinates
    if (props.lat && props.lng) {
      updateMarker(props.lat, props.lng);
    }

    // Listen for zoom changes
    if (props.interactive) {
      map.on("zoomend", () => {
        if (marker && map) {
          const pos = marker.getLatLng();
          props.onLocationChange?.(pos.lat, pos.lng, map.getZoom());
        }
      });

      // Click to place marker
      map.on("click", (e: L.LeafletMouseEvent) => {
        updateMarker(e.latlng.lat, e.latlng.lng);
        props.onLocationChange?.(e.latlng.lat, e.latlng.lng, map!.getZoom());
      });
    }

    // Notify parent that map is ready
    props.onMapReady?.(map);
  });

  // React to prop changes
  createEffect(() => {
    if (map && props.lat && props.lng) {
      map.setView([props.lat, props.lng], props.zoom ?? map.getZoom());
      updateMarker(props.lat, props.lng);
    }
  });

  onCleanup(() => {
    if (map) {
      map.remove();
      map = null;
    }
  });

  return (
    <div class={`${styles.wrapper} ${props.class ?? ""}`}>
      <div ref={mapContainer} class={styles.map} />
      <div class={styles.layerSwitcher}>
        {ALL_LAYERS.map((layer) => (
          <button
            class={`${styles.layerButton} ${activeLayer() === layer.name ? styles.layerActive : ""}`}
            onClick={() => setTileLayer(layer)}
          >
            {layer.name}
          </button>
        ))}
      </div>
    </div>
  );
}
