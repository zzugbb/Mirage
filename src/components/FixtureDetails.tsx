import type { RoomFixture } from "../fixtures";
import { fixtureBoundary } from "../fixtures";

export function FixtureDetails({
  fixture,
  analysis = false,
}: {
  fixture: RoomFixture;
  analysis?: boolean;
}) {
  return (
    <section className="fixture-details" aria-label="设施布置">
      <dl>
        <div>
          <dt>安装位置</dt>
          <dd>{fixture.location}</dd>
        </div>
        <div>
          <dt>中心高度</dt>
          <dd>
            {fixture.position[1].toFixed(2)} <small>m</small>
          </dd>
        </div>
        <div>
          <dt>对象编号</dt>
          <dd>{fixture.id}</dd>
        </div>
      </dl>
      <p>
        {analysis
          ? "此设施尚未接入数据，没有历史曲线或事件。共享时间仍可用于回看机房设备。"
          : fixtureBoundary(fixture)}
      </p>
      <small>位置与高度为场景配置示意</small>
    </section>
  );
}
