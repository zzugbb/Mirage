import { unitLabel } from "../catalog";
import {
  frontServiceDevices,
  type FrontServiceInspection,
} from "../front-service";

export function FrontServiceDetails({
  inspection,
  ready,
  trayAvailable,
  doorOpen,
  onSelect,
  onExtract,
  onOpenDoor,
}: {
  inspection: FrontServiceInspection;
  ready: boolean;
  trayAvailable: boolean;
  doorOpen: boolean;
  onSelect: (id: string) => void;
  onExtract: () => void;
  onOpenDoor: () => void;
}) {
  const { area, device, offset, travel, remaining } = inspection;
  return (
    <section
      className="maintenance-view-details aisle-door-check"
      aria-label="柜前设备行程"
    >
      <strong>{area.rackName.split(" ")[0]} · 柜前设备行程</strong>
      <label>
        柜前检修设备
        <select
          value={device.id}
          disabled={!ready}
          onChange={(e) => onSelect(e.target.value)}
        >
          {frontServiceDevices(area).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} · {unitLabel(d.id)}
            </option>
          ))}
        </select>
      </label>
      <p>
        {travel ? "导轨配置行程 " + travel.toFixed(3) + " m" : "固定安装"} ·
        柜前预留 {area.depth.toFixed(2)} m
      </p>
      <p aria-live="polite">
        {ready
          ? (offset ? "抽出前沿" : "安装前沿") +
            "至预留边界的纵向投影 " +
            remaining.toFixed(3) +
            " m。"
          : "正在定位检修设备。"}
        按配置机箱前沿计算，现场净距未实测。
      </p>
      {!doorOpen && (
        <button disabled={!ready} onClick={onOpenDoor}>
          打开柜前门
        </button>
      )}
      {travel > 0 && (
        <button disabled={!ready || !trayAvailable} onClick={onExtract}>
          {offset ? "推回安装位" : "沿导轨抽出"}
        </button>
      )}
    </section>
  );
}
