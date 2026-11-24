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
export const lightHangerSides = [-1, 1] as const;
export type LightHangerSide = (typeof lightHangerSides)[number];

/** 吊点在灯具局部坐标中从灯壳顶面量至机房顶板参考面。 */
export function lightHangerAxis(light: CeilingLight, side: LightHangerSide) {
  const bottom = lightProfile.bodyCenterY + lightProfile.bodyHeight / 2;
  const top = definition.room.size[1] - light.position[1];
  return {
    top,
    bottom,
    z: side * (light.length / 2 - lightProfile.hangerInset),
    drop: top - bottom,
  };
}

/** 底座、接续座和吊杆沿同一局部坐标轴从顶板向下装配。 */
export function lightCeilingMount(light: CeilingLight, side: LightHangerSide) {
  const { top, bottom, z } = lightHangerAxis(light, side);
  const { plateSize, socketSize } = lightProfile.ceilingMount;
  const plateBottom = top - plateSize[1];
  const rodTop = plateBottom - socketSize[1];
  return {
    plate: {
      size: [...plateSize] as [number, number, number],
      position: [0, (plateBottom + top) / 2, z] as [number, number, number],
    },
    socket: {
      size: [...socketSize] as [number, number, number],
      position: [0, (rodTop + plateBottom) / 2, z] as [number, number, number],
    },
    rodTop,
    rodLength: rodTop - bottom,
  };
}

export function lightSightOffsets(light: CeilingLight) {
  const half = housingLength(light) / 2;
  return [
    [0, diffuserBottom, -half],
    [0, diffuserBottom, 0],
    [0, diffuserBottom, half],
    ...lightHangerSides.map((side) => {
      const { top, z } = lightHangerAxis(light, side);
      return [0, top, z];
    }),
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
