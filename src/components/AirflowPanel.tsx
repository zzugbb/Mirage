import type { ReactNode, RefObject } from "react";
import type { AirflowSnapshot } from "../airflow";
import { airflowViews, type AirflowView } from "../airflow-view";
import { airflowStage } from "../airflow-stage";
import type { AirflowInspection } from "../airflow-inspection";
import { entityById } from "../domain";

export function AirflowPanel({
  snapshot,
  view,
  visit,
  time,
  ready,
  panelRef,
  sliceEnabled,
  onSlice,
  onObserve,
  onReturn,
  onReturnEndpoint,
  onExplain,
  onRoom,
  analysisControl,
}: {
  snapshot: AirflowSnapshot | null;
  view: AirflowView | null;
  visit: AirflowInspection | null;
  time: number;
  ready: boolean;
  panelRef: RefObject<HTMLElement | null>;
  sliceEnabled: boolean;
  onSlice: (value: boolean) => void;
  onObserve: (view: AirflowView) => void;
  onReturn: () => void;
  onReturnEndpoint: () => void;
  onExplain: () => void;
  onRoom: () => void;
  analysisControl: ReactNode;
}) {
  const route = snapshot?.routes[0],
    stage = airflowStage(view);
  return (
    <section
      ref={panelRef}
      className="airflow-panel"
      aria-label="气流观察操作"
      onKeyDown={(event) => {
        if (event.key === "Escape" && view && ready) {
          event.preventDefault();
          event.stopPropagation();
          onReturn();
        }
      }}
    >
      <strong>气流 · {stage?.title ?? "代表路径"}</strong>
      {route ? (
        <>
          <span>
            {entityById(route.deviceId)?.name} · t+{time}s
          </span>
          <small>{route.status} · 前进后出假设</small>
          <div className="airflow-view-actions" aria-label="气流观察视角">
            {airflowViews.map((item) => (
              <button
                key={item.id}
                data-airflow-view={item.id}
                disabled={!ready}
                aria-pressed={view === item.id}
                onClick={() => onObserve(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <span className="airflow-direction">
            {stage?.direction ?? "送风 → 格栅 → 设备进风 → 回风假设"}
          </span>
          {view && (
            <button disabled={!ready} onClick={onReturn}>
              返回原视角
            </button>
          )}
          {visit && (
            <div className="airflow-inspection-return">
              <button onClick={onReturnEndpoint}>← 返回原对象</button>
              <small>原对象：{entityById(visit.originId)?.name}</small>
            </div>
          )}
          <div className="airflow-panel-actions">
            <button onClick={onExplain}>端点与路径依据 ↗</button>
            {analysisControl}
          </div>
          <label>
            <input
              type="checkbox"
              checked={sliceEnabled}
              onChange={(event) => onSlice(event.target.checked)}
            />
            叠加进风切片
          </label>
        </>
      ) : (
        <>
          <p>
            代表路径定义在机房。当前保留结构检视；查看机房气流会先安全归位。
          </p>
          <button disabled={!ready} onClick={onRoom}>
            查看该设备机房气流
          </button>
        </>
      )}
    </section>
  );
}
