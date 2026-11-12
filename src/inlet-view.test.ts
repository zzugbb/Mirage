import { test } from "node:test";
import assert from "node:assert/strict";
import { Box3, Group, Line, PerspectiveCamera, Ray, Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { devices, racks, deviceHeight, rackForDevice } from "./installation.ts";
import { modelForDevice } from "./catalog.ts";
import { inletInspection, inletViewFrame } from "./inlet-view.ts";
import { InletViewGeometry } from "./scene/inlet-view.ts";

test("双设备轮廓保持所查与基准顺序，仅使用已登记设备的完整安装跨度", () => {
  for (const device of devices) {
    const other = devices.find((d) => d.id !== device.id)!;
    const pair = { firstId: device.id, secondId: other.id };
    const view = inletInspection(pair)!;
    assert.deepEqual(view.pair, pair);
    assert.notEqual(view.pair, pair);
    assert.deepEqual(
      view.devices.map((d) => d.id),
      [device.id, other.id],
    );
    assert.equal(view.devices[0].point.y, deviceHeight(device.id));
    assert.equal(view.devices[0].point.x, rackForDevice(device.id).position[0]);
    assert.ok(
      Math.abs(
        view.devices[0].corners[2].y -
          view.devices[0].corners[0].y -
          (modelForDevice(device.id).units * definition.rack.unitPitch - 0.003),
      ) < 1e-10,
    );
  }
  for (const id of [devices[0].id, "rack-a01", "environment-01", "unknown"])
    assert.equal(
      inletInspection({ firstId: devices[0].id, secondId: id }),
      null,
    );
});

test("八柜最高与最低安装位任意组合在桌面可视区内，柜前轮廓不穿过柜体取景", () => {
  const blockers = racks.map((r) =>
    new Box3().setFromCenterAndSize(
      new Vector3(
        r.position[0],
        r.position[1] + definition.rack.size[1] / 2,
        r.position[2],
      ),
      new Vector3(...definition.rack.size),
    ),
  );
  const targets = racks.flatMap((r) => {
    const items = devices
      .filter((d) => d.rackId === r.id)
      .sort((a, b) => a.startUnit - b.startUnit);
    return [items[0], items.at(-1)!];
  });
  for (const [width, height] of [
    [732, 836],
    [644, 704],
    [1152, 836],
  ])
    for (const a of targets)
      for (const b of targets) {
        if (a === b) continue;
        const inspection = inletInspection({ firstId: a.id, secondId: b.id })!;
        const rect = {
          left: 90,
          right: width - 140,
          top: 100,
          bottom: height - 210,
        };
        const fit = inletViewFrame(inspection, width, height, rect);
        const camera = new PerspectiveCamera(40, width / height, 0.01, 200);
        camera.position.copy(fit.position);
        camera.lookAt(fit.target);
        camera.updateMatrixWorld(true);
        for (const point of inspection.points) {
          const projected = point.clone().project(camera),
            x = ((projected.x + 1) * width) / 2,
            y = ((1 - projected.y) * height) / 2;
          assert.ok(
            x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
            `${a.id}/${b.id}: out of frame`,
          );
          for (const box of blockers) {
            const hit = new Ray(
              fit.position,
              point.clone().sub(fit.position).normalize(),
            ).intersectBox(box, new Vector3());
            assert.ok(
              !hit ||
                hit.distanceTo(fit.position) >
                  point.distanceTo(fit.position) - 0.001,
              `${a.id}/${b.id}: blocked`,
            );
          }
        }
      }
});

test("柜前双轮廓保留深度，独立实线与虚线，没有跨设备连线且资源可释放", () => {
  const geometry = new InletViewGeometry(),
    parent = new Group();
  parent.add(geometry.root);
  const view = inletInspection({
    firstId: devices[0].id,
    secondId: devices[1].id,
  })!;
  for (let n = 0; n < 3; n++) {
    geometry.update(view);
    assert.equal(geometry.root.children.length, 2);
    geometry.root.children.forEach((object, i) => {
      const line = object as Line;
      assert.equal(line.geometry.getAttribute("position").count, 5);
      assert.equal((line.material as { depthTest: boolean }).depthTest, true);
      assert.equal(
        (line.material as { type: string }).type,
        i ? "LineDashedMaterial" : "LineBasicMaterial",
      );
    });
  }
  geometry.update(null);
  assert.equal(geometry.root.visible, false);
  geometry.dispose();
  assert.equal(parent.children.length, 0);
});
