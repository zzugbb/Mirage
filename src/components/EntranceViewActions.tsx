import {
  entranceViews,
  type EntranceInspection,
  type EntranceView,
} from "../entrance-view";
import { entranceSettings } from "../entrance";

export function EntranceViewActions({
  inspection,
  ready,
  onView,
  onPreview,
  compact = false,
}: {
  inspection: EntranceInspection;
  ready: boolean;
  onView: (view: EntranceView | null) => void;
  onPreview?: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <section
      className={onPreview ? "entrance-view-details" : "entrance-scene-key"}
      aria-label={onPreview ? "入口布置核对" : "入口分段观察"}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (ready) onView(null);
        }
      }}
    >
      <strong>入口布置 · 配置核对</strong>
      {!compact && (
        <div className="entrance-view-segments" aria-label="入口观察范围">
          {entranceViews.map(({ id, label }) => (
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
          <dl>
            <div>
              <dt>洞口宽 × 高</dt>
              <dd>
                {entranceSettings.openingWidth.toFixed(2)} ×{" "}
                {entranceSettings.openingHeight.toFixed(2)} m
              </dd>
            </div>
            <div>
              <dt>洞口底高</dt>
              <dd>{inspection.openingBottom.toFixed(3)} m</dd>
            </div>
            <div>
              <dt>读卡器中心 / 把手轴高度</dt>
              <dd>
                {inspection.readerHeight.toFixed(3)} /{" "}
                {inspection.handleHeight.toFixed(3)} m
              </dd>
            </div>
            <div>
              <dt>门扇展示角</dt>
              <dd>
                {Math.round(
                  (Math.abs(entranceSettings.displayAngle) * 180) / Math.PI,
                )}
                ° · 静态
              </dd>
            </div>
          </dl>
          <p>
            {inspection.view === "opening"
              ? "轮廓标出配置洞口外缘，不扣门框、门扇或五金，不代表通行净宽。"
              : inspection.view === "access"
                ? "高度按机房 Y 坐标列出，竖线仅用于辨认位置。读卡器与把手分别标记，不表示门锁接线或联动。"
                : "门洞、静态门扇与入口左侧读卡器同框核对；分段近看仍沿用当前配置。"}
          </p>
          <div className="entrance-view-previews">
            <button onClick={() => onPreview(entranceSettings.fixtureId)}>
              预览入口门
            </button>
            <button onClick={() => onPreview(entranceSettings.readerId)}>
              预览读卡器
            </button>
          </div>
          <small>
            未接入门状态、访问记录或门锁控制；不判断通行、疏散或安装合规性。
          </small>
        </>
      ) : (
        <span>静态布置 · 无门锁控制</span>
      )}
      <button disabled={!ready} onClick={() => onView(null)}>
        ← 返回入口观察前视角
      </button>
    </section>
  );
}
