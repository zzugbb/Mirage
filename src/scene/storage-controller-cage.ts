import * as THREE from "three";
import { storageAssembly, controllerPortStages } from "../storage-layout.ts";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";
import type { Box } from "./equipment-model.ts";

function rectangle(x: number, z: number, w: number, d: number) {
  const outline = new THREE.Shape();
  outline.moveTo(x - w / 2, -z - d / 2);
  outline.lineTo(x + w / 2, -z - d / 2);
  outline.lineTo(x + w / 2, -z + d / 2);
  outline.lineTo(x - w / 2, -z + d / 2);
  outline.closePath();
  return outline;
}

// 罩脚落在固定底座的四个长孔里。笼内承片单独插入尾座，抬罩时仍留在座上。
export function buildControllerCage(
  root: THREE.Group,
  cage: THREE.Group,
  index: number,
  box: Box,
) {
  const {
    cageSize: [w, h, d],
    wall,
    hoodLift,
    tongueTravel,
    focusDirection,
    seatDirection,
  } = storageAssembly.controllerPorts;
  const hood = new THREE.Group(),
    insert = new THREE.Group(),
    seat = new THREE.Group();
  hood.name = "controller-port-hood";
  insert.name = "controller-port-insert";
  seat.name = "controller-port-seat";
  cage.add(hood, insert, seat);
  const floorH = wall * 1.45,
    floorY = -h / 2 + floorH;
  const base = rectangle(0, d / 2, w, d);
  const metal = "#84949b";
  const top = box(hood, [w, wall, d], [0, (h - wall) / 2, d / 2], metal);
  top.name = "controller-port-roof";
  for (const side of [-1, 1]) {
    const x = (side * (w - wall)) / 2;
    box(
      hood,
      [wall, h - floorH - wall, d],
      [x, (floorH - wall) / 2, d / 2],
      metal,
    ).name = "controller-port-cheek";
    for (const z of [d * 0.2, d * 0.8]) {
      base.holes.push(rectangle(x, z, wall * 0.78, wall * 2.5));
      box(
        hood,
        [wall * 0.52, floorH * 0.88, wall * 2],
        [x, floorY - floorH * 0.44, z],
        metal,
      ).name = "controller-port-tab";
    }
  }
  const floor = new THREE.Mesh(
    new THREE.ExtrudeGeometry(base, {
      depth: floorH,
      bevelEnabled: false,
    }).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: "#596b74",
      metalness: 0.5,
      roughness: 0.52,
    }),
  );
  floor.position.y = -h / 2;
  floor.castShadow = floor.receiveShadow = true;
  floor.name = "controller-port-floor";
  cage.add(floor);

  const bladeW = w - 4 * wall,
    tailW = bladeW * 0.59,
    bladeY = -h * 0.18;
  const mouth = d * 0.68,
    back = d - wall,
    end = back - wall * 0.25,
    start = wall;
  const openingW = tailW + wall * 0.48,
    supportY = bladeY - wall / 2;
  const seatW = bladeW + wall,
    roofY = bladeY + wall * 1.24;
  const seatColor = "#354751",
    mountDepth = d - mouth;
  box(
    seat,
    [seatW, supportY - floorY, mountDepth],
    [0, (floorY + supportY) / 2, mouth + mountDepth / 2],
    seatColor,
  ).name = "controller-port-bed";
  const sideW = (seatW - openingW) / 2;
  for (const sign of [-1, 1])
    box(
      seat,
      [sideW, roofY - supportY, mountDepth],
      [
        (sign * (seatW - sideW)) / 2,
        (roofY + supportY) / 2,
        mouth + mountDepth / 2,
      ],
      seatColor,
    ).name = "controller-port-stop";
  box(
    seat,
    [openingW, roofY - supportY, wall],
    [0, (roofY + supportY) / 2, d - wall / 2],
    seatColor,
  ).name = "controller-port-socket-back";
  // 后横梁固定簧片，两侧纵边与前沿之间留出窗口，可从上方对照接触位置。
  const rearBar = (end - mouth) * 0.68 + mouth;
  const lip = wall * 0.5;
  const roof = new THREE.Group();
  roof.name = "controller-port-socket-roof";
  seat.add(roof);
  box(
    roof,
    [seatW, wall, d - rearBar],
    [0, roofY + wall / 2, (d + rearBar) / 2],
    seatColor,
  );
  box(
    roof,
    [seatW, wall, lip],
    [0, roofY + wall / 2, mouth + lip / 2],
    seatColor,
  );
  const windowDepth = rearBar - mouth - lip;
  for (const side of [-1, 1])
    box(
      roof,
      [sideW, wall, windowDepth],
      [
        (side * (seatW - sideW)) / 2,
        roofY + wall / 2,
        rearBar - windowDepth / 2,
      ],
      seatColor,
    );
  // 同一承片前宽后窄，两肩对住入口两侧，尾段伸入留有间隙的槽内。
  const shape = new THREE.Shape();
  shape.moveTo(-bladeW / 2, -start);
  for (const [x, z] of [
    [bladeW / 2, start],
    [bladeW / 2, mouth],
    [tailW / 2, mouth],
    [tailW / 2, end],
    [-tailW / 2, end],
    [-tailW / 2, mouth],
    [-bladeW / 2, mouth],
  ])
    shape.lineTo(x, -z);
  shape.closePath();
  const blade = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: wall,
      bevelEnabled: false,
    }).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: "#897849",
      metalness: 0.35,
      roughness: 0.5,
    }),
  );
  blade.name = "controller-port-tongue";
  blade.position.y = supportY;
  blade.castShadow = blade.receiveShadow = true;
  insert.add(blade);
  // 簧片根部贴在尾座上壁，前段的平面压住插入后的接触片。
  const contactY = bladeY + wall * 0.6;
  const tailDepth = end - mouth;
  const spring = new THREE.Shape();
  spring.moveTo(mouth + tailDepth * 0.14, contactY + wall * 0.23);
  spring.lineTo(mouth + tailDepth * 0.25, contactY);
  spring.lineTo(mouth + tailDepth * 0.46, contactY);
  spring.lineTo(mouth + tailDepth * 0.74, roofY - wall * 0.14);
  spring.lineTo(mouth + tailDepth * 0.94, roofY - wall * 0.14);
  spring.lineTo(mouth + tailDepth * 0.94, roofY);
  spring.lineTo(mouth + tailDepth * 0.71, roofY);
  spring.lineTo(mouth + tailDepth * 0.43, contactY + wall * 0.14);
  spring.lineTo(mouth + tailDepth * 0.28, contactY + wall * 0.14);
  spring.lineTo(mouth + tailDepth * 0.17, contactY + wall * 0.34);
  spring.closePath();
  const stripWidth = tailW * 0.115;
  const strip = new THREE.ExtrudeGeometry(spring, {
    depth: stripWidth,
    bevelEnabled: false,
  }).rotateY(-Math.PI / 2);
  const springMetal = new THREE.MeshStandardMaterial({
    color: "#c7976a",
    metalness: 0.48,
    roughness: 0.48,
  });
  for (const n of [-1, 0, 1]) {
    const contact = new THREE.Mesh(strip, springMetal);
    contact.name = "controller-port-spring";
    contact.position.x = n * tailW * 0.3 + stripWidth / 2;
    contact.castShadow = contact.receiveShadow = true;
    seat.add(contact);
    box(
      insert,
      [tailW * 0.15, wall * 0.1, (end - mouth) * 0.82],
      [n * tailW * 0.3, bladeY + wall * 0.55, (mouth + end) / 2],
      "#cba16c",
      0.48,
    ).name = "controller-port-pad";
  }

  const [coverStage, bladeStage] = controllerPortStages(index);
  const [hx, hy, hz] = focusDirection,
    [bx, by, bz] = seatDirection;
  registerLayer(hood, {
    node: hood.name,
    offset: [0, hoodLift, 0],
    direction: [hx, hy, hz],
  });
  registerLayer(insert, {
    node: insert.name,
    offset: [0, 0, -tongueTravel],
    direction: [bx, by, bz],
  });
  registerLayerScope(root, coverStage.id, {
    layerRoot: hood,
    moving: hood,
    members: [cage],
    selectedBranch: hood,
    selectionPadding: 0.0003,
  });
  registerLayerScope(root, bladeStage.id, {
    layerRoot: insert,
    extractedLayers: [hood],
    moving: insert,
    members: [insert, seat],
    selectedBranch: insert,
    selectionPadding: 0.0003,
  });
}
