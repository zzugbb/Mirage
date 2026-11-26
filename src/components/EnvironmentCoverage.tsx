import { useEffect, useRef, type RefObject } from "react";
import { fixtureRosterRows } from "../fixture-roster";
import { clearSearchOnEscape } from "../search-keyboard";
import {
  environmentChannelText,
  environmentCoverage,
  environmentDewPointState,
  environmentProcessNames,
  environmentValue,
} from "../environment-monitoring";

const coverageMetrics = [
  ["ambientTemperature", "温度"],
  ["humidity", "湿度"],
  ["dewPoint", "露点"],
] as const;

export function EnvironmentCoverage({
  time,
  query,
  selected,
  ready,
  visible,
  scroll,
  returningId,
  onQuery,
  onInspect,
  onRestored,
}: {
  time: number;
  query: string;
  selected: string;
  ready: boolean;
  visible: boolean;
  scroll: RefObject<number>;
  returningId?: string;
  onQuery: (query: string) => void;
  onInspect: (id: string) => void;
  onRestored: () => void;
}) {
  const list = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const { rows, counts } = environmentCoverage(time);
  const matches = new Set(
    fixtureRosterRows("simulated", query).map(({ fixture }) => fixture.id),
  );
  const visibleRows = rows.filter(({ fixture }) => matches.has(fixture.id));
  useEffect(() => {
    if (visible && list.current) list.current.scrollTop = scroll.current;
  }, [visible, scroll]);
  useEffect(() => {
    const panel = list.current;
    if (!returningId || !ready || !visible || !panel) return;
    const row = panel.querySelector<HTMLButtonElement>(
      `[data-environment-row="${returningId}"]`,
    );
    panel.scrollTop = scroll.current;
    (row ?? search.current)?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: "nearest" });
    onRestored();
  }, [returningId, ready, visible, scroll, onRestored]);
  const clear = () => {
    onQuery("");
    search.current?.focus({ preventScroll: true });
  };
  return (
    <section
      className="environment-coverage"
      aria-label="机房环境测点覆盖"
      ref={list}
      onScroll={(event) => {
        if (visible) scroll.current = event.currentTarget.scrollTop;
      }}
    >
      <div className="study-search">
        <span aria-hidden="true">⌕</span>
        <input
          ref={search}
          aria-label="查找环境测点"
          placeholder="名称、编号或安装位置"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => clearSearchOnEscape(event, clear)}
        />
        {query && (
          <button type="button" aria-label="清除环境测点查找" onClick={clear}>
            ×
          </button>
        )}
      </div>
      <p className="environment-coverage-caption">
        当前有效测点 <span>{rows.length} 处登记 · 模拟</span>
      </p>
      <dl className="environment-coverage-counts" aria-label="全机房有效测点数">
        {coverageMetrics.map(([metric, label]) => (
          <div key={metric}>
            <dt>{label}</dt>
            <dd>
              {counts[metric]} / {rows.length}
            </dd>
          </div>
        ))}
      </dl>
      <div className="environment-coverage-rows">
        {visibleRows.map(({ fixture, observation }) => {
          const { temperature, humidity, dewPoint } = observation;
          const readings = [
            [
              "温度",
              environmentChannelText(temperature, "°C"),
              temperature.quality === "valid",
            ],
            [
              "湿度",
              environmentChannelText(humidity, "%RH"),
              humidity.quality === "valid",
            ],
            [
              "露点",
              dewPoint.value === null
                ? environmentProcessNames[environmentDewPointState(observation)]
                : environmentValue(dewPoint.value, "°C"),
              dewPoint.value !== null,
            ],
          ] as const;
          return (
            <button
              key={fixture.id}
              className="environment-coverage-row"
              data-environment-row={fixture.id}
              aria-pressed={selected === fixture.id}
              aria-label={`核对 ${fixture.name}`}
              aria-describedby={`probe-coverage-${fixture.id} probe-readings-${fixture.id}`}
              aria-disabled={!ready}
              onClick={() => onInspect(fixture.id)}
            >
              <strong>
                {fixture.name} <span aria-hidden="true">↗</span>
              </strong>
              <span id={`probe-coverage-${fixture.id}`}>
                {fixture.location} · {fixture.position[1].toFixed(2)} m
              </span>
              <span
                className="environment-coverage-values"
                id={`probe-readings-${fixture.id}`}
              >
                {readings.map(([label, value, known]) => (
                  <span key={label} data-observed={known}>
                    <small>{label}</small>
                    <b>{value}</b>
                  </span>
                ))}
              </span>
            </button>
          );
        })}
        {!visibleRows.length && <p role="status">没有匹配的环境测点。</p>}
      </div>
      <p className="environment-coverage-boundary">读数对应各探头安装位置。</p>
    </section>
  );
}
