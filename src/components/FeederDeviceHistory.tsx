import {
  deviceIntervalEnergy,
  energyText,
  type FeederEnergyInterval,
} from "../feeder-energy";
import { deviceSourceRows } from "../reading-sources";
import { feederInputText } from "../power-feeders";
import type { SpatialReading } from "../spatial";

export function FeederDeviceHistory({
  interval,
  deviceId,
  readings,
  ready,
  onAnalyze,
}: {
  interval: FeederEnergyInterval | null;
  deviceId: string;
  readings: Map<string, SpatialReading>;
  ready: boolean;
  onAnalyze: (id: string, time?: number) => void;
}) {
  const [row] = deviceSourceRows([deviceId], "power", readings);
  const energy =
    interval && interval.end > interval.start
      ? deviceIntervalEnergy(deviceId, interval)
      : null;
  return (
    <div className="feeder-device-history">
      <span>关联整机输入 · {feederInputText(row)}</span>
      {!row.included && <small>{row.detail}</small>}
      {interval && energy && (
        <>
          <small>
            整机区间电量 · {interval.start}–{interval.end} 秒 ·{" "}
            {energyText(energy.wattHours)} · 有效 {energy.covered}/
            {interval.end - interval.start} 秒
          </small>
          {energy.lastEnd !== null &&
            energy.covered < interval.end - interval.start && (
              <button
                disabled={!ready}
                onClick={() => onAnalyze(deviceId, energy.lastEnd!)}
              >
                回看最后计入时刻 · {energy.lastEnd} 秒 ↗
              </button>
            )}
        </>
      )}
      <button disabled={!ready} onClick={() => onAnalyze(deviceId)}>
        回看 {row.name} 整机输入 ↗
      </button>
    </div>
  );
}
