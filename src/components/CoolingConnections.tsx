import type { ReactNode } from "react";
import { ConnectionSection } from "./ConnectionSection";
import { coolingSource, coolingDeviceIds, isCoolingSource } from "../cooling";
import { deviceById, racks, rackForDevice } from "../installation";
import { modelForDevice } from "../catalog";
import type { AppState } from "../domain";
import type { SpatialReading } from "../spatial";
import { lifecycleNames, qualityNames } from "../status";

export function CoolingConnections({
  state,
  selectedId,
  readings,
  ready,
  airflowVisible,
  onInteract,
  onSelect,
  onLocateSource,
  onViewAirflow,
  range,
  rangeOpen,
  onRangeOpen,
  active = false,
}: {
  state: AppState;
  selectedId: string;
  readings: Map<string, SpatialReading>;
  ready: boolean;
  airflowVisible: boolean;
  onInteract: () => void;
  onSelect: (id: string) => void;
  onLocateSource: () => void;
  onViewAirflow: () => void;
  range: ReactNode;
  rangeOpen: boolean;
  onRangeOpen: (open: boolean) => void;
  active?: boolean;
}) {
  const ids = coolingDeviceIds(selectedId, state.deviceId);
  if (!ids.length) return null;
  const source = isCoolingSource(selectedId);
  const rack = racks.find((rack) => rack.id === selectedId);
  const device =
    !source && !rack && ids.length === 1 ? deviceById(ids[0]) : null;
  return (
    <ConnectionSection
      onInteract={onInteract}
      open={source ? rangeOpen : undefined}
      onOpenChange={source ? onRangeOpen : undefined}
      title={source ? "配置服务范围" : "冷却关联"}
      className="cooling-connections"
      summary={
        source
          ? `${racks.length} 柜 · ${ids.length} 台设备`
          : `${ids.length} 台设备 · 前进后出假设`
      }
    >
      {!airflowVisible && !(source && state.level === "room") && (
        <div className="cooling-heading">
          <button
            data-cooling-airflow-entry
            disabled={!ready}
            onClick={onViewAirflow}
          >
            {state.level === "room" ? "查看气流" : "机房气流"} ↗
          </button>
        </div>
      )}
      {!source && !active && (
        <button
          className="cooling-source-link"
          onClick={() => onSelect(coolingSource.id)}
        >
          ← {coolingSource.name} · 模拟输入
        </button>
      )}
      {source ? (
        range
      ) : rack ? (
        <>
          <p className="cooling-boundary">按安装位置预览设备进风。</p>
          <div className="cooling-range-list">
            {ids.map((id) => {
              const reading = readings.get(id),
                d = deviceById(id)!,
                units = modelForDevice(id).units;
              const valid =
                reading?.quality === "valid" && reading.temperature !== null;
              return (
                <div key={id} className="cooling-range-row">
                  <button
                    onClick={() => onSelect(id)}
                    aria-label={`预览 ${d.name}进风`}
                  >
                    <strong>{d.name}</strong>
                    <small>
                      U{d.startUnit}
                      {units > 1 ? `–${d.startUnit + units - 1}` : ""} ·{" "}
                      {reading ? lifecycleNames[reading.lifecycle] : "未定义"}
                    </small>
                  </button>
                  <span>
                    {valid
                      ? `${reading.temperature!.toFixed(1)} °C`
                      : reading?.quality === "valid"
                        ? reading.lifecycle === "stopped"
                          ? "停机 · 无进风值"
                          : "无有效进风"
                        : qualityNames[reading?.quality ?? "missing"]}
                    {reading?.alarm ? " · 告警" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : device ? (
        <p>
          {rackForDevice(device.id).name} / {device.name}
        </p>
      ) : null}
      <details className="cooling-path-boundary">
        <summary>路径与数据边界</summary>
        <ol>
          <li>制冷单元逻辑送风端点</li>
          <li>目标柜所在排的柜前地板格栅</li>
          <li>关联设备前部进风 → 柜后出风假设</li>
          <li>上方回风 → 制冷单元逻辑入口</li>
        </ol>
        <p>
          配置关联不表示独占覆盖或已校核制冷量。同向双排布置，尚无架空地板风腔或封闭冷热通道。逻辑端点不是已识别的真实风口；不提供送/回风温度、风量、制冷功率或设施告警。部件温度不作为新的进风测点。
        </p>
      </details>
      {!source && !active && (
        <button
          disabled={!ready}
          className="cooling-source-link"
          onClick={onLocateSource}
        >
          定位制冷单元 ↗
        </button>
      )}
    </ConnectionSection>
  );
}
