import { roomFixtures } from "./fixtures.ts";
/** 仅从已登记的烟感布置生成名单与中心间距，不推断探测覆盖。 */
export const smokeFixtures = roomFixtures.filter(
  (fixture) => fixture.kind === "smoke",
);
export const isSmokeFixture = (id: string) =>
  smokeFixtures.some((fixture) => fixture.id === id);
export function smokePlacement(origin: string) {
  const first = smokeFixtures.find((fixture) => fixture.id === origin);
  if (!first) return null;
  return smokeFixtures.map((fixture) => ({
    ...fixture,
    distance: Math.hypot(
      ...fixture.position.map((value, axis) => value - first.position[axis]),
    ),
  }));
}
