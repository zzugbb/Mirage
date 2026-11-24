import { Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { rackById } from "./installation.ts";
import { mountSettings, pduMountBoxes } from "./pdu-mounts.ts";
import { pduById, pduName } from "./power-config.ts";
import { pduInletPosition } from "./power-paths.ts";

/** 输入参考点只与同一 PDU 的登记支架比较标高。 */
export function roofPduSupport(pduId: string) {
  const pdu = pduById(pduId);
  const offsets = mountSettings.heightOffsets;
  if (!pdu || !offsets.length) return null;
  const rack = rackById(pdu.rackId);
  if (!rack) return null;

  const [x, y, z] = rack.position;
  const inlet = new Vector3().fromArray(pduInletPosition(pduId));
  const mounts = offsets.map(
    (offset) => pduMountBoxes(pdu.feed, offset).spacer,
  );
  const distance = (index: number) =>
    Math.abs(inlet.y - y - mounts[index].position[1]);
  const index = mounts.reduce(
    (best, _, index) => (distance(index) < distance(best) ? index : best),
    0,
  );
  const { position, size } = mounts[index];
  const side = Math.sign(position[0]);
  const supportHeight = y + position[1];
  const bracket = new Vector3(
    x + position[0],
    supportHeight,
    z + position[2] - size[2] / 2,
  );
  // 独立竖尺放在柜后外侧，按标高量取两端。
  const ruler = new Vector3(
    x + side * (mountSettings.sideInnerX + 0.065),
    inlet.y,
    z - definition.rack.size[2] / 2 - 0.03,
  );
  const ends: [Vector3, Vector3] = [ruler, ruler.clone().setY(supportHeight)];
  const markers = [
    {
      id: "roof-support-inlet",
      title: `${pduName(pduId)} · 输入参考点`,
      point: inlet,
    },
    {
      id: "roof-support-bracket",
      title: `最近侧壁支架 ${index + 1}`,
      point: bracket,
    },
  ];
  return {
    inlet,
    index,
    supportHeight,
    heightDifference: inlet.y - supportHeight,
    side,
    markers,
    dimensions: [{ axis: "y" as const, ends }],
    points: [inlet, bracket, ...ends],
  };
}
