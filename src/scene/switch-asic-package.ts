import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";
import type { Box } from "./equipment-model.ts";

const layout = definition.switchAssembly.packageInterface;
export const asicContactHeight = 2 * (layout.mask + layout.land) + layout.joint;

export function switchPackageLid(
  carrier: THREE.Group,
  w: number,
  d: number,
  seat: number,
  height: number,
  box: Box,
) {
  const lid = new THREE.Group();
  lid.name = "asic-lid";
  carrier.add(lid);
  const roof = height * 0.32,
    wall = w * 0.052;
  const depth = height - roof;
  const cover = box(
    lid,
    [w, roof, d],
    [0, seat + height - roof / 2, 0],
    "#707c84",
    0.65,
  );
  cover.name = "asic-package";
  for (const sign of [-1, 1]) {
    box(
      lid,
      [w, depth, wall],
      [0, seat + depth / 2, (sign * (d - wall)) / 2],
      "#717e87",
      0.6,
    );
    box(
      lid,
      [wall, depth, d - 2 * wall],
      [(sign * (w - wall)) / 2, seat + depth / 2, 0],
      "#717e87",
      0.6,
    );
  }
  const die = box(
    carrier,
    [w * 0.56, depth, d * 0.48],
    [0, seat + depth / 2, 0],
    "#364a61",
    0.65,
  );
  die.name = "asic-die";
  registerLayer(lid, {
    node: lid.name,
    offset: [0, layout.lidLift, 0],
    direction: [0.54, 0.74, 1],
  });
  return { lid, die };
}

// 方向角的两行两列使用同一对真实表面分支，近看时仅隐藏相邻区域。
function contactFace(
  parent: THREE.Object3D,
  width: number,
  depth: number,
  y: number,
  upper: boolean,
  box: Box,
) {
  const field = new THREE.Group(),
    corner = new THREE.Group();
  field.name = upper ? "asic-ball-field" : "asic-land-field";
  corner.name = upper ? "asic-ball-corner" : "asic-land-corner";
  parent.add(field);
  field.add(corner);
  const { mask, pitch } = layout,
    boundary = pitch * 0.5;
  const coat = upper ? "#314a43" : "#375e53";
  const strip = (
    owner: THREE.Group,
    x1: number,
    x2: number,
    z1: number,
    z2: number,
  ) =>
    box(
      owner,
      [x2 - x1, mask, z2 - z1],
      [(x1 + x2) / 2, y + ((upper ? -1 : 1) * mask) / 2, (z1 + z2) / 2],
      coat,
      0.2,
    );
  strip(corner, -width / 2, -boundary, boundary, depth / 2).name = upper
    ? "asic-bottom-mask"
    : "asic-board-mask";
  strip(field, -width / 2, -boundary, -depth / 2, boundary);
  strip(field, -boundary, width / 2, -depth / 2, depth / 2);
  const mark = new THREE.Shape();
  const half = pitch * 0.25;
  mark.moveTo(-half, half);
  mark.lineTo(-half, -half);
  mark.lineTo(half, -half);
  mark.closePath();
  const triangle = new THREE.Mesh(
    new THREE.ShapeGeometry(mark),
    new THREE.MeshBasicMaterial({ color: "#cfbd86", side: THREE.DoubleSide }),
  );
  triangle.rotation.x = -Math.PI / 2;
  triangle.position.set(
    -2 * pitch,
    y + (upper ? -1 : 1) * (mask + 0.00002),
    2 * pitch,
  );
  triangle.name = "asic-index-mark";
  corner.add(triangle);
  return { field, corner };
}

export function buildAsicContacts(groups: Map<string, THREE.Group>, box: Box) {
  const board = groups.get("net-board")!,
    chip = groups.get("net-asic")!;
  const carrier = chip.getObjectByName("asic-carrier")!;
  const footprint = board.getObjectByName("switch-asic-footprint")!;
  const substrate = chip.getObjectByName(
    "asic-substrate",
  ) as THREE.Mesh<THREE.BoxGeometry>;
  const { width, depth, height } = substrate.geometry.parameters;
  const underside = substrate.position.y - height / 2;
  const lower = contactFace(footprint, width, depth, 0, false, box);
  const upper = contactFace(carrier, width, depth, underside, true, box);
  // 角部剖视暂隐上方基板与阻焊层，保留原位的三只焊球和基板侧焊盘。
  const cornerJoints = new THREE.Group();
  upper.corner.add(cornerJoints);
  const { pitch, mask, land, joint } = layout;
  const padMaterial = new THREE.MeshStandardMaterial({
    color: "#bb965d",
    metalness: 0.5,
    roughness: 0.4,
  });
  const solder = new THREE.MeshStandardMaterial({
    color: "#a1a9b0",
    metalness: 0.65,
    roughness: 0.38,
  });
  const pad = new THREE.CylinderGeometry(pitch * 0.28, pitch * 0.28, land, 24);
  const r = pitch * 0.22;
  const ball = new THREE.LatheGeometry(
    [
      [0, 0],
      [r * 0.72, 0],
      [r, joint * 0.35],
      [r, joint * 0.65],
      [r * 0.72, joint],
      [0, joint],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    24,
  );
  for (let col = -2; col <= 2; col++)
    for (let row = -2; row <= 2; row++) {
      if (col === -2 && row === 2) continue;
      const local = col < 0 && row > 0;
      const a = local ? lower.corner : lower.field,
        b = local ? cornerJoints : upper.field;
      const x = col * pitch,
        z = row * pitch;
      const landMesh = new THREE.Mesh(pad, padMaterial);
      landMesh.name = "asic-board-land";
      landMesh.position.set(x, mask + land / 2, z);
      a.add(landMesh);
      const topLand = new THREE.Mesh(pad, padMaterial);
      topLand.name = "asic-package-land";
      topLand.position.set(x, underside - mask - land / 2, z);
      b.add(topLand);
      const jointMesh = new THREE.Mesh(ball, solder);
      jointMesh.name = "asic-solder-ball";
      jointMesh.position.set(x, underside - mask - land - joint, z);
      b.add(jointMesh);
    }
  // 整体和角部共用同一基板。只改变核查行程与可见范围。
  for (const close of [false, true]) {
    const root = close ? chip.getObjectByName("asic-carrier-frame")! : carrier;
    registerLayer(root, {
      node: carrier.name,
      offset: [0, close ? layout.cornerLift : layout.carrierLift, 0],
      direction: close ? [0.64, 0.38, 1] : [0.62, 0.65, 1],
    });
    const moving = close ? cornerJoints : carrier;
    const fixed = close ? lower.corner : footprint;
    const members = [moving, fixed];
    for (const owner of [chip, board])
      registerLayerScope(owner, close ? "asic-corner" : "asic-lands", {
        layerRoot: root,
        extractedLayers: [chip],
        moving,
        members,
        selectedBranch:
          owner === board ? fixed : close ? cornerJoints : substrate,
        selectionPadding: 0.0006,
      });
  }
}
