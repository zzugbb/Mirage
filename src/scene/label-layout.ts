import { placeFlowLabel } from "../airflow-label-layout.ts";
import { FrameTask } from "../frame-task.ts";

const blockers =
  ".review-scene-caption, .review-camera, .review-legend, .review-scene-tools, .review-scene-tools details[open] > div, .review-loading, .review-inspector:not([hidden]), .review-object-actions, .study-layer-control, .study-room-summary, .study-alert-caption, .study-show-detail";

export function observeLabelLayout(
  workspace: HTMLElement,
  viewport: HTMLElement,
  anchors: HTMLElement,
  lines: SVGSVGElement | null,
) {
  const layout = () => {
    const sceneRect = viewport.getBoundingClientRect();
    const accepted = [
      ...(workspace.querySelectorAll<HTMLElement>(blockers) ?? []),
    ]
      .filter((element) => element.getClientRects().length)
      .map((element) => element.getBoundingClientRect());
    for (const label of anchors.querySelectorAll<HTMLElement>(
      "[data-anchor]",
    ) ?? []) {
      label.style.visibility = "";
      const line = lines?.querySelector<SVGLineElement>(
        `[data-flow-line="${label.dataset.anchor}"]`,
      );
      if (line) line.style.visibility = "hidden";
      if (label.hidden) continue;
      if (
        (["position", "power-part", "part-position"].includes(
          label.dataset.anchorKind ?? "",
        ) ||
          label.classList.contains("selected")) &&
        sceneRect
      ) {
        const x = Number(label.dataset.screenX),
          y = Number(label.dataset.screenY);
        const rect = placeFlowLabel(
          x +
            sceneRect.left +
            (label.classList.contains("review-fixture-anchor") ? 56 : 0),
          y + sceneRect.top,
          label.offsetWidth,
          label.offsetHeight,
          sceneRect,
          accepted,
        );
        label.style.visibility = rect ? "" : "hidden";
        if (rect) {
          label.style.transform = `translate(${rect.left - sceneRect.left}px,${rect.top - sceneRect.top}px)`;
          accepted.push(
            new DOMRect(
              rect.left,
              rect.top,
              rect.right - rect.left,
              rect.bottom - rect.top,
            ),
          );
          if (line) {
            line.style.visibility = "";
            line.setAttribute("x1", String(x));
            line.setAttribute("y1", String(y));
            line.setAttribute(
              "x2",
              String(
                Math.max(rect.left, Math.min(rect.right, x + sceneRect.left)) -
                  sceneRect.left,
              ),
            );
            line.setAttribute(
              "y2",
              String(
                Math.max(rect.top, Math.min(rect.bottom, y + sceneRect.top)) -
                  sceneRect.top,
              ),
            );
          }
        }
        continue;
      }
      label.style.transform = `translate(${label.dataset.screenX}px,${label.dataset.screenY}px)`;
      const rect = label.getBoundingClientRect();
      const x = Number(label.dataset.screenX),
        y = Number(label.dataset.screenY);
      if (
        x < 10 ||
        x > sceneRect.width - label.offsetWidth - 23 ||
        y < 22 ||
        y > sceneRect.height - 65 ||
        (sceneRect &&
          (rect.left < sceneRect.left + 8 ||
            rect.right > sceneRect.right - 8 ||
            rect.top < sceneRect.top + 8 ||
            rect.bottom > sceneRect.bottom - 8)) ||
        accepted.some(
          (r) =>
            rect.left < r.right + 8 &&
            rect.right > r.left - 8 &&
            rect.top < r.bottom + 8 &&
            rect.bottom > r.top - 8,
        )
      )
        label.style.visibility = "hidden";
      else accepted.push(rect);
    }
  };
  const task = new FrameTask(layout);
  const sizes = new ResizeObserver(task.invalidate);
  let observed = new Set<Element>();
  const syncSizes = () => {
    const next = new Set<Element>([
      workspace,
      viewport,
      ...workspace.querySelectorAll(blockers),
      ...anchors.querySelectorAll("[data-anchor]"),
    ]);
    for (const element of observed)
      if (!next.has(element)) sizes.unobserve(element);
    for (const element of next)
      if (!observed.has(element)) sizes.observe(element);
    observed = next;
  };
  const mutations = new MutationObserver((records) => {
    const changed = records.some(({ target }) => {
      const element = target instanceof Element ? target : target.parentElement;
      return (
        element &&
        !anchors.contains(element) &&
        !lines?.contains(element) &&
        !element.closest("[data-axis]")
      );
    });
    if (!changed) return;
    syncSizes();
    task.invalidate();
  });
  mutations.observe(workspace, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["open", "hidden", "class", "style"],
  });
  syncSizes();
  window.addEventListener("scroll", task.invalidate, {
    capture: true,
    passive: true,
  });
  window.addEventListener("resize", task.invalidate);
  const visibility = () => {
    if (!document.hidden) task.invalidate();
  };
  document.addEventListener("visibilitychange", visibility);
  task.invalidate();
  return {
    invalidate: task.invalidate,
    projected: task.flush,
    dispose() {
      task.dispose();
      mutations.disconnect();
      sizes.disconnect();
      window.removeEventListener("scroll", task.invalidate, true);
      window.removeEventListener("resize", task.invalidate);
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
