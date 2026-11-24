import {
  coolingDeviceIds,
  coolingRelations,
  coolingSource,
} from "./cooling.ts";
import { airflowSnapshot } from "./airflow.ts";
import {
  environmentRounds,
  type EnvironmentRound,
} from "./environment-rounds.ts";
import { deviceSourceRows } from "./reading-sources.ts";
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

export function probeAirflowForInput(
  probeId: string,
  rackId: string,
  deviceId: string,
) {
  const context = coolingProbeForDevice(deviceId);
  if (context?.probe.id !== probeId || context.device.rackId !== rackId)
    return null;
  const route = airflowSnapshot(0, new Map(), deviceId).routes[0];
  return route?.deviceId === deviceId && route.sourceId === coolingSource.id
    ? { ...context, route }
    : null;
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
    const inputs = deviceSourceRows(
      coolingDeviceIds(rack.id),
      "temperature",
      readings,
    );
    const peak = inputs[0];
    return {
      rack,
      inputs,
      coverage: inputs.filter((input) => input.included).length,
      count: inputs.length,
      device: peak?.included ? deviceById(peak.id) : undefined,
      maximum: peak?.value ?? null,
    };
  });
}
