import { standSensingSegments } from "../drain-foot";
import {
  condensate,
  drainStands,
  condensateSensingSegments,
  distanceToReceiver,
} from "../condensate";
import { DrainFloorPlan } from "./DrainFloorPlan";
import {
  leakDetection,
  nearbyCooling,
  leakCable,
  leakController,
} from "../leak-detection";
import { sensingSegmentsToFootprint } from "../leak-footprint";
import { useEffect, useRef, useState } from "react";
import type {
  LeakInspection,
  LeakFittingTarget,
  LeakFloorTarget,
} from "../leak-view";
import { LeakFittingDetails } from "./LeakFittingDetails";

const coolingSegmentGaps = sensingSegmentsToFootprint(
  nearbyCooling.position,
  nearbyCooling.size,
);

function LeakDistanceInput({
  position,
  ready,
  onDistance,
  startLabel,
}: {
  position: { station: number; total: number };
  ready: boolean;
  startLabel: string;
  onDistance: (distance: number) => void;
}) {
  const [origin, setOrigin] = useState("joint");
  const input = useRef<HTMLInputElement>(null);
  const { station, total } = position;
  const distance = origin === "joint" ? station : total - station;
  useEffect(() => {
    if (input.current) input.current.value = distance.toFixed(3);
  }, [position, origin, distance]);
  return (
    <form
      className="leak-distance-input"
      onSubmit={(event) => {
        event.preventDefault();
        const value = input.current?.valueAsNumber;
        if (ready && value !== undefined && Number.isFinite(value))
          onDistance(origin === "joint" ? value : total - value);
      }}
    >
      <label>
        量取起点
        <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
          <option value="joint">{startLabel}</option>
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

function RouteScale({
  route,
  leadLength,
}: {
  route: NonNullable<LeakInspection["route"]>;
  leadLength: number;
}) {
  const x = (at: number) => 6 + (228 * at) / route.total;
  const joint = x(leadLength),
    point = x(route.station);
  return (
    <svg
      viewBox="0 0 240 42"
      className="leak-route-scale"
      role="img"
      aria-label={`支路累计里程，当前点 ${route.station.toFixed(3)} m，全长 ${route.total.toFixed(3)} m`}
    >
      <text x={6} y={12}>
        引线
      </text>
      <text x={joint + 5} y={12}>
        感应线
      </text>
      <path d={`M 6 23 H ${joint}`} stroke="#8497a2" strokeWidth={5} />
      <path d={`M ${joint} 23 H 234`} stroke="#b5a58b" strokeWidth={5} />
      {route.ends.map((at, i) => (
        <line key={i} x1={x(at)} x2={x(at)} y1={19} y2={27} stroke="#e5e9e8" />
      ))}
      <path d={`M ${point} 26 l -4 7 h 8 Z`} fill="#86e4d7" />
    </svg>
  );
}

export function LeakInspectionDetails({
  inspection,
  selectedId,
  onPreview,
  onLocate,
  ready,
  onPosition,
  onRoute,
  onFitting,
  onDrainFixture,
  onHistory,
}: {
  inspection: LeakInspection;
  selectedId: string;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  ready: boolean;
  onPosition: (target: LeakFloorTarget) => void;
  onRoute: (target: number | { fromController: number }) => void;
  onFitting: (target: LeakFittingTarget) => void;
  onDrainFixture: (id: string, segment: number) => void;
  onHistory: () => void;
}) {
  const { view, route, markers, leadLength, sensingLength, fitting } =
    inspection;
  const closest =
    inspection.floor && condensateSensingSegments[inspection.floor.index];
  const floor = inspection.floor;
  const stand = floor?.stand;
  const footNearest =
    stand && floor ? standSensingSegments(stand)[floor.index] : null;
  const initialFitting =
    view === "end" || (route && route.station === route.total)
      ? "end"
      : view === "lead" ||
          route?.station === 0 ||
          (view === "all" && selectedId === leakController.id)
        ? "controller"
        : "joint";
  const positionFloor = (target: LeakFloorTarget) => {
    if (!stand) return onPosition(target);
    onPosition({
      ...(typeof target === "number" ? { segment: target } : target),
      standId: stand.id,
    });
  };
  const sectionSelect = useRef<HTMLSelectElement>(null);
  const fittingSelect = useRef<HTMLSelectElement>(null);
  const pendingFocus = useRef<"route" | "floor" | "fitting" | null>(null);
  useEffect(() => {
    if (ready && pendingFocus.current === view) {
      const select = view === "fitting" ? fittingSelect : sectionSelect;
      select.current?.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [ready, view]);
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
      {fitting ? (
        <LeakFittingDetails
          fitting={fitting}
          ready={ready}
          onFitting={onFitting}
          stateSelect={fittingSelect}
          onRoute={() => {
            pendingFocus.current = "route";
            onRoute({ fromController: fitting.station });
          }}
          onCooling={() => onLocate(nearbyCooling.id)}
        />
      ) : route ? (
        <>
          <strong>整支路里程 · {route.label}</strong>
          <RouteScale route={route} leadLength={leadLength} />
          <label className="leak-floor-segment">
            核对线段
            <select
              disabled={!ready}
              ref={sectionSelect}
              value={route.index}
              onChange={(e) => onRoute(Number(e.target.value))}
            >
              {[leakDetection.leadPoints, leakDetection.sensingPoints].flatMap(
                (points, section) =>
                  points.slice(1).map((_, i) => {
                    const index =
                      i + (section ? leakDetection.leadPoints.length - 1 : 0);
                    return (
                      <option key={index} value={index}>
                        {section ? "感应线" : "引线"}第{i + 1}段
                      </option>
                    );
                  }),
              )}
            </select>
          </label>
          <LeakDistanceInput
            key="route"
            position={route}
            startLabel="控制器引线起点"
            ready={ready}
            onDistance={(distance) => onRoute({ fromController: distance })}
          />
          <dl>
            <div>
              <dt>距控制器线首 / 距末端</dt>
              <dd>
                {route.station.toFixed(3)} /{" "}
                {(route.total - route.station).toFixed(3)} m
              </dd>
            </div>
            <div>
              <dt>本段配置长度</dt>
              <dd>{route.length.toFixed(3)} m</dd>
            </div>
            <div>
              <dt>{route.isLead ? "沿引线至接头" : "自接头起的感应线里程"}</dt>
              <dd>
                {(route.fromJoint ?? leadLength - route.station).toFixed(3)} m
              </dd>
            </div>
          </dl>
          <div className="leak-route-stops">
            {(
              [
                [0, "控制器线首"],
                [leadLength, "感应线接头"],
                [route.total, "末端封接"],
              ] as const
            ).map(([at, label]) => (
              <button
                type="button"
                key={label}
                disabled={!ready}
                onClick={() => onRoute({ fromController: at })}
              >
                {label}
              </button>
            ))}
          </div>
          {route.station === 0 && (
            <button
              disabled={!ready}
              onClick={() => {
                pendingFocus.current = "fitting";
                onFitting({ fitting: "controller", outlet: true });
              }}
            >
              核对控制器出线口 ↗
            </button>
          )}
          {route.fromJoint !== null && (
            <button
              disabled={!ready}
              onClick={() => {
                if (route.fromJoint !== null) {
                  pendingFocus.current = "floor";
                  onPosition({ fromJoint: route.fromJoint });
                }
              }}
            >
              在柜旁地面核对同一点 ↗
            </button>
          )}
          <small>
            按配置折线累计。前 {leadLength.toFixed(3)} m
            为引线，自接头起为感应线。
          </small>
        </>
      ) : inspection.floor ? (
        <>
          <strong>{leakCable.location}</strong>
          <label className="leak-floor-segment">
            核对感应段
            <select
              ref={sectionSelect}
              aria-label="核对感应段"
              value={inspection.floor.index}
              disabled={!ready}
              onChange={(e) => positionFloor(Number(e.target.value))}
            >
              {leakDetection.sensingPoints.slice(1).map((_, i) => (
                <option key={i} value={i}>
                  第 {i + 1} 段
                </option>
              ))}
            </select>
          </label>
          <LeakDistanceInput
            key="floor"
            startLabel="感应线接头"
            position={inspection.floor}
            ready={ready}
            onDistance={(fromJoint) => positionFloor({ fromJoint })}
          />
          <label className="leak-floor-segment">
            地面尺寸基准
            <select
              value={stand?.id ?? nearbyCooling.id}
              disabled={!ready}
              onChange={(e) =>
                onPosition({
                  fromJoint: inspection.floor!.fromJoint,
                  segment: inspection.floor!.index,
                  standId: e.target.value,
                })
              }
            >
              <option value={nearbyCooling.id}>制冷柜投影</option>
              {drainStands.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}底板
                </option>
              ))}
            </select>
          </label>
          <dl>
            <div>
              <dt>距接头 / 距末端</dt>
              <dd>
                {inspection.floor.fromJoint.toFixed(3)} /{" "}
                {inspection.floor.toEnd.toFixed(3)} m
              </dd>
            </div>
            <div>
              <dt>{stand ? "底板" : "柜"}旁位置（机房坐标）</dt>
              <dd>{inspection.floor.side}</dd>
            </div>
            <div>
              <dt>本段配置长度</dt>
              <dd>{inspection.floor.length.toFixed(2)} m</dd>
            </div>
            <div>
              <dt>所选点至{stand ? "底板" : "柜体"}投影</dt>
              <dd>{inspection.floor.distance.toFixed(3)} m</dd>
            </div>
          </dl>
          {!stand && (
            <details className="drain-comparison">
              <summary>逐段核对距柜最近位置</summary>
              <div className="leak-route-stops leak-cabinet-stops">
                {coolingSegmentGaps.map(({ segment, fromJoint, distance }) => (
                  <button
                    key={segment}
                    type="button"
                    disabled={!ready}
                    aria-label={`定位第 ${segment} 段最近点，${distance.toFixed(3)} m`}
                    aria-pressed={
                      floor?.index === segment - 1 &&
                      Math.abs(floor.fromJoint - fromJoint) < 1e-9
                    }
                    onClick={() =>
                      positionFloor({ fromJoint, segment: segment - 1 })
                    }
                  >
                    <span>第 {segment} 段</span>
                    <span>{distance.toFixed(3)} m</span>
                  </button>
                ))}
              </div>
              <small>
                按感应线中心线与柜体配置投影量取 X/Z
                平面最短距离。并列时取最靠近本段中点的位置。
              </small>
            </details>
          )}
          <small>
            里程只计感应线（共 {sensingLength.toFixed(3)}{" "}
            m）。尺寸线从所选点量至{stand ? stand.name + "底板" : "柜体"}
            配置投影。检漏信号未接入，探测范围未登记。
          </small>
          <button
            disabled={!ready}
            onClick={() => {
              if (inspection.floor) {
                pendingFocus.current = "route";
                onRoute({
                  fromController: leadLength + inspection.floor.fromJoint,
                });
              }
            }}
          >
            查看整支路同一里程点 ↗
          </button>
          {stand && footNearest && floor && (
            <div className="drain-comparison">
              <DrainFloorPlan
                segment={floor.index + 1}
                point={floor.point.toArray()}
                stand={stand}
                edge={floor.edge}
              />
              <p>
                本段距底板最近 {footNearest.distance.toFixed(3)} m，距接头{" "}
                {footNearest.fromJoint.toFixed(3)} m。
              </p>
              <button
                disabled={!ready}
                onClick={() =>
                  positionFloor({
                    fromJoint: footNearest.fromJoint,
                    segment: floor.index,
                  })
                }
              >
                定位本段底板最近点
              </button>
              <button
                disabled={!ready}
                onClick={() => onDrainFixture(stand.id, floor.index + 1)}
              >
                定位{stand.name}
              </button>
            </div>
          )}
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
                onClick={() =>
                  onDrainFixture(condensate.receiver.id, closest.segment)
                }
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
      {!fitting && !floor && (
        <button
          disabled={!ready}
          onClick={() => onFitting({ fitting: initialFitting })}
        >
          核对线端装配 ↗
        </button>
      )}
      {!fitting && (
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
      )}
      {!floor && !fitting && (
        <small>
          {selectedId === leakDetection.nearbyFacilityId
            ? "制冷单元与感应线相邻，监测覆盖未登记。"
            : "检漏路径为配置布置，未接入漏水信号。"}
        </small>
      )}
    </section>
  );
}
