import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** 清理 GLB 的导出元数据及已审核需移除的纹理，重新打包而非仅隐藏引用。 */
export function prepareModel(input, review = {}) {
  if (input.readUInt32LE(0) !== 0x46546c67 || input.readUInt32LE(4) !== 2)
    throw Error("仅支持 GLB 2.0");
  const jsonLength = input.readUInt32LE(12);
  const document = JSON.parse(input.subarray(20, 20 + jsonLength).toString());
  const binary = input.subarray(28 + jsonLength);
  if (document.buffers?.length !== 1 || document.buffers[0].uri)
    throw Error("需要单一内嵌缓冲区");
  const removedImages = new Set(review.removeImages ?? []);
  const removedViews = new Set(
    [...removedImages]
      .map((index) => document.images?.[index]?.bufferView)
      .filter((value) => value !== undefined),
  );
  const imageMap = new Map();
  const textureMap = new Map();
  const viewMap = new Map();
  document.images = (document.images ?? []).filter((image, index) => {
    if (removedImages.has(index)) return false;
    imageMap.set(index, imageMap.size);
    delete image.name;
    if (image.uri) throw Error("不允许外部图像依赖");
    return true;
  });
  document.textures = (document.textures ?? []).filter((texture, index) => {
    if (!imageMap.has(texture.source)) return false;
    textureMap.set(index, textureMap.size);
    texture.source = imageMap.get(texture.source);
    return true;
  });
  const chunks = [];
  let offset = 0;
  document.bufferViews = (document.bufferViews ?? []).flatMap((view, index) => {
    if (removedViews.has(index)) return [];
    const padding = (4 - (offset % 4)) % 4;
    if (padding) {
      chunks.push(Buffer.alloc(padding));
      offset += padding;
    }
    const bytes = binary.subarray(
      view.byteOffset ?? 0,
      (view.byteOffset ?? 0) + view.byteLength,
    );
    if (bytes.length !== view.byteLength) throw Error("缓冲区范围无效");
    viewMap.set(index, viewMap.size);
    chunks.push(bytes);
    const result = { ...view, byteOffset: offset };
    offset += bytes.length;
    return [result];
  });
  function clean(object) {
    if (!object || typeof object !== "object") return;
    delete object.extras;
    delete object.name;
    for (const [key, value] of Object.entries(object)) {
      if (key === "bufferView") {
        if (!viewMap.has(value)) throw Error("引用了已删除的图像缓冲区");
        object[key] = viewMap.get(value);
      } else if (
        key.endsWith("Texture") &&
        value &&
        typeof value === "object" &&
        "index" in value
      ) {
        if (textureMap.has(value.index))
          value.index = textureMap.get(value.index);
        else delete object[key];
      } else clean(value);
    }
  }
  clean(document);
  for (const [index, node] of (document.nodes ?? []).entries()) {
    node.name = review.nodeNames?.[index] ?? `object_${index}`;
    if ((review.removeNodes ?? []).includes(index)) {
      delete node.mesh;
      delete node.children;
    }
  }
  for (const category of [
    "materials",
    "meshes",
    "scenes",
    "animations",
    "skins",
  ])
    for (const [index, item] of (document[category] ?? []).entries())
      item.name = `${category}_${index}`;
  for (const [index, color] of Object.entries(review.materialColors ?? {})) {
    const material = document.materials?.[Number(index)];
    if (material) {
      material.pbrMetallicRoughness ??= {};
      material.pbrMetallicRoughness.baseColorFactor = color;
    }
  }
  document.asset = {
    version: "2.0",
    generator: "Mirage asset preparation",
    copyright: "Original model contributor. CC BY-NC 4.0.",
  };
  document.buffers[0].byteLength = offset;
  let json = Buffer.from(JSON.stringify(document));
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
  const data = Buffer.concat([...chunks, Buffer.alloc((4 - (offset % 4)) % 4)]);
  const output = Buffer.alloc(28 + json.length + data.length);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  json.copy(output, 20);
  output.writeUInt32LE(data.length, 20 + json.length);
  output.writeUInt32LE(0x004e4942, 24 + json.length);
  data.copy(output, 28 + json.length);
  return output;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [source, target, review] = process.argv.slice(2);
  if (!source || !target || !review)
    throw Error(
      "用法：node scripts/prepare-model.mjs 输入.glb 输出.glb 审核配置.json",
    );
  writeFileSync(
    target,
    prepareModel(
      readFileSync(source),
      JSON.parse(readFileSync(review, "utf8")),
    ),
  );
  console.log("已生成清理后的模型，请检查实际渲染与纹理再登记资产。");
}
