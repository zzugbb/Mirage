import { EntranceInspectionDetails } from "./EntranceViewActions";
import {
  entranceViewIncludes,
  type EntranceInspection,
} from "../entrance-view";
import type { ReactNode } from "react";
import { floorGrilleSettings, grilleRowRelations } from "../floor-grilles";
import { diffuserBottom, lightTrayRelations } from "../ceiling-lights";
import {
  entranceSettings,
  entranceOpening,
  entranceRelations,
} from "../entrance";
import type { RoomFixture } from "../fixtures";
import { fixtureBoundary } from "../fixtures";
import {
  cableTraySettings,
  trayRelations,
  trayEndpoints,
  trayOuterWidth,
  trayRungBottom,
} from "../cable-trays";
import {
  configuredPathLength,
  isLeakFixture,
  leakDetection,
  leakRelations,
} from "../leak-detection";

export function FixtureDetails({
  fixture,
  analysis = false,
  grilleRelations,
  onInspectEntrance,
  entranceInspection,
  onInspectLeak,
  leakViewActive = false,
  onCompare,
  onCompareRack,
  comparisonReady = false,
  onPreview,
  onLocate,
}: {
  fixture: RoomFixture;
  analysis?: boolean;
  grilleRelations?: ReactNode;
  onInspectEntrance?: () => void;
  entranceInspection?: EntranceInspection | null;
  onInspectLeak?: () => void;
  leakViewActive?: boolean;
  onCompare?: (id: string) => void;
  onCompareRack?: (id: string) => void;
  comparisonReady?: boolean;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
}) {
  if (entranceInspection && entranceViewIncludes(fixture.id)) {
    return (
      <EntranceInspectionDetails
        inspection={entranceInspection}
        selectedId={fixture.id}
        onPreview={onPreview}
        onLocate={onLocate}
      />
    );
  }
  const light = "length" in fixture ? fixture : null;
  const grilleRow = "span" in fixture ? fixture : null;
  const isEntrance = fixture.kind === "entrance";
  const isTray = fixture.kind === "cable-tray";
  const relations = grilleRow
    ? grilleRowRelations(fixture.id)
    : isTray
      ? trayRelations(fixture.id)
      : [...entranceRelations(fixture.id), ...leakRelations(fixture.id)];
  return (
    <section className="fixture-details" aria-label="设施布置">
      <dl>
        <div>
          <dt>安装位置</dt>
          <dd>{fixture.location}</dd>
        </div>
        <div>
          <dt>
            {grilleRow
              ? "面框顶高"
              : isEntrance
                ? "门洞底高"
                : isTray
                  ? "横档底高"
                  : light
                    ? "灯罩底高"
                    : fixture.kind === "leak-cable"
                      ? "敷设高度"
                      : "中心高度"}
          </dt>
          <dd>
            {(isEntrance
              ? entranceOpening.bottom
              : isTray
                ? trayRungBottom(fixture.position[1])
                : light
                  ? light.position[1] + diffuserBottom
                  : fixture.position[1]
            ).toFixed(fixture.kind === "leak-cable" ? 3 : 2)}{" "}
            <small>m</small>
          </dd>
        </div>
        {grilleRow && (
          <>
            <div>
              <dt>格栅数量</dt>
              <dd>{grilleRow.count} 处</dd>
            </div>
            <div>
              <dt>单处宽 × 深</dt>
              <dd>
                {floorGrilleSettings.width.toFixed(2)} ×{" "}
                {floorGrilleSettings.depth.toFixed(2)} <small>m</small>
              </dd>
            </div>
            <div>
              <dt>整排外缘跨度</dt>
              <dd>
                {grilleRow.span.toFixed(2)} <small>m</small>
              </dd>
            </div>
          </>
        )}
        {light && (
          <div>
            <dt>发光面长度</dt>
            <dd>
              {light.length.toFixed(2)} <small>m</small>
            </dd>
          </div>
        )}
        {isEntrance && (
          <>
            <div>
              <dt>洞口宽 × 高</dt>
              <dd>
                {entranceSettings.openingWidth.toFixed(2)} ×{" "}
                {entranceSettings.openingHeight.toFixed(2)} <small>m</small>
              </dd>
            </div>
            <div>
              <dt>展示姿态</dt>
              <dd>
                {Math.round(
                  (Math.abs(entranceSettings.displayAngle) * 180) / Math.PI,
                )}
                ° · 静态
              </dd>
            </div>
          </>
        )}
        {isTray && (
          <div>
            <dt>长度 × 外宽</dt>
            <dd>
              {cableTraySettings.length.toFixed(2)} ×{" "}
              {trayOuterWidth.toFixed(3)} <small>m</small>
            </dd>
          </div>
        )}
        <div>
          <dt>对象编号</dt>
          <dd>{fixture.id}</dd>
        </div>
        {isLeakFixture(fixture.id) && (
          <div>
            <dt>配置段长</dt>
            <dd>
              感应线{" "}
              {configuredPathLength(leakDetection.sensingPoints).toFixed(2)} m
              <br />
              引线 {configuredPathLength(leakDetection.leadPoints).toFixed(2)} m
            </dd>
          </div>
        )}
      </dl>
      {isTray && !analysis && (
        <details className="fixture-relations">
          <summary>
            端点配置 <span>2</span>
          </summary>
          <dl>
            {trayEndpoints(fixture.id).map((point, i) => (
              <div key={i}>
                <dt>{i ? "+X 端" : "−X 端"}</dt>
                <dd>{point.map((v) => v.toFixed(2)).join(" / ")} m</dd>
              </div>
            ))}
          </dl>
          <p>X / Y / Z 为机房坐标，端点未登记外部连接。</p>
        </details>
      )}
      {!analysis && entranceViewIncludes(fixture.id) && (
        <div className="entrance-view-entry">
          {onInspectEntrance ? (
            <button disabled={!comparisonReady} onClick={onInspectEntrance}>
              核对入口布置 ↗
            </button>
          ) : (
            <small>在机房总览中定位此设施后，可分段核对入口布置。</small>
          )}
        </div>
      )}
      {!analysis && isLeakFixture(fixture.id) && !leakViewActive && (
        <div className="leak-view-entry">
          {onInspectLeak ? (
            <button disabled={!comparisonReady} onClick={onInspectLeak}>
              核对检漏路径 ↗
            </button>
          ) : (
            <small>在机房总览中定位此设施后，可分段核对检漏路径。</small>
          )}
        </div>
      )}
      {!analysis &&
        (grilleRow && grilleRelations ? (
          grilleRelations
        ) : (
          <FixtureRelations
            title={grilleRow ? "对应柜排" : "布置关系"}
            relations={relations}
            onCompare={isTray ? onCompareRack : undefined}
            compareLabel="核对柜顶高差"
            comparisonReady={comparisonReady}
            onPreview={onPreview}
            onLocate={onLocate}
          />
        ))}
      {!analysis && (light || isTray) && (
        <FixtureRelations
          title={light ? "投影相交的桥架" : "投影相交的顶灯"}
          relations={lightTrayRelations(fixture.id)}
          onCompare={onCompare}
          comparisonReady={comparisonReady}
          onPreview={onPreview}
          onLocate={onLocate}
        />
      )}
      <p>
        {analysis
          ? fixture.dataStatus === "not-applicable"
            ? "此对象为静态结构布置，没有运行曲线或事件。共享时间仍可用于回看机房设备。"
            : "此设施尚未接入数据，没有历史曲线或事件。共享时间仍可用于回看机房设备。"
          : fixtureBoundary(fixture)}
      </p>
      <small>位置与高度为场景配置示意</small>
    </section>
  );
}

