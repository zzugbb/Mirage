import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "mirage-asset-licenses",
      generateBundle(_, bundle) {
        const read = (path: string) =>
          readFileSync(new URL(path, import.meta.url));
        const manifest = JSON.parse(read("assets/manifest.json").toString());
        for (const record of manifest.assets) {
          const name = record.path.split("/").at(-1);
          const emitted = Object.values(bundle).find(
            (item) => item.type === "asset" && item.names.includes(name),
          );
          if (emitted) record.path = emitted.fileName;
          else {
            const target = `assets/scenes/${name}`;
            this.emitFile({
              type: "asset",
              fileName: target,
              source: read(record.path),
            });
            record.path = target;
          }
        }
        this.emitFile({
          type: "asset",
          fileName: "assets/manifest.json",
          source: JSON.stringify(manifest, null, 2) + "\n",
        });
        for (const path of [
          "LICENSE",
          "NOTICE",
          "LICENSE-ASSETS.md",
          "LICENSES/CC-BY-NC-4.0.txt",
        ])
          this.emitFile({ type: "asset", fileName: path, source: read(path) });
        for (const [name, path] of [
          ["THREE-MIT.txt", "node_modules/three/LICENSE"],
          ["REACT-MIT.txt", "node_modules/react/LICENSE"],
          ["REACT-DOM-MIT.txt", "node_modules/react-dom/LICENSE"],
        ])
          this.emitFile({
            type: "asset",
            fileName: `LICENSES/${name}`,
            source: read(path),
          });
      },
    },
  ],
  resolve: { dedupe: ["three"] },
  build: { rollupOptions: { output: { manualChunks: { three: ["three"] } } } },
});
