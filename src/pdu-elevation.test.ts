import assert from "node:assert/strict";
import { test } from "node:test";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { pdus, powerLinks, powerSettings } from "./power-config.ts";
import { deviceById } from "./installation.ts";
import { pduElevation } from "./pdu-elevation.ts";
import { modelForDevice } from "./catalog.ts";

test("逐位核对十六台 PDU 的配置标高、机柜和两路登记输入", () => {
  let total = 0,
    connected = 0;
  const models = new Set<string>();
  for (const pdu of pdus) {
    const side = powerSettings.layout.positions[pdu.feed];
    for (let outlet = 1; outlet <= powerSettings.outletsPerPdu; outlet++) {
      const v = pduElevation(pdu.id, outlet)!;
      total++;
      assert.ok(Math.abs(v.outletX + side[0]) < 1e-9);
      assert.equal(v.outletY, v.sockets[outlet - 1]);
      const segment = v.segment!;
      const { unitOrigin, unitPitch } = definition.rack;
      assert.ok(
        v.outletY >= unitOrigin + (v.unit - 0.5) * unitPitch &&
          v.outletY < unitOrigin + (v.unit + 0.5) * unitPitch,
      );
      assert.ok(v.unit >= segment.first && v.unit <= segment.last);
      if (segment.kind === "device") {
        assert.equal(v.alignedLink && v.alignedLink.deviceId, segment.id);
        assert.equal(deviceById(segment.id)?.rackId, pdu.rackId);
      } else assert.ok(!v.alignedLink);
      const link = powerLinks.find(
        (l) => l.pduId === pdu.id && l.outlet === outlet,
      );
      if (link) {
        connected++;
        assert.ok(v.input);
        assert.equal(v.socket.device?.id, link.deviceId);
        const band = v.bands.find((b) => b.id === link.deviceId)!;
        assert.ok(
          v.input.y >= band.bottom && v.input.y <= band.bottom + band.height,
        );
        assert.ok(Math.abs(v.input.delta - (v.input.y - v.outletY)) < 1e-9);
        models.add(modelForDevice(link.deviceId).id);
      } else {
        assert.equal(v.input, null);
        assert.equal(v.socket.device, null);
      }
    }
  }
  assert.deepEqual([total, connected, models.size], [384, 168, 4]);
});

test("同高设备、登记设备和未接插座独立核对", () => {
  const id = "pdu-b04-a";
  const v = pduElevation(id, 3)!;
  assert.equal(v.unit, 8);
  assert.equal(v.segment?.name, "SRV-58");
  assert.equal(v.socket.device?.name, "SRV-59");
  assert.equal(v.alignedLink && v.alignedLink.outlet, 2);
  const unused = pduElevation(id, 24)!;
  assert.equal(unused.unit, 37);
  assert.equal(unused.input, null);
  assert.equal(unused.segment?.name, "STO-04");
  assert.equal(unused.alignedLink && unused.alignedLink.outlet, 10);
  assert.equal(pduElevation("invalid", 3), null);
  assert.equal(pduElevation(id, 25), null);
});
