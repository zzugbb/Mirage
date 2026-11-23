import { Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  entranceFixture,
  entranceLeaf as leaf,
  entranceSettings as s,
} from "./entrance.ts";

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
