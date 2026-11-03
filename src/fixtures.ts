import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

/** 布置对象独立于遥测目录，不能从模型存在推断测量或系统覆盖。 */
export const roomFixtures = definition.room.fixtures;
export type RoomFixture = (typeof roomFixtures)[number];
export const fixtureById = (id: string) =>
  roomFixtures.find((f) => f.id === id);
export const fixtureBoundary = (fixture: RoomFixture) =>
  fixture.kind === "access"
    ? "仅登记读卡器位置；未接入刷卡记录、门状态或门锁控制。"
    : fixture.kind === "smoke"
      ? "仅登记烟感位置；未定义探测覆盖、消防联动或独立告警。"
      : "仅登记环境探头位置；未定义温湿度测点、采样或覆盖，不生成露点。";
