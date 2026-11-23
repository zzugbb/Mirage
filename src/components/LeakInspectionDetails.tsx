import {
  leakDetection,
  nearbyCooling,
  leakCable,
  leakController,
} from "../leak-detection";
import type { LeakInspection } from "../leak-view";

export function LeakInspectionDetails({
  inspection,
  selectedId,
  onPreview,
  onLocate,
  ready,
  onSegment,
  onHistory,
}: {
  inspection: LeakInspection;
  selectedId: string;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  ready: boolean;
  onSegment: (index: number) => void;
  onHistory: () => void;
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
      {inspection.floor ? (
        <>
          <strong>{leakCable.location}</strong>
          <label className="leak-floor-segment">
            核对感应段
            <select
              aria-label="核对感应段"
              value={inspection.floor.index}
              disabled={!ready}
              onChange={(e) => onSegment(Number(e.target.value))}
            >
              {leakDetection.sensingPoints.slice(1).map((_, i) => (
                <option key={i} value={i}>
                  第 {i + 1} 段
                </option>
              ))}
            </select>
          </label>
          <dl>
            <div>
              <dt>柜旁位置（机房坐标）</dt>
              <dd>{inspection.floor.side}</dd>
            </div>
            <div>
              <dt>本段配置长度</dt>
              <dd>{inspection.floor.length.toFixed(2)} m</dd>
            </div>
            <div>
              <dt>段中至柜体投影</dt>
              <dd>{inspection.floor.distance.toFixed(3)} m</dd>
            </div>
          </dl>
          <small>
            虚线框为柜体配置投影，尺寸线从所选段中点量至框边。检漏信号未接入，探测范围未登记。
          </small>
          <button disabled={!ready} onClick={onHistory}>
            回看{nearbyCooling.name}输入 ↗
          </button>
        </>
      ) : view === "end" ? (
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
            <option value={leakDetection.controllerId}>
              {leakController.name}
            </option>
            <option value={leakDetection.cableId}>{leakCable.name}</option>
            <option value={leakDetection.nearbyFacilityId}>
              邻近{nearbyCooling.name}
            </option>
          </select>
        </label>
        <button disabled={!ready} onClick={() => onLocate(selectedId)}>
          定位 ↗
        </button>
      </div>
      {!inspection.floor && (
        <small>
          {selectedId === leakDetection.nearbyFacilityId
            ? "制冷单元与感应线相邻，监测覆盖未登记。"
            : "检漏路径为配置布置，未接入漏水信号。"}
        </small>
      )}
    </section>
  );
}
