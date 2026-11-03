import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { leakDetection } from "./leak-detection.ts";
import { traySightOffsets } from "./cable-trays.ts";

/** 布置对象独立于遥测目录，不能从模型存在推断测量或系统覆盖。 */
export const roomFixtures = definition.room.fixtures;
export type RoomFixture = (typeof roomFixtures)[number];
export const fixtureById = (id: string) =>
  roomFixtures.find((f) => f.id === id);
// 点状设施取中心；线状设施取端点、转折与段中点，避免只避让接头而挡住另一段。
const sightOffsets = new Map(
  roomFixtures.map((fixture) => {
    if (fixture.kind === "cable-tray")
      return [fixture.id, traySightOffsets(fixture.id)] as const;
    const path =
      fixture.id === leakDetection.cableId
        ? [...leakDetection.leadPoints, ...leakDetection.sensingPoints.slice(1)]
        : [fixture.position];
    const points = [
      ...path,
      ...path
        .slice(1)
        .map((p, i) => p.map((v, axis) => (v + path[i][axis]) / 2)),
    ];
    return [
      fixture.id,
      points.map((p) => p.map((v, axis) => v - fixture.position[axis])),
    ] as const;
  }),
);
export const fixtureSightOffsets = (id: string) => sightOffsets.get(id) ?? [];
/** 查看感应线时保留控制器的安装结构，避免引线端头悬空。 */
export const fixtureMountReference = (id: string) =>
  id === leakDetection.cableId ? leakDetection.controllerId : id;
export const fixtureBoundary = (fixture: RoomFixture) =>
  fixture.kind === "cable-tray"
    ? "仅表示桥架与柜排的空间对应；未配置实际线缆、桥架互连、强弱电分隔或承载能力，吊装锚固未校核。"
    : fixture.kind === "access"
      ? "仅登记读卡器位置；未接入刷卡记录、门状态或门锁控制。"
      : fixture.kind === "leak-controller" || fixture.kind === "leak-cable"
        ? "仅登记控制器、引线与感应线路径；未接入漏水信号，不表示探测覆盖或制冷单元已发生泄漏。"
        : fixture.kind === "smoke"
          ? "仅登记烟感位置；未定义探测覆盖、消防联动或独立告警。"
          : "仅登记环境探头位置；未定义温湿度测点、采样或覆盖，不生成露点。";
