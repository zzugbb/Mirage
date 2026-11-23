import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  fixtureRoster,
  fixtureRosterRows,
  type FixtureSource,
} from "../fixture-roster";
import {
  environmentObservation,
  environmentChannelText,
} from "../environment-monitoring";

const probeCount = fixtureRoster.filter((row) => row.simulated).length;

export function FixtureRoster({
  source,
  query,
  time,
  selected,
  visible,
  ready,
  restore,
  scroll,
  onSource,
  onQuery,
  onInspect,
  onMap,
}: {
  source: FixtureSource;
  query: string;
  time: number;
  selected: string;
  visible: boolean;
  ready: boolean;
  restore: RefObject<string | null>;
  scroll: RefObject<number>;
  onSource: (source: FixtureSource) => void;
  onQuery: (query: string) => void;
  onInspect: (id: string) => void;
  onMap: () => void;
}) {
  const list = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null);
  const rows = fixtureRosterRows(source, query);
  useLayoutEffect(() => {
    if (!visible || !list.current) return;
    if (!restore.current) {
      list.current.scrollTop = scroll.current;
      search.current?.focus({ preventScroll: true });
    }
  }, [visible, restore, scroll]);
  useLayoutEffect(() => {
    if (!visible || !ready || !restore.current || !list.current) return;
    const target = list.current.querySelector<HTMLButtonElement>(
      `[data-fixture-row="${restore.current}"]`,
    );
    if (!target) return;
    list.current.scrollTop = scroll.current;
    target.focus({ preventScroll: true });
    restore.current = null;
  });
  const resetScroll = () => {
    if (list.current) list.current.scrollTop = 0;
    scroll.current = 0;
  };
  return (
    <section className="fixture-roster" aria-label="环境与安全设施名单">
      <header>
        <h3>环境与安全</h3>
        <button onClick={onMap}>位置图 ↗</button>
      </header>
      <input
        ref={search}
        aria-label="查找环境与安全设施"
        placeholder="查找设施、编号或位置"
        value={query}
        onChange={(e) => {
          resetScroll();
          onQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Escape" && query) {
            e.preventDefault();
            e.stopPropagation();
            resetScroll();
            onQuery("");
          } else if (e.key === "Enter" && rows.length === 1 && ready) {
            e.preventDefault();
            onInspect(rows[0].fixture.id);
          }
        }}
      />
      <div
        className="fixture-roster-filters"
        role="group"
        aria-label="设施数据来源"
      >
        {(
          [
            ["all", "全部", fixtureRoster.length],
            ["simulated", "模拟采样", probeCount],
            ["layout", "仅布置", fixtureRoster.length - probeCount],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            aria-pressed={key === source}
            onClick={() => {
              resetScroll();
              onSource(key);
            }}
          >
            {label} {count}
          </button>
        ))}
      </div>
      <div
        className="fixture-roster-rows"
        ref={list}
        onScroll={(e) => {
          if (visible) scroll.current = e.currentTarget.scrollTop;
        }}
      >
        {rows.map(({ fixture, signal, simulated }) => {
          const observation = simulated
            ? environmentObservation(fixture.id, time)
            : null;
          return (
            <button
              key={fixture.id}
              data-fixture-row={fixture.id}
              disabled={!ready}
              aria-pressed={selected === fixture.id}
              aria-label={`核查 ${fixture.name}`}
              aria-describedby={`roster-${fixture.id}-source roster-${fixture.id}-location roster-${fixture.id}-reading`}
              onClick={() => onInspect(fixture.id)}
            >
              <span className="fixture-roster-title">
                <strong>{fixture.name}</strong>
                <small id={`roster-${fixture.id}-source`}>
                  {simulated ? "模拟采样" : "仅布置"}{" "}
                  <span aria-hidden="true">↗</span>
                </small>
              </span>
              <span id={`roster-${fixture.id}-location`}>
                {fixture.location}
              </span>
              <span
                className="fixture-roster-reading"
                id={`roster-${fixture.id}-reading`}
              >
                {observation
                  ? `温度 ${environmentChannelText(observation.temperature, "°C")} · 湿度 ${environmentChannelText(observation.humidity, "%RH")}`
                  : signal}
              </span>
            </button>
          );
        })}
        {!rows.length && <p role="status">当前筛选下没有匹配设施。</p>}
      </div>
    </section>
  );
}
