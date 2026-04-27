import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/updatable_webring_template/",
  plugins: [react()],
  server: {
    port: 3000,
  },
});
