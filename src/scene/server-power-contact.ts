import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import {
  rearLayoutFor,
  serverSuppliesFor,
  serverPowerStages,
} from "../assembly-pairs.ts";
import {
  assemblyLayer,
  layerScopeFor,
  registerLayer,
  registerLayerScope,
} from "./assembly-layer.ts";
import { rearPowerSupply } from "./rear-power-supply.ts";
import type { Box } from "./equipment-model.ts";

const cfg = definition.serverPowerContact;
const extracted = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();

// 两个已登记的服务器外观在这段索引中保留了同一种削角插片。
// 只分出该段三角面，保留原网格的变换、纹理坐标和材质。
function splitBlade(mesh: THREE.Mesh) {
  const source = mesh.geometry;
  let blade = extracted.get(source);
  if (!blade) {
    const { first, count } = cfg.bladeTriangles;
    const index = source.getIndex();
    if (!index || (first + count) * 3 > index.count)
      throw Error("服务器电源缺少已登记的内端插片");
    blade = new THREE.BufferGeometry();
    const start = first * 3,
      end = (first + count) * 3;
    for (const [name, attribute] of Object.entries(source.attributes)) {
      const values = new Float32Array(count * 3 * attribute.itemSize);
      for (let i = start; i < end; i++)
        for (let c = 0; c < attribute.itemSize; c++)
          values[(i - start) * attribute.itemSize + c] = attribute.getComponent(
            index.getX(i),
            c,
          );
      blade.setAttribute(
        name,
        new THREE.BufferAttribute(values, attribute.itemSize),
      );
    }
    const kept = index.array.slice(0, index.count - count * 3);
    kept.set(index.array.subarray(end), start);
    source.setIndex(new THREE.BufferAttribute(kept, 1));
    extracted.set(source, blade);
  }
  const leaf = new THREE.Mesh(blade, mesh.material);
  leaf.name = "psu-inner-blade";
  mesh.add(leaf);
  return leaf;
}

function fallbackBlade(module: THREE.Group, bounds: THREE.Box3) {
  const [w, h, d] = cfg.bladeSize,
    c = cfg.corner;
  const outline = new THREE.Shape();
  outline.moveTo(-w / 2, 0);
  outline.lineTo(w / 2, 0);
  outline.lineTo(w / 2, -d + c);
  outline.lineTo(w / 2 - c, -d);
  outline.lineTo(-w / 2 + c, -d);
  outline.lineTo(-w / 2, -d + c);
  outline.closePath();
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: h,
    bevelEnabled: false,
  }).rotateX(-Math.PI / 2);
  const leaf = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: "#406352", roughness: 0.54 }),
  );
  leaf.name = "psu-inner-blade";
  leaf.position.set(
    bounds.getCenter(new THREE.Vector3()).x,
    bounds.min.y + 0.0032,
    bounds.max.z,
  );
  module.add(leaf);
  return leaf;
}

