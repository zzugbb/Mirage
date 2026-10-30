import * as THREE from "three";
import { observationColor } from "./metric-color";
import { racks, devices, rackForDevice, deviceHeight } from "../installation";
import type { AppState } from "../domain";
import type { SpatialReading } from "../spatial";
import { signalFor, signalStyles } from "../status";
import type { SceneModel } from "./models";

type Mark = {
  root: THREE.Group;
  material: THREE.MeshBasicMaterial;
  id: string;
};
/** 小面积状态灯和地面轮廓保留实物材质；仅异常标记轻微呼吸，不用整柜闪烁。 */
export class SpatialSignals {
  root = new THREE.Group();
  rackMarks: Mark[] = [];
  deviceMarks: Mark[] = [];
  partMarks = new Map<string, { box: THREE.Box3Helper; dot: THREE.Mesh }>();
  constructor() {
    const create = (
      id: string,
      position: THREE.Vector3,
      rack: boolean,
    ): Mark => {
      const root = new THREE.Group();
      root.position.copy(position);
      this.root.add(root);
      const material = new THREE.MeshBasicMaterial({
        color: "#31d6a2",
        toneMapped: false,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const add = (size: number[], pos: number[]) => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(...(size as [number, number, number])),
          material,
        );
        mesh.position.fromArray(pos);
        root.add(mesh);
      };
      if (rack) {
        for (const x of [-0.305, 0.305])
          add([0.014, 1.98, 0.018], [x, 1.1, 0.585]);
        for (const z of [-0.58, 0.61]) add([0.69, 0.004, 0.014], [0, 0.064, z]);
        for (const x of [-0.34, 0.34])
          add([0.014, 0.004, 1.2], [x, 0.064, 0.015]);
        add([0.56, 0.012, 0.018], [0, 2.14, 0.59]);
      } else {
        add([0.31, 0.006, 0.008], [-0.03, 0.031, 0.492]);
        add([0.006, 0.066, 0.008], [-0.243, 0, 0.492]);
      }
      return { root, material, id };
    };
    for (const rack of racks)
      this.rackMarks.push(
        create(rack.id, new THREE.Vector3(...rack.position), true),
      );
    for (const device of devices) {
      const rack = rackForDevice(device.id);
      this.deviceMarks.push(
        create(
          device.id,
          new THREE.Vector3(
            rack.position[0],
            deviceHeight(device.id),
            rack.position[2] + 0.105,
          ),
          false,
        ),
      );
    }
  }
  update(
    state: AppState,
    mode: string,
    readings: Map<string, SpatialReading>,
    models: SceneModel,
    inspection: number,
    explosion: number,
    time: number,
    reduced: boolean,
  ) {
    this.root.visible = mode !== "object";
    const activeRack = rackForDevice(state.deviceId).id;
    for (const mark of this.rackMarks) {
      mark.root.visible =
        inspection === 0 &&
        (state.level === "room" ||
          (state.level === "rack" && mark.id === activeRack));
      const reading = readings.get(mark.id)!;
      const signal = signalFor(reading);
      mark.material.color.copy(observationColor(reading, mode));
      mark.material.opacity =
        signal === "critical" && !reduced
          ? 0.78 + 0.2 * Math.sin(time * 0.003)
          : signal === "normal"
            ? 0.6
            : 0.92;
    }
    for (const mark of this.deviceMarks) {
      mark.root.visible =
        inspection === 0 &&
        state.level === "rack" &&
        rackForDevice(mark.id).id === activeRack;
      const reading = readings.get(mark.id)!;
      mark.material.color.copy(observationColor(reading, mode));
      mark.material.opacity = 0.95;
      if (mark.id === state.deviceId) {
        models.server.getWorldPosition(mark.root.position);
      } else {
        const rack = rackForDevice(mark.id);
        mark.root.position.set(
          rack.position[0],
          deviceHeight(mark.id),
          rack.position[2] + 0.105,
        );
      }
    }
    // 模型分级只显示异常部件的细轮廓，和设备级告警分开。
    for (const [id, group] of models.parts) {
      let mark = this.partMarks.get(id);
      if (!mark) {
        const box = new THREE.Box3Helper(new THREE.Box3(), "#ffb547");
        (box.material as THREE.LineBasicMaterial).toneMapped = false;
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.003, 10, 8),
          new THREE.MeshBasicMaterial({ color: "#31d6a2", toneMapped: false }),
        );
        this.root.add(box, dot);
        mark = { box, dot };
        this.partMarks.set(id, mark);
      }
      const reading = readings.get(id);
      const show =
        state.level === "device" &&
        inspection === 1 &&
        explosion > 0.25 &&
        (mode === "status" || mode === "temperature");
      mark.box.visible =
        show &&
        !!reading?.evaluation &&
        (reading.evaluation === 2 || state.selected === id);
      mark.dot.visible =
        show && mode === "status" && !!reading && reading.quality === "valid";
      if (show && reading) {
        const color = signalStyles[signalFor(reading)].color;
        mark.box.box.setFromObject(group).expandByScalar(0.002);
        (mark.box.material as THREE.LineBasicMaterial).color.set(color);
        mark.box.box.getCenter(mark.dot.position);
        mark.dot.position.y = mark.box.box.max.y + 0.009;
        (mark.dot.material as THREE.MeshBasicMaterial).color.set(color);
      }
    }
  }
}
