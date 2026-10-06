import { readFile } from "node:fs/promises";
import { defineConfig, type ViteDevServer, type PreviewServer } from "vite";
import vue from "@vitejs/plugin-vue";

// kuromoji decompresses its dictionaries itself; Vite preview's static server
// otherwise marks .gz files as HTTP-compressed and the browser decompresses first.
function serveDictionary(server: ViteDevServer | PreviewServer) {
  server.middlewares.use(async (request, response, next) => {
    if (!request.url) return next();
    const match = /^vendor\/dict\/([a-z_]+\.dat\.gz)(?:\?.*)?$/.exec(
      request.url.slice(server.config.base.length),
    );
    if (!match) return next();
    try {
      const data = await readFile(
        new URL(`./public/vendor/dict/${match[1]}`, import.meta.url),
      );
      response.setHeader("Content-Type", "application/octet-stream");
      response.end(data);
    } catch (error) {
      next(error);
    }
  });
}

export default defineConfig({
  plugins: [
    vue(),
    {
      name: "kuromoji-dictionary",
      configureServer: serveDictionary,
      configurePreviewServer: serveDictionary,
    },
  ],
});
