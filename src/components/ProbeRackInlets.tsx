import { unitLabel } from "../catalog";
import { coolingRackPeaks } from "../cooling-probe";
import type { EnvironmentRound } from "../environment-rounds";
import type { SpatialReading } from "../spatial";
import { ConnectionSection } from "./ConnectionSection";

export function ProbeRackInlets({
  round,
  readings,
  ready,
  active,
  onLocate,
}: {
  round: EnvironmentRound;
  readings: Map<string, SpatialReading>;
  ready: boolean;
  active: boolean;
  onLocate: (id: string) => void;
}) {
  return (
    <ConnectionSection
      className="probe-rack-inlets"
      title="同排各柜最高进风"
      summary={round.row.name + " · " + round.racks.length + " 柜"}
      active={active}
    >
      {coolingRackPeaks(round, readings).map(
        ({ rack, device, coverage, count, maximum }) => (
          <div key={rack.id} className="probe-rack-inlet">
            <div>
              <strong>{rack.name}</strong>
              <small>
                有效 {coverage}/{count}
              </small>
            </div>
            {device && maximum !== null ? (
              <button
                disabled={!ready}
                onClick={() => onLocate(device.id)}
                aria-label={`定位 ${rack.name} ${device.name} ${unitLabel(device.id)} 安装位`}
              >
                <span>
                  {device.name} · {unitLabel(device.id)}
                </span>
                <b>{maximum.toFixed(1)} °C ↗</b>
              </button>
            ) : (
              <small>无有效进风</small>
            )}
          </div>
        ),
      )}
      <small>按本排制冷服务设备的模拟进风取最高值。墙面探头单独采样。</small>
    </ConnectionSection>
  );
}
