import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  roomLayoutItems,
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
  onQuery: (value: string) => void;
  ready: boolean;
  visible: boolean;
  restoreRevision: number;
  scroll: RefObject<number>;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  onEnter: (id: string) => void;
  onDetails: () => void;
  onPlan: () => void;
  boundaryOpen: boolean;
  onBoundaryOpen: (open: boolean) => void;
}) {
  const host = useRef<HTMLElement>(null),
    map = useRef<HTMLDivElement>(null);
  const active = roomLayoutObject(selected, deviceId);
  const current = roomLayoutItems.find((item) => item.id === active);
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
  const matches = roomLayoutItems.filter((item) =>
    roomLayoutMatches(item, query),
  );
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
        <p>八柜与主要设施 · 固定俯视方向</p>
      </header>
      <label>
        查找位置或柜内设备
        <input
          aria-label="布置图查找"
          value={query}
          placeholder="B03、SRV-01、存储、入口"
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
              ? roomLayoutItems[0].id
              : event.key === "End"
                ? roomLayoutItems.at(-1)!.id
                : roomLayoutNeighbor(id, event.key);
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
          <text x="140" y="18" textAnchor="middle">
            入口侧 · −Z
          </text>
          <text x="140" y="244" textAnchor="middle">
            柜前方向 ↓ +Z
          </text>
          {roomLayoutItems.map((item) => (
            <g
              key={item.id}
              data-selected={active === item.id}
              data-match={roomLayoutMatches(item, query)}
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
        </svg>
        {roomLayoutItems.map((item) => (
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
              left: `${(x(item.x) / 280) * 100}%`,
              top: `${(z(item.z) / 252) * 100}%`,
            }}
            onClick={() => onPreview(item.id)}
          >
            <span>{item.short}</span>
          </button>
        ))}
      </div>
      <p className="room-layout-result" role="status">
        {query.trim()
          ? `匹配 ${matches.length} / ${roomLayoutItems.length} 处；其余位置保留`
          : `${roomLayoutSize.width} × ${roomLayoutSize.depth} m · 线框按配置尺寸投影`}
      </p>
      {!!query.trim() && (
        <button onClick={() => onQuery("")}>清除布置查找</button>
      )}
      {current ? (
        <div className="room-layout-selection" aria-label="布置当前对象">
          <strong>{current.name}</strong>
          <p>
            {current.kind === "rack"
              ? `${devices.filter((device) => device.rackId === current.id).length} 台设备 · 柜前朝 +Z`
              : current.kind === "entrance"
                ? "门洞位置 · 非通行净宽"
                : "柜体配置位置 · 非监测覆盖"}
          </p>
          {selected !== current.id && (
            <small>当前对象所属位置；进入后可继续查找设备。</small>
          )}
          <div>
            <button disabled={!ready} onClick={() => onLocate(current.id)}>
              定位此处
            </button>
            <button onClick={onDetails}>详情</button>
            {current.kind === "rack" && (
              <button disabled={!ready} onClick={() => onEnter(current.id)}>
                进入机柜 ↗
              </button>
            )}
          </div>
        </div>
      ) : (
        <p>选择一个位置，在三维中预览；定位才移动镜头。</p>
      )}
      <details
        open={boundaryOpen}
        onToggle={(event) => onBoundaryOpen(event.currentTarget.open)}
      >
        <summary>方向与布置边界</summary>
        <p>
          图上横向为 X、纵向为
          Z，不表示地理南北。细框为配置占地，名称按钮仅供选择；不随三维镜头旋转。亮边标记柜前，空白不代表通行净距或可用容量。此图仅列八柜、制冷单元、配电柜与入口；探头、格栅和高位设施仍从资源列表查找。
        </p>
      </details>
    </section>
  );
}
