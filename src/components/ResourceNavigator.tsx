import { useEffect, useMemo, useRef, useState } from "react";
import type { AppState } from "../domain";
import { rackForDevice } from "../installation";
import {
  componentGroups,
  findResources,
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
  onOpen,
  onFocus,
  state,
  ready,
  showLocation,
  compactLocation,
}: {
  resource: Resource;
  selected: string;
  reading?: SpatialReading;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
  onFocus: (id: string) => void;
  state: AppState;
  ready: boolean;
  showLocation: boolean;
  compactLocation: boolean;
}) {
  const signal = signalStyles[signalFor(reading)];
  const openLabel = resourceOpenLabel(state, resource.id);
  const locateOnly =
    resource.kind === "part" ||
    resource.kind === "facility" ||
    (state.level === "device" && resource.id === state.deviceId);
  return (
    <div
      className={`resource-entry ${selected === resource.id ? "selected" : ""}`}
    >
      <button
        className={`resource-row ${resource.kind === "part" ? "resource-part-row" : ""}`}
        data-kind={resource.kind}
        aria-pressed={selected === resource.id}
        onClick={() => onPick(resource.id)}
      >
        <span className="resource-kind" aria-hidden="true">
          {
            {
              rack: "柜",
              server: "算",
              switch: "网",
              storage: "存",
              facility: "设",
              part: "件",
              room: "房",
            }[resource.kind]
          }
        </span>
        <strong>{resource.name}</strong>
        {showLocation && resource.kind !== "part" && (
          <span className="resource-row-meta">
            {compactLocation
              ? resource.location.split(" / ").at(-1)
              : resource.location}
          </span>
        )}
        <span className="resource-row-foot">
          <small>
            {resource.kind === "rack"
              ? resource.detail.split(" · ").slice(0, 2).join(" · ")
              : resource.detail}
          </small>
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
      <div className="resource-row-actions" aria-label={`${resource.name}操作`}>
        {!locateOnly && canSelectInScene(state, resource.id) && (
          <button
            title={`定位 ${resource.name}`}
            aria-label={`定位 ${resource.name}`}
            disabled={!ready}
            onClick={() => onFocus(resource.id)}
          >
            定位
          </button>
        )}
        <button
          title={`${openLabel} · ${resource.name}`}
          aria-label={`${openLabel} · ${resource.name}`}
          disabled={!ready}
          onClick={() => onOpen(resource.id)}
        >
          {locateOnly ? "定位" : "进入"}
          <span aria-hidden="true">{locateOnly ? "⌖" : "›"}</span>
        </button>
      </div>
    </div>
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
  onInteract,
  onClose,
}: {
  state: AppState;
  selected: string;
  readings: Map<string, SpatialReading>;
  ready: boolean;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
  onFocus: (id: string) => void;
  onBack: () => void;
  onInteract?: () => void;
  onClose?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ResourceFilter>("all");
  const list = useRef<HTMLElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: 0 });
  }, [query, filter, state.level]);
  const results = useMemo(
    () => findResources(state, query, filter),
    [state.level, state.deviceId, query, filter],
  );
  const searching = !!query.trim() || filter !== "all";
  const grouped = state.level === "device" && !searching;
  const enter = (id: string) => {
    onOpen(id);
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
      onOpen={enter}
      onFocus={onFocus}
      state={state}
      ready={ready}
      showLocation={searching || state.level === "rack"}
      compactLocation={!searching}
    />
  );
  return (
    <aside
      id="workspace-resources"
      className="object-panel resource-panel"
      aria-label="资源导航"
      onPointerDownCapture={onInteract}
      onKeyDownCapture={onInteract}
      onFocusCapture={onInteract}
    >
      <header className="resource-header">
        <span>资源导航</span>
        <small>
          {state.level === "room"
            ? "机房"
            : state.level === "rack"
              ? "机柜"
              : "设备内部"}
        </small>
        {onClose && (
          <button
            className="resource-close"
            aria-label="收起资源导航"
            aria-controls="workspace-resources"
            aria-expanded="true"
            title="收起资源导航"
            onClick={onClose}
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            >
              <path d="M13 5l-5 5 5 5M4 4v12" />
            </svg>
          </button>
        )}
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
          : !searching && state.level === "room"
            ? ["A 排", "B 排", "设施"].map((group) => (
                <section className="resource-rack-group" key={group}>
                  <h3>{group}</h3>
                  {results
                    .filter((r) =>
                      group === "设施"
                        ? r.kind === "facility"
                        : r.kind === "rack" && r.name.startsWith(group[0]),
                    )
                    .map(render)}
                </section>
              ))
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
    </aside>
  );
}
