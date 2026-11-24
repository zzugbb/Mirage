import { useMemo } from "react";
import {
  selectRoofPduView,
  selectRoofSupportView,
  selectRoofView,
  rackRoof,
  type FixtureCrossing,
  type RackRoofView,
} from "../fixture-crossing";
import { pduName } from "../power-config";

const signedMillimeters = (offset: number) =>
  `${offset > 0 ? "+" : ""}${(offset * 1000).toFixed(1)} mm`;

export function RoofEntryDetails({
  crossing,
  ready,
  onInspect,
  onLocate,
  onHistory,
}: {
  crossing: RackRoofView;
  ready: boolean;
  onInspect: (pair: FixtureCrossing) => void;
  onLocate: (id: string) => void;
  onHistory: (id: string) => void;
}) {
  const entry = crossing.kind === "roof-pdu" ? crossing.entry : crossing;
  const overview = entry.kind === "roof-entry" ? entry.overview : entry;
  const otherView = useMemo(
    () => selectRoofPduView(crossing, crossing.kind !== "roof-pdu"),
    [crossing],
  );
  const supportView = useMemo(
    () =>
      crossing.kind === "roof-pdu"
        ? selectRoofSupportView(crossing, !crossing.support)
        : null,
    [crossing],
  );
  return (
    <div className="roof-entry-details">
      <label>
        {entry.lower.name}柜顶进线口
        <select
          aria-label="柜顶进线口"
          disabled={!ready}
          value={entry.kind === "roof-entry" ? entry.index : ""}
          onChange={(e) => {
            const next = selectRoofView(
              crossing,
              e.target.value === "" ? null : Number(e.target.value),
            );
            if (next) onInspect(next);
          }}
        >
          <option value="">
            {overview.kind === "lighting-round"
              ? "同框 · 顶灯、桥架与柜顶"
              : "整柜 · 横档与柜顶板"}
          </option>
          {rackRoof.entryXs.map((x, i) => (
            <option key={x} value={i}>
              开口 {i + 1} · 柜内 X {x > 0 ? "+" : ""}
              {x.toFixed(2)} m
            </option>
          ))}
        </select>
      </label>
      {crossing.kind === "roof-entry" && (
        <>
          <strong>
            {crossing.upper.name} · 开口 {crossing.index + 1}
          </strong>
          <p>
            开口宽 {rackRoof.entryWidth.toFixed(2)} m × 深{" "}
            {rackRoof.entryDepth.toFixed(2)} m。按开口中心的 X
            截面，侧梁外缘与开口近缘的 Z 向投影间距为{" "}
            <b>{(crossing.horizontal * 1000).toFixed(1)} mm</b>。
          </p>
          <p>
            柜顶轮廓标出配置开口。刷条与桥架均为静态布置，施工线缆及实际接入未登记。
          </p>
          {otherView && (
            <button disabled={!ready} onClick={() => onInspect(otherView)}>
              核对柜后 PDU 输入 ↗
            </button>
          )}
          <button
            disabled={!ready}
            onClick={() => onHistory(crossing.lower.id)}
          >
            回看{crossing.lower.name}设备汇总 ↗
          </button>
        </>
      )}
      {crossing.kind === "roof-pdu" && (
        <>
          <strong>
            {pduName(crossing.pdu.id)} · 逻辑出线 {crossing.pdu.sourcePort}
          </strong>
          {crossing.support ? (
            <>
              <dl className="roof-pdu-offsets">
                <div>
                  <dt>输入参考点标高</dt>
                  <dd>{crossing.inlet.y.toFixed(3)} m</dd>
                </div>
                <div>
                  <dt>支架 {crossing.support.index + 1} 中心标高</dt>
                  <dd>{crossing.support.supportHeight.toFixed(3)} m</dd>
                </div>
                <div>
                  <dt>输入减支架高差</dt>
                  <dd>
                    {signedMillimeters(crossing.support.heightDifference)}
                  </dd>
                </div>
              </dl>
              <p>
                按标高选距输入参考点最近的本侧支架。支架及标尺沿用样板安装配置，实际固定与穿线待核实。
              </p>
            </>
          ) : (
            <>
              <dl className="roof-pdu-offsets">
                <div>
                  <dt>X 向偏移</dt>
                  <dd>{signedMillimeters(crossing.offsets.x)}</dd>
                </div>
                <div>
                  <dt>Z 向偏移</dt>
                  <dd>{signedMillimeters(crossing.offsets.z)}</dd>
                </div>
                <div>
                  <dt>开口减输入高差</dt>
                  <dd>{signedMillimeters(crossing.offsets.height)}</dd>
                </div>
              </dl>
              <p>
                按开口中心在地面的投影选同柜最近的配置输入点。X、Z
                向偏移从开口量至输入点。柜后局部剖切，实际穿线与回路计量未登记。
              </p>
            </>
          )}
          {supportView && (crossing.support || supportView.support) && (
            <button disabled={!ready} onClick={() => onInspect(supportView)}>
              {crossing.support
                ? "← 返回柜顶与 PDU 输入"
                : "核对输入与侧壁支架 ↗"}
            </button>
          )}
          <button disabled={!ready} onClick={() => onLocate(crossing.pdu.id)}>
            定位 {pduName(crossing.pdu.id)} ↗
          </button>
          <button disabled={!ready} onClick={() => onHistory(crossing.pdu.id)}>
            回看 {pduName(crossing.pdu.id)} 关联输入 ↗
          </button>
          {!crossing.support && otherView && (
            <button disabled={!ready} onClick={() => onInspect(otherView)}>
              ← 返回刷条外侧
            </button>
          )}
        </>
      )}
    </div>
  );
}
