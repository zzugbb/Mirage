import * as THREE from "three";
import { leakDetection } from "../leak-detection.ts";

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
  const points = leakDetection.sensingPoints;
  for (const [name, point, next] of [
    ["leak-coupling", points[0], points[1]],
    ["leak-termination", points.at(-1)!, points.at(-2)!],
  ] as const) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.05, 10),
      new THREE.MeshStandardMaterial({ color: "#36434c", roughness: 0.7 }),
    );
    cap.name = name;
    cap.position.copy(local(point));
    cap.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      local(next).sub(local(point)).normalize(),
    );
    root.add(cap);
  }
}
