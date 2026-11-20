import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { modelForDevice } from "../catalog.ts";
import * as THREE from "three";
import {
  advanceRearDoor,
  advanceMechanism,
  initialMechanism,
  mechanismPhase,
  mechanismTransform,
} from "../mechanics.ts";
import { poseRackRearDoors } from "./rack-enclosure.ts";
import type { PresentationPhase } from "../mechanics";
import type { AppState } from "../domain";
import type { SceneModel } from "./models";

/** 只维护可见模型姿态，不写入业务选择、槽位或模拟时钟。 */
export class StructurePresentation {
  pose = initialMechanism();
  rearDoor = 0;
  rearDoors: THREE.Object3D;
  mounted: THREE.Vector3;
  workbench = new THREE.Vector3();
  models: SceneModel;
  constructor(models: SceneModel) {
    this.models = models;
    this.rearDoors = models.rack.getObjectByName("rack-rear-doors")!;
    this.mounted = models.server.position.clone();
  }
  resetRearDoor() {
    this.rearDoor = 0;
    poseRackRearDoors(this.rearDoors, 0);
  }
  step(
    state: AppState,
    delta: number,
    reducedMotion: boolean,
    explosion: number,
    cover = 0,
  ) {
    const assembling = state.level !== "device" && (explosion > 0 || cover > 0);
    const rearOpen = state.level === "rack" && state.rearDoorOpen;
    this.rearDoor = advanceRearDoor(
      this.rearDoor,
      rearOpen,
      delta,
      reducedMotion,
    );
    poseRackRearDoors(this.rearDoors, this.rearDoor);
    const rearBusy = this.rearDoor !== (rearOpen ? 1 : 0);
    const target = {
      doorOpen: state.doorOpen,
      trayExtended: state.trayExtended,
      inspect: (state.level === "device" || assembling) && this.rearDoor === 0,
    };
    this.pose = advanceMechanism(this.pose, target, delta, reducedMotion);
    const transform = mechanismTransform(this.pose);
    const relocation = transform.inspection;
    this.models.rackDoor.rotation.y = transform.doorAngle;
    const model = modelForDevice(state.deviceId);
    const fixed = model.category === "switch";
    this.models.rackSlide.visible = this.models.railMount.visible = !fixed;
    this.models.rackSlide.position.z = fixed ? 0 : transform.trayOffset;
    const position = this.models.server.position.copy(this.mounted);
    position.z += fixed ? 0 : transform.trayOffset;
    if (relocation > 0) {
      // 先水平出柜，尾部越过柜面后调平，在台面正上方落下。返程沿原路对准 U 位。
      const clearZ =
        this.models.rack.position.z +
        definition.rack.size[2] / 2 +
        model.depth / 2 +
        0.04;
      const travelY = this.workbench.y + 0.05;
      const step = THREE.MathUtils.smoothstep;
      position.z = THREE.MathUtils.lerp(
        position.z,
        clearZ,
        step(relocation, 0, 0.32),
      );
      position.y = THREE.MathUtils.lerp(
        position.y,
        travelY,
        step(relocation, 0.32, 0.58),
      );
      position.z = THREE.MathUtils.lerp(
        position.z,
        this.workbench.z,
        step(relocation, 0.58, 0.88),
      );
      position.y = THREE.MathUtils.lerp(
        position.y,
        this.workbench.y,
        step(relocation, 0.88, 1),
      );
    }
    const phase: PresentationPhase = rearBusy
      ? rearOpen
        ? "opening-rear"
        : "closing-rear"
      : assembling
        ? explosion > 0
          ? "assembling"
          : "closing-cover"
        : mechanismPhase(this.pose, target);
    return {
      phase,
      relocation,
      overBench: relocation >= 0.88,
      ready: phase === "device-ready",
      busy: !["closed", "open", "extended", "device-ready"].includes(phase),
    };
  }
}
