import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { cableTraySettings, trayOuterWidth } from "./cable-trays.ts";

export const ceilingLights = definition.room.lights;
export type CeilingLight = (typeof ceilingLights)[number];
export const lightProfile = definition.room.lightProfile;
export const diffuserBottom =
  lightProfile.bodyCenterY -
  lightProfile.bodyHeight / 2 -
  lightProfile.diffuserHeight;
export const housingLength = (light: CeilingLight) =>
  light.length + lightProfile.endAllowance;

export function lightSightOffsets(light: CeilingLight) {
  const half = housingLength(light) / 2;
  return [
    [0, diffuserBottom, -half],
    [0, diffuserBottom, 0],
    [0, diffuserBottom, half],
    ...[-1, 1].map((side) => [
      0,
      definition.room.size[1] - light.position[1],
      side * (light.length / 2 - lightProfile.hangerInset),
    ]),
  ];
}

// 顶灯沿 Z、桥架沿 X，按各自水平投影求交。比较的是灯罩底面与桥架侧梁顶面。
export const lightTrayCrossings = ceilingLights.flatMap((light) =>
  definition.room.fixtures
    .filter((f) => f.kind === "cable-tray")
    .flatMap((tray) => {
      if (
        Math.abs(light.position[0] - tray.position[0]) >
          (cableTraySettings.length + lightProfile.bodyWidth) / 2 ||
        Math.abs(light.position[2] - tray.position[2]) >
          (housingLength(light) + trayOuterWidth) / 2
      )
        return [];
      const difference =
        light.position[1] +
        diffuserBottom -
        (tray.position[1] +
          cableTraySettings.railCenterY +
          cableTraySettings.railSize[1] / 2);
      return [{ light, tray, difference }];
    }),
);
export function lightTrayRelations(id: string) {
  return lightTrayCrossings
    .filter(({ light, tray }) => id === light.id || id === tray.id)
    .map(({ light, tray, difference }) => {
      const peer = light.id === id ? tray : light;
      return {
        id: peer.id,
        name: peer.name,
        relation: `灯罩底面比侧梁顶面${difference >= 0 ? "高" : "低"} ${Math.abs(difference).toFixed(2)} m`,
      };
    });
}
