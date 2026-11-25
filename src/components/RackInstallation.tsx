import { metricAttentionColor } from "../status";
import { useEffect, useMemo, useRef } from "react";
import type { AppState } from "../domain";
import { deviceById, rackForDevice } from "../installation";
import { categoryNames, modelForDevice, unitLabel } from "../catalog";
import { pduName } from "../power-config";
import type { ReviewLayer } from "../review-model";
import type { Resource, rackUnitQuery } from "../review-resources";
import type { SpatialReading } from "../spatial";
import { rackInstallation, installationMetric } from "../rack-installation";

export function RackInstallation({
  state,
  selected,
  layer,
  readings,
  rows,
  units,
  filtered,
  ready,
  visible,
  onPick,
  onFocus,
  onDetails,
  onBlanking,
  restoreBlanking,
  onBlankingFocus,
  onList,
  onClear,
}: {
  state: AppState;
  selected: string;
  layer: ReviewLayer;
  readings: Map<string, SpatialReading>;
  rows: Resource[];
  units: ReturnType<typeof rackUnitQuery>;
  filtered: boolean;
  ready: boolean;
  visible: boolean;
  onPick: (id: string) => void;
  onFocus: (id: string) => void;
  onBlanking: (first: number, last: number, scroll: number) => void;
  onBlankingFocus: () => void;
  restoreBlanking: { first: number; scroll: number } | null;
  onDetails: (id: string) => void;
  onList: () => void;
  onClear: () => void;
}) {
  const rackId = rackForDevice(state.deviceId).id;
  const layout = useMemo(() => rackInstallation(rackId)!, [rackId]);
  const matches = new Set(rows.map((r) => r.id));
  const localIds = new Set([
    ...layout.segments.filter((s) => s.kind === "device").map((s) => s.id),
    ...layout.pdus.map((p) => p.id),
  ]);
  const outside = rows.filter((r) => !localIds.has(r.id)).length;
  const selectedDevice =
    deviceById(selected)?.rackId === rackId ? deviceById(selected) : undefined;
  const selectedPdu = layout.pdus.find((p) => p.id === selected);
  const selection = selectedDevice ?? selectedPdu;
  const scrollRef = useRef<HTMLDivElement>(null);
  // 只移动导航自己的滚动区；不滚动页面，也不更改三维镜头。
  useEffect(() => {
    if (!visible) return;
    const host = scrollRef.current;
    const item =
      host?.querySelector<HTMLElement>("[aria-pressed='true']") ??
      (filtered
        ? host?.querySelector<HTMLElement>("[data-match='true']")
        : null);
    if (!host || !item) return;
    const h = host.getBoundingClientRect(),
      r = item.getBoundingClientRect();
    if (r.top < h.top || r.bottom > h.bottom)
      host.scrollTop += r.top - h.top - (h.height - r.height) / 2;
  }, [
    selected,
    rackId,
    visible,
    filtered,
    rows.map((r) => r.id).join(","),
    units?.first,
    units?.last,
  ]);
  useEffect(() => {
    if (!visible || !ready || !restoreBlanking) return;
    const host = scrollRef.current;
    const button = host?.querySelector<HTMLButtonElement>(
      `[data-blanking-start="${restoreBlanking.first}"]`,
    );
    if (host && button) {
      const frame = requestAnimationFrame(() => {
        host.scrollTop = restoreBlanking.scroll;
        button.focus({ preventScroll: true });
        onBlankingFocus();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [restoreBlanking, visible, ready, onBlankingFocus]);
  const range =
    units && !units.error && units.rack?.id === rackId ? units : null;
  const rangeText = (first: number, last: number) =>
    first === last ? `U${first}` : `U${first}–${last}`;
  return (
    <section
      className="rack-installation"
      aria-label={`${layout.rack.name}安装图`}
    >
      <header className="rack-installation-heading">
        <strong>
          {layout.rack.name}
          <span>正面 · {layout.units}U</span>
        </strong>
        <small>
          设备 {layout.installedUnits} U · 前置盲板 {layout.blankingUnits} U
        </small>
        {filtered && (
          <div className="rack-installation-filter" role="status">
            <span>
              {units?.error ||
                `${range ? rangeText(range.first, range.last) + " · " : ""}本柜匹配 ${rows.filter((r) => localIds.has(r.id)).length} 项`}
            </span>
            <button onClick={onClear}>清除筛选</button>
            <small>不匹配项保留安装位置，使用淡色显示。</small>
            {range?.blanking && (
              <small>
                范围内封板 {range.blanking.length} U；跨 U
                设备显示完整安装跨度。
              </small>
            )}
            {outside > 0 && (
              <button onClick={onList}>
                查看其他范围的 {outside} 项结果 →
              </button>
            )}
          </div>
        )}
      </header>
      <div className="rack-installation-scroll" ref={scrollRef}>
        <div
          className="rack-installation-grid"
          style={{
            gridTemplateRows: `repeat(${layout.units}, var(--installation-unit))`,
          }}
          aria-label={`从 U${layout.units} 到 U1 的安装分布`}
          onKeyDown={(event) => {
            if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key))
              return;
            const buttons = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
            );
            const index = buttons.indexOf(event.target as HTMLButtonElement);
            if (index < 0) return;
            event.preventDefault();
            buttons[
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? buttons.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        buttons.length - 1,
                        index + (event.key === "ArrowDown" ? 1 : -1),
                      ),
                    )
            ]?.focus();
          }}
        >
          {Array.from({ length: layout.units }, (_, i) => (
            <span
              className="rack-installation-tick"
              key={i}
              style={{ gridRow: i + 1 }}
              aria-hidden="true"
            >
              {layout.units - i}
            </span>
          ))}
          {range && (
            <div
              className="rack-installation-range"
              aria-hidden="true"
              style={{
                gridRow: `${layout.units - range.last + 1} / span ${range.last - range.first + 1}`,
              }}
            />
          )}
          {layout.segments.map((segment) => {
            const style = {
              gridRow: `${layout.units - segment.last + 1} / span ${segment.last - segment.first + 1}`,
            };
            const span = rangeText(segment.first, segment.last);
            if (segment.kind === "blanking")
              return (
                <button
                  type="button"
                  aria-disabled={!ready}
                  data-blanking-start={segment.first}
                  aria-label={`核对 ${span} 前置盲板`}
                  onClick={() =>
                    ready &&
                    onBlanking(
                      segment.first,
                      segment.last,
                      scrollRef.current?.scrollTop ?? 0,
                    )
                  }
                  className="rack-installation-blanking"
                  key={segment.id}
                  style={style}
                  title={`${span} · 前置盲板，不表示可分配容量`}
                  data-match={
                    !!range?.blanking?.some(
                      (u) => u >= segment.first && u <= segment.last,
                    )
                  }
                >
                  <span>{span} · 盲板 ↗</span>
                </button>
              );
            const model = modelForDevice(segment.id);
            const reading = readings.get(segment.id);
            const metric = installationMetric(reading, layer);
            const accent =
              metric && reading
                ? metricAttentionColor(
                    reading,
                    layer === "power" ? "power" : "temperature",
                  )
                : undefined;
            const description = `${segment.name} · ${span} · ${model.units}U ${categoryNames[model.category as keyof typeof categoryNames]}`;
            const content = (
              <>
                <strong>{segment.name}</strong>
                <small style={{ color: accent }}>
                  {metric?.text ??
                    `${model.units}U ${categoryNames[model.category as keyof typeof categoryNames]}`}
                </small>
              </>
            );
            return matches.has(segment.id) ? (
              <button
                key={segment.id}
                className={`rack-installation-device ${state.trayExtended && state.deviceId === segment.id ? "is-extracted" : ""}`}
                style={style}
                data-device={segment.id}
                data-first={segment.first}
                data-last={segment.last}
                data-match="true"
                aria-label={`${description}${metric ? `，${metric.text}` : ""}`}
                aria-pressed={selected === segment.id}
                title={`${description}${metric ? ` · ${metric.detail}` : ""}`}
                onClick={() => onPick(segment.id)}
              >
                {content}
              </button>
            ) : (
              <div
                key={segment.id}
                className={`rack-installation-device is-muted ${selected === segment.id ? "is-selected" : ""}`}
                style={style}
                title={`${description} · 不匹配当前筛选`}
              >
                {content}
              </div>
            );
          })}
        </div>
        <div className="rack-installation-pdus" aria-label="后置供电附件">
          <strong>后置 0U · 不占标准 U 位</strong>
          {layout.pdus.map((pdu) =>
            matches.has(pdu.id) ? (
              <button
                key={pdu.id}
                data-match="true"
                aria-pressed={selected === pdu.id}
                onClick={() => onPick(pdu.id)}
              >
                {pduName(pdu.id)}
                <small>24 插座 · 未计量</small>
              </button>
            ) : (
              <span key={pdu.id} className="is-muted">
                {pduName(pdu.id)}
              </span>
            ),
          )}
        </div>
        <p className="rack-installation-boundary">
          盲板仅表示安装封板。未定义预留、不可用或可分配容量；图中比例按 U
          位，非设备外观。
        </p>
      </div>
      <footer className="rack-installation-selection">
        {selection ? (
          <>
            <strong>
              {selectedDevice?.name ?? pduName(selected)}
              <span>{selectedDevice ? unitLabel(selected) : "后置 0U"}</span>
            </strong>
            <small>
              {selectedDevice
                ? state.trayExtended && state.deviceId === selected
                  ? "设备已抽出，图中保留原安装位"
                  : modelForDevice(selected).name
                : "配置插座 · 无独立计量"}
              {!matches.has(selected) ? " · 不匹配筛选" : ""}
            </small>
            <div>
              <button
                className="rack-installation-detail"
                onClick={() => onDetails(selected)}
              >
                详情
              </button>
              <button disabled={!ready} onClick={() => onFocus(selected)}>
                定位安装位
              </button>
            </div>
          </>
        ) : (
          <small>
            选择设备后可查看详情或定位。
            <br />↑ ↓ 切换焦点 · Enter 选择
          </small>
        )}
      </footer>
    </section>
  );
}
