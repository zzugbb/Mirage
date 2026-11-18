import { useEffect, useLayoutEffect, useRef } from "react";
import {
  fanAssembly,
  fanInspectionNeighbor,
  type FanInspection as Visit,
} from "../fan-inspection";

export function FanInspection({
  deviceId,
  visit,
  ready,
  focusRevision,
  onSelect,
  onInspect,
  onGroup,
  onFinish,
}: {
  deviceId: string;
  visit: Visit;
  ready: boolean;
  focusRevision: number;
  onSelect: (id: string) => void;
  onInspect: () => void;
  onGroup: () => void;
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
    const entry = host.current?.querySelector<HTMLElement>(
      visit.mode === "group" ? `[data-fan-id="${visit.fanId}"]` : "select",
    );
    entry?.focus({ preventScroll: true });
    entry?.scrollIntoView({ block: "nearest" });
  }, [ready, visit.pending, focusRevision, visit.mode]);
  return (
    <section
      ref={host}
      className="fan-inspection"
      aria-label="风扇组核对"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        if (!ready || visit.pending) return;
        if (visit.mode === "single") onGroup();
        else onFinish();
      }}
    >
      {visit.mode === "group" ? (
        <>
          <div className="structure-check-heading">
            <strong>维护子件 · {assembly.fans.length}</strong>
            <button disabled={!ready || visit.pending} onClick={onInspect}>
              只看所选子件 ↗
            </button>
          </div>
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
        </>
      ) : (
        <label className="structure-check-heading">
          切换风扇
          <select
            value={visit.fanId}
            disabled={!ready || visit.pending}
            onChange={(event) => onSelect(event.target.value)}
          >
            {assembly.fans.map((fan) => (
              <option key={fan.id} value={fan.id}>
                {fan.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <details className="structure-check-boundary">
        <summary>配置与读数口径</summary>
        <p>
          前、后侧沿设备坐标。清单按维护子件计数，同一子件可含多个叶轮。编号沿用机型配置。
        </p>
        <p>
          部件读数来自模型推导。真实槽序、气流方向、转速和冗余状态均未接入。
        </p>
      </details>
    </section>
  );
}
