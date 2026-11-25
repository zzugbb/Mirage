import { ConnectionSection } from "./ConnectionSection";
import { networkPowerEnds } from "../network-power";
import { pduById, type PowerLink } from "../power-config";
import { unitLabel } from "../catalog";
import type { NetworkLink } from "../network";

export function NetworkPowerInputs({
  branch,
  activeInput,
  prioritizeOutlet,
  ready,
  onLocate,
}: {
  branch: NetworkLink;
  activeInput: string | null;
  prioritizeOutlet: boolean;
  ready: boolean;
  onLocate: (input: PowerLink) => void;
}) {
  const ends = networkPowerEnds(branch.id);
  return (
    <ConnectionSection
      title="核对两端供电"
      summary={ends.map((end) => end.name).join(" ↔ ")}
      className="network-power-inputs"
      active={!!activeInput && !prioritizeOutlet}
    >
      {ends.map((end) => (
        <section key={end.deviceId} aria-label={end.name + " 供电输入"}>
          <strong>
            {end.side === "source" ? "设备端" : "交换机端"} · {end.name} ·{" "}
            {unitLabel(end.deviceId)}
          </strong>
          <small>{end.portLabel}</small>
          <div className="network-endpoint-picker">
            {end.inputs.map((input) => {
              const pdu = pduById(input.pduId)!;
              const outlet = String(input.outlet).padStart(2, "0");
              return (
                <button
                  key={input.id}
                  disabled={!ready}
                  aria-label={`定位 ${end.name} 输入 ${input.inlet} · PDU ${pdu.feed} 插座 ${outlet}`}
                  aria-pressed={input.id === activeInput}
                  onClick={() => onLocate(input)}
                >
                  <b>
                    输入 {input.inlet} · {pdu.sourcePort}
                  </b>
                  <span>
                    PDU {pdu.feed} · 插座 {outlet}
                  </span>
                </button>
              );
            })}
          </div>
          {!end.inputs.length && <small>电源输入未登记</small>}
        </section>
      ))}
      <small>出线与插座取自配置。回路未计量，A/B 上游独立性未登记。</small>
    </ConnectionSection>
  );
}
