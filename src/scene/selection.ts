import * as THREE from "three";

/** 只描绘包围盒的八个短角，不用整条边遮住结构。动效只响应选择/聚焦。 */
export class SelectionCorners extends THREE.LineSegments<
  THREE.BufferGeometry,
  THREE.LineBasicMaterial
> {
  box = new THREE.Box3();
  animating = false;
  positions = new Float32Array(8 * 3 * 2 * 3);
  private center = new THREE.Vector3();
  private size = new THREE.Vector3();
  private lastKey = "";
  private started = 0;
  constructor() {
    super(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: "#b7e8e8",
        transparent: true,
        opacity: 0.95,
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.raycast = () => {};
    this.visible = false;
  }
  // 装机角标取安装模型的外廓，中心随实际机箱移动。隐藏的展开部件不参与取界。
  setInstalledBox(
    object: THREE.Object3D,
    installed: THREE.Object3D,
    faceCameraZ?: number,
  ) {
    this.box.setFromObject(installed);
    if (installed !== object)
      this.box.setFromCenterAndSize(
        object.getWorldPosition(this.center),
        this.box.getSize(this.size),
      );
    // 告警定位仅描出朝向观察者的一面，保持 1U、2U 的实际安装高度。
    if (faceCameraZ !== undefined) {
      const { min, max } = this.box;
      if (faceCameraZ >= (min.z + max.z) / 2) min.z = max.z;
      else max.z = min.z;
    }
  }
  update(
    key: string | null,
    time: number,
    reduced: boolean,
    padding = 0.006,
    alarmColor?: string,
  ) {
    this.material.color.set(alarmColor ?? "#b7e8e8");
    this.material.depthTest = !alarmColor;
    this.renderOrder = alarmColor ? 10 : 0;
    this.animating = false;
    this.visible = !!key && !this.box.isEmpty();
    if (!this.visible) {
      this.lastKey = "";
      return;
    }
    if (key !== this.lastKey) {
      this.lastKey = key!;
      this.started = time;
    }
    const progress = reduced
      ? 1
      : THREE.MathUtils.clamp((time - this.started) / 240, 0, 1);
    this.animating = progress < 1;
    const spread = 1 + 0.12 * (1 - progress) ** 3;
    this.box.getCenter(this.center);
    this.box
      .getSize(this.size)
      .addScalar(padding * 2)
      .multiplyScalar(spread);
    this.material.opacity = reduced ? 0.95 : 0.55 + progress * 0.4;
    let index = 0;
    const sizes = this.size.toArray(),
      center = this.center.toArray();
    const maxLeg = this.size.length() * (alarmColor ? 0.18 : 0.06);
    for (const x of [-1, 1])
      for (const y of [-1, 1])
        for (const z of [-1, 1]) {
          const signs = [x, y, z];
          const corner = signs.map(
            (sign, axis) => center[axis] + (sizes[axis] * sign) / 2,
          );
          for (let axis = 0; axis < 3; axis++) {
            this.positions.set(corner, index);
            index += 3;
            this.positions.set(corner, index);
            this.positions[index + axis] -=
              signs[axis] * Math.min(sizes[axis] * 0.2, maxLeg);
            index += 3;
          }
        }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }
}
