import * as THREE from "three";
import { storageAssembly } from "../storage-layout.ts";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";
import type { Box } from "./equipment-model.ts";

const hub = 0.0034,
  bore = 0.00155,
  stem = 0.0012;
const earT = 0.0022,
  gripT = 0.0034,
  clearance = 0.00035;
const earY = (gripT + earT) / 2 + clearance;
const axisDepth = 0.0055;

// 轴耳以 X/Z 为截面，沿 Y 轴贯穿。固定耳背接面板，活动耳向右接拉手。
function earGeometry(fixed: boolean) {
  const profile = new THREE.Shape();
  if (fixed) {
    profile.moveTo(-hub, -axisDepth);
    profile.lineTo(hub, -axisDepth);
    profile.lineTo(hub, 0);
    profile.absarc(0, 0, hub, 0, Math.PI, false);
  } else {
    profile.moveTo(hub * 1.6, -hub);
    profile.lineTo(hub * 1.6, hub);
    profile.lineTo(0, hub);
    profile.absarc(0, 0, hub, Math.PI / 2, 1.5 * Math.PI, false);
  }
  profile.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, bore, 0, 2 * Math.PI, true);
  profile.holes.push(hole);
  return plateGeometry(profile, fixed ? earT : gripT);
}
function plateGeometry(shape: THREE.Shape, thickness: number) {
  return new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 12,
  })
    .rotateX(Math.PI / 2)
    .translate(0, thickness / 2, 0);
}
const fixedEarGeometry = earGeometry(true),
  tongueGeometry = earGeometry(false);

export function storageTrayHandle(
  disk: THREE.Group,
  tray: THREE.Group,
  face: THREE.Mesh<THREE.BoxGeometry>,
  box: Box,
) {
  const { width, depth } = face.geometry.parameters;
  const frame = new THREE.Group();
  frame.position.set(-width * 0.31, 0, face.position.z + depth / 2 + axisDepth);
  tray.add(frame);
  const metal = (color: string) =>
    new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.43 });
  const fixedMetal = metal("#596f79"),
    gripMetal = metal("#b8c6c9"),
    pinMetal = metal("#c7a06d");
  const ears = new THREE.Group();
  frame.add(ears);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(fixedEarGeometry, fixedMetal);
    ear.name = side > 0 ? "tray-upper-ear" : "tray-lower-ear";
    ear.position.y = side * earY;
    ears.add(ear);
  }
  const grip = new THREE.Group();
  grip.name = "tray-handle";
  frame.add(grip);
  const tongue = new THREE.Mesh(tongueGeometry, gripMetal);
  tongue.name = "tray-handle-eye";
  grip.add(tongue);
  const length = width * 0.62;
  const strap = new THREE.Shape();
  const join = hub * 1.6;
  strap.moveTo(join, -hub);
  strap.lineTo(length * 0.24, 0.0025);
  strap.lineTo(length * 0.76, 0.0025);
  strap.lineTo(length * 0.9, -0.0015);
  strap.lineTo(length, -0.0015);
  strap.lineTo(length, 0.002);
  strap.lineTo(length * 0.91, 0.002);
  strap.lineTo(length * 0.77, 0.006);
  strap.lineTo(length * 0.23, 0.006);
  strap.lineTo(join, hub);
  strap.closePath();
  const lever = new THREE.Mesh(plateGeometry(strap, gripT), gripMetal);
  lever.name = "tray-handle-lever";
  grip.add(lever);
  const stopDepth = axisDepth - 0.0015;
  const stop = box(
    frame,
    [length * 0.1, gripT * 1.7, stopDepth],
    [length * 0.95, 0, -axisDepth + stopDepth / 2],
    "#677b84",
    0.5,
  );
  stop.name = "tray-handle-stop";

  const pin = new THREE.Group();
  pin.name = "tray-hinge-pin";
  frame.add(pin);
  const shoulderY = earY + earT / 2;
  const tip = -shoulderY - 0.00065;
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(stem, stem, shoulderY - tip, 24),
    pinMetal,
  );
  shaft.position.y = (tip + shoulderY) / 2;
  shaft.name = "tray-pin-shaft";
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(bore * 1.55, bore * 1.55, 0.0012, 24),
    pinMetal,
  );
  cap.position.y = shoulderY + 0.0006;
  cap.name = "tray-pin-head";
  pin.add(shaft, cap);

  const { openAngle, pinTravel, gripTravel } =
    storageAssembly.trayInspection.handle;
  const front: [number, number, number] = [0.28, 0.91, 1];
  const hinge: [number, number, number] = [0.65, 0.82, 1];
  registerLayer(grip, {
    node: grip.name,
    offset: [0, 0, 0],
    turnY: (-openAngle * Math.PI) / 180,
    direction: front,
  });
  registerLayerScope(disk, "handle-swing", {
    layerRoot: grip,
    members: [face, ears, pin, grip, stop],
    moving: grip,
    selectedBranch: grip,
    selectionPadding: 0.0005,
  });
  registerLayer(pin, {
    node: pin.name,
    offset: [0, pinTravel, 0],
    direction: hinge,
  });
  registerLayerScope(disk, "hinge-pin", {
    layerRoot: pin,
    members: [ears, tongue, pin],
    moving: pin,
    selectedBranch: pin,
    selectionPadding: 0.00035,
  });
  registerLayer(frame, {
    node: grip.name,
    offset: [0, 0, gripTravel],
    direction: hinge,
  });
  registerLayerScope(disk, "handle-eye", {
    layerRoot: frame,
    extractedLayers: [pin],
    members: [ears, tongue, pin],
    moving: tongue,
    selectedBranch: tongue,
    selectionPadding: 0.00035,
  });
}
