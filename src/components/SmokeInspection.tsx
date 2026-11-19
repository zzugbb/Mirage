import { useEffect, useRef } from "react";
import { smokeFixtures, smokePlacement } from "../smoke-inspection";

export function SmokeInspectionControls({
  origin,
  selected,
  ready,
  onPreview,
  onLocate,
  onReturn,
  onEnd,
}: {
  origin: string;
  selected: string;
  ready: boolean;
  onPreview: (id: string) => void;
  onLocate: () => void;
  onReturn: () => void;
  onEnd: () => void;
}) {
  const select = useRef<HTMLSelectElement>(null);
  const initialFocus = useRef(true);
  useEffect(() => {
    if (ready && initialFocus.current) {
      select.current?.focus({ preventScroll: true });
      initialFocus.current = false;
    }
  }, [ready]);
  const start = smokeFixtures.find((row) => row.id === origin)!;
  return (
    <div
      className="review-object-actions smoke-controls"
      role="group"
      aria-label="烟感逐点核对"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !ready) return;
        event.preventDefault();
        event.stopPropagation();
        onReturn();
      }}
    >
      <label>
        预览
        <select
          ref={select}
          aria-label="预览烟感点位"
          disabled={!ready}
          value={selected}
          onChange={(event) => onPreview(event.target.value)}
        >
          {smokeFixtures.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <button disabled={!ready} onClick={onLocate}>
        近看安装位
      </button>
      <button disabled={!ready} onClick={onReturn}>
        返回起点 · {start.name}
      </button>
      <button disabled={!ready} onClick={onEnd}>
        就地结束
      </button>
    </div>
  );
}

export function SmokeInspectionDetails({
  origin,
  selected,
}: {
  origin: string;
  selected: string;
}) {
  const rows = smokePlacement(origin)!;
  const point = rows.find((row) => row.id === selected)!;
  const other = rows.find((row) => row.id !== selected)!;
  const distance = selected === origin ? other.distance : point.distance;
  return (
    <section className="smoke-inspection-details" aria-label="烟感布置核对">
      <dl>
        <div>
          <dt>安装中心高度</dt>
          <dd>{point.position[1].toFixed(2)} m</dd>
        </div>
        <div>
          <dt>与{other.name}的中心间距</dt>
          <dd>{distance.toFixed(2)} m</dd>
        </div>
      </dl>
      <details>
        <summary>坐标与配置说明</summary>
        <p>
          机房 X / Y / Z ·{" "}
          {point.position.map((value) => value.toFixed(2)).join(" / ")} m
        </p>
        <p>间距取自配置中心的直线距离。探测覆盖及消防联动未接入。</p>
      </details>
    </section>
  );
}
