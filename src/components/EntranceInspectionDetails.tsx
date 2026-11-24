import { environmentProbes } from "../environment-monitoring";
import { entranceCabinet } from "../entrance-cabinet";
import {
  entranceFixture,
  entranceSettings,
  entranceRelations,
} from "../entrance";

import type { EntranceInspection, EntranceView } from "../entrance-view";
import { EntranceSweepDetails } from "./EntranceSweepDetails";

type CabinetPlacement = Extract<
  EntranceInspection,
  { view: "cabinet" }
>["cabinet"];

function CabinetPlan({ placement }: { placement: CabinetPlacement }) {
  const { displayed, closed, hinge, footprint } = placement;
  const points = [hinge, displayed.edge, closed.edge, ...footprint];
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const left = Math.min(...xs) - 0.1;
  const top = Math.min(...zs) - 0.1;
  const width = Math.max(...xs) - left + 0.1;
  const height = Math.max(...zs) - top + 0.1;
  return (
    <svg
      className="entrance-cabinet-plan"
      role="img"
      aria-label="门扇与柜体的平面布置。实线为展示位，虚线为合拢参考位，两条细线分别连到柜体最近点。"
      viewBox={[left, top, width, height].join(" ")}
    >
      <polygon
        points={footprint.map((p) => [p.x, p.z].join(",")).join(" ")}
        fill="#314550"
        stroke="#93a6b0"
        strokeWidth={0.013}
      />
      <text
        x={(footprint[0].x + footprint[2].x) / 2}
        y={(footprint[0].z + footprint[2].z) / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={0.14}
        fill="currentColor"
      >
        {entranceCabinet.name}
      </text>
      {[closed, displayed].map((pose) => (
        <g
          key={pose === closed ? "closed" : "displayed"}
          stroke={pose === closed ? "#a7bbc7" : "#82d6c9"}
          strokeDasharray={pose === closed ? "0.055 0.03" : undefined}
        >
          <line
            x1={hinge.x}
            y1={hinge.z}
            x2={pose.edge.x}
            y2={pose.edge.z}
            strokeWidth={0.035}
          />
          <line
            x1={pose.edge.x}
            y1={pose.edge.z}
            x2={pose.cabinet.x}
            y2={pose.cabinet.z}
            strokeWidth={0.013}
          />
          <circle
            cx={pose.edge.x}
            cy={pose.edge.z}
            r={0.028}
            fill="currentColor"
            stroke="none"
          />
        </g>
      ))}
    </svg>
  );
}

export function EntranceInspectionDetails({
  inspection,
  selectedId,
  onPreview,
  onLocate,
  ready,
  onHistory,
  onView,
  onSample,
}: {
  inspection: EntranceInspection;
  selectedId: string;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  ready: boolean;
  onHistory: (id: string) => void;
  onView: (view: EntranceView) => void;
  onSample: (index?: number) => void;
}) {
  if (inspection.view === "sweep")
    return (
      <EntranceSweepDetails
        sweep={inspection.sweep}
        selectedId={selectedId}
        ready={ready}
        onSample={onSample}
        onPreview={onPreview}
        onHistory={onHistory}
      />
    );
  if (inspection.view === "hinges") {
    const { joints, selected, spacing, diameter, length } = inspection.hinges;
    const joint = selected === null ? null : joints[selected];
    return (
      <section className="entrance-view-details" aria-label="入口布置核对">
        <strong>门轴与铰链 · 配置</strong>
        <label className="entrance-hinge-position">
          铰链位置
          <select
            value={selected ?? "all"}
            disabled={!ready}
            onChange={(event) =>
              onSample(
                event.target.value === "all"
                  ? undefined
                  : Number(event.target.value),
              )
            }
          >
            <option value="all">三处铰链总览</option>
            {joints.map(({ index, label }) => (
              <option key={index} value={index}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <dl>
          {joint ? (
            <>
              <div>
                <dt>中心标高</dt>
                <dd>{joint.center.y.toFixed(4)} m</dd>
              </div>
              <div>
                <dt>距洞口底边</dt>
                <dd>{joint.fromBottom.toFixed(3)} m</dd>
              </div>
            </>
          ) : (
            <>
              {joints.map(({ index, label, fromBottom }) => (
                <div key={index}>
                  <dt>{label}距洞口底边</dt>
                  <dd>{fromBottom.toFixed(3)} m</dd>
                </div>
              ))}
              <div>
                <dt>相邻中心距 · 自下而上</dt>
                <dd>
                  {spacing.map((distance) => distance.toFixed(3)).join(" / ")} m
                </dd>
              </div>
            </>
          )}
          <div>
            <dt>轴体直径 × 长</dt>
            <dd>
              Ø{Math.round(diameter * 1000)} × {Math.round(length * 1000)} mm
            </dd>
          </div>
        </dl>
        <small>
          铰链中心与门扇共用配置转轴。门框、铰链及当前门扇姿态为原创静态布置示意。
        </small>
        <div className="entrance-view-peer">
          <button
            disabled={!ready}
            onClick={() => {
              onPreview(entranceSettings.readerId);
              onView("jamb");
            }}
          >
            核对读卡器与洞口侧缘 ↗
          </button>
        </div>
      </section>
    );
  }
  if (inspection.view === "heads")
    return (
      <section className="entrance-view-details" aria-label="应急灯头朝向">
        <strong>双灯头布置 · 配置</strong>
        <dl>
          {inspection.heads.map(({ side, azimuth, tilt }) => (
            <div key={side}>
              <dt>{side < 0 ? "左灯头" : "右灯头"}</dt>
              <dd>
                {azimuth > 0 ? "+" : ""}
                {azimuth.toFixed(1)}° · 向下 {tilt.toFixed(1)}°
              </dd>
            </div>
          ))}
          <div>
            <dt>灯面中心间距</dt>
            <dd>{(inspection.spacing * 1000).toFixed(0)} mm</dd>
          </div>
        </dl>
        <small>
          偏角以机房 +Z 为基准，朝 +X
          为正。方向线沿灯面法线绘制。灯头为原创布置示意，照度与自检未接入。
        </small>
        <div className="entrance-view-peer">
          <button disabled={!ready} onClick={() => onView("lights")}>
            返回标志与应急灯
          </button>
        </div>
      </section>
    );
  const { view } = inspection;
  const peers = view === "cabinet" ? [] : entranceRelations(selectedId);
  return (
    <section className="entrance-view-details" aria-label="入口布置核对">
      <strong>
        {view === "cabinet"
          ? "门扇自由边与柜体投影"
          : view === "lintel"
            ? "出口标志与门楣"
            : view === "lights"
              ? "标志与应急灯"
              : inspection.jamb
                ? "读卡器与洞口侧缘"
                : view === "opening"
                  ? "洞口外缘"
                  : view === "access"
                    ? "相对机房地面的高度"
                    : "入口配置"}
      </strong>
      <dl>
        {view === "cabinet" ? (
          <>
            <div>
              <dt>
                展示位 ·{" "}
                {Math.round(
                  (Math.abs(entranceSettings.displayAngle) * 180) / Math.PI,
                )}
                °
              </dt>
              <dd>{inspection.cabinet.displayed.distance.toFixed(3)} m</dd>
            </div>
            <div>
              <dt>合拢参考位 · 0°</dt>
              <dd>{inspection.cabinet.closed.distance.toFixed(3)} m</dd>
            </div>
          </>
        ) : "measure" in inspection ? (
          <div>
            <dt>
              {view === "lintel" ? "标志下缘至门框上缘" : "两箱体中心水平间距"}
            </dt>
            <dd>{inspection.measure.toFixed(3)} m</dd>
          </div>
        ) : inspection.jamb ? (
          <>
            <div>
              <dt>读卡器中心至洞口{inspection.jamb.side}缘</dt>
              <dd>{inspection.jamb.distance.toFixed(3)} m</dd>
            </div>
            <div>
              <dt>读卡器中心高度</dt>
              <dd>{inspection.readerHeight.toFixed(3)} m</dd>
            </div>
          </>
        ) : view === "opening" ? (
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
      {inspection.jamb && (
        <small>
          间距沿机房 X
          方向量取，两端对应读卡器中心和洞口外缘。门状态和刷卡记录未接入。
        </small>
      )}
      {"measure" in inspection && (
        <small>
          按样板安装位置量取。标志面板和灯头均为静态示意，供电、照度及应急自检未接入。
        </small>
      )}
      {view === "lights" && (
        <div className="entrance-view-peer">
          <button disabled={!ready} onClick={() => onView("heads")}>
            核对双灯头朝向 ↗
          </button>
        </div>
      )}
      {(view === "all" || view === "opening" || inspection.jamb) && (
        <div className="entrance-view-peer">
          <button disabled={!ready} onClick={() => onView("hinges")}>
            核对门轴与铰链 ↗
          </button>
        </div>
      )}
      {view === "cabinet" && (
        <>
          <CabinetPlan placement={inspection.cabinet} />
          <small>
            从门板自由边的厚度中点量至柜体配置矩形。实线标出展示位及平面间距，虚线标出合拢参考位。现场通行净距待实测。
          </small>
          <div className="entrance-view-peer">
            <button disabled={!ready} onClick={() => onView("sweep")}>
              核对完整门扇扫掠 ↗
            </button>
          </div>
          <div className="entrance-view-peer">
            {selectedId !== entranceFixture.id && (
              <button
                disabled={!ready}
                onClick={() => onLocate(entranceFixture.id)}
              >
                定位机房入口门
              </button>
            )}
            {selectedId !== entranceCabinet.id && (
              <button
                disabled={!ready}
                onClick={() => onLocate(entranceCabinet.id)}
              >
                定位配电柜
              </button>
            )}
            <button
              disabled={!ready}
              onClick={() => onHistory(entranceCabinet.id)}
            >
              回看配电柜关联输入 ↗
            </button>
          </div>
        </>
      )}
      {peers.map((peer) => (
        <div key={peer.id} className="entrance-view-peer">
          <span>{peer.name}</span>
          <button
            aria-label={`预览${peer.name}`}
            onClick={() => onPreview(peer.id)}
          >
            预览
          </button>
          <button
            disabled={!ready}
            aria-label={`定位${peer.name}`}
            onClick={() => onLocate(peer.id)}
          >
            定位 ↗
          </button>
        </div>
      ))}
      {(inspection.jamb || "measure" in inspection) && (
        <details className="entrance-history">
          <summary>回看同机房环境探头</summary>
          <small>曲线来自各探头安装位置的模拟采样。</small>
          {environmentProbes.map(({ fixture }) => (
            <button
              key={fixture.id}
              disabled={!ready}
              onClick={() => onHistory(fixture.id)}
            >
              {fixture.name} · {fixture.location} ↗
            </button>
          ))}
        </details>
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
