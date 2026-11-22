import { buildCompactStoragePath } from "./compact-storage-path.ts";
import { processorPairs, drivePairs } from "../assembly-pairs.ts";
import {
  compactManagementInterface,
  managementInterface,
} from "./management-interface.ts";
import { buildRtcMount, replaceRtcProxy } from "./rtc-mount.ts";
import { compactSsd, compactTray } from "./compact-drive-model.ts";
import { compactBayForPart } from "../compact-drive-bays.ts";
import {
  buildCompactHarness,
  buildStorageHarness,
  isStorageHarnessPart,
} from "./server-storage-harness.ts";
import { registerLayer } from "./assembly-layer.ts";
import { buildServerPowerContacts } from "./server-power-contact.ts";
import { rearPowerSupply } from "./rear-power-supply.ts";
import {
  compactHeatsink,
  compactPackage,
  registerCompactProcessorSeats,
  registerServerProcessorSeats,
} from "./compact-processors.ts";
import { buildSwitchFanContacts } from "./switch-fan-contacts.ts";
import { registerStorageFanMount } from "./storage-fan-mount.ts";
import { createFanModule } from "./fan-module.ts";
import { buildAsicContacts } from "./switch-asic-package.ts";
import { switchBoard, switchAsic, switchPortCages } from "./switch-model.ts";
import {
  storageController,
  storageDrive,
  storageMidplane,
} from "./storage-model.ts";
import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { modelById, partsForModel, partsForDevice } from "../catalog.ts";
import { devices } from "../installation.ts";
export type Assembly = {
  root: THREE.Group;
  groups: Map<string, THREE.Group>;
  positions: Map<string, THREE.Vector3>;
  representations?: { exterior: THREE.Group; schematic: THREE.Group };
};
export function makeEquipmentBox() {
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
export type Box = ReturnType<typeof makeEquipmentBox>;
function board(root: THREE.Group, size: number[], box: Box) {
  box(root, size, [0, 0, 0], "#234e3d", 0.2).name = "board-substrate";
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
// 两只转接架共用支承与定位尺寸。网卡的双口只表达后面板接口区。
function expansionPart(
  root: THREE.Group,
  part: (typeof definition.parts)[number],
  box: Box,
) {
  const [w, h, d] = part.size;
  const rear = -d / 2;
  const seatZ = d * 0.39;
  root.userData.focusDirection = part.focusDirection;
  if (part.node === "adapter") {
    const pcb = box(
      root,
      [w - 0.009, 0.002, d - 0.02],
      [0, 0, 0.001],
      "#295241",
      0.2,
    );
    pcb.name = "adapter-pcb";
    // 金色接触区与架内承接面共用轴线，表示装配位置。
    box(
      root,
      [w * 0.56, 0.001, 0.006],
      [0, -0.0015, seatZ],
      "#af975c",
      0.55,
    ).name = "adapter-contact";
    box(
      root,
      [w * 0.86, h * 0.82, 0.002],
      [0, 0.003, rear + 0.002],
      "#89969e",
      0.7,
    );
    for (const sign of [-1, 1]) {
      const x = sign * w * 0.23;
      box(
        root,
        [w * 0.29, h * 0.45, 0.016],
        [x, 0.004, rear + 0.009],
        "#a3aeb3",
        0.7,
      );
      box(
        root,
        [w * 0.24, h * 0.32, 0.001],
        [x, 0.004, rear + 0.0005],
        "#212c32",
        0.25,
      );
    }
    for (let i = 0; i < 9; i++)
      box(
        root,
        [0.002, 0.006, d * 0.25],
        [(i - 4) * 0.003, 0.004, 0],
        "#8d9b9e",
        0.72,
      );
    for (const side of [-1, 1])
      box(
        root,
        [0.01, 0.003, 0.015],
        [side * w * 0.27, 0.0025, d * 0.24],
        "#293135",
        0.2,
      );
  } else {
    const floor = -h * 0.42;
    box(root, [w, 0.002, d], [0, floor - 0.001, 0], "#66767e", 0.65);
    for (const side of [-1, 1]) {
      box(
        root,
        [0.002, h * 0.8, d],
        [side * (w / 2 - 0.001), floor + h * 0.4, 0],
        "#99a4ac",
        0.72,
      );
      for (const z of [-d * 0.32, d * 0.32]) {
        const height = -0.001 - floor;
        box(
          root,
          [0.004, height, 0.006],
          [side * w * 0.35, floor + height / 2, z],
          "#a5997a",
          0.55,
        ).name = "adapter-support";
      }
    }
    box(
      root,
      [w * 0.62, 0.004, 0.008],
      [0, -0.004, seatZ],
      "#30383c",
      0.25,
    ).name = "carrier-seat";
    // 转接小板竖装在托架内端，托住承接座，保持前后面可辨。
    box(
      root,
      [w * 0.78, 0.014, 0.002],
      [0, floor + 0.007, seatZ + 0.005],
      "#305545",
      0.2,
    );
    for (const x of [-w * 0.31, w * 0.31])
      box(
        root,
        [0.003, 0.003, 0.001],
        [x, floor + 0.009, seatZ + 0.0035],
        "#abb3ad",
        0.65,
      );
  }
}
// M1 的网卡、转接架和管理接口以机后面板为基准，接口外形为分区示意。
function compactRearInterface(
  root: THREE.Group,
  node: string,
  size: number[],
  box: Box,
) {
  const [w, h, d] = size;
  const rear = -d / 2,
    floor = -h / 2;
  if (node === "adapter") {
    box(root, [w, 0.0016, d], [0, floor + 0.0008, 0], "#305a49", 0.2);
    box(
      root,
      [w * 0.33, h * 0.48, d * 0.26],
      [0, floor + h * 0.24 + 0.0016, d * 0.08],
      "#6f8186",
    );
    for (const side of [-1, 1]) {
      const x = side * w * 0.25,
        z = rear + 0.001;
      box(
        root,
        [w * 0.32, h - 0.0016, 0.018],
        [x, 0.0008, z + 0.009],
        "#a3adb1",
      );
      box(
        root,
        [w * 0.25, h * 0.55, 0.001],
        [x, 0.0008, z - 0.0005],
        "#212b30",
      );
    }
  } else {
    box(
      root,
      [w * 0.94, 0.002, d * 0.42],
      [0, h * 0.12, rear + d * 0.21 + 0.003],
      "#9ca6a9",
    );
    box(
      root,
      [0.002, h * 0.82, d * 0.56],
      [-w * 0.22, 0, rear + d * 0.58],
      "#305749",
    );
    box(
      root,
      [0.008, h * 0.58, d * 0.42],
      [-w * 0.22, 0, rear + d * 0.58],
      "#252d30",
    );
    box(root, [w, h, 0.002], [0, 0, rear + 0.002], "#9ca6a9");
    for (const side of [-1, 1]) {
      box(
        root,
        [w * 0.38, h * 0.6, 0.001],
        [side * w * 0.25, 0, rear + 0.0005],
        "#30393f",
      );
      // 上部支承向机内收窄，为下层网卡留出空间。
      const length = side < 0 ? d : d * 0.44;
      box(
        root,
        [0.002, h, length - 0.003],
        [side * (w / 2 - 0.001), 0, rear + (length + 0.003) / 2],
        "#899398",
      );
      box(
        root,
        [w * 0.08, 0.0015, length - 0.003],
        [side * w * 0.46, h / 2 - 0.00075, rear + (length + 0.003) / 2],
        "#9ba5aa",
      );
    }
  }
}

/** 2U 配置示意的折弯罩体，前后敞开，折肩给机盖边缘留出净空。 */
function foldedAirDuct(size: number[]) {
  const [width, height, depth] = size;
  const x = width / 2,
    y = height / 2,
    shoulder = height * 0.22,
    wall = 0.0012;
  const profile = new THREE.Shape();
  profile.moveTo(-x, -y);
  profile.lineTo(-x, y - shoulder);
  profile.lineTo(-x + shoulder, y);
  profile.lineTo(x - shoulder, y);
  profile.lineTo(x, y - shoulder);
  profile.lineTo(x, -y);
  profile.lineTo(x - wall, -y);
  profile.lineTo(x - wall, y - shoulder - wall / 2);
  profile.lineTo(x - shoulder - wall / 2, y - wall);
  profile.lineTo(-x + shoulder + wall / 2, y - wall);
  profile.lineTo(-x + wall, y - shoulder - wall / 2);
  profile.lineTo(-x + wall, -y);
  profile.closePath();
  const shell = new THREE.Mesh(
    new THREE.ExtrudeGeometry(profile, { depth, bevelEnabled: false }),
    new THREE.MeshPhysicalMaterial({
      color: "#85999c",
      roughness: 0.38,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
  );
  shell.position.z = -depth / 2;
  shell.name = "folded-air-duct";
  return shell;
}
function detail(
  root: THREE.Group,
  node: string,
  size: number[],
  box: Box,
  modelId: string,
) {
  const [w, h, d] = size;
  if (node === "board") board(root, size, box);
  else if (modelId === "server-1u" && node === "chip")
    compactPackage(root, box);
  else if (modelId === "server-1u" && node === "processor")
    compactHeatsink(root, box);
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
    const rear = -d / 2 + 0.0075;
    const tail = definition.serverPowerContact.bladeSize[2];
    box(
      root,
      [w, h, d - 0.0075 - tail],
      [0, 0, 0.00375 - tail / 2],
      "#7f8a93",
      0.8,
    );
    for (let i = 0; i < 7; i++)
      box(
        root,
        [w * 0.8, 0.002, 0.002],
        [0, ((i - 3) * h) / 9, rear - 0.001],
        "#21282e",
        0.1,
      );
    box(root, [w * 0.6, h * 0.6, 0.005], [0, 0, rear - 0.005], "#14191e", 0.2);
    box(root, [0.005, h * 0.65, 0.012], [w * 0.46, 0, rear], "#919d76", 0.5);
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
  } else if (node === "duct" && modelId === "server-2u") {
    root.add(foldedAirDuct(size));
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
  } else if (node === "io" && modelId === "server-2u") {
    managementInterface(root, size, box);
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
  } else
    box(root, size, [0, 0, 0], node === "lid" ? "#9aa5ae" : "#4e5a64", 0.75);
}
// M2 竖装 SSD 的金属盘体、侧盖与后端接触区均属同一个配置部件。
function serverSsd(root: THREE.Group, box: Box) {
  root.rotation.z = -Math.PI / 2;
  compactSsd(root, box, true);
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
      const slot = modelById(modelId).memoryLayout?.slots.find(
        (slot) => slot.id === ids[i].id,
      );
      child.position.set(slot?.x ?? x, 0, 0);
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
      const layout = modelById(modelId).fanDuctLayout;
      const slot = layout?.modules.find((module) => module.id === ids[i].id);
      if (layout && slot) {
        child.position.x =
          slot.rotorX.reduce((sum, x) => sum + x, 0) / slot.rotorX.length;
        for (const x of slot.rotorX) {
          const rotor = createFanModule(layout.rotorSize);
          rotor.position.x = x - child.position.x;
          child.add(rotor);
        }
        continue;
      }
      const w = (size[0] / count) * 0.9;
      child.position.x = ((i - (count - 1) / 2) * size[0]) / count;
      if (id === "net-fans" || id === "sto-fans") {
        child.userData.focusDirection = definition.fanModule.focusDirection;
        root.userData.focusDirection = definition.fanModule.focusDirection;
        const mode = id === "net-fans" ? "rotor" : "guard";
        child.add(createFanModule([w, size[1], size[2]], mode));
        if (mode === "guard") registerStorageFanMount(child);
        const {
          travel,
          focusDirection: [x, y, z],
        } =
          mode === "rotor"
            ? definition.switchAssembly.fanRotor
            : definition.storageAssembly.fanGuard;
        registerLayer(child, {
          node: mode === "rotor" ? "fan-rotor" : "fan-guard",
          offset: [0, 0, -travel],
          direction: [x, y, z],
        });
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
      if (bay) {
        compactTray(child, size[2], box);
        continue;
      }
      const w = 0.0148;
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
      compactSsd(child, box);
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
    box = makeEquipmentBox();
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
    const mount = model.controllerMount;
    const onControllerMount =
      mount && (p.id === mount.boardId || p.id === mount.controllerId);
    const compactInterface =
      model.id === "server-1u" &&
      (p.id === "nic-01" || p.id === "riser-01" || p.id === "io-01");
    if (
      model.category === "server" &&
      p.id !== model.compactHarness?.backplane &&
      !onControllerMount &&
      !compactInterface
    ) {
      if (p.id === "lid-01") {
        pos.splice(0, 3, 0, h / 2, 0);
        size.splice(0, 3, 0.44, 0.002, depth);
      } else if (p.node !== "psu") {
        pos[2] *= depth / 0.9;
        pos[1] *= model.units / 2;
        size[1] *= model.units / 2;
        size[2] *= depth / 0.9;
      }
      if (p.id === "board-01") {
        // M2 主板保留前沿 RTC 安装面，后缘仍接机后板段。
        pos.splice(0, 3, 0, -h / 2 + 0.005, -0.06);
        size.splice(0, 3, 0.428, 0.004, 0.28);
      }
      if (p.id === "memory-01") {
        pos.splice(
          0,
          3,
          0,
          model.memoryLayout?.centerY ?? 0.002,
          model.memoryLayout?.centerZ ?? -0.09,
        );
        size.splice(0, 3, 0.39, 0.03125, 0.13335);
      }
      if (p.id === "fans-01") {
        pos.splice(
          0,
          3,
          0,
          model.fanDuctLayout?.rotorY ?? 0,
          model.fanDuctLayout?.rotorZ ?? 0.1,
        );
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
        if (model.fanDuctLayout) {
          size.splice(0, 3, ...model.fanDuctLayout.ductSize);
          pos.splice(0, 3, ...model.fanDuctLayout.ductCenter);
        } else {
          size[1] = h * 0.25;
          pos[1] = h * 0.25;
        }
      }
    }
    if (model.compactDrive && (p.node === "storage" || p.node === "drives")) {
      const { trayDepth, frontInset } = model.compactDrive;
      pos[2] = depth / 2 - frontInset - trayDepth / 2;
      size[2] = trayDepth;
    }
    group.position.fromArray(pos);
    root.add(group);
    groups.set(p.id, group);
    positions.set(p.id, group.position.clone());
    if (
      model.rtcMount?.batteryId === p.id ||
      model.compactHarness?.harness === p.id
    )
      continue;
    if (model.storageHarness && isStorageHarnessPart(p.id)) continue;
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
      if (
        model.expansionBay &&
        [
          model.expansionBay.adapter,
          model.expansionBay.carrier,
          model.expansionBay.adjacent,
        ].includes(p.id)
      )
        expansionPart(group, p, box);
      else if (model.managementSlide?.partId === p.id)
        compactManagementInterface(group, size, box, model.managementSlide);
      else if (compactInterface) compactRearInterface(group, p.node, size, box);
      else if (mount && p.id === mount.controllerId) {
        // 按控制卡节点外廓画底座、板体与上部组件，外部端口归属独立网卡。
        const [w, h, d] = size;
        box(
          group,
          [w * 0.82, h * 0.32, d * 0.83],
          [0, -h * 0.34, 0],
          "#373a39",
        );
        box(group, [w, h * 0.14, d], [0, -h * 0.11, 0], "#305448");
        box(
          group,
          [w * 0.92, h * 0.54, d * 0.84],
          [0, h * 0.23, 0],
          "#858b8d",
          0.7,
        );
      } else if (p.id === "net-board") switchBoard(group, size, box);
      else if (model.category !== "server" && p.node === "psu")
        rearPowerSupply(
          group,
          size,
          box,
          (depth - size[2]) / 2 + pos[2],
          model.id === "storage-4u"
            ? definition.storageAssembly.powerTray
            : definition.switchAssembly.powerTray,
        );
      else if (p.id === "net-ports") switchPortCages(group, size, box);
      else if (p.id === "net-asic") switchAsic(group, size, box);
      else if (p.id === "sto-midplane") storageMidplane(group, size, box);
      else detail(group, p.node, size, box, modelId);
      if (p.id === "board-01" && !onControllerMount) {
        const tail = new THREE.Group();
        tail.position.z = -(size[2] + 0.14) / 2;
        group.add(tail);
        // 后段主板沿并排电源槽的内侧延伸。
        tail.position.x = 0.075;
        board(tail, [0.27, 0.004, 0.14], box);
      }
    }
  }
  if (modelId === "switch-1u") {
    buildSwitchFanContacts(groups, box);
    buildAsicContacts(groups, box);
  }
  if (model.rtcMount) {
    const board = groups.get(model.rtcMount.boardId)!;
    board.updateWorldMatrix(true, false);
    const plate = board.getObjectByName("board-substrate")!;
    buildRtcMount(
      groups,
      positions,
      new THREE.Box3().setFromObject(plate).max.y,
      box,
    );
  }
  if (model.compactHarness) {
    buildCompactHarness(groups, positions, box);
    buildCompactStoragePath(groups, box);
  }
  if (model.storageHarness) buildStorageHarness(groups, positions, box);
  if (model.category === "server") seatProcessors(modelId, groups, positions);
  if (model.processorSeat) registerCompactProcessorSeats(groups);
  if (modelId === "server-2u") registerServerProcessorSeats(groups);
  if (model.powerBays) buildServerPowerContacts(groups, box, modelId);
  root.updateMatrixWorld(true);
  return { root, groups, positions };
}
/** 给已获准的 2U 贡献结构补充独立原创 FRU；位置参照该模型的实际包围盒。 */
export function completeServerAssembly(
  root: THREE.Group,
  groups: Map<string, THREE.Group>,
  positions: Map<string, THREE.Vector3>,
) {
  const box = makeEquipmentBox();
  root.updateMatrixWorld(true);
  const model = modelById("server-2u");
  const bay = model.expansionBay!;
  for (const part of partsForModel("server-2u").filter(
    (part) => part.procedural,
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
    } else if ([bay.adapter, bay.carrier, bay.adjacent].includes(part.id))
      expansionPart(group, part, box);
    else if (
      part.id !== model.rtcMount!.batteryId &&
      !isStorageHarnessPart(part.id)
    )
      detail(group, part.node, part.size, box, "server-2u");
    root.add(group);
    groups.set(part.id, group);
    positions.set(part.id, group.position.clone());
  }
  replaceRtcProxy(groups.get(model.rtcMount!.boardId)!);
  buildRtcMount(groups, positions, model.rtcMount!.boardPoint[1], box);
  buildStorageHarness(groups, positions, box);
  buildServerPowerContacts(groups, box, model.id);
  seatProcessors("server-2u", groups, positions);
  registerServerProcessorSeats(groups);
  root.updateMatrixWorld(true);
}

// 组装阶段的节点位于同一设备坐标系，封装上表面贴合同号散热器底面。
function seatProcessors(
  modelId: string,
  groups: Assembly["groups"],
  positions: Assembly["positions"],
) {
  const contacts = modelById(modelId).processorContacts;
  for (const { primary, companion } of processorPairs(modelId)) {
    const chip = groups.get(primary.id)!;
    const sink = groups.get(companion.id)!;
    const sinkBounds = new THREE.Box3().setFromObject(sink);
    const contact = sinkBounds.getCenter(new THREE.Vector3());
    contact.y = sinkBounds.min.y;
    // M1 的散热器向前延伸。简模基座和补充封装共用详细模型底部接触面。
    const seat = contacts?.find((item) => item.slot === companion.slot);
    if (seat) {
      const center = new THREE.Vector3().fromArray(seat.center);
      sink.position.copy(center);
      positions.set(companion.id, sink.position.clone());
      contact.copy(center);
    }
    const cap = new THREE.Box3().setFromObject(chip);
    const top = cap.getCenter(new THREE.Vector3());
    top.y = cap.max.y;
    const offset = contact.sub(top);
    chip.position.add(offset);
    positions.set(primary.id, chip.position.clone());
  }
}
