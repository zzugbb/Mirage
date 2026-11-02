/** 设计书签沿用暂停评审；正式入口和评审共用同一工作区。 */
export function workspaceRoute(
  search: string,
): "workspace" | "review" | "prototype" {
  const params = new URLSearchParams(search);
  return params.has("prototype")
    ? "prototype"
    : params.has("review") || params.has("design")
      ? "review"
      : "workspace";
}
