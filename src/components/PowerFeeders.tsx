import { useLayoutEffect, useMemo, useRef } from "react";
import { pdus, pduName, pduById, type PowerLink } from "../power-config";
import {
  compareFeederInputs,
  feederDifferenceText,
  type FeederReference,
  feederConnections,
  feederInputSummary,
  feederInputText,
  type FeederSelection,
} from "../power-feeders";

import {
  energyText,
  feederEnergyInterval,
  feederIntervalEnergy,
} from "../feeder-energy";
import { scenario } from "../simulation";
import type { SpatialReading } from "../spatial";
import { sourceValue } from "../reading-sources";

export function PowerFeeders({
  selection,
  readings,
  time,
  reference,
  onReference,
  onSeek,
  onChange,
  onTrace,
  ready,
  restoreKey,
  selected,
  visible,
  scroll,
}: {
  selection: FeederSelection;
  readings: Map<string, SpatialReading>;
  time: number;
  reference: FeederReference | null;
  onReference: (reference: FeederReference | null) => void;
  onSeek: (time: number) => void;
  onChange: (value: FeederSelection) => void;
  onTrace: (link: PowerLink, fromName: boolean) => void;
  ready: boolean;
  restoreKey: string | null;
  selected: string;
  visible: boolean;
  scroll: React.RefObject<number>;
}) {
  const { first, second, group, query } = selection;
  const result = useMemo(() => feederConnections(selection), [selection]);
  const summary = useMemo(
    () => feederInputSummary(result.members, readings),
    [result, readings],
  );
  const baseline = useMemo(
    () => reference && feederInputSummary(result.members, reference.readings),
    [reference, result],
  );
  const comparison = baseline && compareFeederInputs(baseline, summary);
  const interval = useMemo(
    () =>
      reference?.showEnergy ? feederEnergyInterval(reference.time, time) : null,
    [reference, time],
  );
  const energy = useMemo(
    () =>
      interval &&
      feederIntervalEnergy(
        result.members.map((row) => row.device.id),
        interval,
      ),
    [interval, result],
  );
  const pinButton = useRef<HTMLButtonElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const restorePending = useRef(true);
  useLayoutEffect(() => {
    restorePending.current = true;
  }, [visible, restoreKey]);
  useLayoutEffect(() => {
    if (
      !ready ||
      !visible ||
      !host.current ||
      !restoreKey ||
      !restorePending.current
    )
      return;
    restorePending.current = false;
    host.current.scrollTop = scroll.current;
    const button = host.current.querySelector<HTMLButtonElement>(
      `[data-feeder-key="${restoreKey}"]`,
    );
    button?.focus({ preventScroll: true });
  }, [restoreKey, visible, ready, scroll]);
  function visit(link: PowerLink, fromName: boolean) {
    if (host.current) scroll.current = host.current.scrollTop;
    onTrace(link, fromName);
  }
  const options = (exclude?: string) =>
    pdus
      .filter((p) => p.id !== exclude)
      .map((p) => (
        <option key={p.id} value={p.id}>
          {p.sourcePort} · {pduName(p.id)}
        </option>
      ));
  return (
    <section
      className="power-overview feeder-overview"
      aria-label="配电出线核查"
    >
      <div
        className="power-overview-scroll"
        ref={host}
        onScroll={(e) => {
          if (visible) scroll.current = e.currentTarget.scrollTop;
        }}
      >
        <label>
          主查出线
          <select
            value={first}
            onChange={(e) =>
              onChange({
                ...selection,
                first: e.target.value,
                second: second === e.target.value ? "" : second,
                group: "all",
              })
            }
          >
            {options()}
          </select>
        </label>
        <label>
          对照出线
          <select
            value={second}
            onChange={(e) =>
              onChange({ ...selection, second: e.target.value, group: "all" })
            }
          >
            <option value="">单条核查</option>
            {options(first)}
          </select>
        </label>
        <h3>
          关联设备{" "}
          <small>
            {result.devices} 台 · {result.inputs} 个输入
          </small>
        </h3>
        {second && (
          <div className="feeder-groups" role="group" aria-label="出线关联范围">
            {(
              [
                ["all", "全部", result.devices],
                [
                  "first",
                  "仅 " + pduById(first)!.sourcePort,
                  result.counts.first,
                ],
                ["both", "两路共有", result.counts.both],
                [
                  "second",
                  "仅 " + pduById(second)!.sourcePort,
                  result.counts.second,
                ],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                aria-pressed={value === group}
                onClick={() => onChange({ ...selection, group: value })}
              >
                {label} · {count}
              </button>
            ))}
          </div>
        )}
        <input
          aria-label="出线核查查找设备"
          placeholder="查找机柜或设备编号"
          value={query}
          onChange={(e) => onChange({ ...selection, query: e.target.value })}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !query) return;
            event.preventDefault();
            event.stopPropagation();
            onChange({ ...selection, query: "" });
          }}
        />
        <section className="feeder-input-summary" aria-label="所选范围整机输入">
          <div>
            <strong>整机输入合计</strong>
            <b>{sourceValue(summary.total, "power")}</b>
          </div>
          <small>
            {!reference && `第 ${time} 秒 · `}计入 {summary.coverage}/
            {summary.count} 台
            {summary.zeros > 0 && " · 有效零值 " + summary.zeros + " 台"}
            {" · 回路未计量"}
          </small>
        </section>
        <section
          className="feeder-comparison"
          aria-label="出线整机输入时刻对照"
        >
          <div className="feeder-reference-actions">
            <button
              ref={pinButton}
              onClick={() =>
                onReference({
                  time,
                  readings,
                  showEnergy: reference?.showEnergy ?? false,
                  showDetails: reference?.showDetails,
                })
              }
            >
              {reference ? "改用当前时刻为基准" : "固定当前时刻对照"}
            </button>
            {reference && (
              <button
                onClick={() => {
                  onReference(null);
                  pinButton.current?.focus({ preventScroll: true });
                }}
              >
                结束对照
              </button>
            )}
          </div>
          {reference && baseline && comparison && (
            <>
              <label>
                基准 {reference.time} 秒 → 当前 {time} 秒
                <input
                  aria-label="出线对照回看时刻"
                  type="range"
                  min="0"
                  max={scenario.duration}
                  value={time}
                  onChange={(e) => onSeek(Number(e.target.value))}
                />
              </label>
              <details
                className="feeder-comparison-details"
                open={!!reference.showDetails}
                onToggle={(event) => {
                  const open = event.currentTarget.open;
                  if (open !== !!reference.showDetails)
                    onReference({ ...reference, showDetails: open });
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Escape" || !reference.showDetails) return;
                  event.preventDefault();
                  event.stopPropagation();
                  onReference({ ...reference, showDetails: false });
                  event.currentTarget.querySelector("summary")?.focus({
                    preventScroll: true,
                  });
                }}
              >
                <summary>
                  对照明细
                  <b className="feeder-difference">
                    {feederDifferenceText(comparison.difference)}
                  </b>
                </summary>
                <dl>
                  <div>
                    <dt>
                      基准合计 · {baseline.coverage}/{baseline.count} 台
                    </dt>
                    <dd>{sourceValue(baseline.total, "power")}</dd>
                  </div>
                  <div>
                    <dt>合计差（当前 − 基准）</dt>
                    <dd>{feederDifferenceText(comparison.difference)}</dd>
                  </div>
                  <div>
                    <dt>共同有效设备变化 · {comparison.sharedCount} 台</dt>
                    <dd>{feederDifferenceText(comparison.sharedDelta)}</dd>
                  </div>
                  <div>
                    <dt>仅当前有效 · {comparison.currentOnlyCount} 台计入</dt>
                    <dd>{sourceValue(comparison.currentOnlyWatts, "power")}</dd>
                  </div>
                  <div>
                    <dt>仅基准有效 · {comparison.baselineOnlyCount} 台移出</dt>
                    <dd>
                      {sourceValue(comparison.baselineOnlyWatts, "power")}
                    </dd>
                  </div>
                </dl>
                <button
                  className="feeder-energy-toggle"
                  aria-expanded={reference.showEnergy}
                  onClick={() =>
                    onReference({
                      ...reference,
                      showEnergy: !reference.showEnergy,
                    })
                  }
                >
                  核对区间电量
                </button>
                {interval && energy && (
                  <section
                    className="feeder-energy"
                    aria-label="关联整机区间电量"
                  >
                    <header>
                      <strong>
                        {interval.start}–{interval.end} 秒 · 已知电量
                      </strong>
                      <b>{energyText(energy.wattHours)}</b>
                    </header>
                    {interval.start === interval.end ? (
                      <small>请移动回看时刻，选取至少 1 秒的区间。</small>
                    ) : (
                      <>
                        <small>
                          完整 {energy.complete} 台 · 部分 {energy.partial} 台 ·
                          无有效时段 {energy.unavailable} 台
                        </small>
                        <small>
                          各设备有效时长之和 {energy.covered}/{energy.possible}{" "}
                          秒
                        </small>
                        <small>
                          由整机模拟功耗逐秒积分，只累计相邻两端均有效的时段。
                        </small>
                      </>
                    )}
                  </section>
                )}
              </details>
            </>
          )}
        </section>
        {result.matching.map(({ device, rack, units, links }) => (
          <div key={device.id} className="feeder-device">
            <button
              className="feeder-device-name"
              data-feeder-key={device.id}
              aria-label={`核对 ${device.name} 的配电出线`}
              aria-describedby={[
                "feeder-watts-" + device.id,
                baseline && "feeder-prior-" + device.id,
                energy &&
                  interval &&
                  interval.end > interval.start &&
                  "feeder-energy-" + device.id,
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={selected === device.id}
              disabled={!ready}
              onClick={() => visit(links[0], true)}
            >
              <strong>{device.name}</strong>
              <span
                className="feeder-input-value"
                id={"feeder-watts-" + device.id}
              >
                {feederInputText(summary.byDevice.get(device.id)!)}
              </span>
              <small>
                {rack.name} · {units}
              </small>
              {baseline && (
                <small id={"feeder-prior-" + device.id}>
                  基准 {feederInputText(baseline.byDevice.get(device.id)!)}
                </small>
              )}
              {energy && interval && interval.end > interval.start && (
                <small id={"feeder-energy-" + device.id}>
                  区间 {energyText(energy.byDevice.get(device.id)!.wattHours)} ·
                  有效 {energy.byDevice.get(device.id)!.covered}/
                  {interval.end - interval.start} 秒
                </small>
              )}
            </button>
            {links.map((link) => (
              <button
                key={link.id}
                data-feeder-link={link.id}
                data-feeder-key={link.id}
                aria-current={restoreKey === link.id ? "true" : undefined}
                disabled={!ready}
                aria-label={`进柜查看 ${device.name} 输入 ${link.inlet}，${pduById(link.pduId)!.sourcePort} 插座 ${link.outlet}`}
                onClick={() => visit(link, false)}
              >
                <span>
                  {pduById(link.pduId)!.sourcePort} · 插座{" "}
                  {String(link.outlet).padStart(2, "0")}
                </span>
                <b>输入 {link.inlet} ↗</b>
              </button>
            ))}
          </div>
        ))}
        {!result.matching.length && (
          <p role="status">
            {query ? "当前范围没有匹配的设备。" : "此范围没有关联设备。"}
          </p>
        )}
      </div>
    </section>
  );
}
