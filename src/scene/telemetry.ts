import * as THREE from "three";
import type { AppState } from "../domain";
import { coolingRelationFor } from "../installation";
import type { SimulationSnapshot } from "../simulation";
import type { SceneModel } from "./models";

/** 关系线只表达预设端点与方向；不表示真实管路、流速或热场。 */
export class TelemetryOverlay {
  root = new THREE.Group();
  relation = new THREE.Group();
  enabled = true;
  mode: "object" | "temperature" | "power" | "alarms" = "object";
  sensor = new THREE.Group();
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
    alarmMaterial.depthTest = false;
    alarmMaterial.toneMapped = false;
    this.alarmBox.renderOrder = 10;
    const sensorMaterial = new THREE.MeshBasicMaterial({
      color: "#91c5d0",
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      toneMapped: false,
    });
    this.sensor.add(
      new THREE.Mesh(
        new THREE.TorusGeometry(0.058, 0.002, 6, 64),
        sensorMaterial,
      ),
      new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 8), sensorMaterial),
    );
    this.root.add(this.relation, this.alarmBox, this.sensor);
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
      this.mode === "temperature" &&
      this.enabled &&
      state.level === "room" &&
      roomOpacity === 1 &&
      inspection === 0;
    this.alarmBox.visible =
      ((this.mode === "alarms" && !!sample.alarm?.active) ||
        (this.mode === "power" && explosion === 0)) &&
      (inspection === 0 || inspection === 1);
    if (this.alarmBox.visible) {
      if (explosion > 0) {
        this.alarmBox.box.makeEmpty();
        models.server.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          let parent = object.parent;
          while (parent && parent !== models.server) {
            if (models.parts.has(parent.userData.entityId)) return;
            parent = parent.parent;
          }
          this.alarmBox.box.union(new THREE.Box3().setFromObject(object));
        });
        this.alarmBox.box.expandByScalar(0.008);
      } else
        this.alarmBox.box.setFromObject(models.server).expandByScalar(0.008);
      (this.alarmBox.material as THREE.LineBasicMaterial).color.set(
        this.mode === "power"
          ? "#8ebae6"
          : sample.alarm?.severity === "critical"
            ? "#e99d89"
            : "#dfb276",
      );
    }
    this.sensor.visible =
      this.mode === "temperature" &&
      (inspection === 0 || inspection === 1) &&
      explosion === 0;
    if (this.sensor.visible) {
      models.server.getWorldPosition(this.sensor.position);
      this.sensor.position.z += 0.46;
      const color = sample.alarm?.active
        ? sample.alarm.severity === "critical"
          ? "#e99d89"
          : "#dfb276"
        : "#8ec5d0";
      (
        this.sensor.children[0] as THREE.Mesh<
          THREE.TorusGeometry,
          THREE.MeshBasicMaterial
        >
      ).material.color.set(color);
    }
    if (!this.relation.visible) return;
    const sourceObject = models.facilities.get(
      coolingRelationFor(state.deviceId).source,
    );
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
