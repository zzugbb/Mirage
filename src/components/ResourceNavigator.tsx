import { useEffect, useMemo, useRef, useState } from "react";
import type { AppState } from "../domain";
import { rackForDevice } from "../installation";
import {
  componentGroups,
  findResources,
  resourceCatalog,
  resourceFilters,
  resourceOpenLabel,
  canSelectInScene,
} from "../review-resources";
import type { Resource, ResourceFilter } from "../review-resources";
import type { SpatialReading } from "../spatial";
import { signalFor, signalStyles } from "../status";

function ResourceRow({
  resource,
  selected,
  reading,
  onPick,
}: {
  resource: Resource;
  selected: string;
  reading?: SpatialReading;
  onPick: (id: string) => void;
}) {
  const signal = signalStyles[signalFor(reading)];
  return (
    <button
      className={`resource-row ${resource.kind === "part" ? "resource-part-row" : ""}`}
      data-kind={resource.kind}
      aria-pressed={selected === resource.id}
      onClick={() => onPick(resource.id)}
    >
      <strong>{resource.name}</strong>
      {resource.kind !== "part" && (
        <span className="resource-row-meta">{resource.location}</span>
      )}
      <span className="resource-row-foot">
        <small>{resource.detail}</small>
        {reading && (
          <span style={{ color: signal.color }}>
            {signal.icon}{" "}
            {resource.kind === "part" && reading.quality === "valid"
              ? "模型"
              : ""}
            {signal.label}
          </span>
        )}
      </span>
    </button>
  );
}

export function ResourceNavigator({
  state,
  selected,
  readings,
  ready,
  onPick,
  onOpen,
  onFocus,
  onBack,
}: {
  state: AppState;
  selected: string;
  readings: Map<string, SpatialReading>;
  ready: boolean;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
  onFocus: (id: string) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ResourceFilter>("all");
  const list = useRef<HTMLElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: 0 });
  }, [query, filter, state.level]);
  const catalog = useMemo(
    () => resourceCatalog(state.deviceId),
    [state.deviceId],
  );
  const results = useMemo(
    () => findResources(state, query, filter),
    [state.level, state.deviceId, query, filter],
  );
  const current = catalog.find((r) => r.id === selected);
  const searching = !!query.trim() || filter !== "all";
  const grouped = state.level === "device" && !searching;
  const open = () => {
    if (!current) return;
    onOpen(current.id);
    setQuery("");
    setFilter("all");
  };
  const render = (resource: Resource) => (
    <ResourceRow
      key={resource.id}
      resource={resource}
      selected={selected}
      reading={readings.get(resource.id)}
      onPick={onPick}
    />
  );
  return (
    <aside className="object-panel resource-panel" aria-label="资源导航">
      <header className="resource-header">
        <span>资源导航</span>
        <small>
          {state.level === "room"
            ? "机房"
            : state.level === "rack"
              ? "机柜"
              : "设备内部"}
        </small>
      </header>
      <div className="resource-search">
        <input
          aria-label="查找资源"
          placeholder="名称、类型、机柜或 U 位"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button aria-label="清除资源搜索" onClick={() => setQuery("")}>
            ×
          </button>
        )}
      </div>
      <select
        className="resource-filter"
        aria-label="筛选资源类型"
        value={filter}
        onChange={(e) => setFilter(e.target.value as ResourceFilter)}
      >
        {resourceFilters.map(([value, name]) => (
          <option key={value} value={value}>
            {name}
          </option>
        ))}
      </select>
      <div className="resource-context">
        {state.level !== "room" && (
          <button
            onClick={() => {
              onBack();
              setQuery("");
              setFilter("all");
            }}
          >
            ←{" "}
            {state.level === "device"
              ? rackForDevice(state.deviceId).name
              : "01号机房"}
          </button>
        )}
        <strong>
          {searching
            ? `全机房 · 找到 ${results.length} 项`
            : state.level === "room"
              ? "机柜与设施"
              : state.level === "rack"
                ? `${rackForDevice(state.deviceId).name} · ${results.length} 台设备`
                : `${state.deviceId.toUpperCase()} · ${results.filter((r) => !r.parent).length} 个模块`}
        </strong>
        {query.trim() && state.level === "device" && (
          <small>搜索全机房资源与当前设备部件</small>
        )}
      </div>
      <nav
        ref={list}
        className="resource-results"
        aria-label="资源列表"
        key={`${state.level}:${state.level === "device" ? state.deviceId : state.level === "rack" ? rackForDevice(state.deviceId).id : "room"}:${searching}`}
      >
        {grouped
          ? componentGroups.map((group, index) => {
              const modules = results.filter(
                (r) => r.group === group && !r.parent,
              );
              return modules.length ? (
                <details
                  className="resource-group"
                  key={group}
                  open={
                    index === 0 ||
                    modules.some(
                      (r) =>
                        r.id === selected ||
                        results.some(
                          (c) => c.parent === r.id && c.id === selected,
                        ),
                    ) ||
                    undefined
                  }
                >
                  <summary>
                    {group}
                    <small>{modules.length} 模块</small>
                  </summary>
                  {modules.map((module) => (
                    <div key={module.id}>
                      {render(module)}
                      {results.some((r) => r.parent === module.id) && (
                        <details className="resource-children">
                          <summary>
                            {module.name}的子件{" "}
                            <small>
                              {
                                results.filter((r) => r.parent === module.id)
                                  .length
                              }
                            </small>
                          </summary>
                          {results
                            .filter((r) => r.parent === module.id)
                            .map(render)}
                        </details>
                      )}
                    </div>
                  ))}
                </details>
              ) : null;
            })
          : results.map(render)}
        {!results.length && (
          <div className="resource-empty">
            <strong>没有匹配的资源</strong>
            <p>可尝试“服务器”“A01 U23”或资源编号。</p>
            <button
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              清除查找条件
            </button>
          </div>
        )}
      </nav>
      <footer className="resource-selection">
        {current && current.kind !== "room" ? (
          <>
            <strong>{current.name}</strong>
            <small>{current.location}</small>
            <div>
              {canSelectInScene(state, current.id) &&
                current.kind !== "part" && (
                  <button disabled={!ready} onClick={() => onFocus(current.id)}>
                    定位
                  </button>
                )}
              <button
                className="resource-open"
                disabled={!ready}
                onClick={open}
              >
                {resourceOpenLabel(state, current.id)} ↗
              </button>
            </div>
            {!ready && <span role="status">场景切换中…</span>}
          </>
        ) : (
          <p>选中资源后，可查看详情或逐层进入。</p>
        )}
      </footer>
    </aside>
  );
}
