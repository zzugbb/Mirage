import * as THREE from "three";
import { modelById } from "../catalog.ts";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";
import type { Box } from "./equipment-model.ts";

function movingBody(
  part: THREE.Group,
  offset: [number, number, number],
  direction: [number, number, number],
) {
  const body = new THREE.Group();
  body.name = "rear-moving-body";
  body.add(...part.children);
  part.add(body);
  registerLayer(body, { node: body.name, offset, direction });
  return body;
}

export function registerServerRearMounts(
  groups: Map<string, THREE.Group>,
  modelId: string,
  box: Box,
) {
  const model = modelById(modelId);
  if (model.expansionBay) {
    const bay = model.expansionBay,
      card = groups.get(bay.adapter)!,
      carrier = groups.get(bay.carrier)!;
    const body = movingBody(card, [0, 0.042, 0], [-0.7, 0.7, -1]);
    for (const [owner, branch] of [
      [card, body],
      [carrier, carrier],
    ])
      registerLayerScope(owner, "rear-seat", {
        layerRoot: body,
        moving: body,
        members: [body, carrier],
        selectedBranch: branch,
        selectionPadding: 0.001,
      });
    return;
  }
  // M1 的网卡与上方转接架分别安装。两圈固定孔缘按各自机后外廓绘制。
  for (const panel of model.rearPanels) {
    if (
      !("partId" in panel) ||
      !panel.partId ||
      (panel.kind !== "expansion" && panel.partId !== "nic-01")
    )
      continue;
    const part = groups.get(panel.partId)!;
    const bounds = new THREE.Box3().setFromObject(part, true),
      size = bounds.getSize(new THREE.Vector3());
    const frame = new THREE.Group();
    frame.name = "rear-aperture-" + panel.partId;
    frame.userData.entityId = panel.partId;
    const center = bounds.getCenter(new THREE.Vector3());
    center.z = bounds.min.z;
    part.parent!.add(frame);
    frame.position.copy(frame.parent!.worldToLocal(center));
    frame.visible = false;
    const wall = 0.001,
      clearance = 0.00045,
      w = size.x + 2 * clearance,
      h = size.y + 2 * clearance;
    for (const sign of [-1, 1]) {
      box(
        frame,
        [w + 2 * wall, wall, wall],
        [0, (sign * (h + wall)) / 2, 0],
        "#859298",
      );
      box(frame, [wall, h, wall], [(sign * (w + wall)) / 2, 0, 0], "#859298");
    }
    const body = movingBody(part, [0, 0, -0.052], [0.45, 0.63, -1]);
    registerLayerScope(part, "rear-seat", {
      layerRoot: body,
      moving: body,
      members: [body, frame],
      selectedBranch: body,
      cutaway: frame,
      selectionPadding: 0.00065,
    });
  }
}