export function FixtureRelations({
  relations,
  title = "布置关系",
  onCompare,
  compareLabel = "核对交叉高度",
  comparisonReady = false,
  onPreview,
  onLocate,
}: {
  relations: { id: string; name: string; relation: string }[];
  title?: string;
  onCompare?: (id: string) => void;
  compareLabel?: string;
  comparisonReady?: boolean;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
}) {
  if (!relations.length) return null;
  return (
    <details className="fixture-relations">
      <summary>
        {title} <span>{relations.length}</span>
      </summary>
      {relations.map((relation) => (
        <div key={relation.id}>
          <button
            aria-label={`预览${relation.name}`}
            onClick={() => onPreview(relation.id)}
          >
            <strong>{relation.name}</strong>
            <small>{relation.relation}</small>
          </button>
          <button
            aria-label={`定位${relation.name}`}
            onClick={() => onLocate(relation.id)}
          >
            定位
          </button>
          {onCompare && (
            <button
              className="fixture-compare"
              disabled={!comparisonReady}
              aria-label={
                compareLabel === "核对交叉高度"
                  ? `核对与${relation.name}的交叉高度`
                  : `${compareLabel} · ${relation.name}`
              }
              onClick={() => onCompare(relation.id)}
            >
              {compareLabel} ↗
            </button>
          )}
        </div>
      ))}
    </details>
  );
}
