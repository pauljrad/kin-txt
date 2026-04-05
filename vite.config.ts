import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    tailwindcss(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-v3.ico", "apple-touch-icon-v3.png", "robots.txt"],
      manifest: {
        name: "KiN-TXT",
        short_name: "KiN-TXT",
        description: "Kinetic typography reader - transform text into dynamic visual experiences",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192-v3.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512-v3.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512-v3.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/apple-touch-icon-v3.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        // Cache strategies for different resource types
        runtimeCaching: [
          {
            // Cache ebook files with CacheFirst strategy
            urlPattern: /\/ebooks\/.*\.epub$/,
            handler: "CacheFirst",
            options: {
              cacheName: "ebooks-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache images with CacheFirst
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Cache fonts
            urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Cache JS/CSS with StaleWhileRevalidate for faster loads
            urlPattern: /\.(?:js|css)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            // Cache API calls to Supabase with NetworkFirst
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        // Precache all assets
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // Skip waiting to activate new service worker immediately
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize chunk splitting for faster loads
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["framer-motion", "lucide-react"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
    // Enable source maps for debugging
    sourcemap: false,
    // Minify for smaller bundle size
    minify: "esbuild",
  },
}));
