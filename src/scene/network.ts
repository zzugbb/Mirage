import { createAnnotationGroup } from "./annotations.ts";
import * as THREE from "three";
import type { NetworkMarker } from "../network.ts";
import { patchSettings } from "../network-patch.ts";

/** 直段间插入相切圆滑弯头，限制切角距离，避免样条过冲侵入柜柱或设备。 */
function patchCurve(points: THREE.Vector3[]) {
  const curve = new THREE.CurvePath<THREE.Vector3>();
  let start = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const corner = points[i];
    const radius = Math.min(
      patchSettings.bendRadius,
      corner.distanceTo(points[i - 1]) * 0.4,
      corner.distanceTo(points[i + 1]) * 0.4,
    );
    const tangent = (neighbor: THREE.Vector3) =>
      corner
        .clone()
        .addScaledVector(neighbor.clone().sub(corner).normalize(), radius);
    const before = tangent(points[i - 1]),
      after = tangent(points[i + 1]);
    curve.add(new THREE.LineCurve3(start, before));
    curve.add(new THREE.QuadraticBezierCurve3(before, corner, after));
    start = after;
  }
  curve.add(new THREE.LineCurve3(start, points[points.length - 1]));
  return curve;
}

export class NetworkGeometry {
  root = createAnnotationGroup("network");
  geometry = new THREE.RingGeometry(0.02, 0.026, 24);
  material = new THREE.MeshBasicMaterial({
    color: "#b9d5cb",
    toneMapped: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  dots = new THREE.InstancedMesh(this.geometry, this.material, 2);
  transform = new THREE.Object3D();
  bounds = new THREE.Box3();
  markers: NetworkMarker[] = [];
  patchPoints: THREE.Vector3[] | null = null;
  cable?: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
  hiddenLine?: THREE.Line<THREE.BufferGeometry, THREE.LineDashedMaterial>;
  selectedId = "";
  constructor() {
    this.root.add(this.dots);
    this.root.visible = false;
    this.dots.count = 0;
    this.dots.frustumCulled = false;
    this.dots.raycast = () => {};
    this.dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  private clearCable() {
    for (const object of [this.cable, this.hiddenLine]) {
      object?.geometry.dispose();
      object?.material.dispose();
      object?.removeFromParent();
    }
    this.cable = this.hiddenLine = undefined;
  }
  update(
    markers: NetworkMarker[],
    points: THREE.Vector3[] | null = null,
    selectedId = "",
  ) {
    this.selectedId = selectedId;
    if (this.patchPoints !== points) {
      this.clearCable();
      this.patchPoints = points;
      if (points) {
        const curve = patchCurve(points);
        this.cable = new THREE.Mesh(
          new THREE.TubeGeometry(
            curve,
            192,
            patchSettings.cableRadius,
            8,
            false,
          ),
          new THREE.MeshBasicMaterial({
            color: patchSettings.color,
            toneMapped: false,
            depthWrite: false,
          }),
        );
        // 被设备遮住的段落只投影细虚线，柜前与柜后可由实虚读出。
        this.hiddenLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve.getSpacedPoints(192)),
          new THREE.LineDashedMaterial({
            color: patchSettings.color,
            dashSize: 0.017,
            gapSize: 0.014,
            transparent: true,
            opacity: 0.6,
            depthFunc: THREE.GreaterDepth,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        this.hiddenLine.computeLineDistances();
        this.cable.raycast = this.hiddenLine.raycast = () => {};
        this.root.add(this.cable, this.hiddenLine);
      }
    }
    this.markers = markers;
    this.root.visible = false;
  }
  frame(
    ready: boolean,
    parts: Map<string, THREE.Group>,
    camera?: THREE.Camera,
  ) {
    if (camera) this.transform.quaternion.copy(camera.quaternion);
    let index = 0;
    for (const marker of this.markers) {
      if (marker.point) this.transform.position.fromArray(marker.point);
      else {
        const part = marker.partId ? parts.get(marker.partId) : null;
        if (!part) continue;
        this.bounds.setFromObject(part).getCenter(this.transform.position);
      }
      this.transform.scale.setScalar(
        this.patchPoints
          ? marker.deviceId === this.selectedId
            ? 0.86
            : 0.62
          : 1,
      );
      this.transform.updateMatrix();
      this.dots.setMatrixAt(index++, this.transform.matrix);
    }
    this.dots.count = index;
    this.root.visible = ready && index > 0;
    this.dots.instanceMatrix.needsUpdate = true;
  }
  dispose() {
    this.clearCable();
    this.geometry.dispose();
    this.material.dispose();
    this.dots.dispose();
    this.root.clear();
    this.root.removeFromParent();
  }
}
