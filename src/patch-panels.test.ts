import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  patchPanels,
  panelSettings,
  panelPortNumbers,
  portAtPanel,
  panelPortCenter,
  panelTermination,
} from "./patch-panels.ts";
import { rackById } from "./installation.ts";
import scene from "../assets/public/scenes/room-01.json" with { type: "json" };
import { buildPatchPanel, markPanelPort } from "./scene/patch-panels.ts";

test("配线登记双向唯一且不从孔号推测对端，参照柜和安装墙面来自样板配置", () => {
  const used = new Set<string>();
  for (const { id, first, second } of panelSettings.connections) {
    assert.deepEqual(panelTermination(first), { id, peer: second });
    assert.deepEqual(panelTermination(second), { id, peer: first });
    for (const endpoint of [first, second]) {
      assert.ok(panelPortNumbers.includes(endpoint.port));
      assert.ok(patchPanels.some((p) => p.id === endpoint.panelId));
      const key = endpoint.panelId + "/" + endpoint.port;
      assert.ok(!used.has(key));
      used.add(key);
    }
  }
  assert.equal(used.size, 8);
  for (const p of patchPanels) {
    assert.equal(p.mountId, "shell-back-wall");
    assert.ok(
      Math.abs(
        p.position[2] -
          panelSettings.size[2] / 2 -
          (-scene.room.size[2] / 2 + scene.room.wallThickness / 2),
      ) < 1e-9,
    );
    assert.ok(rackById(p.referenceRackId!));
    for (const n of panelPortNumbers)
      assert.equal(
        !!panelTermination({ panelId: p.id, port: n }),
        used.has(p.id + "/" + n),
      );
  }
});

test("线槽往返保留起点孔，另一块面板只定位已登记的对端", () => {
  for (const panel of patchPanels) {
    const other = patchPanels.find((p) => p.id !== panel.id)!;
    for (const port of panelPortNumbers) {
      const origin = { panelId: panel.id, port };
      assert.deepEqual(portAtPanel(origin, panel.id), origin);
      const entry = panelSettings.connections
        .flatMap(({ first, second }) => [
          [first, second],
          [second, first],
        ])
        .find(([from]) => from.panelId === panel.id && from.port === port);
      assert.deepEqual(portAtPanel(origin, other.id), entry?.[1] ?? null);
      assert.equal(portAtPanel(origin, "raceway-horizontal"), null);
    }
  }
});

test("两块面板逐孔拾取命中登记实例，切换对端与清除只影响所选孔框", () => {
  const groups = new Map<string, THREE.Group>();
  for (const p of patchPanels) {
    const g = new THREE.Group();
    g.name = p.id;
    buildPatchPanel(g, p.name);
    g.position.fromArray(p.position);
    g.updateMatrixWorld(true);
    groups.set(p.id, g);
  }
  for (const [id, g] of groups)
    for (const port of panelPortNumbers) {
      markPanelPort(groups, { panelId: id, port });
      const outline = g.getObjectByName("panel-port-outline")!;
      assert.equal(outline.visible, true);
      const pos = new THREE.Vector3().fromArray(panelPortCenter(port));
      assert.equal(outline.position.x, pos.x);
      assert.equal(outline.position.y, pos.y);
      const origin = g.localToWorld(pos).add(new THREE.Vector3(0, 0, 0.2));
      const hit = new THREE.Raycaster(
        origin,
        new THREE.Vector3(0, 0, -1),
      ).intersectObject(g, true)[0];
      assert.equal(hit.object.name, "panel-apertures");
      assert.equal(hit.object.userData.panelPorts[hit.instanceId!], port);
      assert.equal(
        [...groups.values()].filter(
          (g) => g.getObjectByName("panel-port-outline")!.visible,
        ).length,
        1,
      );
    }
  markPanelPort(groups, null);
  assert.ok(
    [...groups.values()].every(
      (g) => !g.getObjectByName("panel-port-outline")!.visible,
    ),
  );
});

test("配线架字面和各孔口拼成单层正面，斜视不会同时命中重合箱面", () => {
  const [width, height, depth] = panelSettings.size;
  for (const panel of patchPanels) {
    const group = new THREE.Group();
    group.name = panel.id;
    buildPatchPanel(group, panel.name);
    group.updateMatrixWorld(true);
    const look = new THREE.Vector3(-0.4, -0.1, -1).normalize();
    const samples = [
      [width / 2 - 0.012, height / 2 - 0.012, "panel-print"],
      ...panelPortNumbers.map((port) => {
        const [x, y] = panelPortCenter(port);
        return [x, y, "panel-apertures"] as const;
      }),
    ] as const;
    for (const [x, y, mesh] of samples) {
      const front = new THREE.Vector3(x, y, depth / 2);
      const ray = new THREE.Raycaster(
        front.clone().addScaledVector(look, -1),
        look,
      );
      const hits = ray
        .intersectObject(group)
        .filter(({ point }) => Math.abs(point.z - front.z) < 0.002);
      assert.deepEqual(
        [...new Set(hits.map(({ object }) => object.name))],
        [mesh],
      );
    }
  }
});

test("三段线槽和两块面板均可按端接登记起查，当侧优先且不扩展到邻柜", async () => {
  const { racewayRegisterStart, racewayConnections, racewayPanels } =
    await import("./panel-raceway.ts");
  assert.deepEqual(
    racewayPanels.map((p) => p.id),
    ["patch-panel-01", "patch-panel-02"],
  );
  for (const id of ["raceway-horizontal", "raceway-west", "patch-panel-01"])
    assert.deepEqual(racewayRegisterStart(id), racewayConnections[0].first);
  for (const id of ["raceway-east", "patch-panel-02"])
    assert.deepEqual(racewayRegisterStart(id), racewayConnections[0].second);
  assert.equal(racewayRegisterStart("rack-a08"), null);
  assert.equal(racewayConnections.length, 4);
  for (const connection of racewayConnections) {
    assert.deepEqual(
      panelTermination(connection.first)?.peer,
      connection.second,
    );
    assert.deepEqual(
      panelTermination(connection.second)?.peer,
      connection.first,
    );
  }
});

test("逐孔由孔中心量到箱顶入盒中心，沿横槽换端只量已登记的孔", async () => {
  const { panelEntryMeasure, racewayAxisSpan } =
    await import("./panel-raceway.ts");
  const [west, east] = patchPanels;
  for (const panel of patchPanels) {
    const other = panel.id === west.id ? east : west;
    const side = panel.id === west.id ? "west" : "east";
    for (const port of panelPortNumbers) {
      const origin = { panelId: panel.id, port };
      const result = panelEntryMeasure("raceway-" + side, origin)!;
      assert.deepEqual(result, panelEntryMeasure(panel.id, origin));
      const hole = result.hole!;
      const [x, y] = panelPortCenter(port);
      assert.ok(
        Math.abs(panel.position[0] + x + hole.dx - result.drop.position[0]) <
          1e-9,
      );
      assert.ok(
        Math.abs(
          panel.position[1] +
            y +
            hole.rise -
            (result.drop.position[1] - result.drop.sectionSize[1] / 2),
        ) < 1e-9,
      );
      const peer = panelTermination(origin)?.peer ?? null;
      assert.deepEqual(
        panelEntryMeasure(other.id, origin)?.hole?.endpoint ?? null,
        peer,
      );
    }
  }
  assert.equal(Math.round(racewayAxisSpan * 1000), 5560);
  assert.equal(
    panelEntryMeasure("raceway-horizontal", { panelId: west.id, port: 1 }),
    null,
  );
});
