import { useEffect, useLayoutEffect, useRef } from "react";
import { modelForDevice } from "../catalog";
import {
  fanAssembly,
  fanInspectionNeighbor,
  fanInspectionTarget,
  type FanInspection as Visit,
} from "../fan-inspection";

export function FanInspection({
  deviceId,
  visit,
  selected,
  ready,
  focusRevision,
  onSelect,
  onInspect,
  onGroup,
  onFinish,
}: {
  deviceId: string;
  visit: Visit;
  selected: string;
  ready: boolean;
  focusRevision: number;
  onSelect: (id: string) => void;
  onInspect: (id: string) => void;
  onGroup: () => void;
  onFinish: () => void;
}) {
  const assembly = fanAssembly(deviceId)!;
  const target = fanInspectionTarget(assembly, selected, visit.fanId);
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
      visit.mode === "single"
        ? "select"
        : target
          ? `[data-fan-id="${target.id}"]`
          : ".fan-inspection-list",
    );
    entry?.focus({ preventScroll: true });
    entry?.scrollIntoView({ block: "nearest" });
  }, [ready, visit.pending, focusRevision, visit.mode, target?.id]);
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
            <strong>风扇清单</strong>
            {target ? (
              <button
                disabled={!ready || visit.pending}
                onClick={() => onInspect(target.id)}
              >
                {selected === assembly.duct?.id
                  ? `只看 ${target.slot}`
                  : "只看所选子件"}{" "}
                ↗
              </button>
            ) : (
              <span role="status">请选择风扇</span>
            )}
          </div>
          <div
            className="fan-inspection-list"
            role="group"
            aria-label="风扇子件清单"
            tabIndex={-1}
          >
            {assembly.fans.map((fan, index) => (
              <button
                key={fan.id}
                data-fan-id={fan.id}
                aria-label={`${fan.name} · ${fan.slot}`}
                disabled={!ready || visit.pending}
                aria-pressed={selected === fan.id}
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
                {fan.slot}
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
        <summary>风扇编号与观察方向</summary>
        <p>
          编号按机型配置排列，每个维护子件可含多个叶轮。前、后侧沿设备坐标。
        </p>
        {visit.mode === "single" && modelForDevice(deviceId).fanDuctLayout && (
          <p>
            整件沿用当前模型外观。转子位置按机型配置，护网、轴头、轮毂与电机座为原创剖视示意。
          </p>
        )}
        {visit.side === "duct" &&
          modelForDevice(deviceId).id === "server-2u" && (
            <p>
              四个风扇的位置取自 M2
              模型。折弯导风罩按风扇排、两路散热器与上盖之间的空间绘制。
            </p>
          )}
        <p>
          部件读数来自模型推导。真实槽序、气流方向、转速和冗余状态均未接入。
        </p>
      </details>
    </section>
  );
}
