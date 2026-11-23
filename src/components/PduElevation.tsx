import { useEffect, useMemo, useRef, useState } from "react";
import { unitLabel } from "../catalog";
import { pduElevation } from "../pdu-elevation";

const outletNumber = (outlet: number) => String(outlet).padStart(2, "0");
const mm = (meters: number) => (meters * 1000).toFixed(1) + " mm";

export function PduElevation({
  pduId,
  outlet,
  ready,
  onSelect,
}: {
  pduId: string;
  outlet: number;
  ready: boolean;
  onSelect: (outlet: number, restoreScroll?: number) => number;
}) {
  const view = useMemo(() => pduElevation(pduId, outlet), [pduId, outlet]);
  const [returnTo, setReturnTo] = useState<{
    pduId: string;
    from: number;
    scroll: number;
    to: number;
  } | null>(null);
  const title = useRef<HTMLElement>(null);
  const returning = returnTo?.pduId === pduId && returnTo.to === outlet;
  useEffect(() => {
    if (returnTo && !returning) setReturnTo(null);
  }, [returnTo, returning]);
  if (!view) return null;
  const { width, height, unit, segment, socket, input, alignedLink } = view;
  const scale = 142 / height;
  const x = (n: number) => 32 + n * scale;
  const y = (n: number) => 148 - n * scale;
  const rail = x(view.outletX);
  return (
    <details className="pdu-elevation">
      <summary ref={title}>核对柜后安装立面</summary>
      <div className="pdu-elevation-body">
        <svg
          viewBox="0 0 64 154"
          role="img"
          aria-label="从柜后观察插座标高、安装位与登记输入"
        >
          <rect
            x={x(-width / 2)}
            y={y(height)}
            width={width * scale}
            height={height * scale}
            fill="#192a34"
            stroke="#87979f"
          />
          {view.bands.map((b) => (
            <rect
              key={b.id}
              x={x(-width * 0.39)}
              y={y(b.bottom + b.height)}
              width={width * 0.78 * scale}
              height={b.height * scale}
              fill={
                b.id === socket.device?.id
                  ? "#678f99"
                  : b.kind === "blanking"
                    ? "#26353d"
                    : "#526068"
              }
            />
          ))}
          {view.sockets.map((h, i) => (
            <rect
              key={i}
              x={rail - 1.3}
              y={y(h) - 0.8}
              width={2.6}
              height={1.6}
              fill="#a2afb3"
            />
          ))}
          <line
            x1={x(-width / 2) - 2}
            x2={x(width / 2) + 2}
            y1={y(view.outletY)}
            y2={y(view.outletY)}
            stroke="#edc077"
            strokeDasharray="2 2"
          />
          <circle
            cx={rail}
            cy={y(view.outletY)}
            r="2.5"
            fill="#edc077"
            stroke="#172832"
          />
          {input && (
            <rect
              x={x(input.x) - 2}
              y={y(input.y) - 2}
              width="4"
              height="4"
              fill="#bcecee"
              stroke="#24404c"
            />
          )}
        </svg>
        <div>
          <strong>○ 插座 {outletNumber(outlet)}</strong>
          <span>距柜底 {mm(view.outletY)}</span>
          <span>
            同高 {segment ? "U" + unit + " · " + segment.name : "超出安装范围"}
          </span>
          {socket.device && socket.link && input ? (
            <>
              <strong>□ 登记输入 {socket.link.inlet}</strong>
              <span>
                {socket.device.name} · {unitLabel(socket.device.id)}
              </span>
              <span>
                {input.delta === 0
                  ? "与插座同高"
                  : (input.delta > 0 ? "高于" : "低于") +
                    "插座 " +
                    mm(Math.abs(input.delta))}
              </span>
            </>
          ) : (
            <span>此插座未登记对端</span>
          )}
        </div>
      </div>
      {returning ? (
        <button
          disabled={!ready}
          onClick={() => {
            title.current?.focus({ preventScroll: true });
            setReturnTo(null);
            onSelect(returnTo.from, returnTo.scroll);
          }}
        >
          ← 返回插座 {outletNumber(returnTo.from)}
        </button>
      ) : (
        alignedLink &&
        alignedLink.outlet !== outlet && (
          <button
            disabled={!ready}
            onClick={() => {
              title.current?.focus({ preventScroll: true });
              const scroll = onSelect(alignedLink.outlet);
              setReturnTo({
                pduId,
                from: outlet,
                to: alignedLink.outlet,
                scroll,
              });
            }}
          >
            核对 {segment?.name} 的插座 {outletNumber(alignedLink.outlet)} ↗
          </button>
        )
      )}
      <small>按机箱归位时的配置投影，实际敷线待核实。</small>
    </details>
  );
}
