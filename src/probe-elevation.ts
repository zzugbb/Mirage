import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { rackInstallation } from "./rack-installation.ts";

/** 柜排只决定巡检顺序；标高投影取自探头、柜底与 U 位节距。 */
export function probeElevation(rackId: string, height: number) {
  const layout = rackInstallation(rackId);
  if (!layout || !Number.isFinite(height)) return null;
  const { unitOrigin, unitPitch } = definition.rack;
  const origin = layout.rack.position[1] + unitOrigin;
  const bottom = origin + unitPitch / 2;
  const fraction = (height - bottom) / (layout.units * unitPitch);
  // 与场景按同一公式比较 U 位上边界，避免除法舍入将边界分给下方 U 位。
  const lower = Math.floor((height - origin) / unitPitch);
  const unit = height >= origin + (lower + 0.5) * unitPitch ? lower + 1 : lower;
  const segment = layout.segments.find(
    (s) => unit >= s.first && unit <= s.last,
  );
  return { layout, fraction, unit, segment };
}
