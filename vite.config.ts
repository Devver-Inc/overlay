import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/overlay.ts",
      name: "DevverOverlay",
      fileName: (format) => `devver-overlay.${format}.js`,
      formats: ["iife", "es", "umd"],
    },
    rollupOptions: {
      output: {
        extend: true,
        globals: {},
      },
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: "esbuild",
    sourcemap: true,
  },
});
