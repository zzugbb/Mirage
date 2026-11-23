import * as THREE from "three";
import {
  condensate as c,
  condensateFloorY,
  outlet,
  mouth,
  elbow,
  sleeveStart,
  turn,
} from "../condensate.ts";

// 仅制作柜侧样板管道与地面承水件，开口之间保留可见间隔。
export function buildCondensate(root: THREE.Group, id: string) {
  const pipe = id === c.pipe.id;
  const material = new THREE.MeshStandardMaterial({
    color: pipe ? "#c6d2ce" : "#889ca4",
    metalness: pipe ? 0.25 : 0.58,
    roughness: 0.58,
    side: THREE.DoubleSide,
  });
  const add = (geometry: THREE.BufferGeometry, name: string) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  if (pipe) {
    const tube = (a: number[], b: number[], radius: number, name: string) => {
      const start = new THREE.Vector3().fromArray(a),
        end = new THREE.Vector3().fromArray(b);
      const axis = end.clone().sub(start);
      const mesh = add(
        new THREE.CylinderGeometry(radius, radius, axis.length(), 20, 1, true),
        name,
      );
      mesh.position.copy(start).lerp(end, 0.5).sub(root.position);
      mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        axis.normalize(),
      );
    };
    tube(sleeveStart, turn, c.pipeRadius, "condensate-side-pipe");
    const corner = add(
      new THREE.SphereGeometry(c.pipeRadius, 20, 12),
      "condensate-side-elbow",
    );
    corner.position.fromArray(turn).sub(root.position);
    tube(turn, elbow, c.pipeRadius, "condensate-run");
    add(new THREE.SphereGeometry(c.pipeRadius, 20, 12), "condensate-elbow");
    tube(elbow, mouth, c.pipeRadius, "condensate-downpipe");
    tube(
      outlet,
      [outlet[0] + 0.035, outlet[1], outlet[2]],
      c.pipeRadius * 1.45,
      "condensate-socket",
    );
    const lip = add(
      new THREE.RingGeometry(c.pipeRadius * 0.78, c.pipeRadius, 20),
      "condensate-mouth",
    );
    lip.rotation.x = Math.PI / 2;
    lip.position.fromArray(mouth).sub(root.position);
  } else {
    const base = condensateFloorY - c.rimHeight;
    // 旋转剖面同时生成外壁、口缘与内壁，斗口保持敞开。
    const profile = [
      [c.stemRadius * 1.55, base],
      [c.stemRadius * 1.55, base + 0.012],
      [c.stemRadius, base + 0.012],
      [c.stemRadius, -c.bowlDepth],
      [c.rimRadius, -0.009],
      [c.rimRadius, 0],
      [c.rimRadius - 0.006, 0],
      [c.rimRadius - 0.006, -0.008],
      [c.stemRadius - 0.005, -c.bowlDepth],
      [c.stemRadius - 0.005, base],
    ];
    add(
      new THREE.LatheGeometry(
        profile.map(([r, y]) => new THREE.Vector2(r, y)),
        32,
      ),
      "condensate-receiver",
    );
  }
}
