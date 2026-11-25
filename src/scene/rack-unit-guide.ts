import { inspectRackSpace, type RackUnitRange } from "../rack-space.ts";
import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { deviceById, rackById, rackForDevice } from "../installation.ts";
import { modelForDevice, unitLabel } from "../catalog.ts";
import type { AppState } from "../domain.ts";

/** 安装范围始终来自配置，不跟随抽出中的机箱，也不表示可分配容量。 */
export function rackUnitSpan(
  state: AppState,
  range: RackUnitRange | null = null,
) {
  const rangeRack =
    range &&
    (state.level === "rack"
      ? rackForDevice(state.deviceId)
      : state.level === "room"
        ? rackById(state.selected)
        : undefined);
  if (range && rangeRack?.id === range.rackId && inspectRackSpace(range)) {
    return {
      id: `range:${range.first}:${range.last}`,
      label:
        range.first === range.last
          ? `U${range.first}`
          : `U${range.first}–${range.last}`,
      rack: rangeRack,
      first: range.first,
      last: range.last,
      bottom:
        definition.rack.unitOrigin +
        (range.first - 0.5) * definition.rack.unitPitch,
      top:
        definition.rack.unitOrigin +
        (range.last + 0.5) * definition.rack.unitPitch,
    };
  }
  const device = deviceById(state.selected);
  if (
    state.level !== "rack" ||
    !device ||
    device.rackId !== rackForDevice(state.deviceId).id
  )
    return null;
  const first = device.startUnit,
    last = first + modelForDevice(device.id).units - 1;
  return {
    id: device.id,
    label: unitLabel(device.id),
    rack: rackForDevice(device.id),
    first,
    last,
    bottom:
      definition.rack.unitOrigin + (first - 0.5) * definition.rack.unitPitch,
    top: definition.rack.unitOrigin + (last + 0.5) * definition.rack.unitPitch,
  };
}

/** 一条局部括线与短标；有深度遮挡，不覆盖整柜或复用指标颜色。 */
export class RackUnitGuide extends THREE.Group {
  private line = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color: "#b7e8e8",
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  private label: THREE.Sprite | null = null;
  private key = "";
  private rear = false;
  private makeLabel: (label: string) => THREE.Sprite;
  constructor(makeLabel: (label: string) => THREE.Sprite) {
    super();
    this.makeLabel = makeLabel;
    this.name = "rack-unit-guide";
    this.add(this.line);
    this.visible = false;
    this.line.raycast = () => {};
  }
  update(
    state: AppState,
    camera: THREE.Vector3,
    inspecting: boolean,
    range: RackUnitRange | null = null,
  ) {
    const span = rackUnitSpan(state, range);
    this.visible = !!span && !inspecting;
    if (!span || inspecting) return;
    const dz = camera.z - span.rack.position[2];
    if (Math.abs(dz) > 0.2) this.rear = dz < 0;
    const key = `${span.rack.id}:${span.id}:${this.rear}`;
    if (this.key === key) return;
    this.key = key;
    this.position.fromArray(span.rack.position);
    // 正面避开左侧开启的前门；后面沿同一侧安装边界观察。
    const side = 1;
    const x = side * (definition.rack.size[0] / 2 + 0.12);
    const z = (this.rear ? -1 : 1) * (definition.rack.size[2] / 2 + 0.035);
    const points: number[] = [x, span.bottom, z, x, span.top, z];
    for (let u = span.first - 0.5; u <= span.last + 0.5; u++) {
      const y = definition.rack.unitOrigin + u * definition.rack.unitPitch;
      const end = u === span.first - 0.5 || u === span.last + 0.5;
      points.push(x, y, z, x - side * (end ? 0.04 : 0.018), y, z);
    }
    this.line.geometry.dispose();
    this.line.geometry = new THREE.BufferGeometry();
    this.line.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
    this.line.geometry.computeBoundingSphere();
    if (this.label) {
      this.label.removeFromParent();
      this.label.material.map?.dispose();
      this.label.material.dispose();
    }
    this.label = this.makeLabel(span.label);
    this.label.material.depthTest = true;
    this.label.material.depthWrite = false;
    this.label.raycast = () => {};
    this.label.position.set(x + side * 0.13, (span.top + span.bottom) / 2, z);
    this.add(this.label);
    this.userData.span = span.label;
    this.userData.deviceId = span.id;
    this.userData.face = this.rear ? "rear" : "front";
  }
}
