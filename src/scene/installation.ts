import { equipmentModels, modelForDevice } from "../catalog";
import * as THREE from "three";
import { observationColor } from "./metric-color";
import { racks, devices, rackForDevice, deviceHeight } from "../installation";
import type { AppState } from "../domain";
import type { SpatialReading } from "../spatial";
import { signalFor, signalStyles } from "../status";
import { pdus } from "../power-config.ts";
import { text } from "./models";
import type { SceneModel } from "./models";

type ProxyBatch = {
  mesh: THREE.InstancedMesh;
  offsets: THREE.Vector3[];
  ids: string[];
  light: boolean;
  transform?: THREE.Matrix4;
};
/** 远景复用实例化外观与状态灯；仅当前设备展示可交互的详细装配。 */
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
      for (const pdu of pdus.filter((pdu) => pdu.rackId === rack.id))
        group.getObjectByName(`pdu-${pdu.feed}`)!.userData.entityId = pdu.id;
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
        rack.position[2] + 0.555 - modelForDevice(device.id).depth / 2,
      );
      const bounds = new THREE.Mesh(boundsGeometry, boundsMaterial);
      const model = modelForDevice(device.id);
      bounds.scale.set(1, model.units / 2, model.depth / 0.9);
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
      modelId = "server-2u",
    ) => {
      const ids: string[] = [],
        positions: THREE.Vector3[] = [];
      for (const device of devices.filter(
        (device) => device.modelId === modelId,
      ))
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
    for (const model of equipmentModels) {
      const height = model.units * 0.04445 - 0.003,
        depth = model.depth;
      const add = (
        size: number[],
        color: string,
        offsets: number[][],
        metalness = 0.5,
        light = false,
      ) => batch(size, color, offsets, metalness, light, model.id);
      add([0.468, height, depth], "#5e6973", [[0, 0, 0]], 0.7);
      add(
        [0.47, height - 0.004, 0.014],
        model.category === "switch" ? "#35413c" : "#1e282f",
        [[0, 0, depth / 2 + 0.005]],
        0.5,
      );
      add(
        [0.018, height, 0.02],
        "#8d989f",
        [
          [-0.245, 0, depth / 2],
          [0.245, 0, depth / 2],
        ],
        0.75,
      );
      if (model.category === "switch") {
        const ports = Array.from({ length: 48 }, (_, i) => [
          -0.19 + (i % 24) * 0.0125,
          (Math.floor(i / 24) - 0.5) * 0.013,
          depth / 2 + 0.017,
        ]);
        add([0.01, 0.011, 0.008], "#9ba7ad", ports, 0.8);
        add(
          [0.007, 0.007, 0.003],
          "#0d141a",
          ports.map((p) => [p[0], p[1], p[2] + 0.005]),
          0.1,
        );
        add(
          [0.018, 0.011, 0.008],
          "#a7b2b8",
          Array.from({ length: 6 }, (_, i) => [
            0.14 + (i % 3) * 0.026,
            (Math.floor(i / 3) - 0.5) * 0.013,
            depth / 2 + 0.017,
          ]),
          0.8,
        );
      } else {
        const count = model.drives,
          span = model.id === "server-2u" ? 0.137 : 0.41;
        const lff = model.category === "storage";
        const offset = Array.from({ length: count }, (_, i) => [
          lff
            ? (((i % 4) - 1.5) * span) / 4
            : -span / 2 + ((i + 0.5) * span) / count,
          lff ? ((2.5 - Math.floor(i / 4)) * height) / 6 : 0,
          depth / 2 + 0.017,
        ]);
        add(
          [
            (span / (lff ? 4 : count)) * 0.84,
            height * (lff ? 0.14 : 0.8),
            0.009,
          ],
          "#46515b",
          offset,
          0.55,
        );
        add(
          [(span / (lff ? 4 : count)) * 0.58, 0.003, 0.005],
          "#a8b4bb",
          offset.map((p) => [
            p[0],
            p[1] - height * (lff ? 0.03 : 0.22),
            p[2] + 0.006,
          ]),
          0.7,
        );
      }
      add(
        [0.025, 0.003, 0.004],
        "#ffffff",
        [[-0.22, height * 0.3, depth / 2 + 0.024]],
        0,
        true,
      );
    }
  }
  /** 复用同一份贡献几何与贴图实例化远景，进入设备时再切换详细装配。 */
  installExterior(modelId: string, exterior: THREE.Group) {
    const members = devices.filter((device) => device.modelId === modelId);
    if (!members.length) return;
    this.batches = this.batches.filter((batch) => {
      if (
        batch.light ||
        !members.some((device) => batch.ids.includes(device.id))
      )
        return true;
      batch.mesh.removeFromParent();
      batch.mesh.geometry.dispose();
      (batch.mesh.material as THREE.Material).dispose();
      return false;
    });
    exterior.updateWorldMatrix(true, true);
    const inverse = exterior.parent!.matrixWorld.clone().invert();
    exterior.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = Array.isArray(object.material)
        ? object.material.map((m) => m.clone())
        : object.material.clone();
      const mesh = new THREE.InstancedMesh(
        object.geometry.clone(),
        material,
        members.length,
      );
      const ids = members.map((device) => device.id);
      mesh.userData.instanceEntityIds = ids;
      mesh.userData.instanceVisible = [];
      mesh.castShadow = mesh.receiveShadow = true;
      this.root.add(mesh);
      this.batches.push({
        mesh,
        ids,
        offsets: members.map(() => new THREE.Vector3()),
        light: false,
        transform: inverse.clone().multiply(object.matrixWorld),
      });
    });
    this.visibilityKey = this.appearanceKey = "";
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
        if (batch.transform) matrix.multiply(batch.transform);
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
      for (const material of Array.isArray(batch.mesh.material)
        ? batch.mesh.material
        : [batch.mesh.material])
        material.dispose();
    }
    this.root.removeFromParent();
  }
}
