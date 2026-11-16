import { useEffect, useLayoutEffect, useRef } from "react";
import {
  storageSlots,
  storageSlotKey,
  type StorageSlotInspection,
} from "../storage-slots";
import { storageAssembly } from "../storage-layout";
import { deviceById } from "../installation";

export function StorageSlots({
  deviceId,
  selected,
  visit,
  ready,
  analysis,
  focusRevision,
  onSelect,
  onInspect,
  onContact,
  onGroup,
  onFinish,
}: {
  deviceId: string;
  selected: string;
  visit: StorageSlotInspection;
  ready: boolean;
  analysis: boolean;
  focusRevision: number;
  onSelect: (id: string) => void;
  onInspect: (id: string) => void;
  onContact: (id: string) => void;
  onGroup: () => void;
  onFinish: () => void;
}) {
  const slots = storageSlots(deviceId),
    current =
      slots.find((slot) => slot.id === selected) ??
      slots.find((slot) => slot.id === visit.diskId);
  const host = useRef<HTMLElement>(null),
    pendingFocus = useRef(false);
  // 返回可能先重建按钮、再开始镜头适配；保留焦点意图直到下一次主动操作。
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
    if (!ready || visit.pending || !pendingFocus.current || !host.current)
      return;
    const entry = host.current.querySelector<HTMLElement>(
      !analysis ? `[data-slot-id="${current?.id ?? slots[0].id}"]` : "button",
    );
    entry?.focus({ preventScroll: true });
    if (focusRevision) entry?.scrollIntoView({ block: "nearest" });
  }, [ready, visit.pending, focusRevision, analysis]);
  return (
    <section
      ref={host}
      className="storage-slot-check"
      aria-label="存储盘位核对"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (visit.mode !== "group" || analysis) onGroup();
          else onFinish();
        }
      }}
    >
      <strong>
        {deviceById(deviceId)!.name} · {slots.length} 盘位
      </strong>
      {analysis ? (
        <>
          {visit.mode === "contact" && current && (
            <small>
              {current.slot} ↔ 中板第 {current.row} 行 / 第 {current.column}{" "}
              列接点 · 装配对应示意，非电气接线。
            </small>
          )}
          <button disabled={!ready} onClick={onGroup}>
            ← 返回盘位总览
          </button>
        </>
      ) : (
        <>
          <p>
            正面看 ·
            从上到下、从左到右。编号沿用内部配置，不代表外观型号的真实槽号。
          </p>
          <div
            className="storage-slot-grid"
            style={{
              gridTemplateColumns: `repeat(${storageAssembly.columns}, minmax(0, 1fr))`,
            }}
            role="group"
            aria-label="正面盘位图"
          >
            {slots.map((slot) => (
              <button
                key={slot.id}
                data-slot-id={slot.id}
                disabled={!ready || visit.pending}
                aria-pressed={current?.id === slot.id}
                aria-label={`${slot.slot}，第 ${slot.row} 行第 ${slot.column} 列`}
                onClick={() => onSelect(slot.id)}
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
                    slots[storageSlotKey(slot.index, event.key, slots.length)];
                  host.current
                    ?.querySelector<HTMLButtonElement>(
                      `[data-slot-id="${next.id}"]`,
                    )
                    ?.focus();
                }}
              >
                {String(slot.index + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
          <p role="status">
            {current
              ? `${current.slot} · 第 ${current.row} 行 / 第 ${current.column} 列`
              : "选择盘位，在三维中查看对应硬盘。"}
            {visit.mode === "contact"
              ? " · 中板接点对应"
              : visit.mode === "disk"
                ? " · 单盘检视"
                : " · 完整盘组"}
          </p>
          {visit.mode === "contact" && current && (
            <p>
              硬盘后部接触面 ↔ 中板第 {current.row} 行 / 第 {current.column}{" "}
              列接点。
              两端轮廓与虚线仅表示装配对应；展开间隔不是线缆长度，不表示真实电路、接通状态或拔插步骤。
            </p>
          )}
          <div className="storage-slot-actions">
            <button
              disabled={!ready || visit.pending || !current}
              onClick={() => current && onInspect(current.id)}
            >
              只看此硬盘
            </button>
            <button
              disabled={!ready || visit.pending || !current}
              aria-pressed={visit.mode === "contact"}
              onClick={() => current && onContact(current.id)}
            >
              核对中板接点
            </button>
            <button disabled={!ready || visit.pending} onClick={onGroup}>
              {visit.mode !== "group" ? "← 返回盘位总览" : "正面观察盘组"}
            </button>
          </div>
          <small>
            沿用 {slots.length}{" "}
            个已配置硬盘子件；未接入磁盘实测状态，不推断空槽、可用容量或健康。单盘读数仍为模型推导。
          </small>
        </>
      )}
      <button disabled={!ready || visit.pending} onClick={onFinish}>
        结束核对，返回完整结构
      </button>
    </section>
  );
}
