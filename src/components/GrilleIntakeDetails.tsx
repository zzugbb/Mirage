import type { GrilleIntakeInspection } from "../grille-intake";
import { deviceById, rackById } from "../installation";
import { unitLabel } from "../catalog";

export function GrilleIntakeDetails({
  check,
  ready,
  onSeat,
  onLocate,
}: {
  check: GrilleIntakeInspection;
  ready: boolean;
  onSeat: () => void;
  onLocate: (id: string) => void;
}) {
  const { route, seat, offsets } = check;
  const device = deviceById(route.deviceId)!;
  const rack = rackById(route.rackId)!;
  const signed = (value: number) =>
    `${value > 0 ? "+" : ""}${value.toFixed(3)} m`;
  return (
    <div className="lighting-round">
      <dl>
        <div>
          <dt>代表落点</dt>
          <dd>
            {seat.row.name} {String(seat.index + 1).padStart(2, "0")} 号
          </dd>
        </div>
        <div>
          <dt>代表设备</dt>
          <dd>
            {rack.name} · {device.name} · {unitLabel(device.id)}
          </dd>
        </div>
        <div>
          <dt>X 向偏移</dt>
          <dd>{signed(offsets.x)}</dd>
        </div>
        <div>
          <dt>Z 向偏移</dt>
          <dd>{signed(offsets.z)}</dd>
        </div>
        <div>
          <dt>到进风点高差</dt>
          <dd>{offsets.y.toFixed(3)} m</dd>
        </div>
      </dl>
      <small>
        两端沿用本排代表气流配置。地面虚线和竖向尺线分别标示水平偏移和高差。风量和供风范围待实测。
      </small>
      <button disabled={!ready} onClick={() => onLocate(device.id)}>
        定位 {device.name} 安装位 ↗
      </button>
      <button disabled={!ready} onClick={onSeat}>
        返回格栅安装剖面
      </button>
    </div>
  );
}
