import { deviceSourceRows } from "../reading-sources";
import { feederInputText } from "../power-feeders";
import type { SpatialReading } from "../spatial";

export function FeederDeviceHistory({
  deviceId,
  readings,
  ready,
  onAnalyze,
}: {
  deviceId: string;
  readings: Map<string, SpatialReading>;
  ready: boolean;
  onAnalyze: (id: string) => void;
}) {
  const [row] = deviceSourceRows([deviceId], "power", readings);
  return (
    <div className="feeder-device-history">
      <span>关联整机输入 · {feederInputText(row)}</span>
      {!row.included && <small>{row.detail}</small>}
      <button disabled={!ready} onClick={() => onAnalyze(deviceId)}>
        回看 {row.name} 整机输入 ↗
      </button>
    </div>
  );
}
