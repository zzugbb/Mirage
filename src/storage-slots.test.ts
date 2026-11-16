import { test } from "node:test";
import assert from "node:assert/strict";
import {
  storageSlots,
  storageSlotContext,
  activeStorageSlots,
  storageSlotKey,
  type StorageSlotInspection,
} from "./storage-slots.ts";
import { createReview } from "./review-model.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";

test("四台存储盘位图与模型的24个子件逐位对应，正面从左到右从上到下", () => {
  const assembly = createEquipmentAssembly("storage-4u");
  for (const deviceId of ["sto-01", "sto-02", "sto-03", "sto-04"]) {
    const slots = storageSlots(deviceId);
    assert.equal(slots.length, 24);
    assert.equal(new Set(slots.map((slot) => slot.id)).size, 24);
    for (const slot of slots) {
      const object = assembly.groups.get(slot.id)!;
      assert.ok(object);
      assert.ok(Math.abs(object.position.x - slot.center[0]) < 1e-9);
      assert.ok(Math.abs(object.position.y - slot.center[1]) < 1e-9);
      assert.equal(slot.row, Math.floor(slot.index / 4) + 1);
      assert.equal(slot.column, (slot.index % 4) + 1);
      if (slot.column < 4)
        assert.ok(slot.center[0] < slots[slot.index + 1].center[0]);
      if (slot.row < 6)
        assert.ok(slot.center[1] > slots[slot.index + 4].center[1]);
    }
    assert.deepEqual(
      [slots[0].slot, slots[3].slot, slots[20].slot, slots[23].slot],
      ["HDD-01", "HDD-04", "HDD-21", "HDD-24"],
    );
  }
  for (const id of ["srv-01", "srv-05", "sw-01", "missing"])
    assert.deepEqual(storageSlots(id), []);
});
test("盘位核对限定原存储实例，复原、离开设备或选择无关部件立即失效", () => {
  const state = {
    ...createReview().scene,
    level: "device" as const,
    deviceId: "sto-01",
    explosion: 0.4,
  };
  const visit: StorageSlotInspection = {
    deviceId: "sto-01",
    mode: "group",
    diskId: null,
    pending: false,
  };
  for (const id of ["sto-01", "sto-drives", "sto-disk-01", "sto-disk-24"]) {
    assert.equal(storageSlotContext("sto-01", id), true);
    assert.equal(activeStorageSlots(visit, state, id), visit);
  }
  for (const id of ["sto-controller-a", "sto-midplane", "srv-01", "disk-01"])
    assert.equal(activeStorageSlots(visit, state, id), null);
  assert.equal(
    activeStorageSlots(visit, { ...state, deviceId: "sto-02" }, "sto-disk-01"),
    null,
  );
  assert.equal(
    activeStorageSlots(visit, { ...state, level: "rack" }, "sto-01"),
    null,
  );
  assert.equal(
    activeStorageSlots(visit, { ...state, explosion: 0 }, "sto-drives"),
    null,
  );
  const pending = { ...visit, pending: true };
  assert.equal(
    activeStorageSlots(pending, { ...state, explosion: 0 }, "sto-drives"),
    pending,
  );
});
test("盘位键盘按四列移动且不绕行边界，Home和End停在同行", () => {
  for (let i = 0; i < 24; i++)
    for (const key of [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ]) {
      const next = storageSlotKey(i, key, 24);
      assert.ok(next >= 0 && next < 24);
      if (key === "ArrowUp" || key === "ArrowDown")
        assert.equal(next % 4, i % 4);
      else assert.equal(Math.floor(next / 4), Math.floor(i / 4));
    }
  assert.equal(storageSlotKey(0, "ArrowLeft", 24), 0);
  assert.equal(storageSlotKey(3, "ArrowRight", 24), 3);
  assert.equal(storageSlotKey(23, "ArrowDown", 24), 23);
  assert.equal(storageSlotKey(5, "Home", 24), 4);
  assert.equal(storageSlotKey(5, "End", 24), 7);
  assert.equal(storageSlotKey(5, "ArrowDown", 24), 9);
});
