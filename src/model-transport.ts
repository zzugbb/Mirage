export type ModelTransport = {
  url: string;
  rawUrl: string;
  encoding: "gzip" | "identity";
  byteLength: number;
};

/** 不支持原生解包时直接请求原始资产；损坏或中止仍沿用明确的失败/重试路径。 */
export async function fetchModelBytes(
  asset: ModelTransport,
  signal: AbortSignal,
) {
  let decoder: DecompressionStream | null = null;
  if (asset.encoding === "gzip" && typeof DecompressionStream !== "undefined") {
    try {
      decoder = new DecompressionStream("gzip");
    } catch {
      /* 使用原始模型兼容回退。 */
    }
  }
  const response = await fetch(decoder ? asset.url : asset.rawUrl, { signal });
  if (!response.ok) throw Error("模型请求失败");
  let data = await response.arrayBuffer();
  signal.throwIfAborted();
  // 某些静态服务按 Content-Encoding 自动解包，不能对已还原的 GLB 重复解包。
  const magic = () =>
    data.byteLength >= 12 ? new DataView(data).getUint32(0, true) : 0;
  if (decoder && magic() !== 0x46546c67) {
    data = await new Response(
      new Blob([data]).stream().pipeThrough(decoder, { signal }),
    ).arrayBuffer();
  }
  signal.throwIfAborted();
  if (
    data.byteLength !== asset.byteLength ||
    magic() !== 0x46546c67 ||
    new DataView(data).getUint32(4, true) !== 2 ||
    new DataView(data).getUint32(8, true) !== data.byteLength
  )
    throw Error("模型传输内容不完整");
  return {
    data,
    baseUrl: new URL(
      ".",
      response.url ||
        new URL(asset.rawUrl, globalThis.location?.href ?? "http://localhost/")
          .href,
    ).href,
  };
}
