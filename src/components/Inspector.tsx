import { useEffect, useRef } from "react";
import { entityById, simulate, parts } from "../domain";
import { AssemblyControls } from "./AssemblyControls";
import type { Action, AppState } from "../domain";

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
}: {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}) {
  const entity = entityById(state.selected)!;
  const simulation = simulate(state.time);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [state.selected]);
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
                ["模型节点", part.node],
              ]
            : [
                ["对象类型", "基础设施"],
                ["数据接入", "未接入"],
              ];
  return (
    <aside className="inspector" ref={panel}>
      <div className="overline">
        对象信息 <span> / {kindNames[entity.kind]}</span>
      </div>
      <h2>{entity.name}</h2>
      <p className="description">{entity.description}</p>
      {state.level === "device" && (
        <AssemblyControls state={state} dispatch={dispatch} />
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
      {state.level !== "device" && (
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
            <span>设备温度</span>
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
            {simulation.health}
          </span>
          <span>t + {String(state.time).padStart(3, "0")} s</span>
        </div>
        <button
          className="text-button"
          onClick={() => dispatch({ type: "play" })}
        >
          {state.playing ? "Ⅱ 暂停模拟" : "▷ 播放模拟"}
        </button>
        <p>示意数据，无真实设备接入。固定公式生成，时间由全局模拟时钟驱动。</p>
      </section>
    </aside>
  );
}
