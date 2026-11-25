import { RearWallElevation } from "./RearWallElevation";
import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  roomLayoutItems,
  layoutDeviceMatches,
  layoutDeviceRows,
  roomLayoutBranches,
  roomLayoutCrossings,
  roomLayoutCeilingFootprints,
  roomLayoutScopeItems,
  roomLayoutLeakPath,
  type RoomLayoutScope,
  roomLayoutMatches,
  roomLayoutNeighbor,
  roomLayoutObject,
  roomLayoutSize,
} from "../room-layout";
import { rackUnitQuery } from "../review-resources";
import { devices } from "../installation";

import { floorGrilles, floorGrilleSettings } from "../floor-grilles";
import type { GrilleBranch } from "../grille-inspection";
const scopes = {
  equipment: { name: "机柜与设备", hint: "柜号、U 位、设备或机型" },
  fixtures: { name: "环境与安全", hint: "查找设施或配置位置" },
  ceiling: { name: "顶灯与桥架", hint: "查找顶灯、桥架或柜排" },
  wall: { name: "后墙立面", hint: "查找配线架、线槽或门区设施" },
  grilles: { name: "柜前格栅", hint: "查找柜位、代表设备或格栅" },
} satisfies Record<RoomLayoutScope, { name: string; hint: string }>;

