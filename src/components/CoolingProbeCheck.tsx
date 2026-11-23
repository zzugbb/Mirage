import {
  compareCoolingTemperatures,
  type coolingProbeForDevice,
} from "../cooling-probe";
import {
  environmentObservation,
  environmentChannelText,
} from "../environment-monitoring";
import { qualityNames } from "../status";
import type { SpatialReading } from "../spatial";
import { ConnectionSection } from "./ConnectionSection";

export function CoolingProbeCheck({
  context,
  reading,
  time,
  active,
  actionLabel,
  ready,
  onLocate,
}: {
  context: NonNullable<ReturnType<typeof coolingProbeForDevice>>;
  reading: SpatialReading;
  time: number;
  active: boolean;
  actionLabel: string;
  ready: boolean;
  onLocate: () => void;
}) {
  const { device, probe, row } = context;
  const observation = environmentObservation(probe.id, time);
  if (!observation) return null;
  const ambient = observation.temperature;
  const { difference, reason } = compareCoolingTemperatures(reading, ambient);
  const inlet =
    reading.quality !== "valid"
      ? qualityNames[reading.quality]
      : reading.temperature === null
        ? reading.lifecycle === "stopped"
          ? "停机"
          : "无有效进风"
        : reading.temperature.toFixed(1) + " °C";
  return (
    <ConnectionSection
      className="cooling-probe-check"
      title="进风与同排环境"
      summary={row.name + " · " + device.name}
      active={active}
    >
      <dl>
        <dt>{device.name} 进风</dt>
        <dd>
          {inlet}
          {reading.observedAt !== null && (
            <small>采样 t+{reading.observedAt}s</small>
          )}
        </dd>
        <dt>{probe.name}</dt>
        <dd>
          {environmentChannelText(ambient, "°C")}
          {ambient.observedAt !== null && (
            <small>采样 t+{ambient.observedAt}s</small>
          )}
        </dd>
      </dl>
      <p>
        {difference === null
          ? "温差未计算 · " + reason
          : "进风 − 探头 " +
            (difference > 0 ? "+" : "") +
            difference.toFixed(1) +
            " °C · " +
            reason}
      </p>
      <small>同排巡检点 · 模拟温度。探头只代表安装位置。</small>
      <button disabled={!ready} onClick={onLocate}>
        {actionLabel} ↗
      </button>
    </ConnectionSection>
  );
}
