import type { RoomFixture } from "../fixtures";
import { fixtureBoundary } from "../fixtures";
import {
  configuredPathLength,
  isLeakFixture,
  leakDetection,
  leakRelations,
} from "../leak-detection";

export function FixtureDetails({
  fixture,
  analysis = false,
  onPreview,
  onLocate,
}: {
  fixture: RoomFixture;
  analysis?: boolean;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
}) {
  const relations = leakRelations(fixture.id);
  return (
    <section className="fixture-details" aria-label="设施布置">
      <dl>
        <div>
          <dt>安装位置</dt>
          <dd>{fixture.location}</dd>
        </div>
        <div>
          <dt>{fixture.kind === "leak-cable" ? "敷设高度" : "中心高度"}</dt>
          <dd>
            {fixture.position[1].toFixed(fixture.kind === "leak-cable" ? 3 : 2)}{" "}
            <small>m</small>
          </dd>
        </div>
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
      {relations.length > 0 && !analysis && (
        <details className="fixture-relations">
          <summary>
            布置关系 <span>{relations.length}</span>
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
            </div>
          ))}
        </details>
      )}
      <p>
        {analysis
          ? "此设施尚未接入数据，没有历史曲线或事件。共享时间仍可用于回看机房设备。"
          : fixtureBoundary(fixture)}
      </p>
      <small>位置与高度为场景配置示意</small>
    </section>
  );
}
