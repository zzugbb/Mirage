import assert from "node:assert/strict";
import { test } from "node:test";
import { networkLinks, partsForDevice } from "./catalog.ts";
import { deviceById } from "./installation.ts";
import { inletPart, pduById } from "./power-config.ts";
import { pduOutlet } from "./pdu-outlets.ts";
import { networkPowerEnds } from "./network-power.ts";

test("136 条网络接入的两端分别对应本机配置的输入、柜后插座和逻辑出线", () => {
  for (const branch of networkLinks) {
    const ends = networkPowerEnds(branch.id);
    assert.deepEqual(
      ends.map((end) => end.deviceId),
      [branch.source, branch.target],
    );
    for (const end of ends) {
      const device = deviceById(end.deviceId)!;
      assert.deepEqual(end.inputs.map((input) => input.inlet).sort(), [
        "A",
        "B",
      ]);
      for (const input of end.inputs) {
        const pdu = pduById(input.pduId)!;
        assert.equal(pdu.rackId, device.rackId);
        assert.equal(pduOutlet(pdu.id, input.outlet)?.device?.id, device.id);
        assert.ok(pdu.sourcePort);
        assert.ok(
          partsForDevice(device.id).some(
            (part) => part.id === inletPart(device.modelId, input.inlet),
          ),
        );
      }
    }
  }
  assert.deepEqual(networkPowerEnds("未登记"), []);
});

test("切换存储网络分支保留存储双输入，交换机插座随实际对端变化", () => {
  const [a, b] = networkLinks
    .filter((link) => link.source === "sto-01")
    .map((link) => networkPowerEnds(link.id));
  assert.deepEqual(a[0].inputs, b[0].inputs);
  assert.equal(a[1].deviceId, "sw-13");
  assert.equal(b[1].deviceId, "sw-14");
  assert.deepEqual(
    a[1].inputs.map((input) => input.outlet),
    [11, 11],
  );
  assert.deepEqual(
    b[1].inputs.map((input) => input.outlet),
    [12, 12],
  );
});
