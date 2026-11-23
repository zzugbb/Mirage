import {
  condensateFixtures,
  condensate,
  mouth,
  elbow,
  outlet,
  turn,
} from "./condensate.ts";
import { racewaySections, racewaySightOffsets } from "./panel-raceway.ts";
import {
  floorGrilleRows,
  grilleRowSightOffsets,
  type FloorGrilleRow,
} from "./floor-grilles.ts";
import {
  ceilingLights,
  lightSightOffsets,
  type CeilingLight,
} from "./ceiling-lights.ts";
import { entranceSightOffsets } from "./entrance.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { leakDetection } from "./leak-detection.ts";
import { traySightOffsets } from "./cable-trays.ts";

/** 布置对象独立于遥测目录，不能从模型存在推断测量或系统覆盖。 */
export type RoomFixture =
  | (typeof definition.room.fixtures)[number]
  | CeilingLight
  | FloorGrilleRow
  | (typeof racewaySections)[number]
  | (typeof condensateFixtures)[number];
export const roomFixtures: RoomFixture[] = [
  ...definition.room.fixtures,
  ...ceilingLights,
  ...floorGrilleRows,
  ...racewaySections,
  ...condensateFixtures,
];
export const fixtureById = (id: string) =>
  roomFixtures.find((f) => f.id === id);
/** 两类设施共用空间定位，数据与详情仍由各自的定义提供。 */
export const roomFacilityById = (id: string) =>
  fixtureById(id) ??
  definition.facilities.find((facility) => facility.id === id);
// 点状设施取中心；线状设施取端点、转折与段中点，避免只避让接头而挡住另一段。
const sightOffsets = new Map(
  roomFixtures.map((fixture) => {
    if (fixture.id === condensate.pipe.id)
      return [
        fixture.id,
        [outlet, turn, elbow, mouth].map((p) =>
          p.map((n, axis) => n - elbow[axis]),
        ),
      ] as const;
    if ("axis" in fixture)
      return [
        fixture.id,
        [
          fixture.axis,
          [
            fixture.axis[0],
            definition.rendering.floor.surfaceY,
            fixture.axis[2],
          ],
        ].map((p) => p.map((n, i) => n - fixture.position[i])),
      ] as const;
    if ("sectionSize" in fixture)
      return [fixture.id, racewaySightOffsets(fixture)] as const;
    if ("span" in fixture)
      return [fixture.id, grilleRowSightOffsets(fixture)] as const;
    if ("length" in fixture)
      return [fixture.id, lightSightOffsets(fixture)] as const;
    if (fixture.kind === "entrance")
      return [fixture.id, entranceSightOffsets()] as const;
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
// 柜体取中心和八个靠近外缘的点，供各观察方向判断建筑遮挡。
for (const facility of definition.facilities) {
  const [w, h, d] = facility.size;
  const offsets = [[0, 0, 0]];
  for (const x of [-w, w])
    for (const y of [-h, h])
      for (const z of [-d, d]) offsets.push([x * 0.45, y * 0.45, z * 0.45]);
  sightOffsets.set(facility.id, offsets);
}
export const fixtureSightOffsets = (id: string) => sightOffsets.get(id) ?? [];
/** 查看感应线时保留控制器的安装结构，避免引线端头悬空。 */
export const fixtureMountReference = (id: string) =>
  id === leakDetection.cableId ? leakDetection.controllerId : id;
export const fixtureBoundary = (fixture: RoomFixture) =>
  fixture.kind === "emergency-light" || fixture.kind === "exit-sign"
    ? "门区标志、灯具与支座为原创安装示意。未接入供电、灯具自检、续航或照度数据，现场疏散条件待核实。"
    : fixture.kind.startsWith("condensate-")
      ? "制冷柜外形仅供安装参照，排水接口与接水斗为原创样板示意，实际管网与排水状态待核实。"
      : fixture.kind === "wall-raceway"
        ? "线槽与两处箱顶入口为原创安装示意。槽内线缆、占用量及现场施工路径待核实。"
        : fixture.kind === "patch-panel"
          ? "壁挂配线架孔位与跨架端接来自样板登记。现场跳线、走线路径及链路状态待核实，设备运行汇总仅供邻近机柜回看。"
          : fixture.kind === "floor-grille-row"
            ? "格栅排为静态布置。气流示意按柜排和最近格栅取代表落点，不代表独占供风范围；未建立地下风腔、实际风口、风量、阻力或工程开孔率，没有独立读数或告警。"
            : fixture.kind === "ceiling-light"
              ? "灯体和吊杆为布置示意。相交桥架按水平投影识别，高差只比较灯罩底面与桥架侧梁顶面。场景照明仅用于渲染，未接入开关、功率或照度读数。"
              : fixture.kind === "entrance"
                ? "门框、门扇与五金仅为静态布置示意；未接入门状态、门锁或门禁联动，洞口尺寸不代表通行净宽或疏散校核。"
                : fixture.kind === "cable-tray"
                  ? "桥架与下方柜排、上方顶灯均为布置关系。场景未配置实际线缆或桥架互连，强弱电分隔、承载能力与吊装锚固待校核。"
                  : fixture.kind === "access"
                    ? "仅登记读卡器位置；未接入刷卡记录、门状态或门锁控制。"
                    : fixture.kind === "leak-controller" ||
                        fixture.kind === "leak-cable"
                      ? "仅登记控制器、引线与感应线路径；未接入漏水信号，不表示探测覆盖或制冷单元已发生泄漏。"
                      : fixture.kind === "smoke"
                        ? "仅登记烟感位置；未定义探测覆盖、消防联动或独立告警。"
                        : "固定点位的温湿度演示；未接入真实数据，不代表设备进风或整间机房，不生成设施告警。";
