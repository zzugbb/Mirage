import {
  entranceViews,
  type EntranceInspection,
  type EntranceView,
} from "../entrance-view";
import { entranceSettings, entranceRelations } from "../entrance";

export function EntranceViewActions({
  inspection,
  ready,
  onView,
}: {
  inspection: EntranceInspection;
  ready: boolean;
  onView: (view: EntranceView | null) => void;
}) {
  return (
    <section
      className="entrance-scene-key"
      aria-label="入口分段观察"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !ready) return;
        event.preventDefault();
        event.stopPropagation();
        onView(null);
      }}
    >
      <label>
        入口布置
        <select
          aria-label="入口观察范围"
          value={inspection.view}
          disabled={!ready}
          onChange={(event) => {
            const range = entranceViews.find(
              ({ id }) => id === event.target.value,
            );
            if (range) onView(range.id);
          }}
        >
          {entranceViews.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button disabled={!ready} onClick={() => onView(null)}>
        返回原视角
      </button>
    </section>
  );
}

export function EntranceInspectionDetails({
  inspection,
  selectedId,
  onPreview,
  onLocate,
}: {
  inspection: EntranceInspection;
  selectedId: string;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
}) {
  const [peer] = entranceRelations(selectedId);
  const { view } = inspection;
  return (
    <section className="entrance-view-details" aria-label="入口布置核对">
      <strong>
        {view === "opening"
          ? "洞口外缘"
          : view === "access"
            ? "相对机房地面的高度"
            : "入口配置"}
      </strong>
      <dl>
        {view === "opening" ? (
          <>
            <div>
              <dt>宽 × 高</dt>
              <dd>
                {entranceSettings.openingWidth.toFixed(2)} ×{" "}
                {entranceSettings.openingHeight.toFixed(2)} m
              </dd>
            </div>
            <div>
              <dt>底高</dt>
              <dd>{inspection.openingBottom.toFixed(3)} m</dd>
            </div>
          </>
        ) : view === "access" ? (
          <>
            <div>
              <dt>读卡器中心</dt>
              <dd>{inspection.readerHeight.toFixed(3)} m</dd>
            </div>
            <div>
              <dt>把手轴</dt>
              <dd>{inspection.handleHeight.toFixed(3)} m</dd>
            </div>
          </>
        ) : (
          <div>
            <dt>门扇展示角</dt>
            <dd>
              {Math.round(
                (Math.abs(entranceSettings.displayAngle) * 180) / Math.PI,
              )}
              ° · 静态
            </dd>
          </div>
        )}
      </dl>
      {view === "opening" && <small>尺寸包含门框与五金所占空间。</small>}
      {peer && (
        <div className="entrance-view-peer">
          <span>{peer.name}</span>
          <button
            aria-label={`预览${peer.name}`}
            onClick={() => onPreview(peer.id)}
          >
            预览
          </button>
          <button
            aria-label={`定位${peer.name}`}
            onClick={() => onLocate(peer.id)}
          >
            定位 ↗
          </button>
        </div>
      )}
      <details>
        <summary>配置说明</summary>
        <p>
          位置与高度取自机房配置。洞口外缘不能用作通行净宽。门禁状态、访问记录与门锁接线均未接入。
        </p>
        <small>对象编号 {selectedId}</small>
      </details>
    </section>
  );
}
