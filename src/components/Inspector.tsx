import { useEffect, useRef } from "react";
import { entityById, parts } from "../domain";
import { AssemblyControls } from "./AssemblyControls";
import { RackControls } from "./RackControls";
import { phaseLabels } from "../mechanics";
import type { PresentationPhase } from "../mechanics";
import type { Action, AppState } from "../domain";
import type { SimulationSnapshot } from "../simulation";
import { ReplayPanel } from "./ReplayPanel";
import type { InspectionView } from "./ReplayPanel";
import { ComponentCoverage } from "./ComponentCoverage";

const kindNames = {
  room: "机房",
  rack: "机柜",
  device: "设备",
  facility: "设施",
  part: "部件",
};
export function Inspector({
  state,
  dispatch,
  phase,
  sample: simulation,
  view,
  onViewChange,
  showCooling,
  onCoolingChange,
}: {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  phase: PresentationPhase;
  sample: SimulationSnapshot;
  view: InspectionView;
  onViewChange: (view: InspectionView) => void;
  showCooling: boolean;
  onCoolingChange: (show: boolean) => void;
}) {
  const entity = entityById(state.selected)!;
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (view === "object") panel.current?.scrollTo({ top: 0 });
  }, [state.selected, view]);
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
    if (view !== "object" && matchMedia("(max-width: 580px)").matches)
      panel.current?.scrollIntoView({ block: "start" });
  }, [view]);
  const views = [
    ["object", "对象"],
    ["temperature", "温度"],
    ["power", "功耗"],
    ["alarms", "告警"],
  ] as const;
  const part = parts.find((part) => part.id === entity.id);
  const fields =
    entity.kind === "room"
      ? [
          ["场景类型", "示意机房"],
          ["空间尺寸", "8 × 6 × 3.2 m"],
          ["机柜 / 设备", "1 / 1"],
        ]
      : entity.kind === "rack"
        ? [
            ["机柜容量", "42 U"],
            ["外形尺寸", "600 × 1100 mm"],
            ["代表设备", "1 台"],
          ]
        : entity.kind === "device"
          ? [
              ["设备形态", "通用 2U 服务器"],
              ["安装位置", "A01 · U23–U24"],
              ["结构精度", "示意级"],
            ]
          : part
            ? [
                ["所属设备", "SRV-01"],
                ["槽位标识", part.slot],
                ["结构精度", "模组级示意"],
              ]
            : [
                ["对象类型", "基础设施"],
                ["数据接入", "未接入"],
              ];
  return (
    <aside className="inspector" ref={panel}>
      <div
        className="inspector-tabs"
        role="tablist"
        aria-label="观察视图"
        onKeyDown={(event) => {
          const index = views.findIndex(([key]) => key === view);
          const next =
            event.key === "ArrowRight"
              ? (index + 1) % views.length
              : event.key === "ArrowLeft"
                ? (index + views.length - 1) % views.length
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? views.length - 1
                    : -1;
          if (next < 0) return;
          event.preventDefault();
          onViewChange(views[next][0]);
          event.currentTarget
            .querySelector<HTMLButtonElement>(`[data-view="${views[next][0]}"]`)
            ?.focus();
        }}
      >
        {views.map(([key, label]) => (
          <button
            key={key}
            id={`inspection-${key}`}
            data-view={key}
            role="tab"
            aria-selected={view === key}
            aria-controls="inspection-content"
            tabIndex={view === key ? 0 : -1}
            onClick={() => onViewChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="inspection-content"
        aria-labelledby={`inspection-${view}`}
      >
        {view !== "object" ? (
          <ReplayPanel
            state={state}
            sample={simulation}
            view={view}
            dispatch={dispatch}
            showCooling={showCooling}
            onCoolingChange={onCoolingChange}
          />
        ) : (
          <>
            <div className="overline">
              对象信息 <span> / {kindNames[entity.kind]}</span>
            </div>
            <h2>{entity.name}</h2>
            <p className="description">{entity.description}</p>
            {state.level === "device" && (
              <>
                <p className="mechanism-status" role="status">
                  {phaseLabels[phase]}
                </p>
                <AssemblyControls
                  state={state}
                  ready={phase === "device-ready"}
                  dispatch={dispatch}
                />
                <ComponentCoverage dispatch={dispatch} />
              </>
            )}
            {state.level === "rack" && (
              <RackControls state={state} phase={phase} dispatch={dispatch} />
            )}
            <dl className="facts">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {entity.kind !== "facility" && state.level !== "device" && (
              <button
                className="primary-button"
                onClick={() =>
                  dispatch({
                    type: "navigate",
                    level:
                      entity.kind === "device" || state.level === "rack"
                        ? "device"
                        : "rack",
                  })
                }
              >
                {entity.kind === "device" || state.level === "rack"
                  ? "查看设备"
                  : "进入机柜"}
                <span>→</span>
              </button>
            )}
            {state.level === "room" && (
              <section className="explore-path">
                <h3>探索路径</h3>
                {(["room", "rack", "device"] as const).map((level, index) => (
                  <button
                    className={state.level === level ? "active" : ""}
                    key={level}
                    onClick={() => dispatch({ type: "navigate", level })}
                  >
                    <i />
                    <span>{["机房", "机柜", "设备"][index]}</span>
                    <small>0{index + 1}</small>
                  </button>
                ))}
                <div className="path-future">
                  <i />
                  部件<small>04</small>
                </div>
              </section>
            )}
            <section className="simulation">
              <div className="section-heading">
                <h3>模拟状态</h3>
                <span className="tag">模拟</span>
              </div>
              <div className="sim-values">
                <div>
                  <strong>
                    {simulation.temperature}
                    <small> °C</small>
                  </strong>
                  <span>设备进风温度</span>
                </div>
                <div>
                  <strong>
                    {simulation.power}
                    <small> W</small>
                  </strong>
                  <span>设备功耗</span>
                </div>
              </div>
              <div className="simulation-footer">
                <span>
                  <i className="status-dot" />
                  温度{simulation.temperatureStatus}
                </span>
                <span>t + {String(state.time).padStart(3, "0")} s</span>
              </div>
              <button
                className="text-button"
                onClick={() => dispatch({ type: "play" })}
              >
                {state.playing ? "Ⅱ 暂停模拟" : "▷ 播放模拟"}
              </button>
              <div className="metric-links">
                <button onClick={() => onViewChange("temperature")}>
                  温度趋势 ↗
                </button>
                <button onClick={() => onViewChange("power")}>
                  功耗分析 ↗
                </button>
                <button onClick={() => onViewChange("alarms")}>
                  告警记录 ↗
                </button>
              </div>
              <p>
                模拟数据，当前为冷却扰动回放。整机输入功耗含假设转换损耗，非真实采集。
              </p>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
