import * as THREE from "three";
import { observationColor } from "./metric-color";
import { racks, devices, rackForDevice, deviceHeight } from "../installation";
import type { AppState } from "../domain";
import type { SpatialReading } from "../spatial";
import { signalFor, signalStyles } from "../status";
import { text } from "./models";
import type { SceneModel } from "./models";

type ProxyBatch = {
  mesh: THREE.InstancedMesh;
  offsets: THREE.Vector3[];
  ids: string[];
  light: boolean;
};
/** 远景设备只绘制外壳、面板、托架与状态灯；详细 GLB 始终只保留当前一台。 */
export class InstallationScene {
  root = new THREE.Group();
  racks = new Map<string, THREE.Group>();
  devices = new Map<string, THREE.Group>();
  batches: ProxyBatch[] = [];
  visibilityKey = "";
  appearanceKey = "";
  constructor(models: SceneModel) {
    for (const rack of racks) {
      const group = models.rack.clone(true);
      group.traverse((object) => {
        object.userData = {};
      });
      group.userData.entityId = rack.id;
      group.position.fromArray(rack.position);
      this.root.add(group);
      this.racks.set(rack.id, group);
      for (const child of [...group.children])
        if (child instanceof THREE.Sprite) group.remove(child);
      text(group, rack.name.slice(0, 3), [0, 2.36, 0], 0.1);
      for (const child of group.children)
        if (child.name === "rack-door") child.rotation.y = 0;
    }
    const boundsGeometry = new THREE.BoxGeometry(0.4826, 0.089, 0.9);
    const boundsMaterial = new THREE.MeshBasicMaterial();
    for (const device of devices) {
      const group = new THREE.Group();
      group.userData.entityId = device.id;
      const rack = rackForDevice(device.id);
      group.position.set(
        rack.position[0],
        deviceHeight(device.id),
        rack.position[2] + 0.105,
      );
      const bounds = new THREE.Mesh(boundsGeometry, boundsMaterial);
      bounds.visible = false;
      group.add(bounds);
      this.root.add(group);
      this.devices.set(device.id, group);
    }
    const batch = (
      size: number[],
      color: string,
      offsets: number[][],
      metalness = 0.5,
      light = false,
    ) => {
      const ids: string[] = [],
        positions: THREE.Vector3[] = [];
      for (const device of devices)
        for (const offset of offsets) {
          ids.push(device.id);
          positions.push(new THREE.Vector3(...offset));
        }
      const material = light
        ? new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false })
        : new THREE.MeshStandardMaterial({ color, roughness: 0.43, metalness });
      const mesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(...(size as [number, number, number])),
        material,
        ids.length,
      );
      mesh.userData.instanceEntityIds = ids;
      mesh.userData.instanceVisible = [];
      mesh.castShadow = !light;
      mesh.receiveShadow = !light;
      this.root.add(mesh);
      this.batches.push({ mesh, offsets: positions, ids, light });
    };
    batch([0.468, 0.084, 0.86], "#626d79", [[0, 0, 0]], 0.68);
    batch([0.47, 0.075, 0.018], "#222b36", [[0, 0, 0.438]], 0.45);
    batch(
      [0.049, 0.064, 0.009],
      "#3d4957",
      Array.from({ length: 8 }, (_, i) => [-0.196 + i * 0.056, 0, 0.453]),
      0.5,
    );
    batch(
      [0.032, 0.005, 0.007],
      "#9ba8b7",
      Array.from({ length: 8 }, (_, i) => [-0.196 + i * 0.056, -0.014, 0.46]),
      0.7,
    );
    batch(
      [0.018, 0.079, 0.023],
      "#8a97a8",
      [
        [-0.245, 0, 0.441],
        [0.245, 0, 0.441],
      ],
      0.75,
    );
    batch([0.055, 0.004, 0.004], "#ffffff", [[-0.19, 0.025, 0.466]], 0, true);
  }
  update(state: AppState, inspection: number) {
    this.root.visible = state.level !== "device" && inspection === 0;
    const activeRack = rackForDevice(state.deviceId).id;
    for (const [id, group] of this.racks)
      group.visible = state.level === "room" && id !== activeRack;
    const key = `${state.level}:${state.deviceId}:${inspection === 0}`;
    if (key === this.visibilityKey) return;
    this.visibilityKey = key;
    const matrix = new THREE.Matrix4(),
      position = new THREE.Vector3(),
      scale = new THREE.Vector3();
    for (const [id, group] of this.devices)
      group.visible =
        id !== state.deviceId &&
        (state.level === "room" || rackForDevice(id).id === activeRack);
    for (const batch of this.batches) {
      batch.ids.forEach((id, index) => {
        const group = this.devices.get(id)!;
        const visible = group.visible;
        position.copy(group.position).add(batch.offsets[index]);
        scale.setScalar(visible ? 1 : 0);
        matrix.compose(position, new THREE.Quaternion(), scale);
        batch.mesh.setMatrixAt(index, matrix);
        batch.mesh.userData.instanceVisible[index] = visible;
      });
      batch.mesh.instanceMatrix.needsUpdate = true;
      batch.mesh.computeBoundingSphere();
    }
  }
  updateAppearance(
    state: AppState,
    mode: string,
    readings: Map<string, SpatialReading>,
  ) {
    const key = `${state.time}:${state.replayCycle}:${mode}`;
    if (key === this.appearanceKey) return;
    this.appearanceKey = key;
    const color = new THREE.Color(),
      white = new THREE.Color("#ffffff");
    for (const batch of this.batches) {
      batch.ids.forEach((id, index) => {
        const reading = readings.get(id)!;
        const signal = signalFor(reading);
        color.set(signalStyles[signal].color);
        if (!batch.light) {
          if (mode === "temperature" || mode === "power")
            color.copy(observationColor(reading, mode));
          color.lerp(
            white,
            mode === "temperature" || mode === "power" ? 0.78 : 1,
          );
        }
        if (batch.light && mode === "object") color.set("#5e8a7f");
        batch.mesh.setColorAt(index, color);
      });
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    }
  }
  detach() {
    this.root.traverse((object) => {
      if (object instanceof THREE.Sprite) {
        object.material.map?.dispose();
        object.material.dispose();
      }
    });
    for (const batch of this.batches) {
      batch.mesh.geometry.dispose();
      (batch.mesh.material as THREE.Material).dispose();
    }
    this.root.removeFromParent();
  }
}
