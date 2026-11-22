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
  onBoard,
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
  onBoard: () => void;
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
          if (!ready || visit.pending) return;
          if (visit.mode !== "group") onGroup();
          else onFinish();
        }
      }}
    >
      {visit.mode === "group" ? (
        <>
          <div className="structure-check-heading">
            <strong>正面盘位图</strong>
            <span role="status">
              {current
                ? `第 ${current.row} 行 · 第 ${current.column} 列`
                : "请选择盘位"}
            </span>
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
          {visit.mode === "board" ? "接点对应盘位" : "切换盘位"}
          <select
            value={current?.id ?? ""}
            disabled={!ready || visit.pending}
            onChange={(event) => onSelect(event.target.value)}
          >
            {!current && (
              <option value="" disabled>
                点选中板接点
              </option>
            )}
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.slot} · {slot.row} 行 {slot.column} 列
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="storage-slot-actions">
        {visit.mode !== "board" && (
          <button disabled={!ready || visit.pending} onClick={onBoard}>
            从中板选盘
          </button>
        )}
        {current && visit.mode !== "disk" && visit.mode !== "tray" && (
          <button
            disabled={!ready || visit.pending}
            onClick={() => onInspect(current.id)}
          >
            查看盘体与托架
          </button>
        )}
        {current && visit.mode !== "contact" && (
          <button
            disabled={!ready || visit.pending}
            onClick={() => onContact(current.id)}
          >
            核对中板接点
          </button>
        )}
      </div>
      <details className="structure-check-boundary">
        <summary>盘位编号与装配示意</summary>
        <p>
          正面由上至下、由左至右排列。{slots.length}{" "}
          个盘位沿用演示配置，外观机型的真实槽号未经核对。单盘读数为模型推导，磁盘健康、空槽和可用容量均未接入。
        </p>
        {(visit.mode === "disk" || visit.mode === "tray") && (
          <p>
            抬起盘体时，盘尾接触片随盘移动，两道横托留在原位。前拉手绕铰轴转离止挡；抽轴后可移出中间的活动耳，再与上下两只固定耳对孔。托架、铰接构造和行程均为原创装配示意。
          </p>
        )}
        {visit.mode === "contact" && (
          <p>
            虚线标出盘尾与同号中板插座。点“近看插合”可核对宽、窄两片与隔筋的对应。推合后可从座顶观察窗核对接触位置。接头、观察窗和行程为原创装配示意，读数沿用所选部件的模拟值。
          </p>
        )}
      </details>
    </section>
  );
}
