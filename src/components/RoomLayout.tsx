import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  roomLayoutItems,
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

export function RoomLayout({
  selected,
  deviceId,
  query,
  scope,
  crossingId,
  onPreviewCrossing,
  onInspectCrossing,
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
  useLayoutEffect(() => {
    if (!visible || !host.current) return;
    host.current.scrollTop = scroll.current;
    if (restoreRevision) {
      const button = map.current?.querySelector<HTMLButtonElement>(
        `[data-layout-id="${active}"]`,
      );
      button?.focus({ preventScroll: true });
      button?.scrollIntoView({ block: "nearest" });
    }
  }, [visible, restoreRevision, scroll]);
  const x = (value: number) => 140 + value * 16;
  const z = (value: number) => 126 + value * 16;
  const matches = items.filter((item) => roomLayoutMatches(item, query));
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
        <p>
          {scope === "ceiling"
            ? "顶灯与桥架的投影交叉"
            : scope === "fixtures"
              ? "七处环境与安全设施"
              : "八柜与主要设施"}{" "}
          · 固定俯视方向
        </p>
      </header>
      <div className="room-layout-scopes" role="group" aria-label="布置图范围">
        <button
          aria-pressed={scope === "equipment"}
          onClick={() => onScope("equipment")}
        >
          机柜与设备
        </button>
        <button
          aria-pressed={scope === "fixtures"}
          onClick={() => onScope("fixtures")}
        >
          环境与安全
        </button>
        <button
          aria-pressed={scope === "ceiling"}
          onClick={() => onScope("ceiling")}
        >
          顶灯与桥架
        </button>
      </div>
      <label>
        {scope === "ceiling"
          ? "按顶灯与柜排查找交叉处"
          : scope === "fixtures"
            ? "查找设施或配置位置"
            : "查找位置或柜内设备"}
        <input
          aria-label="布置图查找"
          value={query}
          placeholder={
            scope === "ceiling"
              ? "中央 B 排、左侧顶灯、桥架编号"
              : scope === "fixtures"
                ? "烟感、环境、左墙、感应线"
                : "B03、SRV-01、存储、入口"
          }
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
          : scope === "ceiling"
            ? "纵向为灯体，横向为桥架；A / B 为对应柜排"
            : scope === "fixtures"
              ? "圆点为配置中心 · 实线为感应线，虚线为引线"
              : `${roomLayoutSize.width} × ${roomLayoutSize.depth} m · 线框按配置尺寸投影`}
      </p>
      {!!query.trim() && (
        <button onClick={() => onQuery("")}>清除布置查找</button>
      )}
      {current ? (
        <div className="room-layout-selection" aria-label="布置当前对象">
          <strong>{current.name}</strong>
          <p>
            {pair
              ? `灯罩底面比侧梁顶面${pair.difference >= 0 ? "高" : "低"} ${Math.abs(pair.difference).toFixed(2)} m · 配置表面高差，非最小净距`
              : current.kind === "rack"
                ? `${devices.filter((device) => device.rackId === current.id).length} 台设备 · 柜前朝 +Z`
                : current.kind === "entrance"
                  ? "门洞位置 · 非通行净宽"
                  : current.kind === "point"
                    ? `${current.location} · 配置 Y ${current.height!.toFixed(3)} m`
                    : "柜体配置位置 · 非监测覆盖"}
          </p>
          {!pair && selected !== current.id && (
            <small>当前对象所属位置；进入后可继续查找设备。</small>
          )}
          {pair ? (
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
          为场景坐标，不是离地净高。点位和路径不代表监测覆盖或设施状态；两处环境探头仅有演示读数。顶灯与桥架按配置投影，交叉不表示接线或碰撞。格栅仍从资源列表查找。
        </p>
      </details>
    </section>
  );
}
