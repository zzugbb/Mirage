import { test } from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera } from "three";
import {
  lightTrayCrossings,
  diffuserBottom,
  lightProfile,
} from "./ceiling-lights.ts";
import { cableTraySettings } from "./cable-trays.ts";
import { fixtureCrossing, crossingViewFrame } from "./fixture-crossing.ts";

test("六处交叉双向共用配置表面，标记确实落在灯罩底面和侧梁顶面", () => {
  assert.equal(lightTrayCrossings.length, 6);
  for (const { light, tray, difference } of lightTrayCrossings) {
    const pair = fixtureCrossing(light.id, tray.id)!;
    assert.deepEqual(pair, fixtureCrossing(tray.id, light.id));
    assert.equal(pair.difference, difference);
    const [a, b] = pair.points;
    assert.equal(a.y, light.position[1] + diffuserBottom);
    assert.ok(
      Math.abs(
        b.y -
          (tray.position[1] +
            cableTraySettings.railCenterY +
            cableTraySettings.railSize[1] / 2),
      ) < 1e-10,
    );
    assert.ok(
      Math.abs(a.x - light.position[0]) <=
        lightProfile.diffuserWidth / 2 + 1e-10,
    );
    assert.ok(Math.abs(a.z - light.position[2]) <= light.length / 2);
    assert.ok(Math.abs(b.x - tray.position[0]) <= cableTraySettings.length / 2);
    assert.equal(b.z, tray.position[2] + cableTraySettings.railSpacing / 2);
    assert.deepEqual([a.x, a.z], [b.x, b.z]);
  }
  assert.equal(fixtureCrossing("unknown", "cable-tray-a"), null);
  assert.equal(fixtureCrossing("cable-tray-a", "cable-tray-b"), null);
});

test("交叉表面在桌面侧栏组合画幅内，上下表面保留可辨间距", () => {
  for (const { light, tray } of lightTrayCrossings) {
    const pair = fixtureCrossing(light.id, tray.id)!;
    for (const [width, height] of [
      [852, 836],
      [732, 836],
      [744, 704],
      [644, 704],
    ]) {
      const rect = {
        left: Math.min(314, width * 0.48),
        right: width - 40,
        top: 100,
        bottom: height - 48,
      };
      const fit = crossingViewFrame(pair.points, width, height, rect);
      const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
      camera.position.copy(fit.position);
      camera.lookAt(fit.target);
      camera.updateMatrixWorld(true);
      const positions = pair.points.map((point) => {
        const p = point.clone().project(camera);
        const x = ((p.x + 1) * width) / 2,
          y = ((1 - p.y) * height) / 2;
        assert.ok(
          x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
        );
        return y;
      });
      assert.ok(Math.abs(positions[0] - positions[1]) > 35);
    }
  }
});