function registerBayContact(
  module: THREE.Group,
  carrier: THREE.Group,
  leaf: THREE.Mesh,
  id: string,
  box: Box,
) {
  const inModule = module.matrixWorld.clone().invert();
  leaf.updateWorldMatrix(true, true);
  const blade = new THREE.Box3()
    .setFromObject(leaf, true)
    .applyMatrix4(inModule);
  const center = blade.getCenter(new THREE.Vector3()),
    size = blade.getSize(new THREE.Vector3());
  const plug = new THREE.Group();
  plug.name = "psu-bay-plug";
  carrier.add(plug);
  plug.attach(leaf);
  const receiver = new THREE.Group();
  receiver.name = "bay-receiver-" + id;
  receiver.userData.entityId = id;
  module.add(receiver);
  receiver.position.set(center.x, blade.max.y, blade.max.z);
  module.parent!.attach(receiver);
  const depth = size.z * 0.7,
    wall = 0.0011,
    gap = 0.00038,
    width = size.x + 2 * gap;
  const fingerEnd = -depth * 0.26;
  box(
    receiver,
    [width + 2 * wall, size.y + 3 * wall, wall],
    [0, -size.y / 2, wall / 2],
    "#495b61",
  ).name = "bay-receiver-back";
  box(
    receiver,
    [width, wall, depth],
    [0, -size.y - gap - wall / 2, -depth / 2],
    "#547067",
  ).name = "bay-receiver-floor";
  for (const sign of [-1, 1])
    box(
      receiver,
      [wall, size.y + 3 * wall, depth],
      [(sign * (width + wall)) / 2, -size.y / 2, -depth / 2],
      "#495b61",
    ).name = "bay-receiver-side";
  for (const column of [-1, 0, 1]) {
    const x = size.x * 0.26 * column,
      padWidth = size.x * 0.11,
      padHeight = 0.00022;
    box(
      plug,
      [padWidth, padHeight, depth * 0.8],
      [center.x + x, blade.max.y + padHeight / 2, blade.max.z - depth * 0.48],
      "#bf995e",
    ).name = "bay-blade-pad";
    box(
      receiver,
      [padWidth * 0.64, wall, fingerEnd + depth * 0.85],
      [x, padHeight + wall / 2, (fingerEnd - depth * 0.85) / 2],
      "#cdb585",
    ).name = "bay-contact-finger";
    box(
      receiver,
      [padWidth * 0.64, wall, -fingerEnd],
      [x, padHeight + wall / 2, fingerEnd / 2],
      "#899497",
    );
  }
  registerLayer(carrier, {
    node: carrier.name,
    offset: [0, 0, -cfg.travel],
    direction: [0.63, 0.88, -0.82],
  });
  registerLayerScope(module, "bay-contact", {
    layerRoot: carrier,
    members: [plug, receiver],
    moving: plug,
    selectedBranch: plug,
    selectionPadding: 0.0006,
  });
}

export function buildServerPowerContacts(
  groups: Map<string, THREE.Group>,
  box: Box,
  modelId: string,
) {
  for (const { id } of serverSuppliesFor(modelId)) {
    const module = groups.get(id)!;
    module.updateWorldMatrix(true, true);
    const carrier = new THREE.Group();
    carrier.name = "psu-moving-module";
    carrier.add(...module.children);
    module.add(carrier);
    const surface = new THREE.Box3().setFromObject(carrier, true);
    const inModule = module.matrixWorld.clone().invert();
    const shell = surface.clone().applyMatrix4(inModule);
    const original = carrier.children.find(
      (o) =>
        o instanceof THREE.Mesh && /^(compact_psu_|part_psu_)/.test(o.name),
    );
    const leaf =
      original instanceof THREE.Mesh
        ? splitBlade(original)
        : fallbackBlade(carrier, shell);
    registerBayContact(module, carrier, leaf, id, box);

    // 外壳照常使用贡献外观。分层时才显示按本件外廓适配的原创剖视件。
    const study = new THREE.Group();
    study.name = "psu-interior-cutaway";
    study.visible = false;
    const inner = shell.getSize(new THREE.Vector3());
    study.position.copy(shell.getCenter(new THREE.Vector3()));
    module.add(study);
    rearPowerSupply(
      study,
      [inner.x * 0.91, inner.y * 0.81, inner.z * 0.76],
      box,
      0.013,
      cfg.shellCutaway,
    );
    for (const stage of serverPowerStages) {
      if (stage.id === "bay-contact") continue;
      const scope =
        stage.id === "tray"
          ? {
              layerRoot: study,
              moving: study.getObjectByName(assemblyLayer(study)!.node)!,
              members: [study],
            }
          : layerScopeFor(study, stage.id)!;
      registerLayerScope(module, stage.id, { ...scope, cutaway: study });
    }
  }
}

// N1 与 S4 的机后内构均为原创。插片装在壳体内端上半部，为下方托边和限位留出空间。
export function buildRearPowerContacts(
  groups: Map<string, THREE.Group>,
  box: Box,
  modelId: string,
) {
  for (const { id } of rearLayoutFor(modelId)!.supplies) {
    const psu = groups.get(id)!;
    const end = psu.getObjectByName("psu-end-wall")!;
    psu.updateWorldMatrix(true, true);
    const shell = new THREE.Box3()
      .setFromObject(end, true)
      .applyMatrix4(psu.matrixWorld.clone().invert());
    const carrier = new THREE.Group();
    carrier.name = "psu-bay-terminal";
    psu.add(carrier);
    const leaf = fallbackBlade(carrier, shell);
    leaf.position.y =
      shell.getCenter(new THREE.Vector3()).y +
      shell.getSize(new THREE.Vector3()).y * 0.23;
    registerBayContact(psu, carrier, leaf, id, box);
  }
}
