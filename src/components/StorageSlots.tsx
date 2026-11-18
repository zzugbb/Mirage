import { useEffect, useLayoutEffect, useRef } from "react";
import {
  storageSlots,
  storageSlotKey,
  type StorageSlotInspection,
} from "../storage-slots";
import { storageAssembly } from "../storage-layout";

export function StorageSlots({
  deviceId,
  selected,
  visit,
  ready,
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
      visit.mode === "group"
        ? `[data-slot-id="${current?.id ?? slots[0].id}"]`
        : "select",
    );
    entry?.focus({ preventScroll: true });
    if (focusRevision) entry?.scrollIntoView({ block: "nearest" });
  }, [ready, visit.pending, focusRevision, visit.mode]);
  return (
    <section
      ref={host}
      className="storage-slot-check"
      aria-label="存储盘位核对"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (visit.mode !== "group") onGroup();
          else onFinish();
        }
      }}
    >
      {visit.mode === "group" ? (
        <>
          <div className="structure-check-heading">
            <strong>正面盘位图</strong>
            <button disabled={!ready || visit.pending} onClick={onGroup}>
              正面观察盘组
            </button>
          </div>
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
        </>
      ) : (
        <label className="structure-check-heading">
          切换盘位
          <select
            aria-label="切换盘位"
            value={current?.id ?? ""}
            disabled={!ready || visit.pending}
            onChange={(event) => onSelect(event.target.value)}
          >
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.slot} · {slot.row} 行 {slot.column} 列
              </option>
            ))}
          </select>
        </label>
      )}
      {visit.mode !== "disk" && (
        <p role="status">
          {current
            ? visit.mode === "contact"
              ? "盘尾接触面 ↔ 中板接点 · 装配示意"
              : `${current.slot} · 第 ${current.row} 行第 ${current.column} 列`
            : "选择要核对的盘位"}
        </p>
      )}
      {current && (
        <div className="storage-slot-actions">
          {visit.mode !== "disk" && (
            <button
              disabled={!ready || visit.pending}
              onClick={() => onInspect(current.id)}
            >
              只看此硬盘
            </button>
          )}
          {visit.mode !== "contact" && (
            <button
              disabled={!ready || visit.pending}
              onClick={() => onContact(current.id)}
            >
              核对中板接点
            </button>
          )}
        </div>
      )}
      <details className="structure-check-boundary">
        <summary>配置与读数口径</summary>
        <p>
          正面由上至下、由左至右排列。{slots.length}{" "}
          个盘位沿用演示配置，外观机型的真实槽号未经核对。单盘读数为模型推导，磁盘健康、空槽和可用容量均未接入。
        </p>
        {visit.mode === "contact" && (
          <p>
            虚线表示装配对应。展开间距仅用于观察，真实电路、接通状态和拔插步骤均未建模。
          </p>
        )}
      </details>
    </section>
  );
}
