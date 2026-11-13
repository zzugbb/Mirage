import { useEffect, useMemo, useRef } from "react";
import { inletOverview } from "../inlet-overview";
import {
  sliceRackRows,
  verticalTemperatureSlice,
  type SliceControls,
} from "../temperature-slice";
import type { SpatialReading } from "../spatial";

export function SlicePlaneDetails({
  controls,
  readings,
  time,
  selected,
  ready,
  onPreview,
  onReturn,
}: {
  controls: SliceControls;
  readings: Map<string, SpatialReading>;
  time: number;
  selected: string;
  ready: boolean;
  onPreview: (id: string) => void;
  onReturn: () => void;
}) {
  const host = useRef<HTMLElement>(null);
  const row = sliceRackRows.find((item) => item.id === controls.rowId)!;
  const members = useMemo(
    () =>
      inletOverview(readings).filter((item) =>
        row.rackIds.includes(item.rack.id),
      ),
    [readings, row],
  );
  const slice = useMemo(
    () => verticalTemperatureSlice(readings, row.id, controls.distance),
    [readings, row, controls.distance],
  );
  useEffect(() => {
    const section = host.current,
      panel = section?.closest<HTMLElement>(".study-inspector");
    if (section && panel) {
      panel.scrollTop +=
        section.getBoundingClientRect().top -
        panel.getBoundingClientRect().top -
        (panel.querySelector(".study-panel-heading")?.getBoundingClientRect()
          .height ?? 64) -
        12;
      section.focus({ preventScroll: true });
    }
  }, []);
  return (
    <section
      ref={host}
      className="slice-evidence-details slice-plane-details"
      aria-label="整排切片观察"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape" && ready) {
          event.preventDefault();
          event.stopPropagation();
          onReturn();
        }
      }}
    >
      <header>
        <strong>{row.name} · 整排切片观察</strong>
      </header>
      <p>
        第 {time} 秒 · 距柜前 {controls.distance.toFixed(2)} m
      </p>
      <div className="slice-evidence-value">
        <span>切面估计范围</span>
        <strong>
          {slice.min === null
            ? "无有效估计"
            : `${slice.min.toFixed(1)}–${slice.max!.toFixed(1)} °C`}
        </strong>
      </div>
      <p>
        柜旁短标为各柜切面最高估计。下列为整柜有效进风输入，与切面估计分开。调整距离不改变设备输入；超出局部插值范围时切面留白。
      </p>
      <ol>
        {members.map((item) => (
          <li key={item.rack.id}>
            <button
              className="slice-evidence-input"
              aria-pressed={selected === item.rack.id}
              onClick={() => onPreview(item.rack.id)}
            >
              <span>
                {item.rack.name}
                <small>
                  有效 {item.coverage}/{item.rows.length} 台
                </small>
              </span>
              <span>
                {item.maximum === null
                  ? "无有效进风"
                  : `最高 ${item.maximum.toFixed(1)} °C`}
                <small>预览机柜</small>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <button disabled={!ready} onClick={onReturn}>
        ← 返回整排观察前视角
      </button>
      <small>
        切换柜排和距离继续观察；返回只恢复原镜头，保留最新对象、切片参数与共享时间。手动镜头或离开垂直切片结束观察。
      </small>
      <small>
        同向双排样板的柜前插值示意；空白不代表零温度。没有新增环境测点、风口或真实温场验证。
      </small>
    </section>
  );
}
