import { Vector3 } from "three";
import { cableTraySettings, trayCeilingMount } from "./cable-trays.ts";

/** 样板顶板安装座近景，尺寸线沿吊杆轴向取值。 */
export function trayMountGeometry(
  trayPosition: number[],
  station: number,
  side: -1 | 1,
) {
  const [trayX, trayY, trayZ] = trayPosition;
  const { rodOffsetZ, rodSize, rodTopY: localRodTop } = cableTraySettings;
  const assembly = trayCeilingMount(trayY, station, side);
  const { plate, neck } = assembly;
  const x = trayX + station;
  const z = trayZ + side * rodOffsetZ;
  const rodTopY = trayY + localRodTop;
  const ceilingY = trayY + plate.position[1] + plate.size[1] / 2;
  const direction = new Vector3(x > 0 ? -0.28 : 0.28, -0.28, side);
  const point = (y: number, dx = 0, dz = 0) =>
    new Vector3(x + dx, y, z + side * dz);
  const markers = [
    {
      id: "tray-mount-plate",
      title: "顶板底座",
      point: point(trayY + plate.position[1], 0, plate.size[2] / 2),
    },
    {
      id: "tray-mount-neck",
      title: "接续座",
      point: point(trayY + neck.position[1], 0, neck.size[2] / 2),
    },
    {
      id: "tray-mount-rod",
      title: "吊杆上端",
      point: point(rodTopY - 0.047, 0, rodSize / 2),
    },
  ];
  const rulerX = direction.x < 0 ? -0.069 : 0.069;
  const rulerDepth = plate.size[2] / 2 + 0.013;
  const sizeLine = [rodTopY, ceilingY].map((y) => point(y, rulerX, rulerDepth));
  const ceilingOutline = [
    [-0.082, -0.061],
    [0.082, -0.061],
    [0.082, 0.061],
    [-0.082, 0.061],
  ].map(([dx, dz]) => point(ceilingY, dx, dz));
  const ceilingDashes = ceilingOutline.flatMap((start, i) => {
    const end = ceilingOutline[(i + 1) % ceilingOutline.length];
    const count = Math.ceil(start.distanceTo(end) / 0.028);
    return Array.from({ length: count }, (_, step) => [
      start.clone().lerp(end, step / count),
      start.clone().lerp(end, (step + 0.62) / count),
    ]);
  });
  const paths = [
    sizeLine,
    ...sizeLine.map((end) => [
      point(end.y, rulerX - 0.009, rulerDepth),
      point(end.y, rulerX + 0.009, rulerDepth),
    ]),
    [point(rodTopY, 0, neck.size[2] / 2), sizeLine[0]],
    ...ceilingDashes,
  ];
  return {
    ceilingY,
    rodTopY,
    mountHeight: ceilingY - rodTopY,
    plateSize: plate.size,
    neckHeight: neck.size[1],
    assembly,
    paths,
    markers,
    framePoints: [
      ...paths.flat(),
      ...markers.map(({ point }) => point),
      point(rodTopY - 0.115),
    ],
    direction,
  };
}
