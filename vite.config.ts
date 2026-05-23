import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [tsConfigPaths(), tailwindcss(), tanstackStart({
    target: "vercel",
  }), viteReact(), cloudflare({
    viteEnvironment: {
      name: "ssr"
    }
  })],
});