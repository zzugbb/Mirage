import { rackForDevice, deviceById } from "../installation";
import { useEffect, useRef } from "react";
import { entityById, componentById, subparts } from "../domain";
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
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [state.selected, view]);
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [view]);
  const part = componentById(entity.id);
  const fields =
    entity.kind === "room"
      ? [
          ["场景类型", "示意机房"],
          ["空间尺寸", "8 × 6 × 3.2 m"],
          ["机柜 / 设备", "3 / 6"],
        ]
      : entity.kind === "rack"
        ? [
            ["机柜容量", "42 U"],
            ["外形尺寸", "600 × 1100 mm"],
            ["演示设备", "2 台"],
          ]
        : entity.kind === "device"
          ? [
              ["设备形态", "通用 2U 服务器"],
              [
                "安装位置",
                `${rackForDevice(state.deviceId).name} · U${deviceById(state.deviceId)!.startUnit}–U${deviceById(state.deviceId)!.startUnit + 1}`,
              ],
              ["结构精度", "示意级"],
            ]
          : part
            ? [
                ["所属设备", state.deviceId.toUpperCase()],
                [
                  subparts.some((item) => item.id === entity.id)
                    ? "演示编号"
                    : "槽位标识",
                  part.slot,
                ],
                [
                  "结构精度",
                  subparts.some((item) => item.id === entity.id)
                    ? "独立构件 · 示意编号"
                    : "模组级示意",
                ],
              ]
            : [
                ["对象类型", "基础设施"],
                ["数据接入", "未接入"],
              ];
  return (
    <aside className="inspector" aria-label="对象与运行概览">
      <div className="inspector-heading">
        <strong>{view === "object" ? "对象详情" : "运行概览"}</strong>
        <span>{view === "object" ? kindNames[entity.kind] : "模拟"}</span>
      </div>
      <div className="inspector-scroll" ref={panel}>
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
            <div className="metric-links">
              <button onClick={() => onViewChange("temperature")}>
                温度云图 ↗
              </button>
              <button onClick={() => onViewChange("power")}>功耗分布 ↗</button>
              <button onClick={() => onViewChange("alarms")}>告警定位 ↗</button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
