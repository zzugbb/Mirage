import { partPosition } from "./domain.ts";
import type { Part } from "./domain.ts";

export type AssemblyPose = { cover: number; explosion: number };
export type AssemblyTarget = {
  coverOpen: boolean;
  explosion: number;
  hasCover: boolean;
};
const clamp = (x: number) =>
  Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const smooth = (x: number) => {
  const p = clamp(x);
  return p * p * (3 - 2 * p);
};

/** 先取下上盖再展开；复原部件后才允许合盖，离开工作台也遵守这一顺序。 */
export function advanceAssembly(
  pose: AssemblyPose,
  target: AssemblyTarget,
  delta: number,
  reducedMotion = false,
): AssemblyPose {
  const explosion = clamp(target.explosion);
  const cover = target.hasCover && (target.coverOpen || explosion > 0) ? 1 : 0;
  if (reducedMotion) return { cover, explosion };
  const dt = Number.isFinite(delta) ? Math.max(0, Math.min(0.1, delta)) : 0;
  let nextCover = target.hasCover ? pose.cover : 0;
  if (cover > nextCover || pose.explosion === 0)
    nextCover =
      cover > nextCover
        ? Math.min(cover, nextCover + dt / 0.75)
        : Math.max(cover, nextCover - dt / 0.75);
  const nextTarget =
    !target.hasCover || nextCover === 1 || explosion === 0 ? explosion : 0;
  let nextExplosion =
    nextTarget + (pose.explosion - nextTarget) * Math.exp(-5 * dt);
  if (Math.abs(nextExplosion - nextTarget) < 0.0001) nextExplosion = nextTarget;
  return { cover: nextCover, explosion: nextExplosion };
}

/** 可拆平盖先抬离机箱，再移到侧边；合盖沿反向路径返回。 */
export function assemblyPartPosition(
  part: Part,
  explosion: number,
  cover: number,
) {
  const position = partPosition(part, explosion);
  if (part.node !== "lid") return position;
  const slide = smooth((cover - 0.22) / 0.78),
    lift = smooth(cover / 0.22);
  const offset = [-0.5 * slide, 0.08 * lift, -0.08 * slide];
  return position.map(
    (value, index) => value + offset[index] * (1 - clamp(explosion)),
  );
}
