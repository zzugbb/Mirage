import * as THREE from "three";
import { parts } from "../domain";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import serverUrl from "../../assets/public/models/server-2u.glb?url";
import coolingUrl from "../../assets/public/models/cooling-unit.glb?url";
import powerUrl from "../../assets/public/models/power-cabinet.glb?url";

export const hardwareUrls = {
  server: serverUrl,
  cooling: coolingUrl,
  power: powerUrl,
};
export const loadHardware = async (url: string) =>
  (await new GLTFLoader().loadAsync(url)).scene;
export const partNodes: Record<string, string[]> = Object.fromEntries(
  parts.map((part) => [part.id, part.modelNodes]),
);

export function normalizeModel(
  scene: THREE.Group,
  dimension: "width" | "height",
  target: number,
  ground = false,
) {
  const root = new THREE.Group();
  const imported = new THREE.Group();
  imported.add(scene);
  root.add(imported);
  const bounds = new THREE.Box3().setFromObject(scene);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const measured = dimension === "width" ? size.x : size.y;
  if (!Number.isFinite(measured) || measured <= 0) throw Error("模型尺寸无效");
  const scale = target / measured;
  imported.scale.setScalar(scale);
  imported.position.copy(center).multiplyScalar(-scale);
  if (ground) imported.position.y = -bounds.min.y * scale;
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      const mats = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of mats) {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.roughness = THREE.MathUtils.clamp(
            material.roughness,
            0.28,
            0.85,
          );
          material.envMapIntensity = 0.8;
        }
      }
    }
  });
  root.updateMatrixWorld(true);
  return root;
}

export function mapServerParts(scene: THREE.Group) {
  const root = normalizeModel(scene, "width", definition.server.size[0]);
  const groups = new Map<string, THREE.Group>();
  const positions = new Map<string, THREE.Vector3>();
  for (const [id, names] of Object.entries(partNodes)) {
    const nodes = names.map((name) => root.getObjectByName(name));
    if (nodes.some((node) => !node)) throw Error("模型缺少已登记的部件节点");
    const bounds = new THREE.Box3();
    for (const node of nodes)
      bounds.union(new THREE.Box3().setFromObject(node!));
    const group = new THREE.Group();
    group.position.copy(bounds.getCenter(new THREE.Vector3()));
    group.userData.entityId = id;
    root.add(group);
    group.updateMatrixWorld(true);
    for (const node of nodes) group.attach(node!);
    if (id === "lid-01" || id.startsWith("cpu-") || id.startsWith("psu-")) {
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const apply = (material: THREE.Material) => {
            if (!(material instanceof THREE.MeshStandardMaterial))
              return material;
            const adjusted = material.clone();
            adjusted.metalness = id === "lid-01" ? 0.78 : 0.68;
            adjusted.roughness = 0.38;
            if (!adjusted.map) adjusted.color.set("#9a9fa5");
            return adjusted;
          };
          object.material = Array.isArray(object.material)
            ? object.material.map(apply)
            : apply(object.material);
        }
      });
    }
    groups.set(id, group);
    positions.set(id, group.position.clone());
  }
  root.updateMatrixWorld(true);
  return { root, groups, positions };
}
