import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { environmentProbe } from "./environment-monitoring.ts";

import { environmentRoundFor } from "./environment-rounds.ts";

export type FixtureSource = "all" | "simulated" | "layout";
const types: Partial<Record<string, { name: string; signal: string }>> = {
  environment: { name: "温湿度探头", signal: "环境温度、相对湿度" },
  "leak-controller": { name: "检漏", signal: "漏水信号未接入" },
  "leak-cable": { name: "检漏", signal: "漏水信号未接入" },
  smoke: { name: "烟感", signal: "烟感信号未接入" },
  access: { name: "门禁", signal: "刷卡记录与门状态未接入" },
};
/** 名单与布置图共用登记的点位，是否提供模拟读数由采样配置决定。 */
export const fixtureRoster = definition.room.fixtures.flatMap((fixture) => {
  const type = types[fixture.kind];
  if (!type) return [];
  const simulated = !!environmentProbe(fixture.id);
  return [
    {
      fixture,
      simulated,
      signal: type.signal,
      search: [
        fixture.id,
        fixture.name,
        fixture.location,
        environmentRoundFor(fixture.id)?.row.name ?? "",
        type.name,
        type.signal,
        simulated ? "模拟采样" : "仅布置",
      ]
        .join(" ")
        .toLowerCase(),
    },
  ];
});
export function fixtureRosterRows(source: FixtureSource, query: string) {
  const terms = query
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return fixtureRoster
    .filter(
      (row) =>
        (source === "all" || row.simulated === (source === "simulated")) &&
        terms.every((term) => row.search.includes(term)),
    )
    .sort((a, b) => Number(b.simulated) - Number(a.simulated));
}
