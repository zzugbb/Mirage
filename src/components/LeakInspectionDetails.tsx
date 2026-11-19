import { leakDetection } from "../leak-detection";
import type { LeakInspection } from "../leak-view";

export function LeakInspectionDetails({
  inspection,
  selectedId,
  onPreview,
  onLocate,
  ready,
}: {
  inspection: LeakInspection;
  selectedId: string;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  ready: boolean;
}) {
  const { view, markers, leadLength, sensingLength } = inspection;
  const coordinates = (
    <dl>
      {markers.map(({ id, title, point }) => (
        <div key={id}>
          <dt>{title}</dt>
          <dd>
            {point
              .toArray()
              .map((v) => v.toFixed(3))
              .join(" / ")}{" "}
            m
          </dd>
        </div>
      ))}
    </dl>
  );
  return (
    <section className="leak-view-details" aria-label="检漏布置核对">
      {view === "end" ? (
        <>
          <strong>封接位置</strong>
          {coordinates}
          <small>机房坐标 X / Y / Z</small>
        </>
      ) : (
        <>
          <strong>配置段长</strong>
          <dl>
            {view !== "sensing" && (
              <div>
                <dt>①–② 引线</dt>
                <dd>{leadLength.toFixed(2)} m</dd>
              </div>
            )}
            {view !== "lead" && (
              <div>
                <dt>②–③ 感应线</dt>
                <dd>{sensingLength.toFixed(2)} m</dd>
              </div>
            )}
          </dl>
          <details>
            <summary>端点坐标 · X / Y / Z</summary>
            {coordinates}
          </details>
        </>
      )}
      <div className="leak-view-preview">
        <label>
          预览对象
          <select
            value={selectedId}
            onChange={(event) => onPreview(event.target.value)}
          >
            <option value={leakDetection.controllerId}>检漏控制器</option>
            <option value={leakDetection.cableId}>感应线</option>
            <option value={leakDetection.nearbyFacilityId}>邻近制冷单元</option>
          </select>
        </label>
        <button disabled={!ready} onClick={() => onLocate(selectedId)}>
          定位 ↗
        </button>
      </div>
      <small>
        {selectedId === leakDetection.nearbyFacilityId
          ? "制冷单元与感应线相邻，监测覆盖未登记。"
          : "检漏路径为配置布置，未接入漏水信号。"}
      </small>
    </section>
  );
}
