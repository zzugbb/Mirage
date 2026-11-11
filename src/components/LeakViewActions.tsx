import { leakViews, type LeakInspection, type LeakView } from "../leak-view";
import { leakDetection } from "../leak-detection";

export function LeakViewActions({
  inspection,
  ready,
  onView,
  onPreview,
  compact = false,
}: {
  inspection: LeakInspection;
  ready: boolean;
  onView: (view: LeakView | null) => void;
  onPreview?: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <section
      className={onPreview ? "leak-view-details" : "leak-scene-key"}
      aria-label={onPreview ? "检漏布置核对" : "检漏分段观察"}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (ready) onView(null);
        }
      }}
    >
      <strong>检漏路径 · 配置布置</strong>
      {!compact && (
        <div className="leak-view-segments" aria-label="检漏观察段">
          {leakViews.map(({ id, label }) => (
            <button
              key={id}
              disabled={!ready}
              aria-pressed={inspection.view === id}
              onClick={() => onView(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {onPreview && !compact ? (
        <>
          <p>
            引线 {inspection.leadLength.toFixed(2)} m · 感应线{" "}
            {inspection.sensingLength.toFixed(2)} m。长度为配置折线段长。
          </p>
          <p>
            {inspection.view === "lead"
              ? "① 至 ② 是连接控制器与感应线的引线，不计入感应段长。"
              : inspection.view === "end"
                ? "③ 为已登记路径的封接末端；不延伸、不闭环，也不代表未连接故障。"
                : "② 至 ③ 是感应线配置路径；局部线段强调只帮助辨认布置，不表示信号流向、运行状态或探测覆盖。"}
          </p>
          <dl>
            {inspection.markers.map((marker) => (
              <div key={marker.id}>
                <dt>{marker.title}</dt>
                <dd>
                  {marker.point
                    .toArray()
                    .map((v) => v.toFixed(3))
                    .join(" / ")}{" "}
                  m
                </dd>
              </div>
            ))}
          </dl>
          <small>X / Y / Z · 机房配置坐标</small>
          <div className="leak-view-previews">
            <button onClick={() => onPreview(leakDetection.controllerId)}>
              预览控制器
            </button>
            <button onClick={() => onPreview(leakDetection.cableId)}>
              预览感应线
            </button>
            <button onClick={() => onPreview(leakDetection.nearbyFacilityId)}>
              预览邻近制冷单元
            </button>
          </div>
          <small>未接入漏水信号；邻近布置不表示监测覆盖或制冷故障。</small>
        </>
      ) : (
        <span>静态布置 · 未接入信号</span>
      )}
      <button disabled={!ready} onClick={() => onView(null)}>
        ← 返回检漏观察前视角
      </button>
    </section>
  );
}
