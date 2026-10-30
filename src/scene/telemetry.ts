import * as THREE from "three";
import type { AppState } from "../domain";
import { scenario } from "../simulation";
import type { SimulationSnapshot } from "../simulation";
import type { SceneModel } from "./models";

/** 关系线只表达预设端点与方向；不表示真实管路、流速或热场。 */
export class TelemetryOverlay {
  root = new THREE.Group();
  relation = new THREE.Group();
  enabled = true;
  line: THREE.Line;
  arrows: THREE.LineSegments;
  alarmBox = new THREE.Box3Helper(new THREE.Box3(), "#d9a66b");
  source = new THREE.Vector3();
  target = new THREE.Vector3();
  lastPath = "";
  constructor() {
    const material = new THREE.LineDashedMaterial({
      color: "#7cb6c8",
      transparent: true,
      opacity: 0.4,
      dashSize: 0.075,
      gapSize: 0.055,
      depthWrite: false,
      toneMapped: false,
    });
    this.line = new THREE.Line(new THREE.BufferGeometry(), material);
    this.arrows = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: "#8bc3d0",
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.relation.add(this.line, this.arrows);
    const alarmMaterial = this.alarmBox.material as THREE.LineBasicMaterial;
    alarmMaterial.transparent = true;
    alarmMaterial.opacity = 0.8;
    alarmMaterial.depthWrite = false;
    this.root.add(this.relation, this.alarmBox);
  }
  update(
    state: AppState,
    sample: SimulationSnapshot,
    models: SceneModel,
    inspection: number,
    explosion: number,
    roomOpacity: number,
  ) {
    this.relation.visible =
      this.enabled &&
      state.level === "room" &&
      roomOpacity === 1 &&
      inspection === 0;
    this.alarmBox.visible =
      !!sample.alarm?.active &&
      state.level !== "device" &&
      inspection === 0 &&
      explosion === 0;
    if (this.alarmBox.visible) {
      this.alarmBox.box.setFromObject(models.server).expandByScalar(0.008);
      (this.alarmBox.material as THREE.LineBasicMaterial).color.set(
        sample.alarm!.severity === "critical" ? "#d98e7e" : "#d9ac70",
      );
    }
    if (!this.relation.visible) return;
    const sourceObject = models.facilities.get(scenario.relation.source);
    if (!sourceObject) {
      this.relation.visible = false;
      return;
    }
    sourceObject.getWorldPosition(this.source);
    models.server.getWorldPosition(this.target);
    this.source.y = 0.23;
    this.source.z += 0.42;
    this.target.z += 0.5;
    const pathKey = `${this.source.toArray()}:${this.target.toArray()}`;
    if (pathKey !== this.lastPath) {
      this.lastPath = pathKey;
      const curve = new THREE.CatmullRomCurve3([
        this.source.clone(),
        new THREE.Vector3(-2.5, 0.23, 0.85),
        new THREE.Vector3(-0.65, 0.23, 0.95),
        this.target.clone(),
      ]);
      this.line.geometry.dispose();
      this.line.geometry = new THREE.BufferGeometry().setFromPoints(
        curve.getPoints(64),
      );
      this.line.computeLineDistances();
      const arrowPoints: THREE.Vector3[] = [];
      for (const at of [0.22, 0.55, 0.84]) {
        const tip = curve.getPointAt(at);
        const tangent = curve.getTangentAt(at).normalize();
        const side = tangent
          .clone()
          .cross(new THREE.Vector3(0, 1, 0))
          .normalize()
          .multiplyScalar(0.045);
        const back = tip.clone().addScaledVector(tangent, -0.09);
        arrowPoints.push(
          back.clone().add(side),
          tip.clone(),
          back.clone().sub(side),
          tip.clone(),
        );
      }
      this.arrows.geometry.dispose();
      this.arrows.geometry = new THREE.BufferGeometry().setFromPoints(
        arrowPoints,
      );
    }
    const opacity = 0.14 + (sample.coolingCapacity / 100) * 0.26;
    (this.line.material as THREE.LineDashedMaterial).opacity = opacity;
    (this.arrows.material as THREE.LineBasicMaterial).opacity = opacity + 0.15;
  }
}
