import {
  aisleDoorPose,
  type AisleDoorPosition,
  type OpposedDoorGap,
  type RearLeafSide,
} from "../aisle-door-gap";
import type { DoorSweep } from "../door-sweep";
import { pdus, pduName } from "../power-config";
import { pduDoorLeaf } from "../rear-service";

export function AisleDoorDetails({
  sweeps,
  position,
  gap,
  onPosition,
  onSide,
  ready,
  onOpenPdu,
}: {
  sweeps: DoorSweep[];
  position: AisleDoorPosition;
  gap: OpposedDoorGap;
  onPosition: (value: AisleDoorPosition) => void;
  onSide: (side: RearLeafSide) => void;
  ready: boolean;
  onOpenPdu?: (id: string) => void;
}) {
  return (
    <div className="aisle-door-check">
      <label>
        门扇投影位置
        <select
          value={position}
          onChange={(e) => onPosition(e.target.value as AisleDoorPosition)}
        >
          <option value="peak">扫掠最大进深</option>
          <option value="open">配置全开位置</option>
          <option value="front-open">前门全开 · 后门合拢</option>
          <option value="rear-open">前门合拢 · 后门全开</option>
          <option value="closed">两柜门扇合拢</option>
        </select>
      </label>
      <label>
        量至对侧后门
        <select
          value={gap.side}
          onChange={(e) => onSide(e.target.value as RearLeafSide)}
        >
          <option value="right">柜后右扇</option>
          <option value="left">柜后左扇</option>
        </select>
      </label>
      <p>
        前门至{gap.side === "left" ? "左" : "右"}后扇的基准线最短间距{" "}
        <b>{gap.distance.toFixed(3)} m</b>。两端短刻线标出地面量取位置。
      </p>
      {sweeps.map((sweep) => {
        const ref = aisleDoorPose(sweep, position);
        return (
          <p key={sweep.area.id}>
            <b>
              {sweep.area.rackName.split(" ")[0]}{" "}
              {sweep.area.kind === "front" ? "前门" : "双扇后门"} · {ref.angle}°
            </b>
            <br />
            自由边距柜面 {ref.depth.toFixed(3)} m ·{" "}
            {ref.remaining >= 0 ? "至预留边界" : "超出预留"}{" "}
            {Math.abs(ref.remaining).toFixed(3)} m
          </p>
        );
      })}
      <small>
        扇形为铰轴至自由边的扫掠投影。门厚、五金与人员占位未计入，现场通行净距待实测。
      </small>
      {onOpenPdu &&
        pdus
          .filter((pdu) => pdu.rackId === gap.rear.area.rackId)
          .map((pdu) => {
            const placement = pduDoorLeaf(gap.rear, pdu.id);
            const context =
              placement.side +
              (placement.leaf.hingeX === gap.leaf.hingeX
                ? " · 当前量取侧"
                : "");
            const name = "开后门核对 " + pduName(pdu.id) + " ↗";
            return (
              <button
                key={pdu.id}
                disabled={!ready}
                aria-label={name}
                aria-description={context}
                onClick={() => onOpenPdu(pdu.id)}
              >
                {context} · {pduName(pdu.id)} ↗
              </button>
            );
          })}
    </div>
  );
}
