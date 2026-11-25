import type { FeederEnergyInterval } from "../feeder-energy";
import { ConnectionSection } from "./ConnectionSection";
import { FeederDeviceHistory } from "./FeederDeviceHistory";
import { PduOutlets } from "./PduOutlets";
import type { PduInspection } from "../pdu-outlets";
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
  type PowerLink,
} from "../power-config";
import type { SpatialReading } from "../spatial";
import { powerLinkById, powerTraceStops } from "../power-trace";
import { powerScene } from "../power-paths";
import { powerPairLinks } from "../power-view";

export function PowerConnections({
  state,
  pduInspection,
  onPduChange,
  onPduSelect,
  onLocateOutlet,
  onOutletNetwork,
  onOutletAirflow,
  selectedId,
  readings,
  ready,
  onInteract,
  onSelect,
  onLocate,
  onViewPower,
  onOpenFeeders,
  activeLinkId,
  traceExitInScene,
  onTrace,
  onInspect,
  paired,
  onInspectMount,
  interval,
  onAnalyzeDevice,
}: {
  paired: boolean;
  interval: FeederEnergyInterval | null;
  onAnalyzeDevice: (id: string, time?: number) => void;
  onInspectMount?: () => void;
  pduInspection: PduInspection | null;
  onPduChange: (visit: PduInspection) => void;
  onOutletNetwork: (
    visit: PduInspection,
    input: PowerLink,
    branchId: string,
  ) => void;
  onOutletAirflow: (visit: PduInspection) => void;
  onLocateOutlet: (link: PowerLink) => void;
  onPduSelect: (pduId: string, outlet: number) => void;
  state: AppState;
  selectedId: string;
  readings: Map<string, SpatialReading>;
  ready: boolean;
  onInteract: () => void;
  onSelect: (id: string) => void;
  onLocate: (id: string) => void;
  onViewPower?: () => void;
  onOpenFeeders?: (pduId?: string) => void;
  activeLinkId: string | null;
  traceExitInScene: boolean;
  onTrace: (id: string | null) => void;
  onInspect: (id: string) => void;
}) {
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
  const stops = powerTraceStops(activeLinkId);
  const activeLink = powerLinkById(activeLinkId);
  const deviceInputs = activeLink
    ? powerLinks.filter((link) => link.deviceId === activeLink.deviceId)
    : [];
  const canTrace = ready && !!powerScene(state, selectedId);
  return (
    <ConnectionSection
      onInteract={onInteract}
      title="供电连接"
      className="power-connections"
      active={!!activeLinkId || pduInspection?.pduId === selectedId}
      summary={
        pdu
          ? `${links.length} / ${powerSettings.outletsPerPdu} 插座已接`
          : rack
            ? "2 个 PDU · 配置"
            : device
              ? `${links.length} 路输入 · 配置`
              : `${pdus.length} 个逻辑出线 · 配置`
      }
    >
      {onViewPower && <button onClick={onViewPower}>查看功耗视图 ↗</button>}
      {onOpenFeeders && (selectedId === powerSettings.sourceId || pdu) && (
        <button onClick={() => onOpenFeeders(pdu?.id)}>
          {pdu ? "核对出线 " + pdu.sourcePort : "核对配电出线"} ↗
        </button>
      )}
      {!paired && !pdu && (
        <p className="power-boundary">
          配置示意 · A/B 未定义独立上游；回路与插座未计量，整机输入不分摊。
        </p>
      )}
      {paired && activeLink && (
        <section
          className="power-active-trace power-pair-detail"
          aria-label="双输入供电核对"
        >
          <strong>{deviceById(activeLink.deviceId)!.name} · 输入与插座</strong>
          <div
            role="group"
            aria-label="选择供电输入"
            className="power-pair-inputs"
          >
            {powerPairLinks(activeLink.id).map((link) => (
              <button
                key={link.id}
                disabled={!ready}
                aria-pressed={link.id === activeLink.id}
                onClick={() => onTrace(link.id)}
              >
                <b>输入 {link.inlet}</b>
                <span>
                  {pduName(link.pduId)} · 插座{" "}
                  {String(link.outlet).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
          <button disabled={!ready} onClick={() => onLocateOutlet(activeLink)}>
            定位 {pduName(activeLink.pduId)} · 插座{" "}
            {String(activeLink.outlet).padStart(2, "0")} ↗
          </button>
          <button
            className="power-inspect-input"
            disabled={!ready}
            onClick={() => onInspect(activeLink.id)}
          >
            查看电源 {activeLink.inlet} ↗
          </button>
          <button
            disabled={!ready}
            onClick={() => onLocate(powerSettings.sourceId)}
          >
            核对配电柜出线 {pduById(activeLink.pduId)!.sourcePort} ↗
          </button>
          <small>输入端点为配置位置，整机功耗未分摊。</small>
        </section>
      )}
      {stops.length > 0 &&
        !paired &&
        !(
          pdu &&
          pduInspection?.pduId === pdu.id &&
          pduInspection.outlet !== null
        ) && (
          <section className="power-active-trace" aria-label="当前供电支路">
            <header>
              <strong>当前供电支路</strong>
              {!traceExitInScene && (
                <button
                  aria-label="结束当前供电支路追踪"
                  onClick={() => onTrace(null)}
                >
                  结束追踪
                </button>
              )}
            </header>
            {activeLink && selectedId === powerSettings.sourceId && (
              <section
                className="power-feeder-route"
                aria-label="设备出线与插座"
              >
                <strong>
                  {deviceById(activeLink.deviceId)!.name} · 配电柜出线
                </strong>
                <div
                  className="power-pair-inputs"
                  role="group"
                  aria-label="选择设备出线"
                >
                  {deviceInputs.map((link) => (
                    <button
                      key={link.id}
                      disabled={!ready}
                      aria-pressed={link.id === activeLink.id}
                      onClick={() => onTrace(link.id)}
                    >
                      <b>
                        {pduById(link.pduId)!.sourcePort} · 输入 {link.inlet}
                      </b>
                      <span>
                        {pduName(link.pduId)} · 插座{" "}
                        {String(link.outlet).padStart(2, "0")}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  disabled={!ready}
                  onClick={() => onLocateOutlet(activeLink)}
                >
                  定位 {pduName(activeLink.pduId)} · 插座{" "}
                  {String(activeLink.outlet).padStart(2, "0")} ↗
                </button>
                <FeederDeviceHistory
                  interval={interval}
                  deviceId={activeLink.deviceId}
                  readings={readings}
                  ready={ready}
                  onAnalyze={onAnalyzeDevice}
                />
                <small>配电柜共用一个出线示意位置，实体端子位置未配置。</small>
              </section>
            )}

            {activeLink && selectedId !== powerSettings.sourceId && (
              <div
                className="power-input-switch"
                role="group"
                aria-label="同一设备的供电输入"
              >
                <span>{deviceById(activeLink.deviceId)!.name} 输入</span>
                {deviceInputs.map((link) => (
                  <button
                    key={link.id}
                    disabled={!ready}
                    aria-pressed={link.id === activeLinkId}
                    aria-label={`查看 ${deviceById(link.deviceId)!.name} 输入 ${link.inlet}`}
                    onClick={() => onTrace(link.id)}
                  >
                    {link.inlet} · {pduName(link.pduId)}
                  </button>
                ))}
              </div>
            )}
            <ol>
              {stops.map((stop) => (
                <li key={stop.id}>
                  <button
                    className="power-stop-preview"
                    aria-label={`预览支路对象 ${stop.name}`}
                    onClick={() => onSelect(stop.id)}
                    aria-pressed={selectedId === stop.id}
                  >
                    <strong>{stop.name}</strong>
                    <small>{stop.location}</small>
                    {stop.input && <small>{stop.input}</small>}
                  </button>
                  <button
                    disabled={!ready}
                    aria-label={`定位支路对象 ${stop.name}`}
                    onClick={() => onLocate(stop.id)}
                  >
                    定位
                  </button>
                </li>
              ))}
            </ol>
            {activeLink && (
              <button
                className="power-inspect-input"
                disabled={!ready}
                onClick={() => onInspect(activeLink.id)}
              >
                查看 {deviceById(activeLink.deviceId)!.name} 电源{" "}
                {activeLink.inlet}
              </button>
            )}
          </section>
        )}
      {paired ? null : selectedId === powerSettings.sourceId ? (
        <>
          <p>
            {pdus.length} 个 PDU ·{" "}
            {powerDeviceIds(powerSettings.sourceId).length} 台关联设备
          </p>
          <div className="power-connection-list">
            {racks.map((rack) => {
              const pair = pdus.filter((pdu) => pdu.rackId === rack.id);
              return (
                <button
                  className="power-rack-link"
                  aria-label={`查看 ${rack.name} 供电支路`}
                  aria-describedby={`power-ports-${rack.id}`}
                  key={rack.id}
                  onClick={() => onSelect(rack.id)}
                >
                  <span>
                    {rack.name}
                    <small id={`power-ports-${rack.id}`}>
                      {pair
                        .map((pdu) => `${pdu.sourcePort} / PDU ${pdu.feed}`)
                        .join(" · ")}
                    </small>
                  </span>
                  <span aria-hidden="true">↗</span>
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
          <PduOutlets
            onNetwork={onOutletNetwork}
            onAirflow={onOutletAirflow}
            onLocateOutlet={onLocateOutlet}
            interval={interval}
            key={pdu.id}
            pduId={pdu.id}
            inScene={!!powerScene(state, pdu.id)}
            visit={pduInspection}
            readings={readings}
            ready={ready}
            onChange={onPduChange}
            onSelect={(outlet) => onPduSelect(pdu.id, outlet)}
            onPreview={onSelect}
            onInspect={onInspect}
            onAnalyzeDevice={onAnalyzeDevice}
          />
          <details className="pdu-outlet-related">
            <summary>来源与安装 · {pdu.sourcePort}</summary>
            <div className="pdu-outlet-actions">
              <button onClick={() => onSelect(powerSettings.sourceId)}>
                配电柜 {pdu.sourcePort}
              </button>
              {!powerScene(state, pdu.id) && (
                <button disabled={!ready} onClick={() => onLocate(pdu.id)}>
                  定位 PDU 后侧
                </button>
              )}
              {onInspectMount && (
                <button disabled={!ready} onClick={onInspectMount}>
                  核对侧壁支架
                </button>
              )}
            </div>
          </details>
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
