import { condensateSensingSegments, distanceToReceiver } from "../condensate";
import { DrainFloorPlan } from "./DrainFloorPlan";
import {
  leakDetection,
  nearbyCooling,
  leakCable,
  leakController,
} from "../leak-detection";
import { useEffect, useRef, useState } from "react";
import type { LeakInspection, LeakFloorTarget } from "../leak-view";

function LeakDistanceInput({
  floor,
  total,
  ready,
  onPosition,
}: {
  floor: NonNullable<LeakInspection["floor"]>;
  total: number;
  ready: boolean;
  onPosition: (target: LeakFloorTarget) => void;
}) {
  const [origin, setOrigin] = useState("joint");
  const input = useRef<HTMLInputElement>(null);
  const distance = origin === "joint" ? floor.fromJoint : floor.toEnd;
  useEffect(() => {
    if (input.current) input.current.value = distance.toFixed(3);
  }, [floor, origin, distance]);
  return (
    <form
      className="leak-distance-input"
      onSubmit={(event) => {
        event.preventDefault();
        const value = input.current?.valueAsNumber;
        if (ready && value !== undefined && Number.isFinite(value))
          onPosition({ fromJoint: origin === "joint" ? value : total - value });
      }}
    >
      <label>
        量取起点
        <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
          <option value="joint">感应线接头</option>
          <option value="end">末端封接</option>
        </select>
      </label>
      <label>
        沿线距离（m）
        <input
          ref={input}
          type="number"
          required
          min="0"
          max={Number(total.toFixed(6))}
          step="0.001"
        />
      </label>
      <button disabled={!ready} type="submit">
        按距离定位
      </button>
    </form>
  );
}

export function LeakInspectionDetails({
  inspection,
  selectedId,
  onPreview,
  onLocate,
  ready,
  onPosition,
  onReceiver,
  onHistory,
}: {
  inspection: LeakInspection;
  selectedId: string;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  ready: boolean;
  onPosition: (target: LeakFloorTarget) => void;
  onReceiver: (segment: number) => void;
  onHistory: () => void;
}) {
  const { view, markers, leadLength, sensingLength } = inspection;
  const closest =
    inspection.floor && condensateSensingSegments[inspection.floor.index];
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
              onChange={(e) => onPosition(Number(e.target.value))}
            >
              {leakDetection.sensingPoints.slice(1).map((_, i) => (
                <option key={i} value={i}>
                  第 {i + 1} 段
                </option>
              ))}
            </select>
          </label>
          <LeakDistanceInput
            floor={inspection.floor}
            total={sensingLength}
            ready={ready}
            onPosition={onPosition}
          />
          <dl>
            <div>
              <dt>距接头 / 距末端</dt>
              <dd>
                {inspection.floor.fromJoint.toFixed(3)} /{" "}
                {inspection.floor.toEnd.toFixed(3)} m
              </dd>
            </div>
            <div>
              <dt>柜旁位置（机房坐标）</dt>
              <dd>{inspection.floor.side}</dd>
            </div>
            <div>
              <dt>本段配置长度</dt>
              <dd>{inspection.floor.length.toFixed(2)} m</dd>
            </div>
            <div>
              <dt>所选点至柜体投影</dt>
              <dd>{inspection.floor.distance.toFixed(3)} m</dd>
            </div>
          </dl>
          <small>
            里程只计感应线（共 {sensingLength.toFixed(3)}{" "}
            m）。尺寸线从所选点量至柜体配置投影。检漏信号未接入，探测范围未登记。
          </small>
          {closest && (
            <details className="drain-comparison">
              <summary>对照冷凝水接水斗</summary>
              <DrainFloorPlan
                segment={inspection.floor.index + 1}
                point={inspection.floor.point.toArray()}
              />
              <p>
                当前点至斗口中心的平面距离为{" "}
                {distanceToReceiver(inspection.floor.point.toArray()).toFixed(
                  3,
                )}{" "}
                m。本段最近距离为 {closest.distance.toFixed(3)} m。
              </p>
              <button
                disabled={!ready}
                onClick={() => onPosition({ fromJoint: closest.fromJoint })}
              >
                定位本段最近点
              </button>
              <button
                disabled={!ready}
                onClick={() => onReceiver(closest.segment)}
              >
                定位冷凝水接水斗
              </button>
            </details>
          )}
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
