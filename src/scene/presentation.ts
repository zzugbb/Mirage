import { modelForDevice } from "../catalog";
import * as THREE from "three";
import {
  advanceMechanism,
  initialMechanism,
  inspectionStaging,
  mechanismPhase,
  mechanismTransform,
} from "../mechanics";
import type { PresentationPhase } from "../mechanics";
import type { AppState } from "../domain";
import type { SceneModel } from "./models";

/** 只维护可见模型姿态，不写入业务选择、槽位或模拟时钟。 */
export class StructurePresentation {
  pose = initialMechanism();
  mounted: THREE.Vector3;
  workbench = new THREE.Vector3(0, 0.65, 0);
  models: SceneModel;
  constructor(models: SceneModel) {
    this.models = models;
    this.mounted = models.server.position.clone();
  }
  step(
    state: AppState,
    delta: number,
    reducedMotion: boolean,
    explosion: number,
  ) {
    const assembling = state.level !== "device" && explosion > 0;
    const target = {
      doorOpen: state.doorOpen,
      trayExtended: state.trayExtended,
      inspect: state.level === "device" || assembling,
    };
    this.pose = advanceMechanism(this.pose, target, delta, reducedMotion);
    const transform = mechanismTransform(this.pose);
    const stage = inspectionStaging(transform.inspection);
    this.models.rackDoor.rotation.y = transform.doorAngle;
    const fixed = modelForDevice(state.deviceId).category === "switch";
    this.models.rackSlide.visible = this.models.railMount.visible = !fixed;
    this.models.rackSlide.position.z = fixed ? 0 : transform.trayOffset;
    this.models.server.position.copy(this.mounted);
    this.models.server.position.z += fixed ? 0 : transform.trayOffset;
    this.models.server.position.lerp(this.workbench, stage.relocation);
    const phase: PresentationPhase = assembling
      ? "assembling"
      : mechanismPhase(this.pose, target);
    return {
      phase,
      ...stage,
      ready: phase === "device-ready",
      busy: !["closed", "open", "extended", "device-ready"].includes(phase),
    };
  }
}
