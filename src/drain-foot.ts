import { condensate, drainStands } from "./condensate.ts";
import {
  rectangularFootprint,
  sensingSegmentsToFootprint,
} from "./leak-footprint.ts";

export type DrainStand = (typeof drainStands)[number];

export function footCorners(stand: DrainStand) {
  return rectangularFootprint(stand.axis, condensate.supports.footSize);
}

export function standSensingSegments(stand: DrainStand) {
  return sensingSegmentsToFootprint(stand.axis, condensate.supports.footSize, {
    // 等距段沿用既有底板核查位置。
    preferMidpoint: false,
  });
}
