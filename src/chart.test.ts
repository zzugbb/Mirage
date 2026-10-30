import { test } from "node:test";
import assert from "node:assert/strict";
import { devices } from "./installation.ts";
import { observedHistory } from "./device-data.ts";
import { trendScale } from "./chart.ts";
test("所有演示设备的完整回放落在各自固定趋势坐标内，低负载不会沿用首台设备的功耗轴", () => {
  for (const device of devices)
    for (const metric of ["temperature", "power"] as const) {
      const { domain, caption } = trendScale(metric, device.id);
      for (const point of observedHistory(120, device.id, metric))
        assert.ok(point.value >= domain[0] && point.value <= domain[1]);
      if (metric === "power")
        assert.ok(caption.includes(`${domain[0]}–${domain[1]} W`));
    }
  assert.notDeepEqual(
    trendScale("power", "srv-01").domain,
    trendScale("power", "srv-04").domain,
  );
});
