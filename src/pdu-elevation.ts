import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { rackUnitAtHeight } from "./rack-installation.ts";
import { pduById, powerLinks, powerSettings } from "./power-config.ts";
import { pduOutlet } from "./pdu-outlets.ts";
import { installedPowerEndpoint, pduOutletPosition } from "./power-paths.ts";

export function pduElevation(id: string, outlet: number) {
  const pdu = pduById(id);
  const socket = pduOutlet(id, outlet);
  if (!pdu || !socket) return null;
  const point = pduOutletPosition(id, outlet);
  const { layout, unit, segment } = rackUnitAtHeight(pdu.rackId, point[1])!;
  const [rx, ry] = layout.rack.position;
  const link = socket.link;
  const endpoint = link && installedPowerEndpoint(link);
  const alignedLink =
    segment?.kind === "device" &&
    powerLinks.find((l) => l.pduId === id && l.deviceId === segment.id);
  const [width, height] = definition.rack.size;
  const { unitPitch, unitOrigin } = definition.rack;
  return {
    width,
    height,
    unit,
    segment,
    alignedLink,
    socket,
    outletX: rx - point[0],
    outletY: point[1] - ry,
    input: endpoint && {
      x: rx - endpoint[0],
      y: endpoint[1] - ry,
      delta: endpoint[1] - point[1],
    },
    // 从柜后看，场景 +X 在左；纵轴均以当前柜底为零。
    bands: layout.segments.map((s) => ({
      ...s,
      bottom: unitOrigin + (s.first - 0.5) * unitPitch,
      height: (s.last - s.first + 1) * unitPitch,
    })),
    sockets: Array.from(
      { length: powerSettings.outletsPerPdu },
      (_, i) => pduOutletPosition(id, i + 1)[1] - ry,
    ),
  };
}
