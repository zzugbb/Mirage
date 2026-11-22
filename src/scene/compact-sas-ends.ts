import * as THREE from "three";
import { modelById } from "../catalog.ts";
import type { Box } from "./equipment-model.ts";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";

const fit = modelById("server-1u").compactHarness!.contactInspection;
function rectangle(w: number, h: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2);
  s.lineTo(w / 2, -h / 2);
  s.lineTo(w / 2, h / 2);
  s.lineTo(-w / 2, h / 2);
  s.closePath();
  return s;
}
function plate(
  parent: THREE.Group,
  name: string,
  shape: THREE.Shape,
  depth: number,
  material: THREE.Material,
) {
  const part = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 12,
    }),
    material,
  );
  parent.add(part);
  part.name = name;
  part.castShadow = part.receiveShadow = true;
  return part;
}

// 插舌的宽肩止于机壳前沿，窄尾滑入盲槽，外侧两片触点沿用原接合面。
export function compactCablePlug(
  body: THREE.Group,
  name: string,
  p: THREE.Vector3,
  box: Box,
) {
  const end = new THREE.Group();
  end.position.copy(p);
  body.add(end);
  const shell = rectangle(0.015, 0.006),
    tailWidth = 0.008,
    thickness = 0.0018;
  shell.holes.push(rectangle(tailWidth + 0.0006, thickness + 0.0005));
  const skin = new THREE.MeshStandardMaterial({
    color: "#46545c",
    roughness: 0.54,
    metalness: 0.22,
  });
  plate(end, name, shell, 0.012, skin).position.z = -0.006;
  box(
    end,
    [tailWidth + 0.0006, thickness + 0.0005, 0.0037],
    [0, 0, 0.00415],
    "#344348",
  ).name = "sas-pocket-back";
  box(end, [0.009, 0.001, 0.007], [0, 0.0035, 0], "#a0a9a8");
  const insert = new THREE.Group();
  insert.name = "sas-tongue-insert";
  end.add(insert);
  box(insert, [0.012, thickness, 0.0034], [0, 0, -0.0077], "#476d57").name =
    "sas-tongue";
  box(insert, [tailWidth, thickness, 0.008], [0, 0, -0.002], "#476d57").name =
    "sas-tongue-tail";
  for (const side of [-1, 1])
    box(
      insert,
      [0.004, 0.0003, 0.0026],
      [side * 0.003, 0.00105, -0.0077],
      "#c9a865",
    ).name = "sas-pad";
}

// 两条承片伸向插座开口。后横梁落在固定台阶上，两处通孔对回导柱。
export function compactSocketBridge(
  socket: THREE.Group,
  h: number,
  d: number,
  wall: number,
  box: Box,
) {
  const bridge = new THREE.Group();
  bridge.name = "sas-contact-carrier";
  socket.add(bridge);
  const width = 0.0126,
    depth = 0.0024,
    back = -d / 2 + wall,
    front = back + depth,
    centerZ = (front + back) / 2;
  const floor = -h / 2 + wall,
    bottom = 0.00065,
    thickness = 0.00145;
  box(
    socket,
    [width, bottom - floor, depth],
    [0, (bottom + floor) / 2, centerZ],
    "#56616a",
  ).name = "sas-bridge-bed";
  const shape = rectangle(width, depth);
  const pinRadius = 0.00045;
  const posts = new THREE.CylinderGeometry(
    pinRadius,
    pinRadius,
    thickness + 0.00035,
    20,
  );
  const brass = new THREE.MeshStandardMaterial({
    color: "#bda16b",
    roughness: 0.5,
    metalness: 0.5,
  });
  for (const x of [-0.0051, 0.0051]) {
    const hole = new THREE.Path();
    hole.absarc(x, 0, pinRadius + 0.00016, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const post = new THREE.Mesh(posts, brass);
    post.name = "sas-bridge-pin";
    post.position.set(x, bottom + (thickness + 0.00035) / 2, centerZ);
    post.castShadow = post.receiveShadow = true;
    socket.add(post);
  }
  const bar = plate(
    bridge,
    "sas-contact-bridge",
    shape,
    thickness,
    new THREE.MeshStandardMaterial({ color: "#48615a", roughness: 0.6 }),
  );
  bar.rotation.x = -Math.PI / 2;
  bar.position.set(0, bottom, centerZ);
  const tip = d / 2 - 0.0012;
  for (const side of [-1, 1])
    box(
      bridge,
      [0.003, 0.0006, tip - front],
      [side * 0.003, 0.0015, (tip + front) / 2],
      "#ad9369",
    ).name = "sas-finger";
}

export function registerCompactSasEnd(
  id: string,
  cable: THREE.Group,
  board: THREE.Group,
  plug: THREE.Object3D,
  socket: THREE.Object3D,
) {
  const tongue = plug.getObjectByName("sas-tongue-insert")!,
    bridge = socket.getObjectByName("sas-contact-carrier")!;
  const [tx, ty, tz] = fit.tongueDirection,
    [bx, by, bz] = fit.bridgeDirection;
  registerLayer(tongue, {
    node: tongue.name,
    offset: [0, 0, -fit.tongueTravel],
    direction: [tx, ty, tz],
  });
  registerLayerScope(cable, id + "-tongue", {
    layerRoot: tongue,
    moving: tongue,
    extractedLayers: [plug],
    members: [plug],
    selectedBranch: tongue,
    selectionPadding: 0.0003,
  });
  registerLayer(bridge, {
    node: bridge.name,
    offset: [0, fit.bridgeLift, 0],
    direction: [bx, by, bz],
  });
  registerLayerScope(board, id + "-bridge", {
    layerRoot: bridge,
    moving: bridge,
    extractedLayers: [plug],
    members: [socket],
    selectedBranch: bridge,
    selectionPadding: 0.0003,
  });
}
