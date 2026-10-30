import { signalFor, signalStyles } from "../status";
import { racks, devices, rackForDevice } from "../installation";
import { spatialSnapshot } from "../spatial";
import { useEffect, useMemo, useState } from "react";
import { entities, parts, subparts } from "../domain";
import type { AppState, Part } from "../domain";
import type { SimulationSnapshot } from "../simulation";

function PartGroup({
  part,
  selected,
  query,
  onSelect,
}: {
  part: Part;
  selected: string;
  query: string;
  onSelect: (id: string) => void;
}) {
  const children = subparts.filter((child) => child.parent === part.id);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (children.some((child) => child.id === selected)) setExpanded(true);
  }, [selected, part.id]);
  const matches = (name: string, slot: string) =>
    `${name} ${slot}`.toLowerCase().includes(query);
  const parentMatch = matches(part.name, part.slot);
  const filtered = children.filter(
    (child) => parentMatch || matches(child.name, child.slot),
  );
  if (query && !parentMatch && !filtered.length) return null;
  const open = expanded || !!query;
  return (
    <div className="component-group">
      <div className="component-group-row">
        <button
          className="tree-row"
          aria-pressed={selected === part.id}
          onClick={() => onSelect(part.id)}
        >
          <span className="component-dot" />
          {part.name.replace("处理器散热器", "散热器")}
          <small>{children.length ? `${children.length}` : part.slot}</small>
        </button>
        {children.length > 0 && (
          <button
            className="group-toggle"
            aria-label={`${open ? "收起" : "展开"}${part.name}子件`}
            aria-expanded={open}
            onClick={() => setExpanded((value) => !value)}
          >
            {open ? "−" : "+"}
          </button>
        )}
      </div>
      {children.length > 0 && open && (
        <div className="component-children">
          {filtered.map((child) => (
            <button
              className="tree-row"
              key={child.id}
              aria-pressed={selected === child.id}
              onClick={() => onSelect(child.id)}
            >
              <span>{child.name}</span>
              <small>{child.slot}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function RackBranch({
  rack,
  state,
  query,
  onSelect,
  alarm,
}: {
  rack: (typeof racks)[number];
  state: AppState;
  query: string;
  onSelect: (id: string, enter?: boolean) => void;
  alarm: (id: string) => React.ReactNode;
}) {
  const active = rackForDevice(state.deviceId).id === rack.id;
  const [expanded, setExpanded] = useState(active && state.level !== "room");
  useEffect(() => {
    // 选择其他机柜时保留已展开分支，避免双击的两次点击之间行位置跳动。
    if (active && state.level !== "room") setExpanded(true);
  }, [active, state.level]);
  useEffect(() => {
    if (state.level === "room") setExpanded(false);
  }, [state.level]);
  const matches = rack.name.toLowerCase().includes(query);
  const children = devices.filter(
    (device) =>
      device.rackId === rack.id &&
      (matches || device.name.toLowerCase().includes(query)),
  );
  if (query && !matches && !children.length) return null;
  return (
    <div className="rack-branch">
      <div className="component-group-row">
        <button
          className="tree-row depth-1"
          aria-pressed={state.selected === rack.id}
          onClick={() => onSelect(rack.id)}
          onDoubleClick={() => onSelect(rack.id, true)}
        >
          <span className="entity-icon rack" />
          {rack.name}
          {alarm(rack.id)}
        </button>
        <button
          className="group-toggle"
          aria-label={`${expanded ? "收起" : "展开"}${rack.name}设备`}
          aria-expanded={expanded || !!query}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "−" : "+"}
        </button>
      </div>
      {(expanded || query) &&
        children.map((device) => (
          <button
            className="tree-row depth-2"
            key={device.id}
            aria-pressed={state.selected === device.id}
            onClick={() => onSelect(device.id)}
            onDoubleClick={() => onSelect(device.id, true)}
          >
            <span className="entity-icon device" />
            {device.name}
            {alarm(device.id)}
          </button>
        ))}
    </div>
  );
}
export function ObjectTree({
  state,
  onSelect,
}: {
  state: AppState;
  onSelect: (id: string, enter?: boolean) => void;
  sample: SimulationSnapshot;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const spatial = useMemo(
    () => spatialSnapshot(state.time, state.replayCycle, state.deviceId),
    [state.time, state.replayCycle, state.deviceId],
  );
  const alarm = (id: string) => {
    const reading = spatial.readings.get(id);
    const signal = signalFor(reading);
    return (
      <span
        className="tree-signal"
        style={{ color: signalStyles[signal].color }}
        aria-label={`${signalStyles[signal].label}${reading?.alarmCount ? `，${reading.alarmCount} 台告警` : ""}`}
      >
        {signalStyles[signal].icon}
      </span>
    );
  };

  return (
    <aside className="object-panel" aria-label="对象导航">
      <div className="panel-title">
        对象导航
        <span>
          {racks.length} 柜 · {devices.length} 设备
        </span>
      </div>
      <label className="object-search">
        <span aria-hidden="true">⌕</span>
        <input
          aria-label="搜索对象与部件"
          placeholder="搜索对象与部件"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button aria-label="清除搜索" onClick={() => setQuery("")}>
            ×
          </button>
        )}
      </label>
      <nav className="object-scroll" aria-label="场景对象">
        <div className="tree-section-label">空间与设施</div>
        {(!normalized || "01号机房".includes(normalized)) && (
          <button
            className="tree-row"
            aria-pressed={state.selected === "room-01"}
            onClick={() => onSelect("room-01")}
            onDoubleClick={() => onSelect("room-01", true)}
          >
            <span className="entity-icon room" />
            01号机房{alarm("room-01")}
          </button>
        )}
        {racks.map((rack) => (
          <RackBranch
            key={rack.id}
            rack={rack}
            state={state}
            query={normalized}
            onSelect={onSelect}
            alarm={alarm}
          />
        ))}
        {entities
          .filter(
            (entity) =>
              entity.kind === "facility" && entity.name.includes(normalized),
          )
          .map((entity) => (
            <button
              key={entity.id}
              className="tree-row depth-1"
              aria-pressed={state.selected === entity.id}
              onClick={() => onSelect(entity.id)}
            >
              <span className="entity-icon facility" />
              {entity.name}
            </button>
          ))}
        {state.level === "device" && (
          <div className="part-tree">
            <div className="part-tree-title">
              {state.deviceId.toUpperCase()} 部件
              <span>{parts.length + subparts.length}</span>
            </div>
            {parts.map((part) => (
              <PartGroup
                key={part.id}
                part={part}
                query={normalized}
                selected={state.selected}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
        {normalized &&
          !entities.some((entity) =>
            `${entity.name} ${"slot" in entity ? entity.slot : ""}`
              .toLowerCase()
              .includes(normalized),
          ) && <p className="tree-empty">未找到匹配对象</p>}
      </nav>
    </aside>
  );
}
