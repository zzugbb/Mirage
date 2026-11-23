import {
  fixtureCrossing,
  roofEntryPlacement,
  rackRoof,
  type FixtureCrossing,
} from "../fixture-crossing";

export function RoofEntryDetails({
  crossing,
  ready,
  onInspect,
  onHistory,
}: {
  crossing: Extract<FixtureCrossing, { kind: "rack-tray" | "roof-entry" }>;
  ready: boolean;
  onInspect: (pair: FixtureCrossing) => void;
  onHistory: (id: string) => void;
}) {
  return (
    <div className="roof-entry-details">
      <label>
        {crossing.lower.name}柜顶进线口
        <select
          aria-label="柜顶进线口"
          disabled={!ready}
          value={crossing.kind === "roof-entry" ? crossing.index : ""}
          onChange={(e) => {
            const { upper, lower } = crossing;
            const next =
              e.target.value === ""
                ? fixtureCrossing(upper.id, lower.id)
                : roofEntryPlacement(
                    upper.id,
                    lower.id,
                    Number(e.target.value),
                  );
            if (next) onInspect(next);
          }}
        >
          <option value="">整柜 · 横档与柜顶板</option>
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
          <button
            disabled={!ready}
            onClick={() => onHistory(crossing.lower.id)}
          >
            回看{crossing.lower.name}设备汇总 ↗
          </button>
        </>
      )}
    </div>
  );
}
