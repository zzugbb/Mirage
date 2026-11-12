import { powerBudget, budgetRatio } from "./power-budget.ts";
import { powerDeviceIds } from "./power-config.ts";
import { sourceMetrics } from "./reading-sources.ts";
import { deviceById } from "./installation.ts";
import { deviceObservation } from "./device-data.ts";
import { normalizeTime } from "./simulation.ts";
import { qualityNames } from "./status.ts";

export const emptyBudgetReview = { open: false, origin: null as number | null };
export type BudgetReview = typeof emptyBudgetReview;
export function budgetSnapshot(sourceId: string, time: number) {
  if (!sourceMetrics(sourceId).includes("power")) return null;
  const at = normalizeTime(time);
  const rows = powerDeviceIds(sourceId).map((id) => {
    const device = deviceById(id)!,
      observation = deviceObservation(at, id);
    const included =
      observation.quality === "valid" &&
      observation.power !== null &&
      Number.isFinite(observation.power);
    return {
      id,
      name: device.name,
      included,
      value: included ? observation.power : null,
      budget:
        budgetRatio(0, device.budgetWatts) === null ? null : device.budgetWatts,
      reason: included ? "已计入" : qualityNames[observation.quality],
    };
  });
  return { time: at, rows, budget: powerBudget(rows) };
}
type Snapshot = NonNullable<ReturnType<typeof budgetSnapshot>>;
export type BudgetChange = {
  time: number;
  before: Snapshot | null;
  after: Snapshot;
  changed: { id: string; name: string; before: string; after: string }[];
};
/** 负载数值变化不另造口径事件；同一范围始终按设备去重。 */
export function budgetProcess(sourceId: string, time: number) {
  const end = normalizeTime(time),
    initial = budgetSnapshot(sourceId, 0);
  if (!initial) return null;
  const events: BudgetChange[] = [
    { time: 0, before: null, after: initial, changed: [] },
  ];
  let previous = initial;
  for (let at = 1; at <= end; at++) {
    const after = budgetSnapshot(sourceId, at)!;
    const changed = after.rows.flatMap((row, i) =>
      row.included !== previous.rows[i].included ||
      row.reason !== previous.rows[i].reason ||
      row.budget !== previous.rows[i].budget
        ? [
            {
              id: row.id,
              name: row.name,
              before: previous.rows[i].reason,
              after: row.reason,
            },
          ]
        : [],
    );
    if (changed.length)
      events.push({ time: at, before: previous, after, changed });
    previous = after;
  }
  return events;
}
