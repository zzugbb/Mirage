import { airflowStage } from "../airflow-stage";
import type { AirflowView } from "../airflow-view";
import { useEffect, useRef } from "react";
import type { AirflowSnapshot, AirflowRoute, FlowEndpoint } from "../airflow";
import { airflowEndpointObject } from "../airflow-inspection";
import { airflowReturnTray } from "../airflow-return-tray";
import { coolingTerminalFace } from "../cooling-terminal-face";
import { entityById } from "../domain";

const endpointNames = {
  supply: "送风",
  floor: "格栅",
  intake: "进风",
  return: "柜后回风",
  receiver: "柜端回风",
} satisfies Record<FlowEndpoint["kind"], string>;

export function AirflowDetails({
  snapshot,
  view,
  selected,
  ready,
  endpointKind,
  onRead,
  onTerminals,
  onDrain,
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
  revealRequested: "summary" | "endpoint" | "drain" | null;
  endpointKind: FlowEndpoint["kind"] | null;
  onTerminals: (view: "terminals" | "terminal-face") => void;
  onDrain?: () => void;
  onRead: (kind: FlowEndpoint["kind"]) => void;
  onPreview: (route: AirflowRoute, id: string) => void;
  onLocate: (id: string) => void;
}) {
  const section = useRef<HTMLElement>(null);
  const drainButton = useRef<HTMLButtonElement>(null);
  const endpoints = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (view !== "terminal-face" || !endpoints.current?.open) return;
    const details = endpoints.current;
    const focusWasInside = details.contains(document.activeElement);
    details.open = false;
    if (focusWasInside) {
      const next = drainButton.current ?? details.querySelector("summary");
      next?.focus({ preventScroll: true });
    }
  }, [view]);
  useEffect(() => {
    if (!revealRequested) return;
    const host = section.current,
      panel = host?.closest<HTMLElement>(".study-inspector");
    if (!host || !panel) return;
    const details = endpoints.current;
    if (revealRequested === "drain") {
      const button = drainButton.current;
      if (!ready || !button) return;
      if (view === "terminals" && details) details.open = true;
      button.scrollIntoView({ block: "nearest" });
      button.focus({ preventScroll: true });
      onExplained();
      return;
    }
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
  }, [revealRequested, ready, view, onExplained]);
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
  const tray = view === "return-tray" ? airflowReturnTray(route) : null;
  const face = view === "terminal-face" ? coolingTerminalFace(route) : null;
  const drainAction = onDrain && (
    <button ref={drainButton} disabled={!ready} onClick={onDrain}>
      核对同柜排水接合 ↗
    </button>
  );
  return (
    <section
      className="airflow-details slice-evidence-details"
      aria-label="气流路径说明"
      ref={section}
      tabIndex={-1}
    >
      {tray && (
        <div className="airflow-tray-details">
          <strong>回风与桥架 · 配置</strong>
          {tray.crossings.length ? (
            <dl>
              {tray.crossings.map((hit) => (
                <div key={hit.id}>
                  <dt>
                    {hit.fixtureName} · {hit.title}
                  </dt>
                  <dd>
                    {hit.path.y.toFixed(3)} → {hit.bottom.y.toFixed(3)} m
                    <br />
                    高差 {hit.clearance >= 0 ? "+" : "−"}
                    {Math.abs(hit.clearance).toFixed(3)} m
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>本支路的回风中心线与登记桥架侧梁没有平面交会。</p>
          )}
          <small>
            在平面交点的位置，用侧梁底面标高减去代表回风中心线标高。实际敷设、净距与回风状态待核实。
          </small>
        </div>
      )}
      {face && (
        <div className="airflow-face-details">
          <strong>送回风与柜面 · 配置</strong>
          <dl>
            <div>
              <dt>+Z 配置柜面</dt>
              <dd>Z = {face.faceZ.toFixed(3)} m</dd>
            </div>
            {face.terminals.map(({ kind, offset, heightAboveFloor }) => (
              <div key={kind}>
                <dt>{kind === "supply" ? "送风" : "回风"} · 距柜面 / 离地</dt>
                <dd>
                  {offset >= 0 ? "+" : "−"}
                  {(Math.abs(offset) * 1000).toFixed(1)} mm /{" "}
                  {heightAboveFloor.toFixed(4)} m
                </dd>
              </div>
            ))}
            <div>
              <dt>两端标高差</dt>
              <dd>{face.separation.toFixed(3)} m</dd>
            </div>
          </dl>
          {drainAction && (
            <div className="airflow-endpoint-actions">{drainAction}</div>
          )}
          <details className="geometry-basis">
            <summary>量取依据</summary>
            <p>
              虚线标出 +Z 配置柜面，实线沿 Z 轴量取偏移。离地高度以配置地面顶面{" "}
              {face.floorY.toFixed(4)} m 为基准。实际风口位置待核实。
            </p>
          </details>
        </div>
      )}
      <details
        className="review-flow-explanation"
        ref={endpoints}
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
          {(kind === "return" || kind === "receiver" || kind === "supply") &&
            view !== "terminals" &&
            view !== "terminal-face" && (
              <button
                disabled={!ready}
                onClick={() => onTerminals("terminals")}
              >
                核对制冷柜送回风 ↗
              </button>
            )}
          {kind !== "return" && (
            <button disabled={!ready} onClick={() => onLocate(object.id)}>
              {object.locate}
            </button>
          )}
        </div>
        {view === "terminals" && (
          <div className="airflow-endpoint-actions">
            <button
              disabled={!ready}
              onClick={() => onTerminals("terminal-face")}
            >
              核对送回风与柜面 ↗
            </button>
            {drainAction}
          </div>
        )}
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
