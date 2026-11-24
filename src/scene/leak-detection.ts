import * as THREE from "three";
import { leakDetection } from "../leak-detection.ts";
import {
  leakFitting,
  leakFittingChoices,
  leakFittingShells,
  type LeakFitting,
  type LeakFittingId,
} from "../leak-fittings.ts";

/** 无动画、无状态灯；引线与感应线以不同实体材质区分，保留真实遮挡。 */
export function buildLeakCable(root: THREE.Group) {
  const origin = root.position;
  const local = (point: number[]) =>
    new THREE.Vector3().fromArray(point).sub(origin);
  const paths = [
    {
      name: "leak-lead",
      points: leakDetection.leadPoints,
      radius: leakDetection.leadRadius,
      color: leakDetection.leadColor,
    },
    {
      name: "leak-sensing",
      points: leakDetection.sensingPoints,
      radius: leakDetection.sensingRadius,
      color: leakDetection.sensingColor,
    },
  ];
  for (const path of paths) {
    const group = new THREE.Group();
    group.name = path.name;
    root.add(group);
    const material = new THREE.MeshStandardMaterial({
      color: path.color,
      roughness: 0.85,
      metalness: 0.05,
    });
    for (let i = 1; i < path.points.length; i++) {
      const curve = new THREE.LineCurve3(
        local(path.points[i - 1]),
        local(path.points[i]),
      );
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 1, path.radius, 8, false),
        material,
      );
      mesh.name = path.name + "-segment";
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    }
    for (const point of path.points.slice(1, -1)) {
      const joint = new THREE.Mesh(
        new THREE.SphereGeometry(path.radius, 8, 6),
        material,
      );
      joint.position.copy(local(point));
      group.add(joint);
    }
  }
  buildLeakFitting(root, "joint");
  buildLeakFitting(root, "end");
}

/** 原创空腔套壳。剖切只移开前半壳，保留后半壳、线段与封塞。 */
export function buildLeakFitting(root: THREE.Group, id: LeakFittingId) {
  const fitting = leakFitting(id);
  const { length, diameter, wallThickness, center, axis, radial, plug } =
    fitting;
  const name = leakFittingShells[id];
  const assembly = new THREE.Group();
  assembly.name = name;
  assembly.position.copy(center).sub(root.position);
  assembly.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(radial, axis.clone().cross(radial), axis),
  );
  root.add(assembly);
  for (const [half, offset, color] of [
    ["front", -Math.PI / 2, "#637c8c"],
    ["back", Math.PI / 2, "#445964"],
  ] as const) {
    const shape = new THREE.Shape();
    const segments = 18;
    const edge = (radius: number, i: number) => {
      const a = offset + (i * Math.PI) / segments;
      return [radius * Math.cos(a), radius * Math.sin(a)] as const;
    };
    shape.moveTo(...edge(diameter / 2, 0));
    for (let i = 1; i <= segments; i++) shape.lineTo(...edge(diameter / 2, i));
    for (let i = segments; i >= 0; i--)
      shape.lineTo(...edge(diameter / 2 - wallThickness, i));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false,
    });
    geometry.translate(0, 0, -length / 2);
    const shell = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, roughness: 0.65 }),
    );
    shell.name = `${name}-${half}`;
    shell.castShadow = shell.receiveShadow = true;
    assembly.add(shell);
  }
  if (plug) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(plug.radius, plug.radius, plug.length, 18),
      new THREE.MeshStandardMaterial({ color: "#9b8266", roughness: 0.78 }),
    );
    mesh.name = "leak-termination-plug";
    mesh.position.z = plug.center.clone().sub(center).dot(axis);
    mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = mesh.receiveShadow = true;
    assembly.add(mesh);
  }
}

export function showLeakFitting(
  fixtures: Map<string, THREE.Group>,
  selected?: LeakFitting | null,
) {
  for (const { id } of leakFittingChoices) {
    const fixture = fixtures.get(
      id === "controller" ? leakDetection.controllerId : leakDetection.cableId,
    );
    const front = fixture?.getObjectByName(`${leakFittingShells[id]}-front`);
    if (front) front.visible = !(selected?.id === id && selected.opened);
  }
}
