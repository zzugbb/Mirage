import { Euler, MathUtils, Vector3 } from "three";
import { emergencyLight, entranceSettings } from "./entrance.ts";

const config = entranceSettings.lighting;
export const emergencyHeadSides = [-1, 1] as const;
type HeadSide = (typeof emergencyHeadSides)[number];

/** 灯座枢轴、镜片位置和 XYZ 姿态由实体模型与方向核对共用。 */
export function emergencyHeadTransform(side: HeadSide) {
  const center = new Vector3(
    (side * config.headSpacing) / 2,
    config.lampBodySize[1] / 2 + config.headRise,
    0,
  );
  return {
    center,
    rotation: new Euler(config.headPitch, side * config.headYaw, 0, "XYZ"),
    lensZ: config.headDepth / 2 + 0.0005,
  };
}

export function emergencyHeadInspection() {
  const origin = new Vector3().fromArray(emergencyLight.position);
  const heads = emergencyHeadSides.map((side) => {
    const { center, rotation, lensZ } = emergencyHeadTransform(side);
    const direction = new Vector3(0, 0, 1).applyEuler(rotation);
    const face = center.clone().add(origin).addScaledVector(direction, lensZ);
    return {
      side,
      face,
      direction,
      azimuth: MathUtils.radToDeg(Math.atan2(direction.x, direction.z)),
      tilt: MathUtils.radToDeg(
        Math.atan2(-direction.y, Math.hypot(direction.x, direction.z)),
      ),
    };
  });
  const markers = heads.map(({ side, face, direction }) => {
    // 镜片圆网格的中心是三角面共享顶点，标签锚略微错开，仍落在真实镜片上。
    const right = new Vector3(direction.z, 0, -direction.x).normalize();
    const up = direction.clone().cross(right);
    return {
      id: side < 0 ? "entrance-head-left" : "entrance-head-right",
      title: side < 0 ? "左灯头" : "右灯头",
      point: face
        .clone()
        .addScaledVector(right, 0.004)
        .addScaledVector(up, 0.002),
    };
  });
  // 只画镜片前的短机械法线和双翼箭头。
  const paths = heads.flatMap(({ direction, face }) => {
    const start = face.clone().addScaledVector(direction, 0.002);
    const tip = start.clone().addScaledVector(direction, 0.155);
    const base = tip.clone().addScaledVector(direction, -0.028);
    const width = new Vector3(direction.z, 0, -direction.x)
      .normalize()
      .multiplyScalar(0.014);
    return [
      [start, tip],
      [base.clone().sub(width), tip, base.clone().add(width)],
    ];
  });
  const [w, h, d] = config.lampBodySize;
  const points = [
    ...paths.flat(),
    ...markers.map(({ point }) => point),
    origin.clone().add(new Vector3(-w / 2, -h / 2, d / 2)),
    origin
      .clone()
      .add(
        new Vector3(w / 2, h / 2 + config.headRise + config.headRadius, d / 2),
      ),
  ];
  return {
    heads,
    spacing: heads[0].face.distanceTo(heads[1].face),
    paths,
    points,
    markers,
  };
}
