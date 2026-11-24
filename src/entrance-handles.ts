import { Vector3 } from "three";
import {
  entranceFixture,
  entranceHandles,
  entranceLeaf,
  entranceOpening,
  entranceSettings as s,
} from "./entrance.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

const up = new Vector3(0, 1, 0);
const hinge = new Vector3()
  .fromArray(entranceFixture.position)
  .add(new Vector3(entranceLeaf.pivotX, 0, entranceLeaf.pivotZ));
const atLeaf = (x: number, y: number, z: number) =>
  new Vector3(x, y, z).applyAxisAngle(up, s.displayAngle).add(hinge);

/** 门扇展示位下，沿所选门面的法向量取握杆外缘。 */
export function entranceHandleInspection(sample?: number) {
  const { index, side, faceZ, parts } =
    entranceHandles[sample ?? 0] ?? entranceHandles[0];
  const { bar, plate, stem } = parts;
  const [barX, barY, barZ] = bar.position;
  const [plateX, plateY, plateZ] = plate.position;
  const outerBarZ = barZ + (side * bar.size[2]) / 2;
  const outerPlateZ = plateZ + (side * plate.size[2]) / 2;
  const barTop = barY + bar.size[1] / 2;
  const rulerY = barTop + 0.037;
  const ends = [atLeaf(barX, rulerY, faceZ), atLeaf(barX, rulerY, outerBarZ)];
  const paths = [
    ends,
    [atLeaf(barX, barTop, outerBarZ), ends[1]],
    [atLeaf(barX, barTop, faceZ), ends[0]],
    ...[faceZ, outerBarZ].map((z) => [
      atLeaf(barX, rulerY - 0.008, z),
      atLeaf(barX, rulerY + 0.008, z),
    ]),
  ];
  const markers = [
    {
      id: "entrance-handle-bar",
      title: "把手握杆",
      point: atLeaf(barX, barY, outerBarZ),
    },
    {
      id: "entrance-handle-plate",
      title: "把手底板",
      point: atLeaf(plateX, plateY - plate.size[1] * 0.32, outerPlateZ),
    },
  ];
  const points = [
    ...paths.flat(),
    ...markers.map(({ point }) => point),
    atLeaf(barX - bar.size[0] / 2, barY, outerBarZ),
    atLeaf(plateX + plate.size[0] / 2, plateY + plate.size[1] / 2, outerPlateZ),
    atLeaf(plateX + plate.size[0] / 2, plateY - plate.size[1] / 2, outerPlateZ),
  ];
  return {
    handles: {
      selected: index,
      sides: entranceHandles.map(({ index, label }) => ({ index, label })),
      heightFromOpening: hinge.y + stem.position[1] - entranceOpening.bottom,
      faceToBar: Math.abs(outerBarZ - faceZ),
      barLength: bar.size[0],
      plateSize: plate.size,
      stemDepth: stem.size[2],
    },
    paths,
    markers,
    points,
  };
}

export function entranceHandleViewFrame(
  inspection: ReturnType<typeof entranceHandleInspection>,
  width: number,
  height: number,
  rect: FrameRect,
) {
  const { side } = entranceHandles[inspection.handles.selected];
  // 从门扇自由边一侧斜看，能读出外伸尺线并避开后墙与配电柜。
  const direction = new Vector3(0.62, 0.26, side).applyAxisAngle(
    up,
    s.displayAngle,
  );
  return observationFrame(
    inspection.points,
    direction,
    width,
    height,
    {
      ...rect,
      left: Math.min(rect.left, 52),
      bottom: Math.min(rect.bottom, height - 105),
    },
    0.64,
    0.045,
  );
}
