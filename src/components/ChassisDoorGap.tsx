import { useMemo } from "react";
import { chassisDoorGap, type RearDoorPosition } from "../chassis-door-gap";
import type { RearLeafSide } from "../aisle-door-gap";
import type { FrontServiceInspection } from "../front-service";
import type { MaintenanceAisle } from "../maintenance";
import { pduName } from "../power-config";

export type ChassisDoorSelection = {
  open: boolean;
  position: RearDoorPosition;
  side: RearLeafSide;
};
const initial: ChassisDoorSelection = {
  open: false,
  position: "open",
  side: "right",
};

export function ChassisDoorGap({
  inspection,
  ready,
  onLocate,
  selection = initial,
  onChange,
}: {
  selection?: ChassisDoorSelection;
  onChange: (value: ChassisDoorSelection) => void;
  inspection: FrontServiceInspection;
  ready: boolean;
  onLocate: (aisle: MaintenanceAisle, pduId: string) => void;
}) {
  const { position, side } = selection;
  const comparison = useMemo(
    () => chassisDoorGap(inspection, position, side),
    [inspection, position, side],
  );
  if (!comparison) return null;
  const { aisle, left, right, leaves, selected, gap, pdu } = comparison;
  const scale = 50;
  const x = (v: number) => 52 + (v - aisle.x) * scale;
  const z = (v: number) =>
    8 + (v - (inspection.rearZ - inspection.offset)) * scale;
  return (
    <details
      className="chassis-door-gap"
      open={selection.open}
      onToggle={(e) => {
        const open = e.currentTarget.open;
        if (open !== selection.open) onChange({ ...selection, open });
      }}
    >
      <summary>核对机箱前沿与对侧后门</summary>
      <label>
        对侧后门投影
        <select
          value={position}
          onChange={(e) =>
            onChange({
              ...selection,
              position: e.target.value as RearDoorPosition,
            })
          }
        >
          <option value="closed">合拢位置</option>
          <option value="peak">扫掠最大进深</option>
          <option value="open">配置全开位置</option>
        </select>
      </label>
      <label>
        量取门扇
        <select
          value={side}
          onChange={(e) =>
            onChange({ ...selection, side: e.target.value as RearLeafSide })
          }
        >
          <option value="right">柜后右扇</option>
          <option value="left">柜后左扇</option>
        </select>
      </label>
      <div className="chassis-gap-plan">
        <svg
          role="img"
          aria-label="机箱前沿、两侧预留与对侧后门俯视投影"
          viewBox={`0 0 104 ${z(aisle.rear.bounds.maxZ) + 16}`}
        >
          {[aisle.front, aisle.rear].map((area) => (
            <rect
              key={area.id}
              x={x(area.bounds.minX)}
              y={z(area.bounds.minZ)}
              width={area.width * scale}
              height={area.depth * scale}
              fill="none"
              stroke="#73858e"
              strokeDasharray="3 2"
            />
          ))}
          <rect
            x={x(left.x)}
            y={z(inspection.rearZ)}
            width={(right.x - left.x) * scale}
            height={inspection.depth * scale}
            fill="#39545e"
            stroke="#79959e"
          />
          {inspection.offset > 0 && (
            <line
              x1={x(left.x) - 3}
              x2={x(right.x) + 3}
              y1={z(inspection.frontZ - inspection.offset)}
              y2={z(inspection.frontZ - inspection.offset)}
              stroke="#a6bac1"
              strokeDasharray="2 2"
            />
          )}
          <line
            x1={x(left.x)}
            x2={x(right.x)}
            y1={z(left.z)}
            y2={z(right.z)}
            stroke="#a9e6e5"
            strokeWidth="3"
          />
          {leaves.map((item) => (
            <line
              key={item.side}
              x1={x(item.hinge.x)}
              y1={z(item.hinge.z)}
              x2={x(item.tip.x)}
              y2={z(item.tip.z)}
              stroke={item === selected ? "#f2c47c" : "#8799a2"}
              strokeWidth={item === selected ? 3 : 1.5}
            />
          ))}
          <line
            x1={x(gap.from.x)}
            y1={z(gap.from.z)}
            x2={x(gap.to.x)}
            y2={z(gap.to.z)}
            stroke="#f1dfb8"
            strokeDasharray="2 2"
          />
          {[gap.from, gap.to].map((p, i) => (
            <circle key={i} cx={x(p.x)} cy={z(p.z)} r="2.1" fill="#fff1ce" />
          ))}
        </svg>
        <div>
          <strong>{inspection.device.name}</strong>
          <span>{inspection.offset ? "抽出前沿" : "安装前沿"}</span>
          <b>{gap.distance.toFixed(3)} m</b>
          <span>投影最短间距</span>
          <strong>
            {aisle.rear.rackName.split(" ")[0]} ·{" "}
            {side === "left" ? "左后扇" : "右后扇"}
          </strong>
          <span>配置门位 {comparison.angle}°</span>
        </div>
      </div>
      <small>
        按安装外廓俯视量取。门厚、把手与人员占位未计入，现场净距待实测。
      </small>
      {pdu && (
        <button disabled={!ready} onClick={() => onLocate(aisle, pdu.id)}>
          定位 {pduName(pdu.id)} 插座 ↗
        </button>
      )}
    </details>
  );
}
