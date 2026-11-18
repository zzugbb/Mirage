import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  roomLayoutItems,
  layoutDeviceMatches,
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
import { devices } from "../installation";

import { floorGrilles, floorGrilleSettings } from "../floor-grilles";
import type { GrilleBranch } from "../grille-inspection";
const scopes = {
  equipment: [
    "机柜与设备",
    "八柜与主要设施",
    "查找位置或柜内设备",
    "B03、SRV-01、存储、入口",
  ],
  fixtures: [
    "环境与安全",
    "七处环境与安全设施",
    "查找设施或配置位置",
    "烟感、环境、左墙、感应线",
  ],
  ceiling: [
    "顶灯与桥架",
    "顶灯与桥架的投影交叉",
    "按顶灯与柜排查找交叉处",
    "中央 B 排、左侧顶灯、桥架编号",
  ],
  grilles: [
    "柜前格栅",
    "柜前铺设与代表进风设备",
    "查找柜位、代表设备或格栅编号",
    "B03、设备编号、grille-row-b",
  ],
} satisfies Record<RoomLayoutScope, string[]>;

export function RoomLayout({
  selected,
  deviceId,
  query,
  scope,
  crossingId,
  onPreviewCrossing,
  onInspectCrossing,
  onInspectBranch,
  onDeviceInstallation,
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
  crossingId: string | null;
  onPreviewCrossing: (id: string) => void;
  onDeviceInstallation: (id: string) => void;
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
  const host = useRef<HTMLElement>(null),
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
    if (restoreRevision) {
      const button =
        host.current.querySelector<HTMLButtonElement>(
          `[data-device-result="${selected}"]`,
        ) ??
        map.current?.querySelector<HTMLButtonElement>(
          `[data-layout-id="${active}"]`,
        );
      button?.focus({ preventScroll: true });
      button?.scrollIntoView({ block: "nearest" });
    }
  }, [visible, restoreRevision, scroll]);
  const x = (value: number) => 140 + value * 16;
  const z = (value: number) => 126 + value * 16;
  const matches = items.filter((item) => roomLayoutMatches(item, query));
  const rackHits = matches.filter((i) => i.kind === "rack");
  const resultRack =
    scope === "equipment" && query.trim()
      ? (rackHits.find((i) => i.id === active) ??
        (rackHits.length === 1 ? rackHits[0] : undefined))
      : undefined;
  const results = resultRack ? layoutDeviceMatches(resultRack.id, query) : [];
  return (
    <section
      ref={host}
      className="room-layout"
      aria-label="机房布置导览"
      onScroll={(event) => {
        scroll.current = event.currentTarget.scrollTop;
      }}
    >
      <header>
        <strong>机房布置</strong>
        <p>{scopes[scope][1]} · 固定俯视方向</p>
      </header>
      <div className="room-layout-scopes" role="group" aria-label="布置图范围">
        {(Object.keys(scopes) as RoomLayoutScope[]).map((key) => (
          <button
            key={key}
            aria-pressed={scope === key}
            onClick={() => onScope(key)}
          >
            {scopes[key][0]}
          </button>
        ))}
      </div>
      <label>
        {scopes[scope][2]}
        <input
          aria-label="布置图查找"
          value={query}
          placeholder={scopes[scope][3]}
          onChange={(event) => {
            scroll.current = 0;
            onQuery(event.target.value);
          }}
        />
      </label>
      <button disabled={!ready} onClick={onPlan}>
        俯看三维布置
      </button>
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
          <text x="140" y={scope === "fixtures" ? 10 : 18} textAnchor="middle">
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
              data-match={
                scope !== "equipment" || roomLayoutMatches(item, query)
              }
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
                data-selected={f.id === pair?.lightId || f.id === pair?.trayId}
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
                  data-match={roomLayoutMatches(item, query)}
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
            data-match={roomLayoutMatches(item, query)}
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
      <p className="room-layout-result" role="status">
        {query.trim()
          ? `匹配 ${matches.length} / ${items.length} 处；其余位置保留`
          : scope === "grilles"
            ? "小格为地面格栅；选择柜位查看代表落点"
            : scope === "ceiling"
              ? "纵向为灯体，横向为桥架；A / B 为对应柜排"
              : scope === "fixtures"
                ? "圆点为配置中心 · 实线为感应线，虚线为引线"
                : `${roomLayoutSize.width} × ${roomLayoutSize.depth} m · 线框按配置尺寸投影`}
      </p>
      {!!query.trim() && (
        <button onClick={() => onQuery("")}>清除布置查找</button>
      )}
      {resultRack && (
        <section className="layout-device-results" aria-label="匹配设备">
          <strong>
            {resultRack.short} · 匹配 {results.length} 台
          </strong>
          {results.map((device) => (
            <div key={device.id}>
              <button
                data-device-result={device.id}
                aria-pressed={selected === device.id}
                aria-label={`预览 ${device.name}`}
                onClick={() => onPreview(device.id)}
              >
                <strong>{device.name}</strong>
                <small>
                  {device.units} · {device.model}
                </small>
              </button>
              <button
                disabled={!ready}
                aria-label={`定位 ${device.name} 安装位`}
                onClick={() => onDeviceInstallation(device.id)}
              >
                安装位 ↗
              </button>
            </div>
          ))}
        </section>
      )}
      {scope === "equipment" &&
        query.trim() &&
        rackHits.length > 1 &&
        !resultRack && <p>选择亮起的机柜，查看柜内匹配设备。</p>}
      {current ? (
        <div className="room-layout-selection" aria-label="布置当前对象">
          <strong>{current.name}</strong>
          <p>
            {branch
              ? `格栅 ${branch.grille.id.split("-").at(-1)} → ${branch.device.name} · 最近格栅示意落点，非独占供风`
              : pair
                ? `灯罩底面比侧梁顶面${pair.difference >= 0 ? "高" : "低"} ${Math.abs(pair.difference).toFixed(2)} m · 配置表面高差，非最小净距`
                : current.kind === "rack"
                  ? `${devices.filter((device) => device.rackId === current.id).length} 台设备 · 柜前朝 +Z`
                  : current.kind === "entrance"
                    ? "门洞位置 · 非通行净宽"
                    : current.kind === "point"
                      ? `${current.location} · 配置 Y ${current.height!.toFixed(3)} m`
                      : "柜体配置位置 · 非监测覆盖"}
          </p>
          {!branch && !pair && selected !== current.id && (
            <small>当前对象所属位置；进入后可继续查找设备。</small>
          )}
          {branch ? (
            <div>
              <button disabled={!ready} onClick={() => onInspectBranch(branch)}>
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
              <button onClick={() => onDetails(current.id)}>详情</button>
              {current.kind === "rack" && (
                <button disabled={!ready} onClick={() => onEnter(current.id)}>
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
      <details
        open={boundaryOpen}
        onToggle={(event) => onBoundaryOpen(event.currentTarget.open)}
      >
        <summary>方向与布置边界</summary>
        <p>
          图上横向为 X、纵向为
          Z，不表示地理南北。细框为配置占地，名称按钮仅供选择；不随三维镜头旋转。亮边标记柜前，空白不代表通行净距或可用容量。环境与安全层投影七处既有设施的配置中心与检漏路径，标签通过细线连接原位置；配置
          Y
          为场景坐标，不是离地净高。点位和路径不代表监测覆盖或设施状态；两处环境探头仅有演示读数。顶灯与桥架按配置投影，交叉不表示接线或碰撞。格栅落点不代表实测风量。
        </p>
      </details>
    </section>
  );
}
