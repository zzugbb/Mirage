import {
  capacitySource,
  capacityStatus,
  inspectRackCapacity,
  type RackUnitRange,
} from "../rack-space";
import { spaceRangeLabel } from "../space-inspection";

export function RackCapacityDetails({ range }: { range: RackUnitRange }) {
  const result = inspectRackCapacity(range);
  if (!result) return null;
  return (
    <section className="rack-capacity-details" aria-label="U 位容量依据">
      <header>
        <h2>{spaceRangeLabel(range)}</h2>
        <strong data-capacity={result.available ? "available" : undefined}>
          {result.available ? "可分配" : "未满足可分配条件"}
        </strong>
      </header>
      <p className="rack-space-note">{capacitySource} · 仅核对 U 位配置</p>
      <dl>
        {result.segments.map((segment) => (
          <div key={segment.overlap.first} data-capacity={segment.status}>
            <dt>
              <span>{spaceRangeLabel(segment.overlap)}</span>
              <strong>{capacityStatus[segment.status]}</strong>
            </dt>
            <dd>
              {segment.status === "occupied" ? "设备安装登记 · " : ""}
              {segment.reason}
              {(segment.first !== segment.overlap.first ||
                segment.last !== segment.overlap.last) &&
                segment.status !== "unknown" && (
                  <span className="capacity-range-ref">
                    {" "}
                    · 登记 {spaceRangeLabel(segment)}
                  </span>
                )}
            </dd>
          </div>
        ))}
      </dl>
      <details className="rack-space-boundary">
        <summary>配置口径与现场资料</summary>
        <p>
          设备抽出仍占原位，后置 0U PDU 单独登记。前置盲板说明安装外观，容量以逐
          U 登记为依据。
        </p>
        <p>
          现场待核对的资料包括机柜安装台账、预留和禁用记录、导轨深度、净空、承重、供电与散热。
        </p>
      </details>
    </section>
  );
}
