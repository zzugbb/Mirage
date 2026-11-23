import { unitLabel } from "./catalog.ts";
import { devices, rackForDevice } from "./installation.ts";
import { pdus, powerLinks } from "./power-config.ts";

import { deviceSourceRows, sourceValue } from "./reading-sources.ts";
import type { SpatialReading } from "./spatial.ts";

type Membership = "first" | "both" | "second";
export type FeederSelection = {
  first: string;
  second: string;
  group: Membership | "all";
  query: string;
};

export const initialFeeders = (): FeederSelection => ({
  first: pdus[0].id,
  second: "",
  group: "all",
  query: "",
});

/** 两条逻辑出线按设备求并集，仍保留每一个可追溯的插座和输入。 */
export function feederConnections(selection: FeederSelection) {
  const { first, second, group, query } = selection;
  const selected = [first, second].filter(Boolean);
  const rows = devices
    .flatMap((device) => {
      const links = powerLinks
        .filter(
          (link) =>
            link.deviceId === device.id && selected.includes(link.pduId),
        )
        .sort((a, b) => selected.indexOf(a.pduId) - selected.indexOf(b.pduId));
      if (!links.length) return [];
      const hasFirst = links.some((link) => link.pduId === first);
      const hasSecond =
        first !== second && links.some((link) => link.pduId === second);
      const membership: Membership =
        hasFirst && hasSecond ? "both" : hasFirst ? "first" : "second";
      return [
        {
          device,
          rack: rackForDevice(device.id),
          units: unitLabel(device.id),
          links,
          membership,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.rack.name.localeCompare(b.rack.name) ||
        b.device.startUnit - a.device.startUnit,
    );
  const counts = { first: 0, both: 0, second: 0 };
  for (const row of rows) counts[row.membership]++;
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const members = rows.filter(
    (row) => group === "all" || row.membership === group,
  );
  const matching = members.filter((row) =>
    terms.every((term) =>
      (row.rack.name + " " + row.device.name).toLowerCase().includes(term),
    ),
  );
  return {
    counts,
    devices: rows.length,
    inputs: rows.reduce((n, row) => n + row.links.length, 0),
    members,
    matching,
  };
}

/** 查找只筛名单。按关联范围累计有效整机输入，一个设备的两条接线只计一次。 */
export function feederInputSummary(
  members: ReturnType<typeof feederConnections>["members"],
  readings: Map<string, SpatialReading>,
) {
  const rows = deviceSourceRows(
    members.map((row) => row.device.id),
    "power",
    readings,
  );
  const included = rows.filter((row) => row.included);
  return {
    byDevice: new Map(rows.map((row) => [row.id, row])),
    total: included.length
      ? included.reduce((sum, row) => sum + row.value!, 0)
      : null,
    coverage: included.length,
    count: rows.length,
    zeros: included.filter((row) => row.value === 0).length,
  };
}

export function feederInputText(
  row: ReturnType<typeof deviceSourceRows>[number],
) {
  if (row.value === null) return row.reason;
  return (
    sourceValue(row.value, "power") + (row.value === 0 ? " · 有效零值" : "")
  );
}
