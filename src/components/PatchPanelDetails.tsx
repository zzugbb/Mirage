import {
  panelSettings,
  panelPortNumbers,
  panelTermination,
  patchPanelById,
  type PanelPort,
} from "../patch-panels";
import { rackById } from "../installation";

export function PatchPanelDetails({
  id,
  target,
  ready,
  onInspect,
  onHistory,
}: {
  id: string;
  target: PanelPort | null;
  ready: boolean;
  onInspect: (port: PanelPort) => void;
  onHistory: (id: string) => void;
}) {
  const panel = patchPanelById(id)!;
  const rack = panel.referenceRackId && rackById(panel.referenceRackId);
  const current = target?.panelId === id ? target : null;
  const termination = current && panelTermination(current);
  return (
    <section className="panel-port-details" aria-label="配线架孔位">
      <strong>正面孔位</strong>
      <div
        className="panel-port-grid"
        role="group"
        aria-label="按面板位置选择孔位"
        style={{ gridTemplateColumns: `repeat(${panelSettings.columns}, 1fr)` }}
      >
        {panelPortNumbers.map((port) => (
          <button
            key={port}
            disabled={!ready}
            aria-label={`定位 ${panel.name} 孔 ${port}`}
            aria-pressed={current?.port === port}
            onClick={() => onInspect({ panelId: id, port })}
          >
            {String(port).padStart(2, "0")}
          </button>
        ))}
      </div>
      {current && (
        <div aria-live="polite">
          <strong>
            孔 {String(current.port).padStart(2, "0")} ·{" "}
            {termination ? termination.id : "对端未登记"}
          </strong>
          {termination && (
            <button
              disabled={!ready}
              onClick={() => onInspect(termination.peer)}
            >
              定位对端 · {patchPanelById(termination.peer.panelId)!.name} · 孔{" "}
              {String(termination.peer.port).padStart(2, "0")} ↗
            </button>
          )}
        </div>
      )}
      <p>孔号与端接取自样板配置。施工路径、实物跳线和链路状态待核实。</p>
      {rack && (
        <button disabled={!ready} onClick={() => onHistory(rack.id)}>
          回看邻近 {rack.name}设备汇总 ↗
        </button>
      )}
    </section>
  );
}
