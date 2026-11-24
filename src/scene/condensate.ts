import * as THREE from "three";
import {
  condensate as c,
  condensateFloorY,
  condensateMouthInnerRadius,
  condensateReceiverProfile,
  condensateSocket,
  outlet,
  mouth,
  elbow,
  sleeveStart,
  turn,
  drainStands,
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
  const add = (
    geometry: THREE.BufferGeometry,
    name: string,
    surface = material,
  ) => {
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const stand = drainStands.find((item) => item.id === id);
  if (stand) {
    const { footSize, postWidth, clampThickness, clampWidth } = c.supports;
    const radius = c.pipeRadius + clampThickness;
    const half = clampWidth / 2;
    const profile = [
      [c.pipeRadius, -half],
      [radius, -half],
      [radius, half],
      [c.pipeRadius, half],
      [c.pipeRadius, -half],
    ];
    const clamp = add(
      new THREE.LatheGeometry(
        profile.map(([r, y]) => new THREE.Vector2(r, y)),
        32,
      ),
      "drain-stand-clamp",
    );
    clamp.position.y = stand.axis[1] - root.position.y;
    clamp.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -c.fall, c.run).normalize(),
    );
    const foot = add(
      new THREE.BoxGeometry(...(footSize as [number, number, number])),
      "drain-stand-foot",
    );
    foot.position.y = condensateFloorY + footSize[1] / 2 - root.position.y;
    // 立柱止于管夹下半壁内，不穿入管腔。
    const bottom = condensateFloorY + footSize[1];
    const top = stand.axis[1] - c.pipeRadius - clampThickness / 2;
    const post = add(
      new THREE.BoxGeometry(postWidth, top - bottom, postWidth),
      "drain-stand-post",
    );
    post.position.y = (top + bottom) / 2 - root.position.y;
    return;
  }
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
      [outlet[0] + condensateSocket.length, outlet[1], outlet[2]],
      condensateSocket.radius,
      "condensate-socket",
    );
    const lip = add(
      new THREE.RingGeometry(condensateMouthInnerRadius, c.pipeRadius, 20),
      "condensate-mouth",
    );
    lip.rotation.x = Math.PI / 2;
    lip.position.fromArray(mouth).sub(root.position);
  } else {
    const profile = condensateReceiverProfile.map(
      ([r, y]) => new THREE.Vector2(r, y),
    );
    add(new THREE.LatheGeometry(profile, 32), "condensate-receiver");
    // 保留 -X 的半圈。两个切面和原旋转轮廓共用坐标，在地面截止。
    const section = add(
      new THREE.LatheGeometry(profile, 16, Math.PI, Math.PI),
      "condensate-receiver-section",
    );
    const caps = [-1, 1].map(
      (sign) =>
        new THREE.Shape(
          profile.map(({ x, y }) => new THREE.Vector2(x * sign, y)),
        ),
    );
    const cut = add(
      new THREE.ShapeGeometry(caps).rotateY(-Math.PI / 2),
      "condensate-receiver-cut",
      new THREE.MeshStandardMaterial({
        color: "#c7b59a",
        roughness: 0.68,
        side: THREE.DoubleSide,
      }),
    );
    section.visible = cut.visible = false;
  }
}

export function showCondensateReceiverSection(
  fixtures: Map<string, THREE.Group>,
  opened: boolean,
) {
  const receiver = fixtures.get(c.receiver.id);
  if (!receiver) return;
  receiver.getObjectByName("condensate-receiver")!.visible = !opened;
  receiver.getObjectByName("condensate-receiver-section")!.visible = opened;
  receiver.getObjectByName("condensate-receiver-cut")!.visible = opened;
}
