import { unitLabel } from "../catalog";
import {
  frontServiceDevices,
  type FrontServiceInspection,
  type FrontServiceView,
} from "../front-service";

export function FrontServiceDetails({
  inspection,
  ready,
  trayAvailable,
  doorOpen,
  onView,
  onSelect,
  onExtract,
  onOpenDoor,
}: {
  inspection: FrontServiceInspection;
  ready: boolean;
  trayAvailable: boolean;
  doorOpen: boolean;
  onView: (view: FrontServiceView) => void;
  onSelect: (id: string) => void;
  onExtract: () => void;
  onOpenDoor: () => void;
}) {
  const { area, device, offset, travel, remaining } = inspection;
  const { view, depth, tailInset } = inspection;
  const tailPosition =
    Math.abs(tailInset) < 1e-8
      ? "尾端与柜口齐平"
      : "尾端在柜口" +
        (tailInset > 0 ? "内 " : "外 ") +
        Math.abs(tailInset).toFixed(3) +
        " m";
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
      <label>
        行程观察
        <select
          value={view}
          disabled={!ready}
          onChange={(e) =>
            onView(e.target.value === "chassis" ? "chassis" : "reserve")
          }
        >
          <option value="reserve">前沿与预留边界</option>
          <option value="chassis">柜口与机箱尾端</option>
        </select>
      </label>
      <p>
        {travel ? "导轨配置行程 " + travel.toFixed(3) + " m" : "固定安装"} ·{" "}
        {view === "chassis"
          ? "机箱配置深度 " + depth.toFixed(3) + " m"
          : "柜前预留 " + area.depth.toFixed(2) + " m"}
      </p>
      <p aria-live="polite">
        {!ready
          ? "正在定位检修设备。"
          : view === "chassis"
            ? (offset ? "抽出后，" : "在安装位，") +
              tailPosition +
              "。柜侧尺线标出机箱前后沿与柜口的纵向位置。"
            : (offset ? "抽出前沿" : "安装前沿") +
              "至预留边界的纵向投影 " +
              remaining.toFixed(3) +
              " m。按配置机箱前沿计算，"}
        现场净距未实测。
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
