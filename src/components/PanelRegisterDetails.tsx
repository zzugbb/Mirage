import { PanelEntryDetails } from "./PanelEntryDetails";
import {
  racewayConnections,
  racewayPanels,
  panelEntryPlacement,
} from "../panel-raceway";
import {
  patchPanelById,
  panelSettings,
  panelPortNumbers,
  panelTermination,
  type PanelPort,
} from "../patch-panels";
import { rackById } from "../installation";

function compactPort(port: PanelPort) {
  const code = patchPanelById(port.panelId)!.name.split(" ")[0];
  return code + "/" + String(port.port).padStart(2, "0");
}

export function PanelRegisterDetails({
  target,
  selected,
  ready,
  entryView,
  hidden,
  onEntryView,
  onAxis,
  onChoose,
  onLocate,
  onHistory,
  onExit,
}: {
  target: PanelPort;
  selected: string;
  ready: boolean;
  entryView: boolean;
  hidden?: boolean;
  onEntryView: (id: string, enabled: boolean) => void;
  onAxis: () => void;
  onChoose: (port: PanelPort) => void;
  onLocate: (port: PanelPort) => void;
  onHistory: (id: string) => void;
  onExit: () => void;
}) {
  const record = panelTermination(target);
  const panel = entryView
    ? panelEntryPlacement(selected)?.panel
    : racewayPanels.find((p) => p.id === selected);
  const rack = panel?.referenceRackId && rackById(panel.referenceRackId);
  return (
    <section
      className="panel-port-details panel-register"
      aria-label="双端孔位核对"
      hidden={hidden}
    >
      <label>
        跨架端接登记
        <select
          aria-label="跨架端接登记"
          autoFocus
          value={record?.id ?? ""}
          disabled={!ready}
          onChange={(e) => {
            const pair = racewayConnections.find(
              (c) => c.id === e.target.value,
            );
            if (pair)
              onChoose(
                pair.second.panelId === target.panelId
                  ? pair.second
                  : pair.first,
              );
          }}
        >
          {!record && <option value="">此孔对端未登记</option>}
          {racewayConnections.map((pair) => (
            <option key={pair.id} value={pair.id}>
              {pair.id} · {compactPort(pair.first)} ↔ {compactPort(pair.second)}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={!ready}
        onClick={() =>
          onEntryView(entryView ? target.panelId : selected, !entryView)
        }
      >
        {entryView ? "返回所选孔位" : "核对箱顶与横槽"}
      </button>
      {entryView ? (
        <>
          <button disabled={!ready} onClick={onAxis}>
            核对线槽轴线里程 ↗
          </button>
          <PanelEntryDetails
            target={target}
            selected={selected}
            ready={ready}
            onLocate={(id) => onEntryView(id, true)}
          />
        </>
      ) : (
        <>
          {racewayPanels.map((p) => {
            const local = p.id === target.panelId;
            const endpoint = local
              ? target
              : record?.peer.panelId === p.id
                ? record.peer
                : null;
            return (
              <div key={p.id} className="panel-register-face">
                <div className="panel-register-heading">
                  <strong>{p.name}</strong>
                  <small>
                    {local
                      ? selected === p.id
                        ? "近看孔"
                        : "所选孔"
                      : endpoint
                        ? "登记对端"
                        : "对端未登记"}
                    {endpoint && " " + String(endpoint.port).padStart(2, "0")}
                  </small>
                </div>
                <div
                  className="panel-port-grid"
                  role="group"
                  aria-label={p.name + "正面孔位"}
                  style={{
                    gridTemplateColumns:
                      "repeat(" + panelSettings.columns + ",1fr)",
                  }}
                >
                  {panelPortNumbers.map((port) => (
                    <button
                      key={port}
                      disabled={!ready}
                      aria-label={`定位 ${p.name} 孔 ${port}`}
                      aria-pressed={local && target.port === port}
                      aria-description={
                        !local && endpoint?.port === port
                          ? "登记对端"
                          : undefined
                      }
                      data-peer={
                        (!local && endpoint?.port === port) || undefined
                      }
                      onClick={() => onLocate({ panelId: p.id, port })}
                    >
                      {String(port).padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <p>点孔号定位到面板。端接取自样板登记，槽内敷线待核实。</p>
        </>
      )}
      {rack && (
        <button disabled={!ready} onClick={() => onHistory(rack.id)}>
          回看邻近 {rack.name}设备汇总 ↗
        </button>
      )}
      <button disabled={!ready} onClick={onExit}>
        ← 返回核对起点
      </button>
    </section>
  );
}
