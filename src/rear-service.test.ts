import assert from "node:assert/strict";
import test from "node:test";
import { findMaintenanceAisles } from "./maintenance.ts";
import { pdus, powerSettings } from "./power-config.ts";
import { rearServiceInspection } from "./rear-service.ts";

test("各通道按柜后观察方向匹配两扇门、插座和同柜对端", () => {
  const aisles = findMaintenanceAisles("");
  assert.equal(aisles.length, 4);
  for (const aisle of aisles) {
    const installed = pdus.filter((pdu) => pdu.rackId === aisle.rear.rackId);
    assert.equal(installed.length, 2);
    for (const pdu of installed) {
      for (let n = 1; n <= powerSettings.outletsPerPdu; n++) {
        const check = rearServiceInspection(aisle, pdu.id, n)!;
        assert.equal(check.side, pdu.feed === "A" ? "右扇" : "左扇");
        assert.equal(check.sweep.area.id, aisle.rear.id);
        assert.ok(Math.abs(check.inset - 0.083) < 1e-8);
        assert.ok(Math.abs(check.lateral - 0.004) < 1e-8);
        assert.ok(
          Math.abs(
            check.tip.z - aisle.rear.bounds.minZ - check.sweep.open.remaining,
          ) < 1e-8,
        );
        if (check.socket.link) {
          assert.equal(check.socket.link.pduId, pdu.id);
          assert.equal(check.socket.device?.rackId, pdu.rackId);
          assert.equal(check.socket.link.outlet, n);
        }
      }
    }
  }
});
test("柜后巡检区分缺少配置对端、越界插座和对侧机柜", () => {
  const [aisle] = findMaintenanceAisles("B03");
  assert.equal(
    rearServiceInspection(aisle, "pdu-a03-b", 3)?.socket.device?.name,
    "SRV-19",
  );
  assert.equal(
    rearServiceInspection(aisle, "pdu-a03-b", 24)?.socket.link,
    null,
  );
  for (const n of [0, 25, null])
    assert.equal(rearServiceInspection(aisle, "pdu-a03-b", n), null);
  for (const id of ["pdu-b03-b", "pdu-a01-b", "room-01"])
    assert.equal(rearServiceInspection(aisle, id, 3), null);
});
