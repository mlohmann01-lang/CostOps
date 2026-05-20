import { createRequire } from "node:module";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

const require = createRequire(import.meta.url);

function resolvePort(rawPort: string | undefined, fallback: number): number {
  if (!rawPort || rawPort.trim().length === 0) return fallback;
  const parsed = Number(rawPort);
  if (Number.isNaN(parsed) || parsed <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);
  return parsed;
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig(({ command }) => {
  const port = resolvePort(process.env.PORT, 5173);
  const extraPlugins =
    process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          require("@replit/vite-plugin-cartographer").cartographer({
            root: path.resolve(import.meta.dirname, ".."),
          }),
        ]
      : [];

  return {
    base: basePath,
    plugins: [mockupPreviewPlugin(), react(), tailwindcss(), runtimeErrorOverlay(), ...extraPlugins],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
    root: path.resolve(import.meta.dirname),
    build: { outDir: path.resolve(import.meta.dirname, "dist"), emptyOutDir: true },
    server:
      command === "build"
        ? undefined
        : {
            port,
            host: "0.0.0.0",
            allowedHosts: true,
            fs: { strict: true },
          },
    preview: { port, host: "0.0.0.0", allowedHosts: true },
  };
});
