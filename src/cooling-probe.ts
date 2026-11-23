import {
  coolingDeviceIds,
  coolingSummary,
  coolingRelations,
  coolingSource,
} from "./cooling.ts";
import {
  environmentRounds,
  type EnvironmentRound,
} from "./environment-rounds.ts";
import { deviceById } from "./installation.ts";
import type { SpatialReading } from "./spatial.ts";
import type { EnvironmentChannel } from "./environment-monitoring.ts";

/** 只采用服务配置及柜排登记的巡检探头，不由距离推定覆盖。 */
export function coolingProbeForDevice(id: string) {
  const device = deviceById(id);
  if (
    !device ||
    !coolingRelations.some(
      (link) => link.source === coolingSource.id && link.target === id,
    )
  )
    return null;
  const round = environmentRounds.find((round) =>
    round.row.rackIds.includes(device.rackId),
  );
  return round && { device, row: round.row, probe: round.probe };
}

export function compareCoolingTemperatures(
  device: SpatialReading,
  probe: EnvironmentChannel,
) {
  if (
    device.quality !== "valid" ||
    device.temperature === null ||
    !Number.isFinite(device.temperature) ||
    probe.quality !== "valid" ||
    probe.value === null ||
    !Number.isFinite(probe.value) ||
    device.observedAt === null ||
    probe.observedAt === null
  )
    return { difference: null, reason: "缺少有效温度采样" };
  if (device.observedAt !== probe.observedAt)
    return { difference: null, reason: "采样时刻不同" };
  return { difference: device.temperature - probe.value, reason: "同秒采样" };
}

/** 柜排来自探头巡检配置。分母只计制冷服务已登记的整机。 */
export function coolingRackPeaks(
  round: EnvironmentRound,
  readings: Map<string, SpatialReading>,
) {
  return round.racks.map((rack) => {
    const { coverage, count, hottestId, maximum } = coolingSummary(
      coolingDeviceIds(rack.id),
      readings,
    );
    return {
      rack,
      coverage,
      count,
      device: hottestId ? deviceById(hottestId) : undefined,
      maximum,
    };
  });
}
