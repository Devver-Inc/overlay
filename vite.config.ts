import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "DevverOverlay",
      fileName: (format) => `devver-overlay.${format}.js`,
      formats: ["iife", "es", "umd"],
    },
    rollupOptions: {
      output: {
        extend: true,
        globals: {},
        exports: "named",
      },
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: true,
    sourcemap: true,
  },
});
