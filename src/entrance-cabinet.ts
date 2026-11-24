import { Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  entranceFixture,
  entranceLeaf as leaf,
  entranceOpening,
  entranceSettings as s,
} from "./entrance.ts";
import { planarRectangleGap } from "./planar-gap.ts";

export const entranceCabinet = definition.facilities.find(
  (f) => f.id === definition.installation.powerDistribution.sourceId,
)!;

/** 自由边取门板厚度中点，柜体按配置矩形量取，两种姿态共用铰轴。 */
export function entranceCabinetPlacement() {
  const [cx, cy, cz] = entranceCabinet.position;
  const [w, h, d] = entranceCabinet.size;
  const pivot = new Vector3()
    .fromArray(entranceFixture.position)
    .add(new Vector3(leaf.pivotX, 0, leaf.pivotZ));
  const topY = entranceFixture.position[1] + leaf.bottom + leaf.height;
  const cabTop = cy + h / 2;
  const plane = entranceFixture.position[1] + s.openingHeight / 2 + 0.025;
  const at = (x: number, z: number, angle: number) =>
    new Vector3(x, 0, z)
      .applyAxisAngle(new Vector3(0, 1, 0), angle)
      .add(pivot)
      .setY(plane);
  const position = (angle: number) => {
    const edge = at(leaf.width, -s.leafThickness / 2, angle);
    const cabinet = new Vector3(
      Math.max(cx - w / 2, Math.min(cx + w / 2, edge.x)),
      plane,
      Math.max(cz - d / 2, Math.min(cz + d / 2, edge.z)),
    );
    return { edge, cabinet, distance: edge.distanceTo(cabinet) };
  };
  const displayed = position(s.displayAngle),
    closed = position(0);
  const face = [
    at(0, 0, s.displayAngle),
    at(leaf.width, 0, s.displayAngle),
    at(leaf.width, -s.leafThickness, s.displayAngle),
    at(0, -s.leafThickness, s.displayAngle),
  ];
  const box = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(
    ([sx, sz]) =>
      new Vector3(cx + (sx * w) / 2, cabTop + 0.012, cz + (sz * d) / 2),
  );
  const from = at(0, -s.leafThickness / 2, 0);
  const dashes = Array.from({ length: 10 }, (_, i) => [
    from.clone().lerp(closed.edge, i / 10),
    from.clone().lerp(closed.edge, (i + 0.6) / 10),
  ]);
  const paths = [
    [...face, face[0]],
    [...box, box[0]],
    ...dashes,
    [
      displayed.edge,
      displayed.cabinet,
      displayed.cabinet.clone().setY(cabTop + 0.012),
    ],
  ];
  const markers = [
    {
      id: "entrance-leaf-edge",
      title: "门扇自由边",
      point: displayed.edge.clone().setY(topY),
    },
    {
      id: "entrance-cabinet",
      title: entranceCabinet.name,
      point: new Vector3(cx, cabTop + 0.012, cz),
    },
  ];
  return {
    displayed,
    closed,
    hinge: from,
    footprint: box,
    paths,
    markers,
    points: [
      ...face,
      ...box,
      closed.edge,
      ...markers.map((m) => m.point),
      displayed.cabinet,
    ],
  };
}

/** 门板矩形按铰轴取不超过 1° 的等角样本。量距只使用 X/Z 外廓。 */
export function entranceCabinetSweep(sample?: number) {
  const [cx, cy, cz] = entranceCabinet.position;
  const [w, h, d] = entranceCabinet.size;
  const plane = cy + h / 2 + 0.018;
  // 扫掠轮廓抬到门框上方；合拢参考位也能看清门板厚度。
  const top = entranceOpening.top + 0.018;
  const hinge = new Vector3(
    entranceFixture.position[0] + leaf.pivotX,
    plane,
    entranceFixture.position[2] + leaf.pivotZ,
  );
  const up = new Vector3(0, 1, 0);
  const at = (x: number, z: number, angle: number) =>
    new Vector3(x, 0, z).applyAxisAngle(up, angle).add(hinge);
  const footprint: [Vector3, Vector3, Vector3, Vector3] = [
    new Vector3(cx - w / 2, plane, cz - d / 2),
    new Vector3(cx + w / 2, plane, cz - d / 2),
    new Vector3(cx + w / 2, plane, cz + d / 2),
    new Vector3(cx - w / 2, plane, cz + d / 2),
  ];
  const intervals = Math.max(
    1,
    Math.ceil(Math.abs(s.displayAngle) / (Math.PI / 180)),
  );
  const poses = Array.from({ length: intervals + 1 }, (_, index) => {
    const angle = (index * s.displayAngle) / intervals;
    const panel: [Vector3, Vector3, Vector3, Vector3] = [
      at(0, 0, angle),
      at(leaf.width, 0, angle),
      at(leaf.width, -s.leafThickness, angle),
      at(0, -s.leafThickness, angle),
    ];
    const { from, to, distance } = planarRectangleGap(panel, footprint);
    return {
      index,
      angle,
      deg: (Math.abs(angle) * 180) / Math.PI,
      distance,
      leaf: panel,
      doorPoint: new Vector3(from.x, plane, from.z),
      cabinetPoint: new Vector3(to.x, plane, to.z),
    };
  });
  const minimum = poses.reduce((best, pose) =>
    pose.distance < best.distance ? pose : best,
  );
  const index =
    sample !== undefined && Number.isFinite(sample)
      ? Math.max(0, Math.min(intervals, Math.round(sample)))
      : minimum.index;
  const pose = poses[index],
    closed = poses[0],
    displayed = poses[intervals];
  const arc = poses.map((item) => item.leaf[2].clone().setY(top));
  const wholeOutline = poses.flatMap((item) =>
    item.leaf.map((point) => point.clone().setY(top)),
  );
  const outline = pose.leaf.map((point) => point.clone().setY(top));
  const delta = pose.cabinetPoint.clone().sub(pose.doorPoint);
  const tick = new Vector3(delta.z, 0, -delta.x)
    .normalize()
    .multiplyScalar(0.044);
  const ends = [pose.doorPoint, pose.cabinetPoint];
  const paths = [
    [...outline, outline[0]],
    [...footprint, footprint[0]],
    ...arc.flatMap((point, i) =>
      i % 3 === 0 && i + 2 < arc.length
        ? [[point, arc[i + 1], arc[i + 2]]]
        : [],
    ),
    ends,
    ...ends.map((point) => [point.clone().sub(tick), point.clone().add(tick)]),
  ];
  const markers = [
    {
      id: "entrance-sweep-door",
      title: entranceFixture.name,
      point: at(leaf.width * 0.74, 0.008, pose.angle).setY(
        entranceFixture.position[1] + leaf.bottom + leaf.height * 0.81,
      ),
    },
    {
      id: "entrance-sweep-cabinet",
      title: entranceCabinet.name,
      point: new Vector3(cx, plane, cz),
    },
  ];
  return {
    sweep: {
      index,
      count: poses.length,
      pose,
      minimum,
      closed,
      displayed,
      footprint,
      arc,
    },
    paths,
    markers,
    points: [...wholeOutline, ...footprint],
  };
}
