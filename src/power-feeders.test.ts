import assert from "node:assert/strict";
import { test } from "node:test";
import { pdus, powerLinks } from "./power-config.ts";
import { feederConnections, initialFeeders } from "./power-feeders.ts";

test("逐条出线核查覆盖八柜全部登记输入，保留配置插座与安装位", () => {
  const found = new Set<string>();
  const devices = new Set<string>();
  for (const pdu of pdus) {
    const result = feederConnections({ ...initialFeeders(), first: pdu.id });
    const expected = powerLinks.filter((link) => link.pduId === pdu.id);
    assert.equal(result.inputs, expected.length);
    assert.equal(
      result.devices,
      new Set(expected.map((link) => link.deviceId)).size,
    );
    for (const row of result.matching) {
      devices.add(row.device.id);
      assert.equal(row.rack.id, pdu.rackId);
      assert.match(row.units, /^U/);
      assert.equal(row.membership, "first");
      for (const link of row.links) {
        assert.ok(expected.includes(link));
        assert.equal(link.deviceId, row.device.id);
        assert.ok(!found.has(link.id));
        found.add(link.id);
      }
    }
  }
  assert.equal(found.size, 168);
  assert.equal(devices.size, 84);
});
test("同柜按整机去重，查找仍保留源出线次序与两个输入", () => {
  const result = feederConnections({
    first: "pdu-a01-b",
    second: "pdu-a01-a",
    query: " srV-07  a01 ",
    group: "both",
  });
  assert.deepEqual(result.counts, { first: 0, both: 10, second: 0 });
  assert.equal(result.devices, 10);
  assert.equal(result.inputs, 20);
  assert.equal(result.matching.length, 1);
  const [row] = result.matching;
  assert.equal(row.units, "U3–4");
  assert.deepEqual(
    row.links.map((l) => [l.id, l.outlet, l.inlet]),
    [
      ["power-srv-07-b", 3, "B"],
      ["power-srv-07-a", 3, "A"],
    ],
  );
});
test("跨柜两路保留各自范围，空交集与空查找不影响配置总数", () => {
  const pair = { ...initialFeeders(), second: "pdu-a02-b" };
  const overlap = feederConnections({ ...pair, group: "both" });
  assert.deepEqual(overlap.counts, { first: 10, both: 0, second: 10 });
  assert.equal(overlap.devices, 20);
  assert.equal(overlap.inputs, 20);
  assert.deepEqual(overlap.matching, []);
  for (const group of ["first", "second"] as const) {
    const rows = feederConnections({ ...pair, group }).matching;
    assert.equal(rows.length, 10);
    assert.ok(
      rows.every((row) =>
        row.links.every((link) => link.pduId === pair[group]),
      ),
    );
  }
  const empty = feederConnections({ ...pair, query: "STO-99" });
  assert.deepEqual(empty.matching, []);
  assert.equal(empty.devices, 20);
});
