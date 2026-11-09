import { test } from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera } from "three";
import {
  localIntakeEvidence,
  localIntakeTemperature,
  initialSliceControls,
  type IntakeInput,
} from "./temperature-slice.ts";
import { devices } from "./installation.ts";
import { spatialSnapshot } from "./spatial.ts";
import { inspectSliceDevice } from "./slice-device.ts";
import { SliceEvidenceGeometry } from "./scene/slice-evidence.ts";
const input = (
  id: string,
  x: number,
  temperature: number | null,
): IntakeInput => ({ id, position: [x, 1, 1], front: 0.9, temperature });

test("局部估计依据保留有效零值，等距输入各占一半且直接重合只采用一个输入", () => {
  const inputs = [input("a", 0, 0), input("b", 0.4, 40)];
  const midpoint = localIntakeEvidence(inputs, [0.2, 1, 1]);
  assert.equal(midpoint.reason, "weighted");
  assert.ok(Math.abs(midpoint.temperature! - 20) < 1e-9);
  assert.deepEqual(
    midpoint.inputs.map((i) => i.share),
    [0.5, 0.5],
  );
  const exact = localIntakeEvidence(inputs, [0, 1, 1]);
  assert.equal(exact.reason, "exact");
  assert.equal(exact.temperature, 0);
  assert.deepEqual(
    exact.inputs.map((i) => i.share),
    [1, 0],
  );
  assert.equal(localIntakeEvidence(inputs, [0, 1, 0.8]).reason, "outside");
  assert.equal(localIntakeEvidence(inputs, [5, 1, 1]).inputs.length, 0);
});
test("最近无效输入阻止邻居补值，明细保留邻居读数但不给计算占比", () => {
  const inputs = [input("missing", 0, null), input("valid", 0.4, 40)];
  const result = localIntakeEvidence(inputs, [0.1, 1, 1]);
  assert.equal(result.reason, "nearest-unavailable");
  assert.equal(result.nearestId, "missing");
  assert.equal(result.temperature, null);
  assert.deepEqual(
    result.inputs.map((i) => i.share),
    [null, null],
  );
  assert.equal(result.inputs[1].temperature, 40);
  const original = structuredClone(inputs);
  localIntakeEvidence(inputs, [0.35, 1, 1]);
  assert.deepEqual(inputs, original);
});
test("84 台设备两种切面和多个时刻的依据与切片同源，占比可还原估计且无效输入始终不参与", () => {
  for (const time of [0, 44, 45, 60, 120]) {
    const readings = spatialSnapshot(time).readings;
    for (const device of devices)
      for (const orientation of ["horizontal", "vertical"] as const) {
        const controls = { ...initialSliceControls(), orientation };
        const initial = inspectSliceDevice(device.id, controls, readings)!;
        for (const current of [
          controls,
          initial.target,
          {
            ...initial.target,
            height: initial.target.height + 0.08,
            distance: 0.36,
          },
        ]) {
          const context = inspectSliceDevice(device.id, current, readings)!;
          if (!context.evidence) {
            assert.equal(context.point, null);
            continue;
          }
          const e = context.evidence;
          assert.equal(e.temperature, context.estimate);
          const rendered = localIntakeTemperature(
            e.inputs,
            context.point!,
          ).temperature;
          if (e.temperature === null) assert.equal(rendered, null);
          else
            assert.ok(
              rendered !== null && Math.abs(rendered - e.temperature) < 1e-9,
            );
          if (e.temperature !== null) {
            assert.ok(
              Math.abs(
                e.inputs.reduce((sum, i) => sum + (i.share ?? 0), 0) - 1,
              ) < 1e-9,
            );
            assert.ok(
              Math.abs(
                e.inputs.reduce(
                  (sum, i) => sum + (i.temperature ?? 0) * (i.share ?? 0),
                  0,
                ) - e.temperature,
              ) < 1e-9,
            );
          }
          for (const i of e.inputs)
            if (readings.get(i.id)!.quality !== "valid") {
              assert.equal(i.temperature, null);
              assert.equal(i.share, null);
            }
        }
      }
  }
});
test("三维核对标记复用缓冲，保留遮挡且不参与拾取和接触阴影；结束核对完整隐藏", () => {
  const context = inspectSliceDevice(
    "srv-01",
    initialSliceControls(),
    spatialSnapshot(60).readings,
  )!;
  const geometry = new SliceEvidenceGeometry(),
    camera = new PerspectiveCamera();
  const buffer = geometry.geometry.getAttribute("position");
  geometry.update(context, context.evidence!.inputs[0].id);
  geometry.frame(camera);
  assert.equal(geometry.root.visible, true);
  assert.equal(geometry.line.visible, true);
  assert.ok(geometry.geometry.drawRange.count > 8);
  assert.equal(geometry.root.userData.excludeFromContactShadows, true);
  assert.equal(geometry.material.depthTest, true);
  camera.rotateY(0.3);
  geometry.frame(camera);
  assert.equal(geometry.geometry.getAttribute("position"), buffer);
  geometry.frame(camera, false);
  assert.equal(geometry.root.visible, false);
  geometry.frame(camera, true);
  assert.equal(geometry.root.visible, true);
  geometry.update(null, null);
  geometry.frame(camera);
  assert.equal(geometry.root.visible, false);
  let disposed = 0;
  geometry.geometry.addEventListener("dispose", () => disposed++);
  geometry.dispose();
  assert.equal(disposed, 1);
  assert.equal(geometry.root.children.length, 0);
});
