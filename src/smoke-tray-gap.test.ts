import assert from "node:assert/strict";
import { test } from "node:test";
import { cableTraySettings } from "./cable-trays.ts";
import {
  environmentRounds,
  type EnvironmentRound,
} from "./environment-rounds.ts";
import { smokeMount } from "./smoke-mount.ts";
import { smokeTrayGap } from "./smoke-tray-gap.ts";

function close(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
}

function withSmokePosition(round: EnvironmentRound, position: number[]) {
  const [smoke, ...fixtures] = round.points;
  return { ...round, points: [{ ...smoke, position }, ...fixtures] };
}

test("两排圆壳与侧梁按配置外廓量取，水平间距和标高差各用自身基准", () => {
  for (const round of environmentRounds) {
    const [smoke, tray] = round.points;
    const gap = smokeTrayGap(round);
    close(gap.horizontal, 0.3775);
    close(gap.difference, 0.2075);
    close(gap.housingEdge.x, smoke.position[0]);
    close(gap.railEdge.x, smoke.position[0]);
    close(gap.housingEdge.z, smoke.position[2] + 0.105);
    close(gap.railEdge.z, tray.position[2] - 0.2175);
    close(gap.housingEdge.y, 3.6775);
    close(gap.housingBottom.y, 3.6225);
    close(gap.railEdge.y, 3.415);
    assert.ok(gap.housingMarker.z < gap.housingEdge.z);
    assert.ok(gap.railMarker.z > gap.railEdge.z);

    const opposite = smokeTrayGap(
      withSmokePosition(round, [
        smoke.position[0],
        smoke.position[1],
        2 * tray.position[2] - smoke.position[2],
      ]),
    );
    close(opposite.horizontal, gap.horizontal);
    close(opposite.difference, gap.difference);
    close(opposite.railEdge.z, tray.position[2] + 0.2175);
    close(opposite.housingEdge.z, 2 * tray.position[2] - gap.housingEdge.z);
  }
});

test("侧梁按有限长度量距，并处理投影接触与重合", () => {
  const round = environmentRounds[0];
  const [smoke, tray] = round.points;
  const end = tray.position[0] + cableTraySettings.length / 2;
  const beyond = smokeTrayGap(
    withSmokePosition(round, [end + 0.3, smoke.position[1], smoke.position[2]]),
  );
  close(beyond.railEdge.x, end);
  close(beyond.horizontal, Math.hypot(0.3, 0.4825) - 0.105);
  close(
    beyond.housingEdge.z - smoke.position[2],
    (0.4825 * 0.105) / Math.hypot(0.3, 0.4825),
  );

  const railNear = tray.position[2] - 0.2175;
  for (const smokeZ of [
    railNear - smokeMount.bodyUpperRadius,
    railNear - smokeMount.bodyUpperRadius / 2,
    railNear + cableTraySettings.railSize[0] / 2,
  ]) {
    const touching = smokeTrayGap(withSmokePosition(round, [0, 3.2, smokeZ]));
    close(touching.horizontal, 0);
    close(touching.housingEdge.x, touching.railEdge.x);
    close(touching.housingEdge.z, touching.railEdge.z);
    close(touching.difference, -0.2425);
  }
});
