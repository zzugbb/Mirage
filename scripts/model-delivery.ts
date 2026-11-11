import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { resolve, basename } from "node:path";
import type { Plugin } from "vite";

const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
/** 只生成已登记模型的无损传输副本；源资产及部件契约保持原字节。 */
export function packModel(bytes: Buffer, approvedDigest: string) {
  if (digest(bytes) !== approvedDigest)
    throw Error("模型摘要与已登记资产不一致");
  if (
    bytes.length < 12 ||
    bytes.readUInt32LE(0) !== 0x46546c67 ||
    bytes.readUInt32LE(4) !== 2 ||
    bytes.readUInt32LE(8) !== bytes.length
  )
    throw Error("模型不是完整 GLB 2.0");
  const packed = gzipSync(bytes, { level: 9 });
  if (
    packed.length > bytes.length * 0.9 ||
    bytes.length - packed.length < 16384
  )
    return null;
  return {
    bytes: packed,
    sha256: digest(packed),
    byteLength: packed.length,
    decodedByteLength: bytes.length,
    decodedSha256: approvedDigest,
  };
}
export function modelDelivery(root: string) {
  const prefix = "@mirage-models/";
  let building = false,
    base = "/";
  const routes = new Map<string, Buffer>();
  const packedFiles = new Map<
    string,
    {
      ref: string;
      fileName?: string;
      data: NonNullable<ReturnType<typeof packModel>>;
    }
  >();
  const plugin: Plugin = {
    name: "mirage-model-delivery",
    enforce: "pre",
    configResolved(config) {
      building = config.command === "build";
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        const bytes = routes.get(path);
        if (!bytes) return next();
        res.setHeader("Content-Type", "application/gzip");
        res.setHeader("Content-Length", bytes.length);
        res.setHeader("Cache-Control", "no-cache");
        res.end(req.method === "HEAD" ? undefined : bytes);
      });
    },
    load(id) {
      if (!id.endsWith(".glb?packed")) return;
      const path = id.slice(0, -"?packed".length);
      const manifestPath = resolve(root, "assets/manifest.json");
      this.addWatchFile(path);
      this.addWatchFile(manifestPath);
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const record = manifest.assets.find(
        (r: { path: string; kind: string; publicationApproved: boolean }) =>
          resolve(root, r.path) === path &&
          r.kind === "model" &&
          r.publicationApproved,
      );
      if (!record) throw Error("压缩传输只接受已获准登记的模型");
      const raw = readFileSync(path),
        packed = packModel(raw, record.sha256);
      const rawImport = `import rawUrl from ${JSON.stringify(path + "?url")};`;
      if (!packed)
        return `${rawImport} export default {url:rawUrl, rawUrl, encoding:"identity", byteLength:${raw.length}};`;
      let url: string;
      if (building) {
        const ref = this.emitFile({
          type: "asset",
          name: basename(path) + ".gz",
          source: packed.bytes,
        });
        packedFiles.set(record.path, { ref, data: packed });
        url = `import.meta.ROLLUP_FILE_URL_${ref}`;
      } else {
        const route = `${base}${prefix}${packed.sha256.slice(0, 16)}-${basename(path)}.gz`;
        routes.set(route, packed.bytes);
        url = JSON.stringify(route);
      }
      return `${rawImport} export default {url:${url}, rawUrl, encoding:"gzip", byteLength:${raw.length}};`;
    },
    generateBundle() {
      for (const entry of packedFiles.values())
        entry.fileName = this.getFileName(entry.ref);
    },
  };
  return {
    plugin,
    transportFor(path: string) {
      const entry = packedFiles.get(path);
      if (!entry?.fileName) return undefined;
      const { bytes: _, ...data } = entry.data;
      return { encoding: "gzip", path: entry.fileName, ...data };
    },
  };
}
