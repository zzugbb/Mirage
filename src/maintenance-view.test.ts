import { test } from "node:test";
import assert from "node:assert/strict";
import { Box3, PerspectiveCamera, Ray, Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { maintenanceAreas, maintenanceAisle } from "./maintenance.ts";
import {
  maintenanceInspection,
  maintenanceViews,
  maintenanceViewFrame,
  maintenanceViewIncludes,
} from "./maintenance-view.ts";
const racks = definition.installation.racks;

test("八柜分段观察复用配置预留，排间两侧身份稳定，无关对象不进入", () => {
  assert.equal(maintenanceInspection("room-01", "front"), null);
  for (const rack of racks) {
    for (const view of maintenanceViews) {
      const inspection = maintenanceInspection(rack.id, view.id)!;
      assert.ok(maintenanceViewIncludes(inspection, rack.id));
      assert.equal(maintenanceViewIncludes(inspection, "srv-01"), false);
      if (view.id === "aisle") {
        const aisle = maintenanceAisle(rack.id)!;
        assert.deepEqual(inspection.areas, [aisle.front, aisle.rear]);
        const other = inspection.areas.find((a) => a.rackId !== rack.id)!;
        assert.ok(maintenanceViewIncludes(inspection, other.rackId));
        assert.deepEqual(
          inspection.points,
          maintenanceInspection(other.rackId, "aisle")!.points,
        );
      } else {
        assert.deepEqual(
          inspection.areas,
          maintenanceAreas(rack.id).filter((a) => a.kind === view.id),
        );
        assert.equal(inspection.aisle, undefined);
      }
    }
  }
});

test("八柜三种观察在桌面组合画幅内，地面边界视线不穿过已定义机柜", () => {
  for (const rack of racks)
    for (const view of maintenanceViews) {
      const inspection = maintenanceInspection(rack.id, view.id)!;
      for (const [width, height] of [
        [852, 836],
        [732, 836],
        [744, 704],
        [644, 704],
      ]) {
        const rect = {
          left: Math.min(330, width * 0.48),
          right: width - 40,
          top: 100,
          bottom: height - 48,
        };
        const fit = maintenanceViewFrame(inspection, width, height, rect);
        const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
        camera.position.copy(fit.position);
        camera.lookAt(fit.target);
        camera.updateMatrixWorld(true);
        for (const point of inspection.points) {
          const p = point.clone().project(camera),
            x = ((p.x + 1) * width) / 2,
            y = ((1 - p.y) * height) / 2;
          assert.ok(
            x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
            `${rack.id}/${view.id}/${width}`,
          );
          if (point.y > 1) continue;
          for (const other of racks) {
            const [w, h, d] = definition.rack.size;
            const bounds = new Box3(
              new Vector3(
                other.position[0] - w / 2,
                0,
                other.position[2] - d / 2,
              ),
              new Vector3(
                other.position[0] + w / 2,
                h,
                other.position[2] + d / 2,
              ),
            );
            const hit = new Ray(
              fit.position,
              point.clone().sub(fit.position).normalize(),
            ).intersectBox(bounds, new Vector3());
            assert.ok(
              !hit ||
                hit.distanceTo(fit.position) >=
                  point.distanceTo(fit.position) - 0.025,
              `${rack.id}/${view.id}/${width} 地面被 ${other.id} 遮挡`,
            );
          }
        }
      }
    }
});
