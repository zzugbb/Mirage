import { ConnectionSection } from "./ConnectionSection";
import {
  coolingSource,
  coolingDeviceIds,
  coolingSummary,
  isCoolingSource,
} from "../cooling";
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
      title={source ? "配置服务范围" : "冷却关联"}
      className="cooling-connections"
      summary={
        source
          ? `${racks.length} 柜 · ${ids.length} 台设备`
          : `${ids.length} 台设备 · 前进后出假设`
      }
    >
      <div className="cooling-heading">
        {!airflowVisible && (
          <button disabled={!ready} onClick={onViewAirflow}>
            {state.level === "room" ? "查看气流" : "机房气流"} ↗
          </button>
        )}
      </div>
      {!source && (
        <button
          className="cooling-source-link"
          onClick={() => onSelect(coolingSource.id)}
        >
          ← {coolingSource.name} · 模拟输入
        </button>
      )}
      {source ? (
        <>
          <p className="cooling-boundary">
            按配置关联{" "}
            {
              racks.filter((rack) =>
                ids.some((id) => deviceById(id)?.rackId === rack.id),
              ).length
            }{" "}
            柜 / {ids.length} 台设备；不表示独占覆盖或已校核制冷量。
          </p>
          <div className="cooling-range-list">
            {racks.map((rack) => {
              const range = coolingSummary(
                ids.filter((id) => deviceById(id)?.rackId === rack.id),
                readings,
              );
              if (!range.count) return null;
              return (
                <div key={rack.id} className="cooling-range-row">
                  <button
                    onClick={() => onSelect(rack.id)}
                    aria-label={`预览 ${rack.name}冷却关联`}
                  >
                    <strong>{rack.name}</strong>
                    <small>
                      进风最高{" "}
                      {range.maximum === null
                        ? "—"
                        : `${range.maximum.toFixed(1)} °C`}{" "}
                      · 有效 {range.coverage}/{range.count}
                    </small>
                  </button>
                  <span>
                    {range.alarmIds.length
                      ? `${range.alarmIds.length} 台告警`
                      : "无当前告警"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : rack ? (
        <>
          <p className="cooling-boundary">
            {rack.name} · {ids.length} 台关联设备。预览设备可切换当前代表路径。
          </p>
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
          {rackForDevice(device.id).name} / {device.name} · 假设前进后出
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
          同向双排布置，尚无架空地板风腔或封闭冷热通道。逻辑端点不是已识别的真实风口；不提供送/回风温度、风量、制冷功率或设施告警。部件温度不作为新的进风测点。
        </p>
      </details>
      {!source && (
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
