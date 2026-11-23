import { mountSettings } from "../pdu-mounts";
import type { PowerViewCommand } from "../power-view";

export function PowerViewActions({
  active,
  paired,
  ready,
  canTrace,
  initialMount,
  mountIndex,
  onView,
}: {
  active: boolean;
  paired: boolean;
  ready: boolean;
  canTrace: boolean;
  initialMount: number | null;
  mountIndex?: number;
  onView: (action: PowerViewCommand["action"]) => void;
}) {
  return (
    <div
      className="power-view-actions"
      role="group"
      aria-label="供电接入观察"
      onKeyDown={(event) => {
        if (event.key === "Escape" && active && ready) {
          event.preventDefault();
          event.stopPropagation();
          onView("return");
        }
      }}
    >
      <select
        aria-label="供电观察范围"
        value={
          !active
            ? ""
            : mountIndex !== undefined
              ? "mount"
              : paired
                ? "pair"
                : "single"
        }
        disabled={!ready}
        onChange={(event) => {
          const value = event.target.value;
          if (value === "mount" && initialMount !== null)
            onView({ mount: initialMount });
          else onView(value === "pair" ? "observe-pair" : "observe");
        }}
      >
        <option value="" disabled>
          选择观察范围
        </option>
        {canTrace && <option value="single">单路插座与输入</option>}
        {canTrace && <option value="pair">A/B 双输入</option>}
        {initialMount !== null && <option value="mount">PDU 侧壁支架</option>}
      </select>
      {mountIndex !== undefined && (
        <select
          aria-label="支架安装位置"
          disabled={!ready}
          value={mountIndex}
          onChange={(event) => onView({ mount: Number(event.target.value) })}
        >
          {mountSettings.heightOffsets.map((offset, i) => (
            <option key={offset} value={i}>
              支架 {i + 1}
            </option>
          ))}
        </select>
      )}
      {active && (
        <button disabled={!ready} onClick={() => onView("return")}>
          返回原视角
        </button>
      )}
    </div>
  );
}
