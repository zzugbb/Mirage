import { test } from "node:test";
import assert from "node:assert/strict";
import { networkOverview, networkConnectionRows } from "./network-overview.ts";
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

test("全机房连接结果按八柜安装位置排列，A/B 各68条且不生成未配置口", () => {
  const rows = networkConnectionRows();
  assert.equal(rows.length, 136);
  assert.deepEqual(
    new Set(rows.map(({ link }) => link.id)),
    new Set(networkLinks.map((link) => link.id)),
  );
  assert.deepEqual(rows, networkConnectionRows("   "));
  for (const role of ["A", "B"] as const) {
    const filtered = networkConnectionRows("", role);
    assert.equal(filtered.length, 68);
    assert.ok(
      filtered.every((row) => row.role === role && row.link.speedGbps === 25),
    );
    assert.ok(filtered.every((row) => row.endpoints.length === 2));
  }
  const room = networkOverview();
  assert.deepEqual(
    rows.map((row) => row.link.id),
    room.flatMap((r) =>
      r.sources.flatMap((s) => s.connections.map((l) => l.id)),
    ),
  );
});

test("组合查找限定同一条连接，跨柜存储、两端编号、U位与分支可共同限定", () => {
  const rows = networkConnectionRows("  b03   Sto-01 ", "B");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rack.id, "rack-a07");
  assert.equal(rows[0].link.source, "sto-01");
  assert.equal(rows[0].link.target, "sw-14");
  assert.equal(networkConnectionRows("SRV-01 SW-02 U23").length, 1);
  assert.equal(networkConnectionRows("SRV-01 SW-02", "A").length, 0);
  assert.equal(networkConnectionRows("SRV-01 SW-01 SW-02").length, 0);
  assert.equal(networkConnectionRows("100G").length, 0);
  assert.equal(networkConnectionRows("不存在的设备").length, 0);
  assert.deepEqual(
    networkOverview("B03 STO-01").flatMap((r) =>
      r.matching.map((s) => s.device.id),
    ),
    ["sto-01"],
  );
  assert.equal(
    networkOverview("SRV-01 SW-01 SW-02").flatMap((r) => r.matching).length,
    0,
  );
});

test("可看走线仅列出已支持的同柜连接，并与查找和分支共同筛选", () => {
  assert.deepEqual(
    networkConnectionRows("", "all", true).map(({ link }) => [
      link.source,
      link.target,
    ]),
    [
      ["sto-02", "sw-13"],
      ["sto-02", "sw-14"],
      ["sto-01", "sw-13"],
      ["sto-01", "sw-14"],
      ["sto-04", "sw-15"],
      ["sto-04", "sw-16"],
      ["sto-03", "sw-15"],
      ["sto-03", "sw-16"],
    ],
  );
  assert.deepEqual(
    networkConnectionRows("B04 09", "B", true).map(({ link }) => link.target),
    ["sw-16"],
  );
  assert.equal(
    networkConnectionRows("STO-04 U38 端口10", "all", true).length,
    2,
  );
});

test("交换机端口与控制器分支按字段匹配，U 位可落在任一端安装跨度内", () => {
  const find = (q: string) =>
    networkConnectionRows(q).map(({ link }) => link.id);
  for (const query of [
    "B04 SW-16 端口09",
    "B04 SW-16 端口 9",
    "Ｂ０４ Ｕ２６ 控制器 Ｂ 交换机口０９",
    "B04 STO-03 U41 接入B",
    "B04 U28 U41 控制器 B",
  ])
    assert.deepEqual(find(query), ["link-sto-03-1"]);
  assert.deepEqual(find("B04 SW-16 端口1"), find("B04 SW-16 端口01"));
  assert.equal(find("B04 SW-16 端口1").length, 1);
  assert.equal(find("B04 SW-16 端口09 控制器A").length, 0);
  assert.equal(find("B04 STO-03 U2").length, 0);
  assert.equal(find("B04 端口 00").length, 0);
  assert.deepEqual(
    networkOverview("B04 U26 SW-16 端口 09").flatMap((r) =>
      r.matching.flatMap((s) => s.matchingLinks.map((link) => link.id)),
    ),
    ["link-sto-03-1"],
  );
});
