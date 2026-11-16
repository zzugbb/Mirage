import { useEffect, useLayoutEffect, useRef } from "react";
import {
  fanAssembly,
  fanInspectionNeighbor,
  type FanInspection as Visit,
} from "../fan-inspection";
import { deviceById } from "../installation";

export function FanInspection({
  deviceId,
  visit,
  ready,
  analysis,
  focusRevision,
  onSelect,
  onInspect,
  onGroup,
  onSide,
  onFinish,
}: {
  deviceId: string;
  visit: Visit;
  ready: boolean;
  analysis: boolean;
  focusRevision: number;
  onSelect: (id: string) => void;
  onInspect: () => void;
  onGroup: () => void;
  onSide: (side: Visit["side"]) => void;
  onFinish: () => void;
}) {
  const assembly = fanAssembly(deviceId)!;
  const host = useRef<HTMLElement>(null),
    pendingFocus = useRef(false);
  useEffect(() => {
    const release = () => {
      pendingFocus.current = false;
    };
    document.addEventListener("pointerdown", release, true);
    document.addEventListener("keydown", release, true);
    return () => {
      document.removeEventListener("pointerdown", release, true);
      document.removeEventListener("keydown", release, true);
    };
  }, []);
  useLayoutEffect(() => {
    pendingFocus.current = focusRevision > 0;
  }, [focusRevision]);
  useLayoutEffect(() => {
    if (!ready || visit.pending || !pendingFocus.current) return;
    const entry = host.current?.querySelector<HTMLButtonElement>(
      !analysis ? `[data-fan-id="${visit.fanId}"]` : "button",
    );
    entry?.focus({ preventScroll: true });
    entry?.scrollIntoView({ block: "nearest" });
  }, [ready, visit.pending, focusRevision, analysis]);
  return (
    <section
      ref={host}
      className="fan-inspection"
      aria-label="风扇组核对"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        if (!ready) return;
        if (visit.mode === "single" || analysis) onGroup();
        else onFinish();
      }}
    >
      <strong>
        {deviceById(deviceId)!.name} · {assembly.group.name}
      </strong>
      {analysis ? (
        <button disabled={!ready} onClick={onGroup}>
          ← 返回风扇组核对
        </button>
      ) : (
        <>
          <p>
            按维护子件计数，不按叶轮数量；编号不表示实际槽号、左右顺序或拆装步骤。
          </p>
          <div
            className="fan-inspection-list"
            role="group"
            aria-label="风扇子件清单"
          >
            {assembly.fans.map((fan, index) => (
              <button
                key={fan.id}
                data-fan-id={fan.id}
                disabled={!ready || visit.pending}
                aria-pressed={visit.fanId === fan.id}
                onClick={() => onSelect(fan.id)}
                onKeyDown={(event) => {
                  if (
                    ![
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                      "Home",
                      "End",
                    ].includes(event.key)
                  )
                    return;
                  event.preventDefault();
                  event.stopPropagation();
                  const next =
                    assembly.fans[
                      fanInspectionNeighbor(
                        index,
                        event.key,
                        assembly.fans.length,
                      )
                    ];
                  host.current
                    ?.querySelector<HTMLButtonElement>(
                      `[data-fan-id="${next.id}"]`,
                    )
                    ?.focus();
                }}
              >
                {fan.name}
              </button>
            ))}
          </div>
          {visit.mode === "group" ? (
            <div className="fan-inspection-actions">
              <button
                disabled={!ready}
                aria-pressed={visit.side === "front"}
                onClick={() => onSide("front")}
              >
                前侧观察
              </button>
              <button
                disabled={!ready}
                aria-pressed={visit.side === "rear"}
                onClick={() => onSide("rear")}
              >
                后侧观察
              </button>
              <button disabled={!ready} onClick={onInspect}>
                只看所选子件 ↗
              </button>
            </div>
          ) : (
            <button disabled={!ready} onClick={onGroup}>
              ← 返回风扇组核对
            </button>
          )}
        </>
      )}
      <small>
        两侧沿设备坐标；外观与内部示意沿用原模型，不判断气流方向、转速、健康或冗余。
      </small>
      <button disabled={!ready} onClick={onFinish}>
        结束风扇核对
      </button>
    </section>
  );
}
