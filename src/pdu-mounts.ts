import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import type { AppState } from "./domain.ts";
import { rackById, rackForDevice } from "./installation.ts";
import {
  pduById,
  pduOutletOffsetY,
  powerSettings,
  type PowerFeed,
} from "./power-config.ts";
import type { PowerPoint } from "./power-paths.ts";

export const mountSettings = definition.rack.enclosure.pduMount;

type MountBox = { position: PowerPoint; size: PowerPoint };

/** 同一组局部坐标用于建模、安装面标记与取景。 */
export function pduMountBoxes(feed: PowerFeed, offset: number) {
  const [x, y, z] = powerSettings.layout.positions[feed];
  const [width, , depth] = powerSettings.layout.size;
  const side = Math.sign(x),
    outer = Math.abs(x) + width / 2,
    inner = Math.abs(x) - width / 2;
  const { sideInnerX: wall, height, thickness } = mountSettings;
  const plate: MountBox = {
    size: [wall - inner, height, thickness],
    position: [
      (side * (inner + wall)) / 2,
      y + offset,
      z + (depth + thickness) / 2,
    ],
  };
  const spacer: MountBox = {
    size: [wall - outer, height, depth],
    position: [(side * (outer + wall)) / 2, y + offset, z],
  };
  return { plate, spacer };
}

export function nearestPduMount(outlet: number | null) {
  const offset = outlet === null ? 0 : pduOutletOffsetY(outlet);
  const heights = mountSettings.heightOffsets;
  return heights.reduce(
    (best, y, i) =>
      Math.abs(y - offset) < Math.abs(heights[best] - offset) ? i : best,
    0,
  );
}

export function pduMountInspection(
  state: AppState,
  pduId: string,
  index: number,
) {
  const pdu = pduById(pduId),
    offset = mountSettings.heightOffsets[index];
  if (
    state.level !== "rack" ||
    !pdu ||
    offset === undefined ||
    rackForDevice(state.deviceId).id !== pdu.rackId
  )
    return null;
  const { plate, spacer } = pduMountBoxes(pdu.feed, offset);
  const [rx, ry, rz] = rackById(pdu.rackId)!.position;
  const side = Math.sign(spacer.position[0]);
  const face = (box: MountBox) => ({
    center: [
      rx + side * mountSettings.sideInnerX,
      ry + box.position[1],
      rz + box.position[2],
    ] as PowerPoint,
    depth: box.size[2],
  });
  return {
    plate: face(plate),
    spacer: face(spacer),
    side,
    width: spacer.size[0],
    height: spacer.size[1],
    localHeight: spacer.position[1],
    localZ: spacer.position[2],
    feed: pdu.feed,
    index,
    pduId,
  };
}
export type PduMountInspection = NonNullable<
  ReturnType<typeof pduMountInspection>
>;
