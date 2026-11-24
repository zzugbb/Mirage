import { Vector3 } from "three";
import {
  entranceFixture,
  entranceLeaf,
  entranceOpening,
  entranceSettings as s,
} from "./entrance.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

const sampleLabels = ["框深中线", "室内侧近缘", "室内框口"];
const defaultSample = sampleLabels.length - 1;

function leafIntervalAtZ(polygon: Vector3[], z: number) {
  const hits: number[] = [];
  for (const [index, start] of polygon.entries()) {
    const end = polygon[(index + 1) % polygon.length];
    if (Math.abs(start.z - z) < 1e-10) hits.push(start.x);
    // 跨越采样面时取线段内插值。重合边的端点已由上式纳入。
    if ((start.z - z) * (end.z - z) < 0)
      hits.push(
        start.x + ((end.x - start.x) * (z - start.z)) / (end.z - start.z),
      );
  }
  return hits.length ? [Math.min(...hits), Math.max(...hits)] : null;
}

/** 沿原门框的深度方向取水平截面，门板使用展示姿态下含厚度的外廓。 */
export function entranceFrameSectionInspection(sample?: number) {
  const { left: outerLeft, right: outerRight, bottom } = entranceOpening;
  const [fixtureX, , fixtureZ] = entranceFixture.position;
  const heightFromOpening = (s.hingeHeights[0] + s.hingeHeights[1]) / 2;
  const height = bottom + heightFromOpening;
  const roomFace = fixtureZ + s.frameDepth / 2;
  const rearFace = fixtureZ - s.frameDepth / 2;
  const frameLeft = outerLeft + s.frameWidth;
  const frameRight = outerRight - s.frameWidth;
  const up = new Vector3(0, 1, 0);
  const hinge = new Vector3(
    fixtureX + entranceLeaf.pivotX,
    height,
    fixtureZ + entranceLeaf.pivotZ,
  );
  const atLeaf = (x: number, z: number) =>
    new Vector3(x, 0, z).applyAxisAngle(up, s.displayAngle).add(hinge);
  const jamb = (min: number, max: number) => [
    new Vector3(min, height, rearFace),
    new Vector3(max, height, rearFace),
    new Vector3(max, height, roomFace),
    new Vector3(min, height, roomFace),
  ];
  const footprints = {
    leftJamb: jamb(outerLeft, frameLeft),
    rightJamb: jamb(frameRight, outerRight),
    leaf: [
      atLeaf(0, 0),
      atLeaf(entranceLeaf.width, 0),
      atLeaf(entranceLeaf.width, -s.leafThickness),
      atLeaf(0, -s.leafThickness),
    ],
  };
  const samples = [0, 3 / 8, 1 / 2].map((fraction, index) => {
    const z = fixtureZ + s.frameDepth * fraction;
    const interval = leafIntervalAtZ(footprints.leaf, z);
    const leafBlocks =
      interval && interval[0] <= frameRight && interval[1] > frameLeft;
    const leftX = leafBlocks ? Math.min(frameRight, interval[1]) : frameLeft;
    return {
      index,
      label: sampleLabels[index],
      depth: roomFace - z,
      z,
      width: frameRight - leftX,
      obstacle: leafBlocks ? ("leaf" as const) : ("jamb" as const),
      left: new Vector3(leftX, height, z),
      right: new Vector3(frameRight, height, z),
    };
  });
  const current = samples[sample ?? defaultSample] ?? samples[defaultSample];
  // 标注取左框靠墙的可见正面，截面量距仍使用框内缘。
  const leftJambSurface = new Vector3(
    frameLeft - s.frameWidth * 0.86,
    height,
    roomFace + 0.001,
  );
  const rightJambSurface = new Vector3(
    frameRight + s.frameWidth * 0.52,
    height,
    roomFace + 0.001,
  );
  const leafSurface = atLeaf(0.145, 0);
  const markers = [
    {
      id: "entrance-section-start",
      title: current.obstacle === "jamb" ? "左门框" : "门扇占位边",
      point: current.obstacle === "jamb" ? leftJambSurface : leafSurface,
    },
    { id: "entrance-section-end", title: "右门框", point: rightJambSurface },
  ];
  const ends = [current.left, current.right];
  const paths = [
    ends,
    ...ends.map((point) => [
      point.clone().setY(height - 0.033),
      point.clone().setY(height + 0.033),
    ]),
  ];
  const points = [
    leftJambSurface,
    rightJambSurface,
    leafSurface,
    ...samples.flatMap(({ left, right }) => [left, right]),
    new Vector3(frameLeft, height - 0.19, roomFace),
    new Vector3(frameRight, height + 0.19, roomFace),
  ];
  return {
    section: {
      selected: current.index,
      samples,
      current,
      height,
      heightFromOpening,
      frameWidth: frameRight - frameLeft,
      outerWidth: outerRight - outerLeft,
      angle: s.displayAngle,
      footprints,
    },
    paths,
    points,
    markers,
  };
}

export function entranceFrameSectionViewFrame(
  inspection: ReturnType<typeof entranceFrameSectionInspection>,
  width: number,
  height: number,
  rect: FrameRect,
) {
  // 从门扇右侧略向下观察，透过真实开口读取尺线，保留下沿控件空间。
  return observationFrame(
    inspection.points,
    new Vector3(0.71, 1.3, 1),
    width,
    height,
    {
      ...rect,
      left: Math.min(rect.left, 52),
      bottom: Math.min(rect.bottom, height - 105),
    },
    1.9,
    0.063,
  );
}
