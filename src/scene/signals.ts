import { createAnnotationGroup } from "./annotations.ts";
import { modelForDevice } from "../catalog.ts";
import * as THREE from "three";
import {
  racks,
  devices,
  rackForDevice,
  deviceHeight,
} from "../installation.ts";
import type { AppState } from "../domain";
import type { SpatialReading } from "../spatial.ts";
import { signalStyles } from "../status.ts";
import type { SceneModel } from "./models";

type AlarmSignal = "warning" | "critical";

type Mark = { root: THREE.Mesh; material: THREE.MeshBasicMaterial; id: string };
/** 只有告警视图显示设备告警，不叠加运行状态或模型评估。 */
export function visibleSignal(
  reading: SpatialReading | undefined,
  mode: string,
): AlarmSignal | null {
  if (mode !== "alarms" || !reading?.alarm) return null;
  return reading.alarm === 2 ? "critical" : "warning";
}

function polygon(points: number[][]) {
  const vertices: number[] = [];
  for (let i = 1; i < points.length - 1; i++)
    for (const [x, y] of [points[0], points[i], points[i + 1]])
      vertices.push(x, y, 0);
  return new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
}

export class SpatialSignals {
  root = createAnnotationGroup("signals");
  rackMarks: Mark[] = [];
  deviceMarks: Mark[] = [];
  geometries: Record<AlarmSignal, THREE.BufferGeometry> = {
    warning: polygon([
      [0, 1],
      [-1, -0.8],
      [1, -0.8],
    ]),
    critical: polygon([
      [0, 1],
      [-1, 0],
      [0, -1],
      [1, 0],
    ]),
  };
  constructor() {
    const create = (id: string, rack: boolean): Mark => {
      const material = new THREE.MeshBasicMaterial({
        color: "#ffffff",
        side: THREE.DoubleSide,
        toneMapped: false,
        depthTest: true,
        transparent: true,
        depthWrite: false,
      });
      const root = new THREE.Mesh(this.geometries.warning, material);
      root.scale.setScalar(rack ? 0.098 : 0.025);
      root.userData.entityId = id;
      this.root.add(root);
      return { root, material, id };
    };
    this.rackMarks = racks.map((r) => create(r.id, true));
    this.deviceMarks = devices.map((d) => create(d.id, false));
  }
  update(
    state: AppState,
    mode: string,
    readings: Map<string, SpatialReading>,
    models: SceneModel,
    inspection: number,
    camera: THREE.Camera,
  ) {
    this.root.visible = mode === "alarms";
    const activeRack = rackForDevice(state.deviceId).id;
    for (const [marks, rackLevel] of [
      [this.rackMarks, true],
      [this.deviceMarks, false],
    ] as const) {
      for (const mark of marks) {
        const signal = visibleSignal(readings.get(mark.id), mode);
        const rack = rackLevel
          ? racks.find((r) => r.id === mark.id)!
          : rackForDevice(mark.id);
        mark.root.visible =
          !!signal &&
          inspection === 0 &&
          (rackLevel
            ? state.level === "room"
            : state.level === "rack" && rack.id === activeRack);
        if (!mark.root.visible || !signal) continue;
        mark.root.geometry = this.geometries[signal];
        mark.material.color.set(signalStyles[signal].color);
        mark.root.quaternion.copy(camera.quaternion);
        if (rackLevel)
          mark.root.position.set(
            rack.position[0] - 0.39,
            rack.position[1] + 2.24,
            rack.position[2] + 0.72,
          );
        else {
          if (mark.id === state.deviceId)
            models.server.getWorldPosition(mark.root.position);
          else
            mark.root.position.set(
              rack.position[0],
              deviceHeight(mark.id),
              rack.position[2] + 0.555 - modelForDevice(mark.id).depth / 2,
            );
          mark.root.position.x -= 0.26;
          mark.root.position.z += modelForDevice(mark.id).depth / 2 + 0.035;
        }
      }
    }
  }
  dispose() {
    Object.values(this.geometries).forEach((g) => g.dispose());
    [...this.rackMarks, ...this.deviceMarks].forEach((m) =>
      m.material.dispose(),
    );
    this.root.clear();
    this.root.removeFromParent();
  }
}
