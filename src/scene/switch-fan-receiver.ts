import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import type { Box } from "./equipment-model.ts";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";

// 从风扇所在的 -Z 侧装入；较高的触头与同侧风扇触片共用中心。
export const contactCenters = [
  [-0.002, 0.001],
  [0.002, 0.002],
] as const;
const fit = definition.switchAssembly.fanContact.receiver;
function perforatedFace(
  width: number,
  height: number,
  radius: number,
  depth: number,
  centerY = 0.0015,
) {
  const outline = new THREE.Shape();
  outline.moveTo(-width / 2, centerY - height / 2);
  outline.lineTo(width / 2, centerY - height / 2);
  outline.lineTo(width / 2, centerY + height / 2);
  outline.lineTo(-width / 2, centerY + height / 2);
  outline.closePath();
  for (const [x, y] of contactCenters) {
    const hole = new THREE.Path();
    hole.absarc(x, y, radius, 0, Math.PI * 2, true);
    outline.holes.push(hole);
  }
  return new THREE.ExtrudeGeometry(outline, {
    depth,
    bevelEnabled: false,
    curveSegments: 20,
  });
}

export function switchFanReceiver(
  board: THREE.Group,
  fanModule: THREE.Object3D,
  socket: THREE.Group,
  id: string,
  back: number,
  box: Box,
  brass: THREE.Material,
  metal: THREE.Material,
) {
  const face = 0.005,
    pocketEnd = 0.0082,
    mouth = 0.0037,
    flangeBack = 0.00455,
    barrelEnd = 0.0079;
  function mesh(
    parent: THREE.Group,
    name: string,
    geo: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const part = new THREE.Mesh(geo, material);
    part.name = name;
    part.castShadow = part.receiveShadow = true;
    part.position.set(x, y, z);
    parent.add(part);
    return part;
  }
  const backing = box(
    socket,
    [0.01, 0.008, back - pocketEnd],
    [0, 0.001, (back + pocketEnd) / 2],
    "#526571",
  );
  backing.name = "fan-receiver-pocket-floor";
  const block = mesh(
    socket,
    "fan-receiver-body",
    perforatedFace(0.01, 0.008, fit.seatBore, pocketEnd - face, 0.001),
    backing.material,
    0,
    0,
    face,
  );
  const carrier = new THREE.Group(),
    probes = new THREE.Group();
  carrier.name = "fan-sleeve-carrier";
  probes.name = "fan-probe-pair";
  socket.add(carrier);
  carrier.add(probes);
  mesh(
    carrier,
    "fan-sleeve-bridge",
    perforatedFace(0.008, 0.0048, fit.barrelRadius, face - flangeBack),
    metal,
    0,
    0,
    flangeBack,
  );
  const profile = [
    [fit.sleeveBore, mouth],
    [0.00145, mouth],
    [0.00145, flangeBack],
    [fit.barrelRadius, flangeBack],
    [fit.barrelRadius, barrelEnd],
    [fit.sleeveBore, barrelEnd],
    [fit.sleeveBore, mouth],
  ].map(([r, z]) => new THREE.Vector2(r, z));
  const sleeve = new THREE.LatheGeometry(profile, 40).rotateX(Math.PI / 2);
  const tip = new THREE.CylinderGeometry(0.001, 0.001, 0.0016, 32).rotateX(
    Math.PI / 2,
  );
  const stemLength = 0.0028;
  const stem = new THREE.CylinderGeometry(
    fit.stemRadius,
    fit.stemRadius,
    stemLength,
    32,
  ).rotateX(Math.PI / 2);
  for (const [x, y] of contactCenters) {
    mesh(carrier, "fan-contact-sleeve", sleeve, metal, x, y, 0);
    mesh(probes, "fan-contact-tip", tip, brass, x, y, mouth - 0.0008);
    mesh(probes, "fan-probe-stem", stem, brass, x, y, mouth + stemLength / 2);
  }
  const stages = [
    {
      id: "fan-probes",
      moving: probes,
      members: [carrier],
      travel: fit.probeTravel,
      direction: fit.probeDirection,
    },
    {
      id: "fan-sleeves",
      moving: carrier,
      members: [carrier, block, backing],
      travel: fit.carrierTravel,
      direction: fit.carrierDirection,
    },
  ];
  for (const stage of stages) {
    const [x, y, z] = stage.direction;
    registerLayer(stage.moving, {
      node: stage.moving.name,
      offset: [0, 0, -stage.travel],
      direction: [x, y, z],
    });
    registerLayerScope(board, stage.id + ":" + id, {
      extractedLayers: [fanModule],
      layerRoot: stage.moving,
      moving: stage.moving,
      members: stage.members,
      selectedBranch: stage.moving,
      selectionPadding: 0.0002,
    });
  }
}
