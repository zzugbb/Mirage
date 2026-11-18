import { airflowStage } from "../airflow-stage";
import type { AirflowView } from "../airflow-view";
import { useEffect, useRef } from "react";
import type { AirflowSnapshot, AirflowRoute, FlowEndpoint } from "../airflow";
import { airflowEndpointObject } from "../airflow-inspection";
import { entityById } from "../domain";

const endpointNames = {
  supply: "送风",
  floor: "格栅",
  intake: "进风",
  return: "回风",
} satisfies Record<FlowEndpoint["kind"], string>;

export function AirflowDetails({
  snapshot,
  view,
  selected,
  ready,
  endpointKind,
  onRead,
  onExplained,
  revealRequested,
  onPreview,
  onLocate,
}: {
  snapshot: AirflowSnapshot;
  view: AirflowView | null;
  selected: string;
  ready: boolean;
  onExplained: () => void;
  revealRequested: "summary" | "endpoint" | null;
  endpointKind: FlowEndpoint["kind"] | null;
  onRead: (kind: FlowEndpoint["kind"]) => void;
  onPreview: (route: AirflowRoute, id: string) => void;
  onLocate: (id: string) => void;
}) {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!revealRequested) return;
    const host = section.current,
      panel = host?.closest<HTMLElement>(".study-inspector");
    if (!host || !panel) return;
    const details = host.querySelector("details");
    if (details) details.open = true;
    const bounds = host.getBoundingClientRect();
    const viewport = panel.getBoundingClientRect();
    const top =
      viewport.top +
      (panel.querySelector(".study-panel-heading")?.getBoundingClientRect()
        .height ?? 64) +
      12;
    if (bounds.top < top || bounds.bottom > viewport.bottom)
      panel.scrollTop += bounds.top - top;
    const focusTarget =
      revealRequested === "endpoint"
        ? details?.querySelector<HTMLButtonElement>(
            ".airflow-endpoint-picker [aria-pressed='true']",
          )
        : details?.querySelector("summary");
    focusTarget?.focus({ preventScroll: true });
    onExplained();
  }, [revealRequested, onExplained]);
  const route = snapshot.routes[0];
  if (!route) return null;
  const stage = airflowStage(view);
  const kind =
    endpointKind ??
    stage?.endpoints[0] ??
    (route.deviceId === selected ? "intake" : "supply");
  const endpoint = route.endpoints.find((item) => item.kind === kind);
  if (!endpoint) return null;
  const object = airflowEndpointObject(route, kind);
  return (
    <section
      className="airflow-details slice-evidence-details"
      aria-label="气流路径说明"
      ref={section}
      tabIndex={-1}
    >
      <details
        className="review-flow-explanation"
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !event.currentTarget.open) return;
          const details = (event.target as HTMLElement).closest(
            "details[open]",
          );
          if (!(details instanceof HTMLDetailsElement)) return;
          event.preventDefault();
          event.stopPropagation();
          details.open = false;
          details.querySelector("summary")?.focus({ preventScroll: true });
        }}
      >
        <summary>气流端点与依据 · {entityById(route.deviceId)?.name}</summary>
        <div
          className="airflow-endpoint-picker"
          role="group"
          aria-label="查阅气流端点"
        >
          {route.endpoints.map((item) => (
            <button
              key={item.kind}
              aria-pressed={kind === item.kind}
              onClick={() => onRead(item.kind)}
            >
              {endpointNames[item.kind]}
            </button>
          ))}
        </div>
        <div className="airflow-endpoint-reading">
          <strong>{endpoint.title}</strong>
          <p>{endpoint.detail}</p>
        </div>
        <div className="airflow-endpoint-actions">
          <button
            disabled={selected === object.id}
            onClick={() => onPreview(route, object.id)}
          >
            预览{object.name}
          </button>
          {kind !== "return" && (
            <button disabled={!ready} onClick={() => onLocate(object.id)}>
              {object.locate}
            </button>
          )}
        </div>
        <details className="airflow-boundary">
          <summary>布置假设与数据边界</summary>
          <p>
            {stage
              ? `${stage.direction}。${stage.boundary}`
              : "送风连续，回风分段。箭头表示假设方向。"}
          </p>
          <p>
            当前同向机柜假设前进后出。前后柜面细框按设备安装 U
            位标记代表范围，不是真实风口；送风沿低位侧通道至柜前格栅，再穿柜并从上方回到制冷单元。没有架空地板风腔或封闭冷热通道模型，保留柜体深度遮挡。冷却输入百分比、线宽和脉冲速度不表示风量或风速；无效观测、停机或维护时仅保留静态方向。叠加切片沿用局部进风插值，不改变代表支路，也不生成环境测点或排风温度。
          </p>
        </details>
      </details>
    </section>
  );
}
