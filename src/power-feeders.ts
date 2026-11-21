import { unitLabel } from "./catalog.ts";
import { devices, rackForDevice } from "./installation.ts";
import { pdus, powerLinks } from "./power-config.ts";

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
  const matching = rows.filter(
    (row) =>
      (group === "all" || row.membership === group) &&
      terms.every((term) =>
        (row.rack.name + " " + row.device.name).toLowerCase().includes(term),
      ),
  );
  return {
    counts,
    devices: rows.length,
    inputs: rows.reduce((n, row) => n + row.links.length, 0),
    matching,
  };
}
