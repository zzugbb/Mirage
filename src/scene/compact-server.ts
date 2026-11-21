import * as THREE from "three";
import { createEquipmentAssembly } from "./equipment-model.ts";
import { compactDriveBays } from "../compact-drive-bays.ts";
import { modelById } from "../catalog.ts";

/** 保留已审核贴图与材质的贡献模型；零件重定父节点时保留装配矩阵。 */
export function mapCompactServer(root: THREE.Group) {
  const groups = new Map<string, THREE.Group>();
  const positions = new Map<string, THREE.Vector3>();
  const attach = (id: string, names: string[]) => {
    const nodes = names.map((name) => root.getObjectByName(name));
    if (nodes.some((node) => !node)) throw Error("1U 模型缺少已登记节点");
    const bounds = new THREE.Box3();
    for (const node of nodes)
      bounds.union(new THREE.Box3().setFromObject(node!));
    const group = new THREE.Group();
    bounds.getCenter(group.position);
    group.userData.entityId = id;
    root.add(group);
    group.updateMatrixWorld(true);
    for (const node of nodes) group.attach(node!);
    groups.set(id, group);
    positions.set(id, group.position.clone());
    return group;
  };
  const mapping: Record<string, string[]> = {
    "lid-01": ["compact_cover"],
    "board-01": ["compact_mainboard"],
    "cpu-01": ["compact_heatsink_a"],
    "cpu-02": ["compact_heatsink_b"],
    "memory-01": ["compact_memory"],
    "fans-01": ["compact_fans", "compact_fan_frame"],
    "storage-01": ["compact_bays"],
    "psu-01": ["compact_psu_a"],
    "psu-02": ["compact_psu_b"],
    "backplane-01": ["compact_backplane"],
    "nic-01": ["compact_nic"],
    "raid-01": ["compact_controller"],
    "duct-01": ["compact_airduct"],
    "io-01": ["compact_io"],
  };
  for (const [id, names] of Object.entries(mapping)) attach(id, names);
  for (let i = 1; i <= 8; i++)
    attach(`dimm-${String(i).padStart(2, "0")}`, [`compact_dimm_${i}`]);
  for (let i = 1; i <= 4; i++) {
    attach(`fan-${String(i).padStart(2, "0")}`, [
      `compact_rotor_${i * 2 - 1}`,
      `compact_rotor_${i * 2}`,
    ]);
  }
  for (const bay of compactDriveBays)
    attach(bay.tray.id, [`compact_bay_${Number(bay.number)}`]);
  // 子件归入各自模组，矩阵不变；每个热插拔风扇模组包含两个转子。
  for (const [id, group] of groups) {
    const parent = id.startsWith("dimm-")
      ? "memory-01"
      : id.startsWith("fan-")
        ? "fans-01"
        : id.startsWith("bay-")
          ? "storage-01"
          : null;
    if (parent) {
      groups.get(parent)!.attach(group);
      positions.delete(id);
    }
  }
  const supplement = createEquipmentAssembly("server-1u");
  for (const id of modelById("server-1u").parts) {
    if (groups.has(id)) continue;
    const group = supplement.groups.get(id)!;
    root.attach(group);
    groups.set(id, group);
    positions.set(id, group.position.clone());
  }
  // 磁盘与托架分别可选，磁盘安装姿态跟随对应实际盘位。
  for (const { disk, tray } of compactDriveBays) {
    const id = disk.id;
    const group = supplement.groups.get(id)!;
    const bounds = new THREE.Box3().setFromObject(groups.get(tray.id)!);
    groups.get("drives-01")!.attach(group);
    const center = bounds.getCenter(new THREE.Vector3());
    group.parent!.worldToLocal(center);
    group.position.copy(center);
    groups.set(id, group);
  }
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      if (material instanceof THREE.MeshStandardMaterial && material.map)
        material.map.anisotropy = 8;
    }
    object.castShadow = object.receiveShadow = true;
  });
  // 剩余简化件不属于当前装配，释放其几何；已附着的件由场景统一释放。
  const used = new Set<THREE.BufferGeometry>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) used.add(o.geometry);
  });
  supplement.root.traverse((o) => {
    if (o instanceof THREE.Mesh && !used.has(o.geometry)) o.geometry.dispose();
  });
  root.updateMatrixWorld(true);
  return { root, groups, positions };
}
