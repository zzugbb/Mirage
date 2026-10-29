import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
export type MechanismPose = { door: number; tray: number; inspection: number };
export type MechanismTarget = {
  doorOpen: boolean;
  trayExtended: boolean;
  inspect: boolean;
};
export type PresentationPhase =
  | "assembling"
  | "closed"
  | "opening"
  | "open"
  | "extracting"
  | "extended"
  | "to-device"
  | "device-ready"
  | "to-rack"
  | "retracting"
  | "closing";
export const phaseLabels: Record<PresentationPhase, string> = {
  assembling: "正在复原部件",
  closed: "柜门已关闭",
  opening: "正在打开柜门",
  open: "柜门已打开",
  extracting: "正在沿导轨抽出",
  extended: "服务器已抽出",
  "to-device": "正在进入结构工作台",
  "device-ready": "结构工作台已就绪",
  "to-rack": "正在返回导轨",
  retracting: "正在推回服务器",
  closing: "正在关闭柜门",
};
export const initialMechanism = (): MechanismPose => ({
  door: 0,
  tray: 0,
  inspection: 0,
});
const approach = (value: number, target: number, step: number) =>
  value < target
    ? Math.min(target, value + step)
    : Math.max(target, value - step);
const smooth = (value: number) => value * value * (3 - 2 * value);
export function advanceMechanism(
  pose: MechanismPose,
  target: MechanismTarget,
  delta: number,
  reducedMotion = false,
): MechanismPose {
  const needsTray =
    target.trayExtended || target.inspect || pose.inspection > 0;
  const needsDoor = target.doorOpen || needsTray || pose.tray > 0;
  if (reducedMotion)
    return {
      door: target.doorOpen || target.trayExtended || target.inspect ? 1 : 0,
      tray: target.trayExtended || target.inspect ? 1 : 0,
      inspection: target.inspect ? 1 : 0,
    };
  const dt = Number.isFinite(delta) ? Math.max(0, Math.min(0.1, delta)) : 0;
  const motion = definition.rack.motion;
  const door = approach(pose.door, needsDoor ? 1 : 0, dt / motion.doorDuration);
  const tray = approach(
    pose.tray,
    needsTray && door === 1 ? 1 : needsTray ? pose.tray : 0,
    dt / motion.trayDuration,
  );
  const inspection = approach(
    pose.inspection,
    target.inspect && tray === 1 ? 1 : 0,
    dt / motion.inspectionDuration,
  );
  return { door, tray, inspection };
}
export function mechanismTransform(pose: MechanismPose) {
  return {
    doorAngle:
      pose.door === 0
        ? 0
        : (-smooth(pose.door) *
            definition.rack.motion.doorAngleDegrees *
            Math.PI) /
          180,
    trayOffset: smooth(pose.tray) * definition.rack.motion.trayTravel,
    inspection: smooth(pose.inspection),
  };
}
export function mechanismPhase(
  pose: MechanismPose,
  target: MechanismTarget,
): PresentationPhase {
  if (pose.inspection > 0 && !target.inspect) return "to-rack";
  if (target.inspect && pose.inspection === 1) return "device-ready";
  if (target.inspect && pose.tray === 1) return "to-device";
  if (
    (target.doorOpen || target.trayExtended || target.inspect) &&
    pose.door < 1
  )
    return "opening";
  if ((target.trayExtended || target.inspect) && pose.tray < 1)
    return "extracting";
  if (!target.trayExtended && !target.inspect && pose.tray > 0)
    return "retracting";
  if (!target.doorOpen && pose.door > 0) return "closing";
  return pose.tray === 1 ? "extended" : pose.door === 1 ? "open" : "closed";
}

export function inspectionStaging(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  return {
    rackOpacity: 1 - smooth(Math.min(1, p / 0.3)),
    relocation: smooth(Math.max(0, (p - 0.3) / 0.7)),
  };
}
