import { coolingRelations, coolingSource } from "./cooling.ts";
import { environmentRounds } from "./environment-rounds.ts";
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
