import { environmentProbes } from "../environment-monitoring";
import { entranceSettings, entranceRelations } from "../entrance";

import type { EntranceInspection } from "../entrance-view";

export function EntranceInspectionDetails({
  inspection,
  selectedId,
  onPreview,
  onLocate,
  ready,
  onProbeHistory,
}: {
  inspection: EntranceInspection;
  selectedId: string;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  ready: boolean;
  onProbeHistory: (id: string) => void;
}) {
  const [peer] = entranceRelations(selectedId);
  const { view } = inspection;
  return (
    <section className="entrance-view-details" aria-label="入口布置核对">
      <strong>
        {inspection.jamb
          ? "读卡器与洞口侧缘"
          : view === "opening"
            ? "洞口外缘"
            : view === "access"
              ? "相对机房地面的高度"
              : "入口配置"}
      </strong>
      <dl>
        {inspection.jamb ? (
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
            disabled={!ready}
            aria-label={`定位${peer.name}`}
            onClick={() => onLocate(peer.id)}
          >
            定位 ↗
          </button>
        </div>
      )}
      {inspection.jamb && (
        <details className="entrance-history">
          <summary>回看同机房环境探头</summary>
          <small>曲线来自各探头安装位置的模拟采样。</small>
          {environmentProbes.map(({ fixture }) => (
            <button
              key={fixture.id}
              disabled={!ready}
              onClick={() => onProbeHistory(fixture.id)}
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
