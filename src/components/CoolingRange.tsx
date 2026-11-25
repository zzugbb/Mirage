import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  coolingRangeRows,
  type CoolingRangeState,
  type CoolingRangeAction,
  type CoolingRangePosition,
  type CoolingRangeFilter,
} from "../cooling-range";
import { unitLabel } from "../catalog";
import { lifecycleNames, qualityNames } from "../status";
import type { SpatialReading } from "../spatial";
import { clearSearchOnEscape } from "../search-keyboard";

export function CoolingRange({
  value,
  readings,
  ready,
  open,
  restore,
  searchFocus,
  onChange,
  onVisit,
}: {
  value: CoolingRangeState;
  readings: Map<string, SpatialReading>;
  ready: boolean;
  open: boolean;
  restore: RefObject<CoolingRangePosition | null>;
  searchFocus: RefObject<boolean>;
  onChange: (value: CoolingRangeState) => void;
  onVisit: (
    id: string,
    rackId: string,
    action: CoolingRangeAction,
    position: CoolingRangePosition,
  ) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const rows = useMemo(
    () => coolingRangeRows(readings, value.query, value.filter),
    [readings, value.query, value.filter],
  );
  const search = useRef<HTMLInputElement>(null);
  const [rowMissing, setRowMissing] = useState(false);
  useLayoutEffect(() => {
    if (!open || !ready || !host.current) return;
    if (searchFocus.current) {
      searchFocus.current = false;
      search.current?.focus({ preventScroll: true });
      search.current
        ?.closest("details")
        ?.querySelector("summary")
        ?.scrollIntoView({ block: "start" });
    }
    const position = restore.current;
    if (!position) return;
    restore.current = null;
    host.current.scrollTop = position.list;
    const panel = host.current.closest<HTMLElement>(".study-inspector");
    if (panel) panel.scrollTop = position.panel;
    const button = position.focusKey
      ? host.current.querySelector<HTMLButtonElement>(
          `[data-cooling-action="${position.focusKey}"]`,
        )
      : null;
    const target =
      button ??
      host.current.querySelector<HTMLButtonElement>("[aria-expanded='true']");
    target?.focus({ preventScroll: true });
    if (position.focusKey && !button)
      target?.scrollIntoView({ block: "nearest" });
    setRowMissing(!!position.focusKey && !button);
  });
  const visit = (
    id: string,
    rackId: string,
    action: CoolingRangeAction = "preview",
  ) => {
    if (!host.current) return;
    setRowMissing(false);
    onVisit(id, rackId, action, {
      list: host.current.scrollTop,
      panel:
        host.current.closest<HTMLElement>(".study-inspector")?.scrollTop ?? 0,
      focusKey: id !== rackId ? id + ":" + action : undefined,
    });
  };
  const changeQuery = (query: string, filter = value.filter) => {
    if (host.current) host.current.scrollTop = 0;
    setRowMissing(false);
    onChange({ ...value, selectedDeviceId: undefined, query, filter });
  };
  const filtered = !!value.query.trim() || value.filter !== "all";
  const matchingRacks = rows.filter((row) => row.matching.length);
  const singleRack = matchingRacks.length === 1 ? matchingRacks[0].rack : null;
  const matching = rows.reduce((n, row) => n + row.matching.length, 0);
  return (
    <section className="cooling-range-browser" aria-label="制冷服务范围核对">
      <label>
        查找机柜或设备
        <input
          ref={search}
          aria-label="服务范围查找"
          value={value.query}
          placeholder="机柜、编号、机型或 U 位"
          onChange={(e) => changeQuery(e.target.value)}
          onKeyDown={(event) =>
            clearSearchOnEscape(event, () => changeQuery(""))
          }
        />
      </label>
      <label>
        查看对象
        <select
          aria-label="服务范围筛选"
          value={value.filter}
          onChange={(e) =>
            changeQuery(value.query, e.target.value as CoolingRangeFilter)
          }
        >
          <option value="all">全部关联设备</option>
          <option value="unavailable">无当前进风</option>
          <option value="alarm">当前设备告警</option>
        </select>
      </label>
      {filtered && (
        <p className="cooling-range-count" role="status">
          匹配 {matching} 台设备
          {singleRack && value.rackId !== singleRack.id && (
            <button
              onClick={() => {
                onChange({
                  ...value,
                  selectedDeviceId: undefined,
                  rackId: singleRack.id,
                });
                const toggle = host.current?.querySelector<HTMLButtonElement>(
                  `[aria-controls="cooling-range-${singleRack.id}"]`,
                );
                toggle?.focus();
              }}
            >
              查看 {singleRack.name} ↗
            </button>
          )}
        </p>
      )}
      {rowMissing && (
        <p role="status">原设备在当前时刻已移出筛选范围，已返回原机柜。</p>
      )}
      <div className="cooling-range-groups" ref={host}>
        {rows.map(({ rack, grille, summary, matching }) => (
          <section key={rack.id} className="cooling-range-group">
            <button
              className="cooling-range-toggle"
              aria-expanded={value.rackId === rack.id}
              aria-controls={`cooling-range-${rack.id}`}
              onClick={() => {
                setRowMissing(false);
                onChange({
                  ...value,
                  selectedDeviceId: undefined,
                  rackId: value.rackId === rack.id ? null : rack.id,
                });
              }}
            >
              <strong>
                {rack.name}{" "}
                <span>
                  {filtered
                    ? `${matching.length}/${summary.count}`
                    : summary.count}{" "}
                  台 {value.rackId === rack.id ? "−" : "+"}
                </span>
              </strong>
              <small>
                最高进风{" "}
                {summary.maximum === null
                  ? "—"
                  : `${summary.maximum.toFixed(1)} °C`}{" "}
                · 有效 {summary.coverage}/{summary.count} ·{" "}
                {summary.alarmIds.length
                  ? `${summary.alarmIds.length} 台告警`
                  : "无设备告警"}
              </small>
            </button>
            {value.rackId === rack.id && (
              <div id={`cooling-range-${rack.id}`}>
                {grille && (
                  <p className="cooling-grille-location">
                    柜前送风格栅 {grille.id.split("-").at(-1)} · 本柜代表落点
                  </p>
                )}
                <div className="cooling-range-actions">
                  <button
                    disabled={!ready}
                    onClick={() => visit(rack.id, rack.id, "enter")}
                  >
                    进入机柜 ↗
                  </button>
                  <button onClick={() => visit(rack.id, rack.id)}>预览</button>
                  <button
                    disabled={!ready}
                    onClick={() => visit(rack.id, rack.id, "airflow")}
                  >
                    本柜气流 ↗
                  </button>
                </div>
                {matching.map((device) => {
                  const r = readings.get(device.id);
                  const valid =
                    r?.quality === "valid" &&
                    r.temperature !== null &&
                    Number.isFinite(r.temperature);
                  return (
                    <div className="cooling-range-device" key={device.id}>
                      <button
                        aria-pressed={device.id === value.selectedDeviceId}
                        data-cooling-action={device.id + ":preview"}
                        onClick={() => visit(device.id, rack.id)}
                        aria-label={`预览 ${device.name}服务范围设备`}
                      >
                        <strong>
                          {device.name} <small>{unitLabel(device.id)}</small>
                        </strong>
                        <span>
                          {valid
                            ? `${r.temperature!.toFixed(1)} °C`
                            : r?.quality === "valid"
                              ? "无有效进风"
                              : qualityNames[r?.quality ?? "missing"]}
                          {r ? ` · ${lifecycleNames[r.lifecycle]}` : ""}
                          {r?.alarm ? " · 告警" : ""}
                        </span>
                      </button>
                      <button
                        disabled={!ready}
                        data-cooling-action={device.id + ":installation"}
                        aria-label={`定位 ${device.name} 安装位`}
                        onClick={() =>
                          visit(device.id, rack.id, "installation")
                        }
                      >
                        安装位
                      </button>
                      <button
                        disabled={!ready}
                        data-cooling-action={device.id + ":airflow"}
                        aria-label={`查看 ${device.name}气流`}
                        onClick={() => visit(device.id, rack.id, "airflow")}
                      >
                        气流 ↗
                      </button>
                    </div>
                  );
                })}
                {!matching.length && <p>本柜没有匹配设备。</p>}
              </div>
            )}
          </section>
        ))}
      </div>
      {!matching && (
        <p>
          <button
            onClick={() => {
              search.current?.focus();
              changeQuery("", "all");
            }}
          >
            清除查找与筛选
          </button>
        </p>
      )}
    </section>
  );
}
