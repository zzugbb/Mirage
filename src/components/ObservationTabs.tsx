import type { InspectionView } from "./ReplayPanel";
const views = [
  ["status", "运行状态", "查看设备状态标记与运行概览"],
  ["object", "结构拆解", "查看原始材质、部件清单与展开复原"],
  ["temperature", "温度", "查看设备进风与部件模型温度"],
  ["power", "功耗", "查看设备输入功耗与分配"],
  ["alarms", "告警", "查看并定位设备告警"],
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
      {views.map(([key, label, description]) => (
        <button
          key={key}
          role="tab"
          title={description}
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
