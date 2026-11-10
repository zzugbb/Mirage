import {
  environmentComparison,
  environmentProbe,
  environmentValue,
  type EnvironmentMetric,
} from "./environment-monitoring.ts";

export type EnvironmentPair = { firstId: string; secondId: string };
/** 固定进入时的两端身份；预览或定位任一端不颠倒差值方向。 */
export function environmentPair(
  firstId: string,
  secondId: string,
): EnvironmentPair | null {
  return firstId !== secondId &&
    environmentProbe(firstId) &&
    environmentProbe(secondId)
    ? { firstId, secondId }
    : null;
}
export function environmentPairIncludes(
  pair: EnvironmentPair | null,
  selected: string,
) {
  return !!pair && [pair.firstId, pair.secondId].includes(selected);
}
export function environmentPairMarkers(
  pair: EnvironmentPair,
  metric: EnvironmentMetric,
  time: number,
) {
  const row = environmentComparison(pair.firstId, pair.secondId, time)?.find(
    (row) => row.metric === metric,
  );
  if (!row) return [];
  return [pair.firstId, pair.secondId].map((id, index) => {
    const fixture = environmentProbe(id)!.fixture;
    const reading = index ? row.right : row.left;
    return {
      id,
      name: fixture.name,
      position: fixture.position,
      title: `${index ? "②" : "①"} ${fixture.name}`,
      value: `${environmentValue(reading.value, metric === "humidity" ? "%RH" : "°C")} · ${reading.status}`,
    };
  });
}
