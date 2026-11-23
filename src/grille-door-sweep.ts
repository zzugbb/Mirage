import {
  maintenanceDoorSweep,
  type DoorSweep,
  doorSector,
  type DoorReference,
} from "./door-sweep.ts";
import { floorGrilleSettings, type FloorGrille } from "./floor-grilles.ts";
import type { MaintenanceAisle } from "./maintenance.ts";

type Point = { x: number; z: number };

// 扇形与矩形都为凸多边形。逐边裁去面框外的部分，保留边界交点。
function clip(points: Point[], axis: keyof Point, limit: number, sign: number) {
  const result: Point[] = [];
  for (const [i, end] of points.entries()) {
    const start = points[(i + points.length - 1) % points.length];
    const from = sign * (start[axis] - limit);
    const to = sign * (end[axis] - limit);
    const startsInside = from >= 0;
    const endsInside = to >= 0;
    if (startsInside !== endsInside) {
      const t = from / (from - to);
      result.push({
        x: start.x + t * (end.x - start.x),
        z: start.z + t * (end.z - start.z),
      });
    }
    if (endsInside) result.push(end);
  }
  return result;
}

export function grilleDoorSweep(
  aisle: MaintenanceAisle,
  grille: FloorGrille,
  reference: DoorReference,
) {
  return frontGrilleSweep(maintenanceDoorSweep(aisle.front), grille, reference);
}

export function frontGrilleSweep(
  sweep: DoorSweep,
  grille: FloorGrille,
  reference: DoorReference,
) {
  const angle = sweep[reference].angle;
  const leaf = sweep.leaves[0];
  const sector = doorSector(leaf, angle, 1);
  const [x, , z] = grille.position;
  const { width, depth } = floorGrilleSettings;
  const minX = x - width / 2,
    maxX = x + width / 2,
    minZ = z - depth / 2,
    maxZ = z + depth / 2;
  const frame = [
    { x: minX, z: minZ },
    { x: maxX, z: minZ },
    { x: maxX, z: maxZ },
    { x: minX, z: maxZ },
  ];
  let patch = clip(sector, "x", minX, 1);
  patch = clip(patch, "x", maxX, -1);
  patch = clip(patch, "z", minZ, 1);
  patch = clip(patch, "z", maxZ, -1);
  const area =
    Math.abs(
      patch.reduce((sum, a, i) => {
        const b = patch[(i + 1) % patch.length];
        return sum + (a.x - x) * (b.z - z) - (a.z - z) * (b.x - x);
      }, 0),
    ) / 2;
  return {
    angle,
    sector,
    frame,
    patch: area > 1e-12 ? patch : [],
    area: area > 1e-12 ? area : 0,
    y: sweep.area.position[1] + 0.012,
  };
}

export type GrilleDoorSweep = ReturnType<typeof grilleDoorSweep>;
