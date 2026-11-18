import { airflowStage } from "../airflow-stage";
import type { AirflowView } from "../airflow-view";
import { useEffect, useRef } from "react";
import type { AirflowSnapshot, AirflowRoute } from "../airflow";
import { airflowEndpointObject } from "../airflow-inspection";
import { entityById } from "../domain";

export function AirflowDetails({
  snapshot,
  view,
  selected,
  ready,
  compact,
  focusRevision,
  onPreview,
  onLocate,
}: {
  snapshot: AirflowSnapshot;
  view: AirflowView | null;
  selected: string;
  ready: boolean;
  compact: boolean;
  focusRevision: number;
  onPreview: (route: AirflowRoute, id: string) => void;
  onLocate: (id: string) => void;
}) {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!focusRevision || compact) return;
    const host = section.current,
      panel = host?.closest<HTMLElement>(".study-inspector");
    if (!host || !panel) return;
    const details = host.querySelector("details");
    if (details) details.open = true;
    panel.scrollTop +=
      host.getBoundingClientRect().top -
      panel.getBoundingClientRect().top -
      (panel.querySelector(".study-panel-heading")?.getBoundingClientRect()
        .height ?? 64) -
      12;
    host.focus({ preventScroll: true });
  }, [focusRevision, compact]);
  const route = snapshot.routes[0];
  if (!route) return null;
  const stage = airflowStage(view);
  return (
    <section
      className="airflow-details slice-evidence-details"
      aria-label="气流路径说明"
      ref={section}
      tabIndex={-1}
    >
      <details open={!compact} className="review-flow-explanation">
        <summary>气流端点与依据 · {entityById(route.deviceId)?.name}</summary>
        <p>{snapshot.label}</p>
        {stage ? (
          <p>
            <strong>{stage.direction}</strong>
            <br />
            {stage.boundary}
          </p>
        ) : (
          <p>送风连续，回风分段。箭头表示假设方向。</p>
        )}
        <ol aria-label="气流端点与读数">
          {route.endpoints.map((endpoint) => {
            const object = airflowEndpointObject(route, endpoint.kind);
            return (
              <li key={endpoint.kind}>
                <b>{endpoint.title}</b>
                <span>{endpoint.detail}</span>
                <div className="airflow-endpoint-actions">
                  <button
                    disabled={selected === object.id}
                    onClick={() => onPreview(route, object.id)}
                  >
                    预览{object.name}
                  </button>
                  {endpoint.kind !== "return" && (
                    <button
                      disabled={!ready}
                      onClick={() => onLocate(object.id)}
                    >
                      {object.locate}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <details className="airflow-boundary">
          <summary>布置假设与数据边界</summary>
          <p>
            当前同向机柜假设前进后出。前后柜面细框按设备安装 U
            位标记代表范围，不是真实风口；送风沿低位侧通道至柜前格栅，再穿柜并从上方回到制冷单元。没有架空地板风腔或封闭冷热通道模型，保留柜体深度遮挡。冷却输入百分比、线宽和脉冲速度不表示风量或风速；无效观测、停机或维护时仅保留静态方向。叠加切片沿用局部进风插值，不改变代表支路，也不生成环境测点或排风温度。
          </p>
        </details>
      </details>
    </section>
  );
}
