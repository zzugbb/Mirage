import type { InspectionView } from "./ReplayPanel";
const views = [
  ["object", "结构"],
  ["temperature", "温度"],
  ["power", "功耗"],
  ["alarms", "告警"],
] as const;
export function ObservationTabs({
  view,
  onChange,
}: {
  view: InspectionView;
  onChange: (view: InspectionView) => void;
}) {
  return (
    <div
      className="observation-tabs"
      role="tablist"
      aria-label="观察模式"
      onKeyDown={(event) => {
        const index = views.findIndex(([key]) => key === view);
        const next =
          event.key === "ArrowRight"
            ? (index + 1) % views.length
            : event.key === "ArrowLeft"
              ? (index + views.length - 1) % views.length
              : event.key === "Home"
                ? 0
                : event.key === "End"
                  ? views.length - 1
                  : -1;
        if (next < 0) return;
        event.preventDefault();
        onChange(views[next][0]);
        event.currentTarget
          .querySelector<HTMLButtonElement>(`[data-view="${views[next][0]}"]`)
          ?.focus();
      }}
    >
      {views.map(([key, label]) => (
        <button
          key={key}
          role="tab"
          id={`inspection-${key}`}
          data-view={key}
          aria-selected={key === view}
          aria-controls="observation-content"
          tabIndex={key === view ? 0 : -1}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
