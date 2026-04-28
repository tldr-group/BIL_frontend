import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    base: "/BIL_frontend/",
    plugins: [react()],
    server: {
        port: 3000
    }
});
