import { test } from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera } from "three";
import { slicePlanePoints, slicePlaneFrame } from "./slice-plane-view.ts";
import {
  sliceRackRows,
  temperatureSlice,
  verticalTemperatureSlice,
} from "./temperature-slice.ts";
import { spatialSnapshot } from "./spatial.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

const readings = spatialSnapshot(60).readings;
test("两排与距离边界均纳入切片和柜面，拟合桌面工具上方画幅", () => {
  for (const row of sliceRackRows)
    for (const distance of [0, 0.08, 0.9]) {
      const slice = verticalTemperatureSlice(readings, row.id, distance);
      const points = slicePlanePoints(slice);
      assert.ok(points.length > 40);
      const original = points.map((p) => p.clone());
      for (const [width, height, left = 24] of [
        [852, 836],
        [724, 704],
        [1152, 836],
        [744, 704, 314],
      ]) {
        const rect = {
          left,
          right: width - 24,
          top: 100,
          bottom: height - (left === 24 ? 350 : 48),
        };
        const fit = slicePlaneFrame(points, width, height, rect);
        const camera = new PerspectiveCamera(40, width / height, 0.01, 150);
        camera.position.copy(fit.position);
        camera.lookAt(fit.target);
        camera.updateMatrixWorld(true);
        for (const point of points) {
          const p = point.clone().project(camera);
          const x = ((p.x + 1) * width) / 2,
            y = ((1 - p.y) * height) / 2;
          assert.ok(
            x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
          );
        }
        // 后排柜前底部视线越过同向前排顶部；没有关闭柜体深度遮挡。
        if (row.id === "row-b") {
          const bottom = points[0];
          const frontZ = 1.8 + definition.rack.size[2] / 2;
          const ratio = (frontZ - bottom.z) / (fit.position.z - bottom.z);
          assert.ok(
            bottom.y + ratio * (fit.position.y - bottom.y) >
              definition.rack.size[1],
          );
        }
      }
      assert.deepEqual(points, original);
    }
});
test("整排取景不跟随有效输入、过期、离线或停机变动，水平切片无整排取景", () => {
  for (const row of sliceRackRows) {
    const baseline = slicePlanePoints(
      verticalTemperatureSlice(readings, row.id, 0.08),
    );
    for (const time of [0, 44, 45, 90, 120])
      assert.deepEqual(
        slicePlanePoints(
          verticalTemperatureSlice(
            spatialSnapshot(time).readings,
            row.id,
            0.08,
          ),
        ),
        baseline,
      );
    assert.notDeepEqual(
      slicePlanePoints(verticalTemperatureSlice(readings, row.id, 0.9)),
      baseline,
    );
  }
  assert.deepEqual(slicePlanePoints(null), []);
  assert.deepEqual(slicePlanePoints(temperatureSlice(readings, 1.2)), []);
});
