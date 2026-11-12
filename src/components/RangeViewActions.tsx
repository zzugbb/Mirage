import type { RangeView, RangeViewCommand } from "../range-view";

export function RangeViewActions({
  active,
  ready,
  onView,
}: {
  active: RangeView | null;
  ready: boolean;
  onView: (action: RangeViewCommand["action"]) => void;
}) {
  return (
    <div
      className="range-view-actions"
      onKeyDown={(event) => {
        if (event.key === "Escape" && active && ready) {
          event.preventDefault();
          event.stopPropagation();
          onView("return");
        }
      }}
    >
      <div>
        <button
          data-range-view="front"
          disabled={!ready}
          aria-pressed={active === "front"}
          onClick={() => onView("front")}
        >
          前侧观察范围
        </button>
        <button
          data-range-view="rear"
          disabled={!ready}
          aria-pressed={active === "rear"}
          onClick={() => onView("rear")}
        >
          后侧观察范围
        </button>
      </div>
      {active && (
        <button disabled={!ready} onClick={() => onView("return")}>
          ← 返回范围观察前视角
        </button>
      )}
    </div>
  );
}
