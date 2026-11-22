import * as THREE from "three";
import { modelById, partsForModel } from "../catalog.ts";
import { registerLayer } from "./assembly-layer.ts";
import type { Assembly, Box } from "./equipment-model.ts";

const mount = modelById("server-2u").rtcMount!;

// 贡献主板将电池外形烘入同一网格。只替换登记的三角面，保留板面和纹理。
export function replaceRtcProxy(board: THREE.Object3D) {
  const node = board.getObjectByName(mount.boardNode);
  const index = node instanceof THREE.Mesh ? node.geometry.getIndex() : null;
  if (!(node instanceof THREE.Mesh) || !index)
    throw Error("M2 主板缺少已登记的 RTC 几何");
  if (node.geometry.userData.rtcProxyRemoved) return;
  const { first, count } = mount.proxyTriangles;
  const start = first * 3,
    end = (first + count) * 3;
  if (end > index.count) throw Error("M2 电池外形超出主板索引");
  const kept = index.array.slice(0, index.count - count * 3);
  kept.set(index.array.subarray(end), start);
  node.geometry.setIndex(new THREE.BufferAttribute(kept, 1));
  node.geometry.userData.rtcProxyRemoved = true;
}

// 根节点取电池座底面。整件跟随主板展开，只有电池沿局部 Y 轴抬起。
export function buildRtcMount(
  groups: Assembly["groups"],
  positions: Assembly["positions"],
  boardSurfaceY: number,
  box: Box,
) {
  const root = groups.get(mount.batteryId)!;
  const part = partsForModel("server-2u").find(
    (p) => p.id === mount.batteryId,
  )!;
  const radius = part.size[0] / 2,
    height = part.size[1];
  const floor = 0.0012,
    contactHeight = 0.0006;
  const bottom = floor + contactHeight;
  root.position.set(mount.boardPoint[0], boardSurfaceY, mount.boardPoint[2]);
  positions.set(part.id, root.position.clone());
  const polymer = new THREE.MeshStandardMaterial({
    color: "#323e43",
    roughness: 0.6,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: "#b3bfc4",
    metalness: 0.7,
    roughness: 0.37,
  });
  const holder = new THREE.Group();
  holder.name = "rtc-holder";
  root.add(holder);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius + 0.0015, radius + 0.0015, floor, 48),
    polymer,
  );
  base.name = "rtc-holder-base";
  base.position.y = floor / 2;
  holder.add(base);

  // 两段围边中间留出观察缺口，弹片从侧面接触电池。
  for (const start of [0.25, Math.PI + 0.25]) {
    const end = start + Math.PI - 0.5;
    const shape = new THREE.Shape();
    shape.absarc(0, 0, radius + 0.0015, start, end, false);
    shape.absarc(0, 0, radius + 0.0002, end, start, true);
    shape.closePath();
    const rim = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: height * 0.82,
        bevelEnabled: false,
        curveSegments: 24,
      }),
      polymer,
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = floor;
    holder.add(rim);
  }
  for (const sign of [-1, 1]) {
    box(
      holder,
      [0.0025, bottom, 0.003],
      [sign * (radius + 0.00125), bottom / 2, 0],
      "#9ca69e",
    ).name = "rtc-solder-foot";
    box(
      holder,
      [0.0006, height * 0.7, 0.0025],
      [sign * (radius + 0.0003), bottom + height * 0.35, 0],
      "#bba276",
    ).name = "rtc-side-contact";
  }
  box(
    holder,
    [radius * 0.9, contactHeight, radius * 0.32],
    [0, floor + contactHeight / 2, 0],
    "#bea773",
    0.7,
  ).name = "rtc-floor-contact";

  const cell = new THREE.Group();
  cell.name = "rtc-cell";
  root.add(cell);
  const seam = height * 0.16;
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height - seam, 64),
    steel,
  );
  can.name = "rtc-cell-can";
  can.position.y = bottom + (height - seam) / 2;
  cell.add(can);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.93, radius * 0.96, seam, 64),
    steel,
  );
  cap.position.y = bottom + height - seam / 2;
  cell.add(cap);
  for (const [width, depth] of [
    [0.004, 0.0005],
    [0.0005, 0.004],
  ])
    box(
      cell,
      [width, 0.00008, depth],
      [0, bottom + height + 0.00004, 0],
      "#6c7577",
      0.45,
    );
  registerLayer(root, {
    node: cell.name,
    lift: mount.lift,
    direction: [
      mount.focusDirection[0],
      mount.focusDirection[1],
      mount.focusDirection[2],
    ],
  });
}
