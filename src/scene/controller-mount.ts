import * as THREE from "three";
import { modelById } from "../catalog.ts";
import { createAnnotationGroup } from "./annotations.ts";

/** 在主板上标出装配态控制卡的投影。标记随主板移动，虚线止于展开后的卡底。 */
export class ControllerMountGuide {
  root = createAnnotationGroup("controller-mount");
  private seat = new THREE.Vector3();
  private projection = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(0, 1, 0),
    ]),
    new THREE.LineDashedMaterial({
      color: "#c3e0d7",
      dashSize: 0.11,
      gapSize: 0.08,
      depthWrite: false,
    }),
  );
  constructor() {
    const mount = modelById("server-1u").controllerMount!;
    const [w, h, d] = mount.controllerSize;
    this.seat.fromArray(mount.controllerCenter);
    this.seat.y -= h / 2 - 0.0004;
    const corners: THREE.Vector3[] = [];
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const corner = new THREE.Vector3((sx * w) / 2, 0, (sz * d) / 2);
        corners.push(
          new THREE.Vector3(sx * w * 0.2, 0, corner.z),
          corner,
          corner,
          new THREE.Vector3(corner.x, 0, sz * d * 0.2),
        );
      }
    this.root.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(corners),
        new THREE.LineBasicMaterial({ color: "#c3e0d7", depthWrite: false }),
      ),
      this.projection,
    );
    this.projection.computeLineDistances();
    this.root.matrixAutoUpdate = false;
    this.root.visible = false;
  }
  update(board: THREE.Object3D, boardBase: THREE.Vector3, separation: number) {
    board.updateWorldMatrix(true, false);
    this.root.matrix
      .makeTranslation(
        this.seat.x - boardBase.x,
        this.seat.y - boardBase.y,
        this.seat.z - boardBase.z,
      )
      .premultiply(board.matrixWorld);
    this.root.matrixWorldNeedsUpdate = true;
    this.projection.scale.y = Math.max(0, separation - 0.0004);
  }
}
