import { test } from "node:test";
import assert from "node:assert/strict";
import {
  switchPortRows,
  switchPortNeighbor,
  switchPortIncludes,
} from "./switch-ports.ts";
import { devices } from "./installation.ts";
import {
  networkLinks,
  modelForDevice,
  partsForDevice,
  subpartsForDevice,
} from "./catalog.ts";

test("16台交换机的端口总览沿用54个逻辑口与136条接入，不重复或补造上联", () => {
  const switches = devices.filter(
    (device) => modelForDevice(device.id).category === "switch",
  );
  assert.equal(switches.length, 16);
  const links: string[] = [];
  for (const device of switches) {
    const rows = switchPortRows(device.id);
    assert.equal(rows.length, 54);
    assert.equal(new Set(rows.map((row) => row.port)).size, 54);
    assert.equal(rows.filter((row) => row.speedGbps === 25).length, 48);
    assert.equal(rows.filter((row) => row.speedGbps === 100).length, 6);
    assert.ok(
      rows
        .filter((row) => row.speedGbps === 100)
        .every((row) => !row.link && !row.peer),
    );
    for (const row of rows.filter((row) => row.link)) {
      assert.equal(row.link!.target, device.id);
      assert.equal(row.link!.targetPort, row.port);
      assert.equal(row.peer!.id, row.link!.source);
      links.push(row.link!.id);
    }
  }
  assert.deepEqual(links.sort(), networkLinks.map((link) => link.id).sort());
  assert.equal(links.length, 136);
  assert.deepEqual(switchPortRows("srv-01"), []);
  assert.deepEqual(switchPortRows("unknown"), []);
});
test("查找保留全部编号，数字精确匹配，速率和对端支持多词交集", () => {
  assert.equal(
    switchPortRows("sw-01", "01").filter((row) => row.matches).length,
    1,
  );
  assert.deepEqual(
    switchPortRows("sw-01", "100G 未配置")
      .filter((row) => row.matches)
      .map((row) => row.port),
    [49, 50, 51, 52, 53, 54],
  );
  assert.equal(
    switchPortRows("sw-01", "SRV-01").filter((row) => row.matches)[0].peer!.id,
    "srv-01",
  );
  assert.equal(
    switchPortRows("sw-01", "999").filter((row) => row.matches).length,
    0,
  );
  assert.equal(switchPortRows("sw-01", "不存在").length, 54);
});
test("键盘在速率分组内移动，边界不跳进另一组", () => {
  assert.equal(switchPortNeighbor(1, "ArrowUp"), 1);
  assert.equal(switchPortNeighbor(1, "ArrowDown"), 9);
  assert.equal(switchPortNeighbor(48, "ArrowRight"), 48);
  assert.equal(switchPortNeighbor(49, "ArrowLeft"), 49);
  assert.equal(switchPortNeighbor(20, "Home"), 1);
  assert.equal(switchPortNeighbor(20, "End"), 48);
  assert.equal(switchPortNeighbor(50, "End"), 54);
  assert.equal(switchPortNeighbor(51, "Enter"), 51);
});
test("往返只延续本交换机、已配置对端及其部件，未配置口不借用其他设备", () => {
  for (const id of ["srv-01", "srv-08", "sto-01"]) {
    const link = networkLinks.find((link) => link.source === id)!;
    const check = { switchId: link.target, port: link.targetPort, query: "" };
    for (const deviceId of [id, link.target]) {
      assert.ok(switchPortIncludes(check, deviceId, deviceId));
      for (const part of [
        ...partsForDevice(deviceId),
        ...subpartsForDevice(deviceId),
      ])
        assert.ok(switchPortIncludes(check, part.id, deviceId));
    }
    assert.equal(switchPortIncludes(check, "cooling-01", id), false);
    assert.equal(switchPortIncludes(check, "nic-01", "srv-04"), false);
  }
  assert.equal(
    switchPortIncludes(
      { switchId: "sw-01", port: 54, query: "" },
      "srv-01",
      "srv-01",
    ),
    false,
  );
});
