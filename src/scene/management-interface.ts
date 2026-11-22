import {
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Path,
  RingGeometry,
  Shape,
} from "three";
import { modelById } from "../catalog.ts";
import { registerLayer } from "./assembly-layer.ts";
import type { Box } from "./equipment-model.ts";

// M2 的 MGMT 面板、支承和板上接口共用一个维护身份，机后朝 -Z。
export function managementInterface(root: Group, size: number[], box: Box) {
  const [w, h, d] = size;
  const rear = -d / 2,
    floor = -h / 2;
  const metal = "#909ca3",
    pcb = "#305b4b";
  const sheet = 0.0015;
  const portW = w * 0.31,
    portH = h * 0.38;
  const apertureW = portW + 0.002,
    apertureH = portH + 0.002;
  function outline(width: number, height: number, corner: number) {
    const x = width / 2,
      y = height / 2,
      shape = new Shape();
    shape.moveTo(-x + corner, -y);
    shape.lineTo(x - corner, -y);
    shape.lineTo(x, -y + corner);
    shape.lineTo(x, y - corner);
    shape.lineTo(x - corner, y);
    shape.lineTo(-x + corner, y);
    shape.lineTo(-x, y - corner);
    shape.lineTo(-x, -y + corner);
    shape.closePath();
    return shape;
  }
  function bore(shape: Shape, x: number, y: number, radius: number) {
    const hole = new Path();
    hole.absarc(x, y, radius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  function plate(
    parent: Group,
    name: string,
    shape: Shape,
    color: string,
    metalness: number,
  ) {
    const mesh = new Mesh(
      new ExtrudeGeometry(shape, { depth: sheet, bevelEnabled: false }),
      new MeshStandardMaterial({ color, metalness, roughness: 0.48 }),
    );
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const faceShape = outline(w, h, 0.002);
  faceShape.holes.push(outline(apertureW, apertureH, 0.0007));
  for (const side of [-1, 1]) bore(faceShape, side * w * 0.4, 0, 0.0018);
  plate(root, "management-face", faceShape, metal, 0.58).position.z = rear;
  box(
    root,
    [w, sheet, d - sheet],
    [0, floor + sheet / 2, sheet / 2],
    "#697b84",
  ).name = "management-tray";

  const module = new Group();
  module.name = "management-module";
  root.add(module);
  const boardBottom = -portH / 2 - sheet;
  const boardDepth = d - 0.005;
  const boardShape = outline(w - 0.008, boardDepth, 0.0014);
  const boreRadius = 0.00135;
  const brass = new MeshStandardMaterial({
    color: "#b39d69",
    metalness: 0.5,
    roughness: 0.43,
  });
  const base = floor + sheet,
    postHeight = boardBottom - base;
  const hex = new Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const x = 0.0026 * Math.cos(angle),
      y = 0.0026 * Math.sin(angle);
    if (i === 0) hex.moveTo(x, y);
    else hex.lineTo(x, y);
  }
  hex.closePath();
  bore(hex, 0, 0, boreRadius * 0.8);
  const postGeometry = new ExtrudeGeometry(hex, {
    depth: postHeight,
    bevelEnabled: false,
  });
  postGeometry.rotateX(-Math.PI / 2);
  const ring = new RingGeometry(boreRadius, 0.00255, 24);
  for (const side of [-1, 1])
    for (const end of [-1, 1]) {
      const x = side * w * 0.36,
        z = end * d * 0.3;
      // 板的二维 Y 轴旋转后指向机后；孔中心由固定支柱的位置反算。
      bore(boardShape, x, sheet - z, boreRadius);
      const post = new Mesh(postGeometry, brass);
      post.name = "management-post";
      post.position.set(x, base, z);
      post.castShadow = post.receiveShadow = true;
      root.add(post);
      const pad = new Mesh(ring, brass);
      pad.name = "management-fastener-ring";
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, boardBottom + sheet + 0.00001, z);
      module.add(pad);
    }
  const substrate = plate(module, "management-pcb", boardShape, pcb, 0.22);
  substrate.rotation.x = -Math.PI / 2;
  substrate.position.set(0, boardBottom, sheet);

  const front = rear + 0.004,
    depth = d * 0.42;
  // 壳体围出口腔，背衬在内端。打开时能从机后沿孔口看到内壁。
  for (const side of [-1, 1]) {
    box(
      module,
      [sheet, portH, depth],
      [(side * (portW - sheet)) / 2, 0, front + depth / 2],
      metal,
    );
    box(
      module,
      [portW - 2 * sheet, sheet, depth],
      [0, (side * (portH - sheet)) / 2, front + depth / 2],
      metal,
    ).name = side > 0 ? "management-port-roof" : "management-port-floor";
  }
  box(
    module,
    [portW - 2 * sheet, portH - 2 * sheet, sheet],
    [0, 0, front + depth - sheet / 2],
    "#273138",
  ).name = "management-port-backing";
  box(
    module,
    [w * 0.17, 0.002, boardDepth * 0.23],
    [0, boardBottom + sheet + 0.001, d * 0.28],
    "#27373a",
  );
  registerLayer(root, {
    node: module.name,
    lift: modelById("server-2u").expansionBay!.managementLift,
    direction: [-0.62, 0.75, -1],
  });
}
