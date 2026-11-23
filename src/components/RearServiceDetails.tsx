import { unitLabel } from "../catalog";
import { pduName, pdus, type PowerLink } from "../power-config";
import { pduOutlets } from "../pdu-outlets";
import type { RearServiceInspection } from "../rear-service";

export function RearServiceDetails({
  inspection,
  ready,
  showSweep,
  onSelect,
  onInspect,
}: {
  inspection: RearServiceInspection;
  ready: boolean;
  showSweep: boolean;
  onSelect: (id: string, outlet: number) => void;
  onInspect: (link: PowerLink) => void;
}) {
  const { sweep, pdu, socket, side, inset, lateral } = inspection;
  return (
    <section
      className="maintenance-view-details aisle-door-check"
      aria-label="柜后安装关系"
    >
      <strong>{sweep.area.rackName.split(" ")[0]} · 柜后检修</strong>
      <label>
        柜后 PDU
        <select
          value={pdu.id}
          disabled={!ready}
          onChange={(e) => onSelect(e.target.value, socket.outlet)}
        >
          {pdus
            .filter((item) => item.rackId === pdu.rackId)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {pduName(item.id)}
              </option>
            ))}
        </select>
      </label>
      <label>
        插座与配置对端
        <select
          value={socket.outlet}
          disabled={!ready}
          onChange={(e) => onSelect(pdu.id, Number(e.target.value))}
        >
          {pduOutlets(pdu.id).map((row) => (
            <option key={row.outlet} value={row.outlet}>
              {String(row.outlet).padStart(2, "0")} ·{" "}
              {row.device
                ? row.device.name + " · 输入 " + row.link!.inlet
                : "未配置对端"}
            </option>
          ))}
        </select>
      </label>
      <p>
        从柜后看，插座中心位于{side}铰轴{inset >= 0 ? "向柜内" : "向柜外"}{" "}
        {Math.abs(inset * 1000).toFixed(0)} mm，横向相差{" "}
        {(lateral * 1000).toFixed(0)} mm。
      </p>
      <p>
        配置全开 {sweep.open.angle}° · 柜后预留 {sweep.area.depth.toFixed(2)}{" "}
        m。{showSweep ? "地面扇形显示全开扫掠，" : ""}
        全开自由边至预留边界的纵向投影为 {sweep.open.remaining.toFixed(3)}{" "}
        m。现场净距未实测。
      </p>
      {socket.link && socket.device && (
        <button disabled={!ready} onClick={() => onInspect(socket.link!)}>
          核对 {socket.device.name} · {unitLabel(socket.device.id)} · 电源{" "}
          {socket.link.inlet} ↗
        </button>
      )}
    </section>
  );
}
