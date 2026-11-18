import { useRef, type ReactNode, type RefObject } from "react";
import type { AirflowSnapshot } from "../airflow";
import { airflowViews, type AirflowView } from "../airflow-view";
import type { AirflowInspection } from "../airflow-inspection";
import { entityById } from "../domain";

export function AirflowPanel({
  snapshot,
  view,
  visit,
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
  const explain = useRef<HTMLButtonElement>(null);
  const route = snapshot?.routes[0];
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
      {route ? (
        <>
          <div className="airflow-view-actions">
            <strong>{entityById(route.deviceId)?.name}</strong>
            <select
              aria-label="气流观察范围"
              value={view ?? ""}
              disabled={!ready}
              onChange={(event) => {
                const next = airflowViews.find(
                  (item) => item.id === event.target.value,
                );
                if (next) onObserve(next.id);
              }}
            >
              <option value="" disabled>
                分段观察
              </option>
              {airflowViews.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          {!route.animated && <small>{route.status}</small>}
          {visit && (
            <div className="airflow-inspection-return">
              <button
                onClick={() => {
                  explain.current?.focus({ preventScroll: true });
                  onReturnEndpoint();
                }}
              >
                ← 返回{entityById(visit.originId)?.name}
              </button>
            </div>
          )}
          <div className="airflow-panel-actions">
            <button ref={explain} onClick={onExplain}>
              端点与路径依据 ↗
            </button>
            {analysisControl}
          </div>
          <div className="airflow-overlay-row">
            <label>
              <input
                type="checkbox"
                checked={sliceEnabled}
                onChange={(event) => onSlice(event.target.checked)}
              />
              叠加进风切片
            </label>
            {view && (
              <button disabled={!ready} onClick={onReturn}>
                返回原视角
              </button>
            )}
          </div>
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
