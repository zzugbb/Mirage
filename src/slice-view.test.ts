import { test } from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera } from "three";
import { devices, rackForDevice } from "./installation.ts";
import { spatialSnapshot } from "./spatial.ts";
import { initialSliceControls } from "./temperature-slice.ts";
import { inspectSliceDevice } from "./slice-device.ts";
import { sliceViewPoints, sliceViewFrame } from "./slice-view.ts";

const frames = [
  [852, 836],
  [732, 836],
  [744, 704],
  [644, 704],
];
test("全部设备的估计位置与附近输入在桌面可用画幅内，后排从排间通道观察", () => {
  const readings = spatialSnapshot(60).readings;
  for (const device of devices)
    for (const orientation of ["horizontal", "vertical"] as const) {
      const initial = { ...initialSliceControls(), orientation };
      const aligned = inspectSliceDevice(device.id, initial, readings)!.target;
      for (const controls of [
        aligned,
        ...(orientation === "horizontal"
          ? [
              { ...aligned, height: 0.2 },
              { ...aligned, height: 2.1 },
            ]
          : [{ ...aligned, distance: 0.9 }]),
      ]) {
        const context = inspectSliceDevice(device.id, controls, readings)!;
        const points = sliceViewPoints(context);
        for (const [width, height] of frames) {
          const rect = {
            left: Math.min(314, width * 0.48),
            right: width - 40,
            top: 96,
            bottom: height - 48,
          };
          const fit = sliceViewFrame(points, width, height, rect);
          const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
          camera.position.copy(fit.position);
          camera.lookAt(fit.target);
          camera.updateMatrixWorld(true);
          for (const point of points) {
            const p = point.clone().project(camera),
              x = ((p.x + 1) * width) / 2,
              y = ((1 - p.y) * height) / 2;
            assert.ok(
              x > rect.left &&
                x < rect.right &&
                y > rect.top &&
                y < rect.bottom,
              `${device.id}/${orientation}/${width}: ${x},${y}`,
            );
          }
          assert.ok(fit.position.y > 0.1);
          if (rackForDevice(device.id).position[2] < 0)
            assert.ok(
              fit.position.z < 1.2,
              `${device.id}/${width} camera behind front row: ${fit.position.z}`,
            );
        }
      }
    }
});
test("回看、过期、离线与停机不改变取景点，其他柜排没有可观察位置", () => {
  for (const id of ["srv-01", "srv-59", "srv-25", "srv-56", "srv-63"]) {
    const controls = inspectSliceDevice(
      id,
      { ...initialSliceControls(), orientation: "vertical" },
      spatialSnapshot(0).readings,
    )!.target;
    const points = [0, 44, 45, 60, 120].map((time) =>
      sliceViewPoints(
        inspectSliceDevice(id, controls, spatialSnapshot(time).readings),
      ),
    );
    for (const next of points.slice(1)) assert.deepEqual(next, points[0]);
  }
  assert.deepEqual(
    sliceViewPoints(
      inspectSliceDevice(
        "srv-59",
        { ...initialSliceControls(), orientation: "vertical", rowId: "row-a" },
        spatialSnapshot(60).readings,
      ),
    ),
    [],
  );
  assert.deepEqual(sliceViewPoints(null), []);
});
test("移动切片使用新位置，拟合不修改核对点与既有气流输入", () => {
  const controls = initialSliceControls(),
    readings = spatialSnapshot(60).readings;
  const near = sliceViewPoints(
    inspectSliceDevice("srv-01", controls, readings),
  );
  const high = sliceViewPoints(
    inspectSliceDevice("srv-01", { ...controls, height: 1.8 }, readings),
  );
  assert.notDeepEqual(near, high);
  const original = near.map((p) => p.clone());
  sliceViewFrame(near, 744, 704, {
    left: 300,
    right: 704,
    top: 100,
    bottom: 650,
  });
  assert.deepEqual(near, original);
});
