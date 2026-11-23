import assert from "node:assert/strict";
import test from "node:test";
import { aisleDoorSweeps } from "./door-sweep.ts";
import { floorGrilleSettings } from "./floor-grilles.ts";
import { grilleDoorSweep } from "./grille-door-sweep.ts";
import { findMaintenanceAisles, maintenanceGrilles } from "./maintenance.ts";
import { MaintenanceGeometry } from "./scene/maintenance.ts";

test("四组柜前格栅的两个扫掠角按整块面框裁切，面积与圆弧横截面相符", () => {
  let pairs = 0;
  const { width, depth } = floorGrilleSettings;
  for (const aisle of findMaintenanceAisles("")) {
    const sweep = aisleDoorSweeps(aisle)[0],
      leaf = sweep.leaves[0];
    for (const overlap of maintenanceGrilles(aisle.front)) {
      const [x, , z] = overlap.grille.position;
      for (const ref of ["peak", "open"] as const) {
        const result = grilleDoorSweep(aisle, overlap.grille, ref);
        assert.equal(result.angle, sweep[ref].angle);
        // 沿格栅深度积分真实圆弧，与渲染用的内接多边形独立比较。
        const step = depth / 4000;
        let exact = 0;
        for (let i = 0; i < 4000; i++) {
          const dz = z - depth / 2 + (i + 0.5) * step - leaf.hingeZ;
          if (dz < 0 || dz > leaf.reach) continue;
          const radiusX = Math.sqrt(leaf.reach ** 2 - dz ** 2);
          const start = Math.max(
            -radiusX,
            dz / Math.tan((result.angle * Math.PI) / 180),
          );
          const left = Math.max(x - width / 2, leaf.hingeX + start);
          const right = Math.min(x + width / 2, leaf.hingeX + radiusX);
          exact += Math.max(0, right - left) * step;
        }
        assert.ok(Math.abs(result.area - exact) < 0.000017, overlap.name);
        assert.equal(result.patch.length > 0, exact > 0);
        for (const p of result.patch) {
          assert.ok(
            Math.abs(p.x - x) <= width / 2 + 1e-10 &&
              Math.abs(p.z - z) <= depth / 2 + 1e-10,
          );
          assert.ok(
            Math.hypot(p.x - leaf.hingeX, p.z - leaf.hingeZ) <=
              leaf.reach + 1e-10,
          );
        }
        pairs++;
      }
    }
  }
  assert.equal(pairs, 22);
});

test("格栅从未扫到、开门后扫到、换成空交集，再退出核对时清除叠色", () => {
  const [aisle] = findMaintenanceAisles("B02");
  const [edge, , far] = maintenanceGrilles(aisle.front);
  const geometry = new MaintenanceGeometry();
  geometry.update([aisle.front], aisle);
  for (const [overlap, angle, expected] of [
    [edge, "peak", false],
    [edge, "open", true],
    [far, "open", false],
  ] as const) {
    const result = grilleDoorSweep(aisle, overlap.grille, angle);
    geometry.showDoorSweeps(undefined, angle, result);
    assert.equal(geometry.grillePatch.visible, expected);
    assert.equal(
      geometry.grillePatch.geometry.getAttribute("position").count > 0,
      expected,
    );
    assert.equal(geometry.sweepLines.visible, true);
  }
  geometry.showDoorSweeps(undefined, "open");
  assert.equal(geometry.sweepLines.visible, false);
  assert.equal(geometry.grillePatch.visible, false);
  geometry.dispose();
});

test("圆弧只与面框相切时保留零面积，越过边缘的微小扫掠单独显示", () => {
  const [aisle] = findMaintenanceAisles("B03");
  const grille = maintenanceGrilles(aisle.front)[0].grille;
  const leaf = aisleDoorSweeps(aisle)[0].leaves[0];
  const tangent = {
    ...grille,
    position: [
      leaf.hingeX,
      grille.position[1],
      leaf.hingeZ + leaf.reach + floorGrilleSettings.depth / 2,
    ] as typeof grille.position,
  };
  const touch = grilleDoorSweep(aisle, tangent, "peak");
  assert.equal(touch.area, 0);
  assert.deepEqual(touch.patch, []);
  assert.equal(grilleDoorSweep(aisle, grille, "peak").area, 0);
  const cm2 = grilleDoorSweep(aisle, grille, "open").area * 10000;
  assert.ok(cm2 > 0.1 && cm2 < 0.2);
});

test("从两排每块格栅反查柜前预留与门扇，边缘开口沿实际相交机柜回看", async () => {
  const { grilleSeatInspection } = await import("./grille-seat.ts");
  const { floorGrilleRows } = await import("./floor-grilles.ts");
  const { maintenanceAreas } = await import("./maintenance.ts");
  const rackIds = new Set<string>();
  let hits = 0,
    empty = 0;
  for (const row of floorGrilleRows) {
    const expected = row.rackIds.flatMap((id) => {
      const [area] = maintenanceAreas(id);
      return maintenanceGrilles(area).map((o) => ({ rackId: id, ...o }));
    });
    for (let i = 0; i < row.count; i++) {
      const peak = grilleSeatInspection(row.id, i, false, "peak")!;
      const open = grilleSeatInspection(row.id, i, true, "open")!;
      const overlap = expected.find((o) => o.grille.id === peak.id);
      assert.equal(open.front?.area.rackId, overlap?.rackId);
      assert.equal(peak.front?.sweep.angle, peak.front?.door.peak.angle);
      if (!overlap) {
        assert.equal(open.front, undefined);
        empty++;
        continue;
      }
      hits++;
      rackIds.add(overlap.rackId);
      assert.equal(open.front!.overlap?.overlapWidth, overlap.overlapWidth);
      assert.equal(open.front!.overlap?.overlapDepth, overlap.overlapDepth);
      assert.ok(open.front!.sweep.area >= peak.front!.sweep.area - 1e-10);
      if (i === 5) {
        assert.equal(open.branch, undefined);
        assert.equal(peak.front!.sweep.area, 0);
        assert.equal(Math.round(open.front!.sweep.area * 100000) / 10, 100.2);
      }
      if (i === 7) assert.equal(open.front!.sweep.area, 0);
      const aisle = findMaintenanceAisles("").find(
        (a) => a.front.rackId === overlap.rackId,
      );
      if (aisle)
        assert.deepEqual(
          open.front!.sweep,
          grilleDoorSweep(aisle, overlap.grille, "open"),
        );
    }
  }
  assert.deepEqual([hits, empty, rackIds.size], [22, 12, 8]);
});
