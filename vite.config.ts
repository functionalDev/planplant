import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "url";

export default defineConfig({
  base: "/planplant/",
  plugins: [
    solid(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.svg"],
      manifest: {
        name: "PlanPlant",
        short_name: "PlanPlant",
        description: "Document your garden",
        theme_color: "#2e7d32",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/planplant/",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
