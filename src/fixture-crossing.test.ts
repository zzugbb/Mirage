import { test } from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera } from "three";
import { environmentRounds } from "./environment-rounds.ts";
import {
  lightTrayCrossings,
  diffuserBottom,
  housingLength,
  lightProfile,
} from "./ceiling-lights.ts";
import { cableTraySettings } from "./cable-trays.ts";
import { CrossingGeometry } from "./scene/fixture-crossing.ts";
import {
  lightingRound,
  smokeLightInspection,
  nearestHousingPoint,
  crossingObjectIds,
  fixtureCrossing,
  lightRodInspection,
  sectionLights,
  traySupportBay,
  traySupportStations,
  crossingViewFrame,
} from "./fixture-crossing.ts";

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

test("灯桥巡检只承接本排四柜，两处独立的高差括线跟随灯和所选横档", () => {
  const drawing = new CrossingGeometry();
  let count = 0;
  for (const { light, tray } of lightTrayCrossings) {
    const source = fixtureCrossing(light.id, tray.id)!;
    for (const row of cableTraySettings.rows) {
      for (const id of row.rackIds) {
        const route = lightingRound(light.id, tray.id, id);
        if (row.fixtureId !== tray.id) {
          assert.equal(route, null);
          continue;
        }
        assert.ok(route);
        const rack = fixtureCrossing(tray.id, id)!;
        assert.deepEqual(route.points, [...rack.points, ...source.points]);
        assert.equal(route.alongX, rack.points[0].x - light.position[0]);
        assert.deepEqual(crossingObjectIds(route), [light.id, tray.id, id]);
        drawing.update(route);
        const positions = drawing.geometry.getAttribute("position");
        assert.equal(positions.count, 12);
        for (const [i, j] of [
          [0, 0],
          [5, 1],
          [6, 2],
          [11, 3],
        ]) {
          assert.ok(Math.abs(positions.getX(i) - route.points[j].x) < 1e-6);
          assert.ok(Math.abs(positions.getY(i) - route.points[j].y) < 1e-6);
          assert.ok(Math.abs(positions.getZ(i) - route.points[j].z) < 1e-6);
        }
        count++;
      }
    }
    drawing.update(source);
    assert.equal(drawing.geometry.drawRange.count, 6);
  }
  assert.equal(count, 24);
  drawing.dispose();
});

test("逐排从烟感中心量到最近灯壳，切到同灯桥架时仍使用实际灯罩和侧梁", () => {
  for (const round of environmentRounds) {
    const [smoke, tray] = round.points;
    const initial = smokeLightInspection(round)!;
    assert.equal(initial.candidates.length, 3);
    assert.deepEqual(
      initial.candidates.map((c) => Number(c.horizontal.toFixed(2))),
      [1.62, 2.72, 7.22],
    );
    assert.equal(
      initial.light.id,
      smoke.position[0] < 0 ? "ceiling-light-01" : "ceiling-light-03",
    );
    assert.equal(smokeLightInspection(round, "unknown"), null);
    const geometry = new CrossingGeometry();
    for (const { light } of initial.candidates) {
      const housing = smokeLightInspection(round, light.id)!;
      assert.deepEqual(housing.points[1].toArray(), smoke.position);
      assert.ok(Math.abs(housing.difference - 0.09) < 1e-9);
      assert.equal(housing.points[0].z, smoke.position[2]);
      const section = smokeLightInspection(round, light.id, "crossing")!;
      assert.deepEqual(
        section.points,
        fixtureCrossing(light.id, tray.id)!.points,
      );
      assert.deepEqual(crossingObjectIds(section), [
        smoke.id,
        tray.id,
        light.id,
      ]);
      for (const pair of [housing, section]) {
        geometry.update(pair);
        assert.equal(
          geometry.geometry.drawRange.count,
          pair.view === "housing" ? 4 : 6,
        );
      }
    }
    geometry.update(null);
    assert.equal(geometry.root.visible, false);
    geometry.dispose();
  }
});

test("灯壳水平投影覆盖中心时保留零距离，端部外侧取配置外廓角点", () => {
  const { light } = lightTrayCrossings[0],
    [x, y, z] = light.position;
  const center = nearestHousingPoint([x, 0, z], light);
  assert.deepEqual([center.x, center.z], [x, z]);
  for (const sign of [-1, 1]) {
    const edge = nearestHousingPoint([x + sign, 0, z + sign * 15], light);
    assert.equal(edge.x, x + (sign * lightProfile.bodyWidth) / 2);
    assert.equal(edge.z, z + (sign * housingLength(light)) / 2);
    assert.equal(
      edge.y,
      y + lightProfile.bodyCenterY - lightProfile.bodyHeight / 2,
    );
  }
});

test("灯壳侧面与桥架吊杆采用同一截面的配置外缘，支吊段可双向找到灯具", () => {
  const s = cableTraySettings;
  const expectedGroups = [[0], [1, 2], [3]];
  const expectedGaps = [11, 1361, 11];
  const drawing = new CrossingGeometry();
  for (const [i, { light, tray }] of lightTrayCrossings.entries()) {
    const lightIndex = Math.floor(i / s.rows.length);
    const pair = lightRodInspection(light.id, tray.id);
    assert.ok(pair);
    assert.deepEqual(pair.stations, expectedGroups[lightIndex]);
    assert.deepEqual(crossingObjectIds(pair), [light.id, tray.id]);
    assert.deepEqual(
      sectionLights(pair.section).map(({ id }) => id),
      [light.id],
    );
    if (lightIndex === 1) {
      assert.equal(pair.section.kind, "tray-bay");
      for (const index of [0, 2])
        assert.deepEqual(sectionLights(traySupportBay(tray.id, index)!), []);
    } else assert.equal(pair.section.kind, "tray-support");
    assert.deepEqual(lightRodInspection(light.id, tray.id, 42), pair);
    for (const index of pair.stations) {
      const view = lightRodInspection(light.id, tray.id, index)!;
      assert.equal(view.index, index);
      assert.equal(
        Number((view.gap * 1000).toFixed(1)),
        expectedGaps[lightIndex],
      );
      assert.ok(
        view.racks.every((rack) =>
          s.rows
            .find((row) => row.fixtureId === tray.id)!
            .rackIds.includes(rack.id),
        ),
      );
      const [housing, rod] = view.points;
      assert.equal(housing.y, light.position[1] + lightProfile.bodyCenterY);
      assert.deepEqual([housing.y, housing.z], [rod.y, rod.z]);
      assert.equal(rod.z, tray.position[2] + view.toward * s.rodOffsetZ);
      assert.ok(
        Math.abs(
          Math.abs(housing.x - light.position[0]) - lightProfile.bodyWidth / 2,
        ) < 1e-9,
      );
      assert.ok(
        Math.abs(
          Math.abs(rod.x - tray.position[0] - traySupportStations[index]) -
            s.rodSize / 2,
        ) < 1e-9,
      );
      drawing.update(view);
      assert.equal(drawing.geometry.drawRange.count, 6);
    }
  }
  assert.equal(lightRodInspection("unknown", "cable-tray-a"), null);
  drawing.dispose();
});
