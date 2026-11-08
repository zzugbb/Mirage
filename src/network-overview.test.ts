import { test } from "node:test";
import assert from "node:assert/strict";
import { networkOverview } from "./network-overview.ts";
import { networkLinks } from "./catalog.ts";
import { switchRole } from "./network.ts";

test("机房接入图完整覆盖八柜与136条配置，每条只出现一次", () => {
  const room = networkOverview();
  assert.equal(room.length, 8);
  assert.equal(room.flatMap((r) => r.switches).length, 16);
  assert.equal(room.flatMap((r) => r.sources).length, 68);
  const links = room.flatMap((r) => r.sources.flatMap((s) => s.connections));
  assert.equal(links.length, 136);
  assert.deepEqual(
    new Set(links.map((l) => l.id)),
    new Set(networkLinks.map((l) => l.id)),
  );
  for (const rack of room) {
    assert.equal(rack.matching.length, rack.sources.length);
    for (const source of rack.sources) {
      assert.equal(source.device.rackId, rack.rack.id);
      assert.deepEqual(
        source.connections.map((c) => switchRole(c.target)).sort(),
        ["A", "B"],
      );
      assert.ok(
        source.connections.every(
          (link) =>
            link.speedGbps === 25 &&
            rack.switches.some((sw) => sw.device.id === link.target),
        ),
      );
    }
    for (const sw of rack.switches) {
      assert.equal(sw.ports, 54);
      assert.equal(sw.uplinks, 6);
      assert.equal(sw.configured, rack.sources.length);
    }
  }
});

test("查找保留所有机柜与完整配置，仅筛选对应设备，支持存储和交换机对端", () => {
  const all = networkOverview();
  const storage = networkOverview(" sTo-01 ");
  assert.equal(storage.length, 8);
  assert.deepEqual(
    storage.flatMap((r) => r.matching.map((s) => s.device.id)),
    ["sto-01"],
  );
  const sw = all[0].switches[0].device.name;
  assert.equal(networkOverview(sw)[0].matching.length, all[0].sources.length);
  assert.ok(
    networkOverview("不存在的设备").every((r) => r.matching.length === 0),
  );
  for (let i = 0; i < 8; i++) assert.deepEqual(storage[i].links, all[i].links);
});
