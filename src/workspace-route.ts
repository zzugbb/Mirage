/** 默认使用统一工作区；已有评审书签与原型对照分别保留入口。 */
export function workspaceRoute(
  search: string,
): "workspace" | "review" | "prototype" {
  const params = new URLSearchParams(search);
  return params.has("prototype")
    ? "prototype"
    : params.has("review")
      ? "review"
      : "workspace";
}
