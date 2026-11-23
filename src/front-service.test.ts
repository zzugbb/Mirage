import assert from "node:assert/strict";
import test from "node:test";
import { modelForDevice } from "./catalog.ts";
import { findMaintenanceAisles } from "./maintenance.ts";
import {
  frontServiceDevices,
  frontServiceInspection,
} from "./front-service.ts";
import { mechanismTransform, initialMechanism } from "./mechanics.ts";
import { MaintenanceGeometry } from "./scene/maintenance.ts";

test("每组通道按柜前安装位排列，投影与导轨全行程一致，固定设备留在原位", () => {
  const models = new Set<string>();
  const travel = mechanismTransform({
    ...initialMechanism(),
    tray: 1,
  }).trayOffset;
  for (const { front, rear } of findMaintenanceAisles("")) {
    const devices = frontServiceDevices(front);
    assert.ok(devices.length);
    assert.deepEqual(frontServiceDevices(rear), []);
    assert.deepEqual(
      devices.map((d) => d.startUnit),
      devices.map((d) => d.startUnit).sort((a, b) => a - b),
    );
    for (const device of devices) {
      const model = modelForDevice(device.id);
      models.add(model.id);
      const mounted = frontServiceInspection(front, device.id, false)!;
      const drawn = frontServiceInspection(front, device.id, true)!;
      const offset = model.category === "switch" ? 0 : travel;
      assert.equal(drawn.travel, offset);
      assert.ok(Math.abs(drawn.frontZ - mounted.frontZ - offset) < 1e-8);
      assert.ok(Math.abs(mounted.remaining - 1.195) < 1e-8);
      assert.ok(Math.abs(drawn.remaining + offset - mounted.remaining) < 1e-8);
      assert.equal(frontServiceInspection(rear, device.id, true), null);
    }
  }
  assert.equal(models.size, 4);
});

test("柜前投影尺跟随安装高度及前沿，归位与退出不残留抽出读数", () => {
  const [a, b] = findMaintenanceAisles("");
  const id = frontServiceDevices(a.front)[0].id;
  assert.equal(frontServiceInspection(b.front, id, true), null);
  assert.equal(frontServiceInspection(a.front, "unknown", false), null);
  const overlay = new MaintenanceGeometry();
  for (const extended of [false, true, false]) {
    const inspection = frontServiceInspection(a.front, id, extended)!;
    overlay.showFrontService(inspection);
    const points = overlay.frontRuler.geometry.getAttribute("position");
    assert.ok(Math.abs(points.getY(0) - inspection.height) < 1e-6);
    assert.ok(Math.abs(points.getZ(0) - inspection.frontZ) < 1e-6);
    assert.ok(Math.abs(points.getZ(5) - inspection.area.bounds.maxZ) < 1e-6);
  }
  overlay.showFrontService(null);
  assert.equal(overlay.frontRuler.visible, false);
  overlay.dispose();
});
