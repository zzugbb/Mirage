import { useLayoutEffect, useRef } from "react";
import {
  findMaintenanceAisles,
  reserveGapText,
  type MaintenanceAisle,
} from "../maintenance";

export function MaintenanceAisles({
  query,
  onQuery,
  selected,
  ready,
  visible,
  restore,
  onRestored,
  onInspect,
}: {
  query: string;
  onQuery: (query: string) => void;
  selected: string;
  ready: boolean;
  visible: boolean;
  restore: { rackId: string; scroll: number } | null;
  onRestored: () => void;
  onInspect: (aisle: MaintenanceAisle, scroll: number) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const rows = findMaintenanceAisles(query);
  useLayoutEffect(() => {
    if (!visible || !ready || !restore || !list.current) return;
    const target = list.current.querySelector<HTMLButtonElement>(
      `[data-aisle-row="${restore.rackId}"]`,
    );
    if (!target) return;
    target.focus({ preventScroll: true });
    list.current.scrollTop = restore.scroll;
    onRestored();
  }, [restore, visible, ready, onRestored]);
  const inspect = (row: MaintenanceAisle) => {
    if (ready) onInspect(row, list.current?.scrollTop ?? 0);
  };
  return (
    <section className="aisle-roster" aria-label="排间通道名单">
      <input
        aria-label="查找通道机柜"
        placeholder="查找任一侧机柜，如 B03"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Escape" && query) {
            e.preventDefault();
            e.stopPropagation();
            onQuery("");
          } else if (e.key === "Enter" && ready && rows.length === 1) {
            e.preventDefault();
            inspect(rows[0]);
          }
        }}
      />
      <div className="aisle-roster-count" role="status">
        {rows.length ? `${rows.length} 组排间通道` : "没有匹配的通道"}
      </div>
      <div className="aisle-roster-rows" ref={list}>
        {rows.map((aisle) => (
          <button
            key={aisle.id}
            data-aisle-row={aisle.front.rackId}
            aria-pressed={[aisle.front.rackId, aisle.rear.rackId].includes(
              selected,
            )}
            aria-disabled={!ready}
            onClick={() => inspect(aisle)}
          >
            <strong>
              {aisle.front.rackName.split(" ")[0]} 柜前 ·{" "}
              {aisle.rear.rackName.split(" ")[0]} 柜后{" "}
              <span aria-hidden="true">↗</span>
            </strong>
            <small>
              柜面间距 {aisle.faceDistance.toFixed(2)} m ·{" "}
              {reserveGapText(aisle.gap)}
            </small>
          </button>
        ))}
      </div>
      <p>按机柜布置和维护预留计算。通行净距需现场实测。</p>
    </section>
  );
}
