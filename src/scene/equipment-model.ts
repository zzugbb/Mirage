import { processorPairs, drivePairs } from "../assembly-pairs.ts";
import { compactBayForPart } from "../compact-drive-bays.ts";
import { createFanModule } from "./fan-module.ts";
import { switchBoard, switchAsic, switchPowerSupply } from "./switch-model.ts";
import {
  storageController,
  storageDrive,
  storageMidplane,
} from "./storage-model.ts";
import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { modelById, partsForDevice } from "../catalog.ts";
import { devices } from "../installation.ts";
export type Assembly = {
  root: THREE.Group;
  groups: Map<string, THREE.Group>;
  positions: Map<string, THREE.Vector3>;
  representations?: { exterior: THREE.Group; schematic: THREE.Group };
};
function maker() {
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  return (
    root: THREE.Object3D,
    size: number[],
    position: number[],
    color: string,
    metalness = 0.55,
  ) => {
    const key = color + metalness;
    let material = materials.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness,
      });
      materials.set(key, material);
    }
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...(size as [number, number, number])),
      material,
    );
    mesh.position.fromArray(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
}
type Box = ReturnType<typeof maker>;
function board(root: THREE.Group, size: number[], box: Box) {
  box(root, size, [0, 0, 0], "#234e3d", 0.2);
  for (let i = 0; i < 10; i++) {
    const x = ((i - 4.5) * size[0]) / 11;
    box(
      root,
      [0.012, 0.005, 0.014],
      [x, size[1] / 2 + 0.003, -size[2] * 0.29],
      "#171b1e",
      0.1,
    );
    box(
      root,
      [0.0005, 0.0003, size[2] * 0.6],
      [x, size[1] / 2 + 0.0003, 0],
      "#8b9b66",
      0.6,
    );
  }
  for (const x of [-0.38, 0.38])
    for (const z of [-0.38, 0.38])
      box(
        root,
        [0.005, 0.004, 0.005],
        [x * size[0], 0, z * size[2]],
        "#aab1b7",
        0.8,
      );
}
function detail(root: THREE.Group, node: string, size: number[], box: Box) {
  const [w, h, d] = size;
  if (node === "board") board(root, size, box);
  else if (node === "chip") {
    box(root, [w, 0.002, d], [0, -0.002, 0], "#1a4c3a", 0.2);
    box(root, [w * 0.85, 0.004, d * 0.85], [0, 0.001, 0], "#aeb5b9", 0.8);
    for (const x of [-1, 1])
      box(root, [0.002, 0.003, d * 0.7], [x * w * 0.48, 0, 0], "#c7a260", 0.8);
  } else if (node === "processor" || node === "heatsink") {
    box(root, [w, 0.003, d], [0, -h / 2, 0], "#a0a9b2", 0.85);
    for (let i = 0; i < 15; i++)
      box(
        root,
        [w / 40, h, d],
        [-w / 2 + (w * (i + 0.5)) / 15, 0, 0],
        "#939fa9",
        0.8,
      );
  } else if (node === "psu") {
    box(root, size, [0, 0, 0], "#7f8a93", 0.8);
    for (let i = 0; i < 7; i++)
      box(
        root,
        [w * 0.8, 0.002, 0.002],
        [0, ((i - 3) * h) / 9, -d / 2 - 0.001],
        "#21282e",
        0.1,
      );
    box(
      root,
      [w * 0.6, h * 0.6, 0.005],
      [0, 0, -d / 2 - 0.005],
      "#14191e",
      0.2,
    );
    box(root, [0.005, h * 0.65, 0.012], [w * 0.48, 0, -d / 2], "#919d76", 0.5);
  } else if (node === "controller") {
    storageController(root, size, box);
  } else if (node === "adapter") {
    board(root, [w, 0.003, d], box);
    box(root, [w * 0.42, 0.008, d * 0.3], [0, 0.007, 0], "#939ea9", 0.8);
    for (let i = 0; i < 2; i++)
      box(
        root,
        [0.013, 0.014, 0.012],
        [(i - 0.5) * 0.025, 0, -d / 2],
        "#a4b1bb",
        0.8,
      );
    box(root, [w * 0.8, 0.002, 0.005], [0, -0.002, d * 0.48], "#b49b58", 0.8);
  } else if (node === "riser") {
    box(root, [w, 0.003, d], [0, -h / 2, 0], "#355346", 0.2);
    for (const x of [-w / 2, w / 2])
      box(root, [0.003, h, d], [x, 0, 0], "#77828b", 0.7);
    box(root, [w * 0.8, 0.006, 0.012], [0, -h / 2 + 0.005, 0], "#242b30", 0.3);
  } else if (node === "duct") {
    const mat = new THREE.MeshPhysicalMaterial({
      color: "#586069",
      transparent: true,
      opacity: 0.28,
      roughness: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (const x of [-w / 2, w / 2]) {
      const m = box(root, [0.001, h, d], [x, 0, 0], "#555f68");
      m.material = mat;
    }
    const m = box(root, [w, 0.001, d], [0, h / 2, 0], "#555f68");
    m.material = mat;
  } else if (node === "battery") {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(w / 2, w / 2, h, 24),
      new THREE.MeshStandardMaterial({
        color: "#b1bbc1",
        metalness: 0.85,
        roughness: 0.25,
      }),
    );
    root.add(m);
  } else if (node === "cable") {
    for (let i = 0; i < 4; i++)
      box(
        root,
        [w / 7, h * 0.6, d],
        [((i - 1.5) * w) / 4, 0, 0],
        i % 2 ? "#3d4147" : "#242930",
        0.1,
      );
    for (const z of [-d / 2, d / 2])
      box(root, [w * 1.3, h * 1.4, 0.012], [0, 0, z], "#161b20", 0.1);
  } else if (node === "io") {
    box(root, size, [0, 0, 0], "#919da5", 0.8);
    for (let i = 0; i < 3; i++)
      box(
        root,
        [w / 5, h * 0.55, 0.003],
        [((i - 1) * w) / 3, 0, -d / 2 - 0.002],
        "#151d23",
        0.1,
      );
  } else if (node === "ports") {
    for (let i = 0; i < 54; i++) {
      const up = i >= 48,
        x = up ? 0.145 + ((i - 48) % 3) * 0.024 : -0.18 + (i % 24) * 0.0125,
        y = (Math.floor((up ? i - 48 : i) / (up ? 3 : 24)) - 0.5) * 0.013;
      box(root, [up ? 0.02 : 0.01, 0.011, 0.014], [x, y, 0], "#a1adb6", 0.8);
      box(
        root,
        [up ? 0.016 : 0.007, 0.007, 0.003],
        [x, y, 0.009],
        "#10181e",
        0.1,
      );
    }
  } else
    box(root, size, [0, 0, 0], node === "lid" ? "#9aa5ae" : "#4e5a64", 0.75);
}
// M2 竖装 SSD 的金属盘体、侧盖与后端接触区均属同一个配置部件。
function serverSsd(root: THREE.Group, box: Box) {
  const w = 0.007,
    h = 0.06985,
    d = 0.10045;
  box(root, [w, h, d], [0, 0, 0], "#77838d", 0.65);
  box(root, [0.0006, h - 0.006, d - 0.006], [w / 2, 0, 0], "#adb5b9", 0.7);
  for (const y of [-1, 1]) {
    for (const z of [-1, 1])
      box(
        root,
        [0.0008, 0.0026, 0.0026],
        [w / 2, y * (h / 2 - 0.006), z * (d / 2 - 0.006)],
        "#525c63",
      );
  }
  box(root, [w * 0.7, h * 0.56, 0.003], [0, -0.007, -d / 2], "#353f43", 0.22);
  box(
    root,
    [0.001, h * 0.46, 0.002],
    [0.0008, -0.007, -d / 2 - 0.001],
    "#ad9662",
    0.45,
  );
}

function children(
  root: THREE.Group,
  id: string,
  count: number,
  node: string,
  box: Box,
  groups: Map<string, THREE.Group>,
  size: number[],
  modelId: string,
) {
  const verticalBays =
    modelId === "server-2u" && (node === "storage" || node === "drives");
  const ids = verticalBays
    ? drivePairs.map((pair) =>
        node === "storage" ? pair.primary : pair.companion,
      )
    : definition.subparts.filter((p) => p.parent === id).slice(0, count);
  for (let i = 0; i < ids.length; i++) {
    const child = new THREE.Group();
    child.userData.entityId = ids[i].id;
    root.add(child);
    groups.set(ids[i].id, child);
    const bay =
      modelId === "server-1u" ? compactBayForPart(ids[i].id) : undefined;
    if (bay) child.position.set(bay.x, bay.y, 0);
    if (verticalBays) {
      // 槽距按归一化后的贡献模型取整，正面从左到右编号。
      child.position.set(-0.05994 + i * 0.017084, -0.00058, 0);
      if (node === "drives") {
        serverSsd(child, box);
        continue;
      }
    }
    if (node === "memory") {
      const perBank = count / 2,
        bank = i < perBank ? -1 : 1,
        x = bank * 0.16 + ((i % perBank) - (perBank - 1) / 2) * 0.0075;
      child.position.set(x, 0, 0);
      box(child, [0.003, 0.03125, 0.13335], [0, 0, 0], "#28523f", 0.2);
      for (let k = 0; k < 8; k++)
        box(
          child,
          [0.004, 0.012, 0.011],
          [0.003, 0, (k - 3.5) * 0.014],
          "#151a1c",
          0.1,
        );
      box(child, [0.004, 0.003, 0.125], [0, -0.014, 0], "#ae9154", 0.6);
    } else if (node === "fans") {
      const w = (size[0] / count) * 0.9;
      child.position.x = ((i - (count - 1) / 2) * size[0]) / count;
      if (id === "net-fans" || id === "sto-fans") {
        child.userData.focusDirection = definition.fanModule.focusDirection;
        root.userData.focusDirection = definition.fanModule.focusDirection;
        child.add(createFanModule([w, size[1], size[2]]));
        continue;
      }
      box(child, [w, size[1], size[2]], [0, 0, 0], "#252d34", 0.3);
      for (let k = 0; k < 7; k++)
        box(
          child,
          [w * 0.8, 0.0015, 0.002],
          [0, ((k - 3) * size[1]) / 9, size[2] / 2 + 0.001],
          "#77838e",
          0.6,
        );
      const fan = new THREE.Mesh(
        new THREE.CylinderGeometry(
          Math.min(w, size[1]) * 0.37,
          Math.min(w, size[1]) * 0.37,
          0.003,
          16,
        ),
        new THREE.MeshStandardMaterial({ color: "#12181d" }),
      );
      fan.rotation.x = Math.PI / 2;
      fan.position.z = size[2] / 2 + 0.002;
      child.add(fan);
    } else if (node === "storage") {
      const w = bay ? 0.073 : 0.0148;
      for (const x of [-w / 2, w / 2])
        box(child, [0.002, size[1], size[2]], [x, 0, 0], "#8e9aa3", 0.75);
      for (const y of [-size[1] / 2, size[1] / 2])
        box(child, [w, 0.002, size[2]], [0, y, 0], "#8e9aa3", 0.75);
      box(
        child,
        [w * 0.6, 0.003, 0.005],
        [0, -size[1] * 0.2, size[2] / 2],
        "#9da8ae",
        0.8,
      );
    } else if (id === "sto-drives") {
      storageDrive(child, i, size, box);
    } else if (bay) {
      // 盘体与可抽出的托架分别建模，把手属于托架。
      box(child, [0.06985, 0.007, 0.10045], [0, 0, 0], "#78858e", 0.55);
      box(child, [0.065, 0.001, 0.093], [0, 0.0035, 0], "#a4afb7", 0.65);
      box(child, [0.044, 0.004, 0.003], [-0.009, 0, -0.05], "#28333d", 0.35);
    } else {
      const vertical = count >= 8,
        w = vertical ? Math.min(0.015, (size[0] / count) * 0.85) : 0.06985;
      child.position.x = ((i - (count - 1) / 2) * size[0]) / count;
      box(
        child,
        [
          w,
          vertical ? 0.06985 : Math.min(0.015, size[1] * 0.85),
          size[2] * 0.85,
        ],
        [0, 0, 0],
        "#9aa4ac",
        0.75,
      );
      box(
        child,
        [w * 0.9, size[1] * 0.8, 0.008],
        [0, 0, size[2] / 2],
        "#28333d",
        0.4,
      );
      box(
        child,
        [w * 0.6, 0.003, 0.003],
        [0, -size[1] * 0.2, size[2] / 2 + 0.005],
        "#b3bec4",
        0.8,
      );
      const led = box(
        child,
        [0.002, 0.003, 0.002],
        [-w * 0.3, size[1] * 0.25, size[2] / 2 + 0.006],
        "#71a6a5",
        0.1,
      );
      (led.material as THREE.MeshStandardMaterial).emissive.set("#33635f");
    }
  }
}
/** 原创配置结构，各机型独立建模，绝不通过拉伸 2U 模型伪装成其他设备。 */
export function createEquipmentAssembly(modelId: string): Assembly {
  const model = modelById(modelId),
    device = devices.find((d) => d.modelId === modelId)!;
  const root = new THREE.Group(),
    groups = new Map<string, THREE.Group>(),
    positions = new Map<string, THREE.Vector3>(),
    box = maker();
  const h = model.units * 0.04445 - 0.003,
    depth = model.depth;
  box(root, [0.44, 0.002, depth], [0, -h / 2, 0], "#78838b", 0.75);
  for (const x of [-0.222, 0.222])
    box(root, [0.003, h, depth], [x, 0, 0], "#86919a", 0.8);
  for (const x of [-0.237, 0.237]) {
    box(root, [0.025, h, 0.012], [x, 0, depth / 2], "#9da8af", 0.8);
    box(
      root,
      [0.008, h * 0.65, 0.016],
      [x, 0, depth / 2 + 0.008],
      "#303b44",
      0.5,
    );
  }
  const ps = partsForDevice(device.id);
  for (const p of ps) {
    const group = new THREE.Group();
    group.userData.entityId = p.id;
    const pos = [...p.position],
      size = [...p.size];
    if (p.node === "lid") {
      pos[1] = h / 2;
      size[1] = 0.002;
      size[2] = depth;
    }
    if (model.category === "server") {
      if (p.id === "lid-01") {
        pos.splice(0, 3, 0, h / 2, 0);
        size.splice(0, 3, 0.44, 0.002, depth);
      } else if (!(p.node === "psu" && model.id === "server-1u")) {
        pos[2] *= depth / 0.9;
        pos[1] *= model.units / 2;
        size[1] *= model.units / 2;
        size[2] *= depth / 0.9;
      }
      if (p.id === "board-01") {
        pos.splice(0, 3, 0, -h / 2 + 0.005, -0.09);
        size.splice(0, 3, 0.4, 0.004, 0.22);
      }
      if (p.id === "memory-01") {
        pos.splice(0, 3, 0, 0.002, -0.09);
        size.splice(0, 3, 0.39, 0.03125, 0.13335);
      }
      if (p.node === "psu" && model.id === "server-2u") {
        pos.splice(
          0,
          3,
          p.id.endsWith("01") ? -0.185 : 0.185,
          0,
          -depth / 2 + 0.075,
        );
        size.splice(0, 3, 0.065, h * 0.8, 0.14);
      }
      if (p.id === "nic-01" || p.id === "riser-01") {
        pos.splice(0, 3, 0.04, 0.003, -depth / 2 + 0.065);
        size[0] = 0.065;
        size[2] = 0.1;
      }
      if (p.id === "io-01") {
        const panel = model.rearPanels.find(
          (panel) => panel.kind === "interface",
        );
        if (panel) pos[0] = panel.center[0];
      }
      if (p.id === "fans-01") {
        pos.splice(0, 3, 0, 0, 0.1);
        size.splice(0, 3, 0.39, h * 0.8, 0.055);
      }
      if (p.id === "drives-01") {
        pos.splice(0, 3, 0, 0, depth / 2 - (model.units === 2 ? 0.06 : 0.065));
        size.splice(0, 3, model.units === 2 ? 0.137 : 0.41, h * 0.85, 0.1);
      }
      if (p.id === "storage-01") {
        pos.splice(0, 3, 0, 0, depth / 2 - (model.units === 2 ? 0.06 : 0.02));
        size.splice(
          0,
          3,
          model.units === 2 ? 0.137 : 0.42,
          h * 0.85,
          model.units === 2 ? 0.119 : 0.03,
        );
      }
      if (p.id === "backplane-01") {
        pos.splice(0, 3, 0, 0, depth / 2 - 0.135);
        size.splice(0, 3, 0.4, h * 0.75, 0.005);
      }
      if (p.id === "cpu-01" || p.id === "cpu-02") {
        pos[0] = p.id === "cpu-01" ? -0.09 : 0.09;
        pos[2] = -0.09;
        size[0] = 0.07;
        size[2] = 0.07;
      }
      if (p.id.startsWith("processor-")) {
        pos[0] = p.id.endsWith("01") ? -0.09 : 0.09;
        pos[2] = -0.09;
      }
      if (p.id === "duct-01") {
        size[1] = h * 0.25;
        pos[1] = h * 0.25;
      }
    }
    if (
      model.id === "server-1u" &&
      (p.node === "storage" || p.node === "drives")
    )
      size[1] = 0.015;
    group.position.fromArray(pos);
    root.add(group);
    groups.set(p.id, group);
    positions.set(p.id, group.position.clone());
    if (
      p.node === "memory" ||
      p.node === "fans" ||
      p.node === "drives" ||
      p.node === "storage"
    ) {
      if (p.node === "storage") {
        children(
          group,
          p.id,
          model.drives,
          "storage",
          box,
          groups,
          size,
          modelId,
        );
      } else
        children(
          group,
          p.id,
          p.node === "memory"
            ? model.dimms
            : p.node === "fans"
              ? model.fans
              : model.drives,
          p.node,
          box,
          groups,
          size,
          modelId,
        );
    } else {
      if (p.id === "net-board") switchBoard(group, size, box);
      else if (modelId === "switch-1u" && p.node === "psu")
        switchPowerSupply(group, size, box);
      else if (p.id === "net-asic") switchAsic(group, size, box);
      else if (p.id === "sto-midplane") storageMidplane(group, size, box);
      else detail(group, p.node, size, box);
      if (p.id === "board-01") {
        const tail = new THREE.Group();
        tail.position.z = -0.18;
        group.add(tail);
        // M1 后段板沿并排电源槽内侧延伸。
        if (model.id === "server-1u") tail.position.x = 0.075;
        board(tail, [model.id === "server-1u" ? 0.27 : 0.28, 0.004, 0.14], box);
      }
    }
  }
  if (modelId === "server-2u") seatProcessors(groups, positions);
  root.updateMatrixWorld(true);
  return { root, groups, positions };
}
/** 给已获准的 2U 贡献结构补充独立原创 FRU；位置参照该模型的实际包围盒。 */
export function completeServerAssembly(
  root: THREE.Group,
  groups: Map<string, THREE.Group>,
  positions: Map<string, THREE.Vector3>,
) {
  const box = maker();
  root.updateMatrixWorld(true);
  for (const part of definition.parts.filter(
    (p) => p.procedural && modelById("server-2u").parts.includes(p.id),
  )) {
    const group = new THREE.Group();
    group.userData.entityId = part.id;
    group.position.fromArray(part.position);
    if (part.id === "drives-01") {
      group.position.set(0, 0, 0);
      for (const { primary, companion } of drivePairs) {
        const tray = groups.get(primary.id)!;
        const child = new THREE.Group();
        new THREE.Box3().setFromObject(tray).getCenter(child.position);
        child.userData.entityId = companion.id;
        group.add(child);
        groups.set(companion.id, child);
        serverSsd(child, box);
      }
    } else detail(group, part.node, part.size, box);
    root.add(group);
    groups.set(part.id, group);
    positions.set(part.id, group.position.clone());
  }
  seatProcessors(groups, positions);
  root.updateMatrixWorld(true);
}

// 组装阶段的节点位于同一设备坐标系，封装上表面贴合同号散热器底面。
function seatProcessors(
  groups: Assembly["groups"],
  positions: Assembly["positions"],
) {
  for (const { primary, companion } of processorPairs) {
    const chip = groups.get(primary.id)!;
    const sink = new THREE.Box3().setFromObject(groups.get(companion.id)!);
    const cap = new THREE.Box3().setFromObject(chip);
    const offset = sink
      .getCenter(new THREE.Vector3())
      .sub(cap.getCenter(new THREE.Vector3()));
    offset.y = sink.min.y - cap.max.y;
    chip.position.add(offset);
    positions.set(primary.id, chip.position.clone());
  }
}