export function RoomLayout({
  selected,
  deviceId,
  query,
  scope,
  onOpenFixtureRoster,
  crossingId,
  onPreviewCrossing,
  onInspectCrossing,
  onInspectBranch,
  onInspectWall,
  onCompareWall,
  onScope,
  onQuery,
  ready,
  visible,
  restoreRevision,
  scroll,
  onPreview,
  onLocate,
  onEnter,
  onDetails,
  onPlan,
  boundaryOpen,
  onBoundaryOpen,
}: {
  selected: string;
  deviceId: string;
  query: string;
  scope: RoomLayoutScope;
  onOpenFixtureRoster: () => void;
  crossingId: string | null;
  onPreviewCrossing: (id: string) => void;
  onInspectWall: (origin: string, target: string) => void;
  onCompareWall: (origin: string) => void;
  onInspectBranch: (branch: GrilleBranch) => void;
  onInspectCrossing: (id: string) => void;
  onScope: (scope: RoomLayoutScope) => void;
  onQuery: (value: string) => void;
  ready: boolean;
  visible: boolean;
  restoreRevision: number;
  scroll: RefObject<number>;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  onEnter: (id: string) => void;
  onDetails: (id: string) => void;
  onPlan: () => void;
  boundaryOpen: boolean;
  onBoundaryOpen: (open: boolean) => void;
}) {
  const search = useRef<HTMLInputElement>(null);
  const host = useRef<HTMLDivElement>(null),
    map = useRef<HTMLDivElement>(null);
  const items = roomLayoutScopeItems(scope);
  const pair =
    scope === "ceiling"
      ? roomLayoutCrossings.find(
          (p) =>
            p.id === crossingId &&
            (selected === p.lightId || selected === p.trayId),
        )
      : undefined;
  const active =
    scope === "ceiling" ? pair?.id : roomLayoutObject(selected, deviceId);
  const current = items.find((item) => item.id === active);
  const branch =
    scope === "grilles"
      ? roomLayoutBranches.find((b) => b.id === active)?.branch
      : undefined;
  useLayoutEffect(() => {
    if (!visible || !host.current) return;
    host.current.scrollTop = scroll.current;
    if (restoreRevision && scope === "wall") {
      host.current
        .querySelector<HTMLButtonElement>(`[data-wall-row="${selected}"]`)
        ?.focus({ preventScroll: true });
      return;
    }
    if (restoreRevision) {
      let button =
        host.current.querySelector<HTMLButtonElement>(
          `[data-device-result="${selected}"]`,
        ) ??
        host.current.querySelector<HTMLButtonElement>(
          ".room-layout-selection .layout-device-actions button",
        ) ??
        map.current?.querySelector<HTMLButtonElement>(
          `[data-layout-id="${active}"]`,
        );
      if (button?.dataset.layoutId === selected) {
        const entry = host.current.querySelector<HTMLButtonElement>(
          `[data-enter-layout-rack="${selected}"], [data-layout-point-details="${selected}"]`,
        );
        const viewport = host.current.getBoundingClientRect();
        const visible = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          return rect.top >= viewport.top && rect.bottom <= viewport.bottom;
        };
        if (entry && !visible(button) && visible(entry)) button = entry;
      }
      button?.focus({ preventScroll: true });
      const rect = button?.getBoundingClientRect();
      const viewport = host.current.getBoundingClientRect();
      const crossingVisible =
        scope === "ceiling" &&
        rect &&
        rect.bottom > viewport.top &&
        rect.top < viewport.bottom;
      if (!crossingVisible)
        (button?.closest("[data-layout-device-row]") ?? button)?.scrollIntoView(
          { block: "nearest" },
        );
    }
  }, [visible, restoreRevision, scroll]);
  useLayoutEffect(() => {
    const focused = document.activeElement;
    if (
      visible &&
      focused instanceof HTMLElement &&
      focused.dataset.deviceResult === selected
    )
      focused
        .closest("[data-layout-device-row]")
        ?.scrollIntoView({ block: "nearest" });
  }, [visible, selected]);
  const x = (value: number) => 140 + value * 16;
  const z = (value: number) => 126 + value * 16;
  const units =
    scope === "equipment" ? rackUnitQuery({ level: "room" }, query) : null;
  const matches = items.filter((item) => roomLayoutMatches(item, query, units));
  const rackHits = matches.filter((i) => i.kind === "rack");
  const resultRack =
    scope === "equipment" && query.trim()
      ? (rackHits.find((i) => i.id === active) ??
        (rackHits.length === 1 ? rackHits[0] : undefined))
      : undefined;
  const results = resultRack
    ? layoutDeviceMatches(resultRack.id, query, units)
    : [];
  const rackCount =
    current?.kind === "rack"
      ? devices.filter((device) => device.rackId === current.id).length
      : 0;
  const selectedDevice =
    scope === "equipment"
      ? layoutDeviceRows.find((device) => device.id === selected)
      : undefined;
  const selectedInResults = results.some((device) => device.id === selected);
  const deviceActions = selectedDevice && (
    <div className="layout-device-actions">
      <button
        disabled={!ready}
        aria-label={`查看 ${selectedDevice.name} 安装位`}
        onClick={() => onEnter(selectedDevice.id)}
      >
        查看安装位 ↗
      </button>
      <button
        className="study-open-current-details"
        aria-label={`查看 ${selectedDevice.name} 详情`}
        onClick={() => onDetails(selectedDevice.id)}
      >
        设备详情
      </button>
    </div>
  );
  const hasQuery = !!query.trim();
  const single = hasQuery && matches.length === 1 ? matches[0] : undefined;
  const singleDevice =
    single?.kind === "rack" && results.length === 1 ? results[0] : undefined;
  const changeQuery = (value: string) => {
    if (host.current) host.current.scrollTop = 0;
    onQuery(value);
  };
  const clearSearch = () => {
    search.current?.focus({ preventScroll: true });
    changeQuery("");
  };
  return (
    <section
      className="room-layout-browser"
      aria-label="机房布置导览"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        const target = event.target as HTMLElement;
        if (
          target !== search.current &&
          !target.closest(
            "[data-device-result], [data-layout-id], [data-wall-row]",
          )
        )
          return;
        if (event.nativeEvent.isComposing) {
          event.stopPropagation();
          return;
        }
        if (!query) return;
        event.preventDefault();
        event.stopPropagation();
        clearSearch();
      }}
    >
      <div className="room-layout-finder">
        <div className="room-layout-toolbar">
          <select
            aria-label="布置图范围"
            value={scope}
            onChange={(event) => {
              if (host.current) host.current.scrollTop = 0;
              onScope(event.target.value as RoomLayoutScope);
            }}
          >
            {(Object.keys(scopes) as RoomLayoutScope[]).map((key) => (
              <option key={key} value={key}>
                {scopes[key].name}
              </option>
            ))}
          </select>
          {scope === "fixtures" && (
            <button onClick={onOpenFixtureRoster}>设施名单</button>
          )}
          {scope !== "wall" && (
            <button disabled={!ready} title="俯看三维布置" onClick={onPlan}>
              三维俯视
            </button>
          )}
        </div>
        <div className="room-layout-search">
          <input
            ref={search}
            aria-label="布置图查找"
            value={query}
            placeholder={scopes[scope].hint}
            aria-describedby={hasQuery ? "layout-match-status" : undefined}
            onChange={(event) => changeQuery(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key !== "Enter" ||
                event.nativeEvent.isComposing ||
                !single
              )
                return;
              const target =
                scope === "wall"
                  ? host.current?.querySelector<HTMLButtonElement>(
                      `[data-wall-row="${single.id}"]`,
                    )
                  : singleDevice
                    ? host.current?.querySelector<HTMLButtonElement>(
                        `[data-device-result="${singleDevice.id}"]`,
                      )
                    : map.current?.querySelector<HTMLButtonElement>(
                        `[data-layout-id="${single.id}"]`,
                      );
              if (target) {
                event.preventDefault();
                target.focus();
                target.click();
              }
            }}
          />
          {query && (
            <button aria-label="清除布置查找" onClick={clearSearch}>
              ×
            </button>
          )}
        </div>
        {hasQuery && (
          <p id="layout-match-status" role="status">
            {matches.length
              ? `匹配 ${matches.length} / ${items.length} 处`
              : units?.error ||
                (units ? "这个 U 位范围没有匹配设备" : "当前范围没有匹配位置")}
            {resultRack && ` · ${resultRack.short} · ${results.length} 台`}
            {single && (
              <span className="layout-key-hint">
                {" · Enter 预览"}
                {singleDevice
                  ? "设备"
                  : single.kind === "rack"
                    ? "柜位"
                    : "位置"}
              </span>
            )}
          </p>
        )}
      </div>
      <div
        ref={host}
        className="room-layout"
        onScroll={(event) => {
          scroll.current = event.currentTarget.scrollTop;
        }}
      >
        {layoutContents()}
      </div>
    </section>
  );

  function layoutContents() {
    if (scope === "wall")
      return (
        <RearWallElevation
          selected={selected}
          query={query}
          ready={ready}
          onPreview={onPreview}
          onInspect={onInspectWall}
          onCompare={onCompareWall}
        />
      );
    return (
      <>
        <div
          ref={map}
          className="room-layout-map"
          role="group"
          aria-label="机房位置图"
          onKeyDown={(event) => {
            const id = (event.target as HTMLElement).dataset.layoutId;
            if (!id) return;
            const next =
              event.key === "Home"
                ? items[0].id
                : event.key === "End"
                  ? items.at(-1)!.id
                  : roomLayoutNeighbor(id, event.key, scope);
            if (
              [
                "ArrowUp",
                "ArrowDown",
                "ArrowLeft",
                "ArrowRight",
                "Home",
                "End",
              ].includes(event.key)
            ) {
              event.preventDefault();
              event.stopPropagation();
              map.current
                ?.querySelector<HTMLButtonElement>(`[data-layout-id="${next}"]`)
                ?.focus();
            }
          }}
        >
          <svg viewBox="0 0 280 252" aria-hidden="true">
            <rect
              className="room-layout-boundary"
              x={x(-roomLayoutSize.width / 2)}
              y={z(-roomLayoutSize.depth / 2)}
              width={roomLayoutSize.width * 16}
              height={roomLayoutSize.depth * 16}
            />
            <text
              x="140"
              y={scope === "fixtures" ? 10 : 18}
              textAnchor="middle"
            >
              入口侧 · −Z
            </text>
            <text x="140" y="244" textAnchor="middle">
              柜前方向 ↓ +Z
            </text>
            {roomLayoutItems.map((item) => (
              <g
                key={item.id}
                className={
                  scope !== "equipment" ? "room-layout-context" : undefined
                }
                data-selected={scope === "equipment" && active === item.id}
                data-match={scope !== "equipment" || matches.includes(item)}
              >
                <rect
                  className="room-layout-footprint"
                  x={x(item.x - item.width / 2)}
                  y={z(item.z - item.depth / 2)}
                  width={item.width * 16}
                  height={item.depth * 16}
                />
                {item.kind === "rack" && (
                  <path
                    className="room-layout-front"
                    d={`M ${x(item.x - item.width / 2)} ${z(item.z + item.depth / 2)} h ${item.width * 16}`}
                  />
                )}
              </g>
            ))}
            {scope === "grilles" && (
              <g className="room-layout-grilles">
                {floorGrilles.map((g) => (
                  <rect
                    key={g.id}
                    data-active={branch?.grille.id === g.id}
                    x={x(g.position[0] - floorGrilleSettings.width / 2)}
                    y={z(g.position[2] - floorGrilleSettings.depth / 2)}
                    width={floorGrilleSettings.width * 16}
                    height={floorGrilleSettings.depth * 16}
                  />
                ))}
                {branch && (
                  <line
                    x1={x(branch.grille.position[0])}
                    y1={z(branch.grille.position[2])}
                    x2={x(branch.rack.position[0])}
                    y2={z(branch.rack.position[2] + current!.depth / 2)}
                  />
                )}
              </g>
            )}
            {scope === "ceiling" &&
              roomLayoutCeilingFootprints.map((f) => (
                <g
                  key={f.id}
                  className="room-layout-ceiling"
                  data-kind={f.kind}
                  data-selected={
                    f.id === pair?.lightId || f.id === pair?.trayId
                  }
                >
                  <rect
                    x={x(f.x - f.width / 2)}
                    y={z(f.z - f.depth / 2)}
                    width={f.width * 16}
                    height={f.depth * 16}
                  />
                  {f.kind === "light" && (
                    <text
                      x={x(f.x)}
                      y={z(f.z - f.depth / 2) - 7}
                      textAnchor="middle"
                    >
                      {f.name}
                    </text>
                  )}
                </g>
              ))}
            {scope === "fixtures" && (
              <>
                <g
                  className="room-layout-leak"
                  data-selected={active === roomLayoutLeakPath.id}
                >
                  <polyline
                    className="room-layout-lead"
                    points={roomLayoutLeakPath.lead
                      .map(([px, pz]) => `${x(px)},${z(pz)}`)
                      .join(" ")}
                  />
                  <polyline
                    points={roomLayoutLeakPath.sensing
                      .map(([px, pz]) => `${x(px)},${z(pz)}`)
                      .join(" ")}
                  />
                </g>
                {items.map((item) => (
                  <g
                    key={item.id}
                    className="room-layout-point"
                    data-selected={active === item.id}
                    data-match={matches.includes(item)}
                  >
                    <line
                      x1={x(item.x)}
                      y1={z(item.z)}
                      x2={x(item.x) + item.labelOffset![0]}
                      y2={z(item.z) + item.labelOffset![1]}
                    />
                    <circle cx={x(item.x)} cy={z(item.z)} r={3} />
                  </g>
                ))}
              </>
            )}
          </svg>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              data-layout-id={item.id}
              data-kind={item.kind}
              data-match={matches.includes(item)}
              aria-pressed={active === item.id}
              aria-label={`预览布置 ${item.name}`}
              title={item.name}
              style={{
                left: `${((x(item.x) + (item.labelOffset?.[0] ?? 0)) / 280) * 100}%`,
                top: `${((z(item.z) + (item.labelOffset?.[1] ?? 0)) / 252) * 100}%`,
              }}
              onClick={() =>
                item.kind === "crossing"
                  ? onPreviewCrossing(item.id)
                  : onPreview(item.id)
              }
            >
              <span>{item.short}</span>
            </button>
          ))}
        </div>
        {!hasQuery && (
          <p className="room-layout-result">
            {scope === "grilles"
              ? "小格为地面格栅；选择柜位查看代表落点"
              : scope === "ceiling"
                ? "纵向为灯体，横向为桥架；A / B 为对应柜排"
                : scope === "fixtures"
                  ? "圆点为配置中心 · 实线为感应线，虚线为引线"
                  : `${roomLayoutSize.width} × ${roomLayoutSize.depth} m · 线框按配置尺寸投影`}
          </p>
        )}
        {scope === "equipment" &&
          query.trim() &&
          rackHits.length > 1 &&
          !resultRack && <p>选择亮起的机柜，查看柜内匹配设备。</p>}
        {selectedDevice ? (
          !selectedInResults && (
            <div className="room-layout-selection" aria-label="布置当前设备">
              <strong>{selectedDevice.name}</strong>
              <p>
                {current?.name} · {selectedDevice.units} ·{" "}
                {selectedDevice.model}
              </p>
              {deviceActions}
            </div>
          )
        ) : current ? (
          <div className="room-layout-selection" aria-label="布置当前对象">
            <strong>
              {!branch && !pair && selected !== current.id
                ? `所属位置 · ${current.name}`
                : current.name}
            </strong>
            <p>
              {branch
                ? `格栅 ${branch.grille.id.split("-").at(-1)} → ${branch.device.name}`
                : pair
                  ? `灯罩底面比侧梁顶面${pair.difference >= 0 ? "高" : "低"} ${Math.abs(pair.difference).toFixed(2)} m · 配置表面高差，非最小净距`
                  : current.kind === "rack"
                    ? `${rackCount} 台设备`
                    : (current.location ?? "柜体配置位置 · 非监测覆盖")}
            </p>
            {branch ? (
              <div>
                <button
                  disabled={!ready}
                  onClick={() => onInspectBranch(branch)}
                >
                  查看代表气流 ↗
                </button>
              </div>
            ) : pair ? (
              <div>
                <button
                  disabled={!ready}
                  onClick={() => onInspectCrossing(pair.id)}
                >
                  核对交叉高度 ↗
                </button>
              </div>
            ) : (
              <div>
                <button disabled={!ready} onClick={() => onLocate(current.id)}>
                  定位此处
                </button>
                <button
                  className={
                    current.id === selected
                      ? "study-open-current-details"
                      : undefined
                  }
                  data-layout-point-details={
                    current.kind === "rack" ? undefined : current.id
                  }
                  onClick={() => onDetails(current.id)}
                >
                  详情
                </button>
                {current.kind === "rack" && (
                  <button
                    data-enter-layout-rack={current.id}
                    aria-disabled={!ready}
                    onClick={() => ready && onEnter(current.id)}
                  >
                    进入机柜 ↗
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <p>
            {scope === "ceiling"
              ? "选择交叉处预览顶灯，核对时近看两个表面。"
              : "选择一个位置，在三维中预览；定位才移动镜头。"}
          </p>
        )}
        {resultRack && (
          <section className="layout-device-results" aria-label="匹配设备">
            {results.map((device) => (
              <div key={device.id} data-layout-device-row>
                <button
                  data-device-result={device.id}
                  aria-pressed={selected === device.id}
                  aria-label={`预览 ${device.name}`}
                  onClick={() => onPreview(device.id)}
                >
                  <strong>{device.name}</strong>
                  <span>{device.units}</span>
                  <small>{device.model}</small>
                </button>
                {selected === device.id && deviceActions}
              </div>
            ))}
          </section>
        )}
        <details
          open={boundaryOpen}
          onToggle={(event) => onBoundaryOpen(event.currentTarget.open)}
        >
          <summary>方向与布置边界</summary>
          <p>
            图上横向为 X、纵向为 Z，方向固定。
            {scope === "equipment"
              ? "细框按配置占地投影，亮边标记柜前。名称标签仅供选择，空白不代表通行净距或可用容量。"
              : scope === "fixtures"
                ? "细线连接标签与配置中心。点位和检漏路径不代表监测覆盖或设施状态，两处环境探头仅有演示读数。"
                : scope === "ceiling"
                  ? "灯体与桥架按配置投影，交叉不表示接线或碰撞。"
                  : "柜前格栅按最近位置标出代表落点，不表示独占供风或实测风量。"}
          </p>
        </details>
      </>
    );
  }
}
