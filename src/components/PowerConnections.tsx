import { ConnectionSection } from "./ConnectionSection";
import { useState } from "react";
import type { AppState } from "../domain";
import { entityById } from "../domain";
import { deviceById, racks, rackForDevice } from "../installation";
import { modelForDevice } from "../catalog";
import {
  pdus,
  pduById,
  pduName,
  powerLinks,
  powerSettings,
  inletPart,
  powerDeviceIds,
} from "../power-config";
import type { SpatialReading } from "../spatial";
import { qualityNames } from "../status";
import { powerScene } from "../power-paths";

const input = (reading?: SpatialReading) =>
  reading?.quality === "valid" && reading.power !== null
    ? `${reading.power.toFixed(1)} W`
    : qualityNames[reading?.quality ?? "missing"];
export function PowerConnections({
  state,
  selectedId,
  readings,
  ready,
  onInteract,
  onSelect,
  onLocate,
  onViewPower,
  activeLinkId,
  onTrace,
}: {
  state: AppState;
  selectedId: string;
  readings: Map<string, SpatialReading>;
  ready: boolean;
  onInteract: () => void;
  onSelect: (id: string) => void;
  onLocate: (id: string) => void;
  onViewPower?: () => void;
  activeLinkId: string | null;
  onTrace: (id: string | null) => void;
}) {
  const [empty, setEmpty] = useState(false);
  const pdu = pduById(selectedId),
    selectedDevice = deviceById(selectedId),
    rack = racks.find((rack) => rack.id === selectedId);
  const part = entityById(selectedId)?.kind === "part";
  const device =
    selectedDevice ?? (part ? deviceById(state.deviceId) : undefined);
  if (selectedId !== powerSettings.sourceId && !pdu && !rack && !device)
    return null;
  const model = device ? modelForDevice(device.id) : null;
  const selectedFeed = model
    ? (["A", "B"] as const).find(
        (feed) => inletPart(model.id, feed) === selectedId,
      )
    : null;
  const links = powerLinks.filter((link) =>
    pdu
      ? link.pduId === pdu.id
      : device
        ? link.deviceId === device.id &&
          (!selectedFeed || link.inlet === selectedFeed)
        : false,
  );
  const canTrace = ready && !!powerScene(state, selectedId);
  return (
    <ConnectionSection
      onInteract={onInteract}
      title="供电连接"
      className="power-connections"
      active={!!activeLinkId}
      summary={
        pdu
          ? `${links.length} / ${powerSettings.outletsPerPdu} 插座已接`
          : rack
            ? "2 个 PDU · 配置"
            : device
              ? `${links.length} 路输入 · 配置`
              : `${pdus.length} 个出线 · 配置`
      }
    >
      {onViewPower && <button onClick={onViewPower}>场景查看 ↗</button>}
      <p className="power-boundary">
        配置示意 · A/B 未定义独立上游；回路与插座未计量，整机输入不分摊。
      </p>
      {selectedId === powerSettings.sourceId ? (
        <>
          <p>
            {pdus.length} 个逻辑出线 → {pdus.length} 个 PDU ·{" "}
            {powerDeviceIds(powerSettings.sourceId).length} 台关联设备
          </p>
          <div className="power-connection-list">
            {racks.map((rack) => {
              const pair = pdus.filter((pdu) => pdu.rackId === rack.id);
              return (
                <button
                  className="power-rack-link"
                  key={rack.id}
                  onClick={() => onSelect(rack.id)}
                >
                  <span>
                    {rack.name}
                    <small>
                      {pair
                        .map((pdu) => `${pdu.sourcePort} / PDU ${pdu.feed}`)
                        .join(" · ")}
                    </small>
                  </span>
                  <span>查看支路 ↗</span>
                </button>
              );
            })}
          </div>
        </>
      ) : rack ? (
        <>
          <button
            className="power-upstream"
            onClick={() => onSelect(powerSettings.sourceId)}
          >
            ← 查看配电柜
          </button>
          <div className="power-connection-list">
            {pdus
              .filter((pdu) => pdu.rackId === rack.id)
              .map((pdu) => (
                <div className="power-link" key={pdu.id}>
                  <strong>{pduName(pdu.id)}</strong>
                  <span>
                    配电柜 {pdu.sourcePort} → 入口 {pdu.feed}
                  </span>
                  <small>
                    已接{" "}
                    {powerLinks.filter((link) => link.pduId === pdu.id).length}{" "}
                    / {powerSettings.outletsPerPdu} 插座
                  </small>
                  <div>
                    <button onClick={() => onSelect(pdu.id)}>查看插座</button>
                    <button disabled={!ready} onClick={() => onLocate(pdu.id)}>
                      定位 PDU {pdu.feed}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </>
      ) : pdu ? (
        <>
          <div className="power-upstream-row">
            <button onClick={() => onSelect(powerSettings.sourceId)}>
              配电柜 {pdu.sourcePort}
            </button>
            <span>→ {pduName(pdu.id)}</span>
          </div>
          <p>
            已接 {links.length} / {powerSettings.outletsPerPdu} 插座 · 空闲{" "}
            {powerSettings.outletsPerPdu - links.length}
          </p>
          <div className="power-pdu-actions">
            <button disabled={!ready} onClick={() => onLocate(pdu.id)}>
              定位到机柜后侧
            </button>
            <label>
              <input
                type="checkbox"
                checked={empty}
                onChange={(event) => setEmpty(event.target.checked)}
              />
              显示空闲插座
            </label>
          </div>
          <div
            className="power-outlet-table"
            role="table"
            aria-label={`${pduName(pdu.id)}插座分配`}
          >
            <div role="row" className="power-outlet-heading">
              <span role="columnheader">插座 / 去向</span>
              <span role="columnheader">整机输入</span>
              <span role="columnheader">支路</span>
            </div>
            {Array.from(
              { length: powerSettings.outletsPerPdu },
              (_, index) => index + 1,
            )
              .filter(
                (outlet) =>
                  empty || links.some((link) => link.outlet === outlet),
              )
              .map((outlet) => {
                const link = links.find((link) => link.outlet === outlet),
                  device = link ? deviceById(link.deviceId)! : null;
                return (
                  <div
                    role="row"
                    key={outlet}
                    className="power-outlet"
                    data-traced={!!link && activeLinkId === link.id}
                  >
                    <span role="cell">
                      <b>{String(outlet).padStart(2, "0")}</b>
                      {device && link ? (
                        <button onClick={() => onSelect(device.id)}>
                          {device.name}
                          <small>
                            → 输入 {link.inlet} /{" "}
                            {
                              entityById(inletPart(device.modelId, link.inlet))!
                                .name
                            }
                          </small>
                        </button>
                      ) : (
                        <small>空闲 · 未连接</small>
                      )}
                    </span>
                    <span role="cell">
                      {device ? input(readings.get(device.id)) : "—"}
                    </span>
                    <span role="cell">
                      {link ? (
                        <button
                          aria-label={`追踪${pduName(pdu.id)}插座${String(outlet).padStart(2, "0")}`}
                          aria-pressed={activeLinkId === link.id}
                          disabled={!canTrace}
                          onClick={() =>
                            onTrace(activeLinkId === link.id ? null : link.id)
                          }
                        >
                          {activeLinkId === link.id ? "取消" : "追踪"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                );
              })}
          </div>
          <small className="power-boundary">
            表中 W 值属于关联整机，不是本插座或本路负载；两路的关联值不能相加。
          </small>
        </>
      ) : device && model ? (
        <>
          <button
            className="power-upstream"
            onClick={() => onSelect(rackForDevice(device.id).id)}
          >
            ← {rackForDevice(device.id).name}供电
          </button>
          <div className="power-connection-list">
            {links.map((link) => (
              <div className="power-link" key={link.id}>
                <strong>
                  输入 {link.inlet} ·{" "}
                  {model.parts.includes(inletPart(model.id, link.inlet))
                    ? entityById(inletPart(model.id, link.inlet))!.name
                    : "未映射"}
                </strong>
                <span>
                  {pduName(link.pduId)} / 插座{" "}
                  {String(link.outlet).padStart(2, "0")} → {device.name}
                </span>
                <div>
                  <button
                    aria-label={`追踪${device.name}输入${link.inlet}`}
                    aria-pressed={activeLinkId === link.id}
                    disabled={!canTrace}
                    onClick={() =>
                      onTrace(activeLinkId === link.id ? null : link.id)
                    }
                  >
                    {activeLinkId === link.id
                      ? "取消追踪"
                      : `追踪输入 ${link.inlet}`}
                  </button>
                  <button
                    disabled={!ready}
                    onClick={() => onLocate(link.pduId)}
                  >
                    定位 PDU {link.inlet}
                  </button>
                  {state.level === "device" && state.deviceId === device.id && (
                    <button
                      onClick={() => onSelect(inletPart(model.id, link.inlet))}
                    >
                      预览电源 {link.inlet}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {model.category !== "server" && (
            <p className="power-boundary">
              交换机与存储的电源位置属于内部配置示意，展开后查看，不代表精确外观端口。
            </p>
          )}
          {part && (
            <p className="power-boundary">
              部件转换损耗或模型分项不等于该输入支路功率。
            </p>
          )}
        </>
      ) : null}
    </ConnectionSection>
  );
}
