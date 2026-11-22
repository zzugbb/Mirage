import assert from "node:assert/strict";
import { test } from "node:test";
import { Box3, Group, Vector3 } from "three";
import { modelById } from "./catalog.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import { DimmSocket } from "./scene/dimm-socket.ts";

for (const modelId of ["server-1u", "server-2u"]) {
  test(modelId + " 逐槽落座、打开卡扣、换槽和退出均恢复原装配", () => {
    const slots = modelById(modelId).memoryLayout!.slots;
    const { root, groups } = createEquipmentAssembly(modelId);
    const bench = new Group();
    bench.add(root);
    bench.position.set(1.1, 2, -0.9);
    bench.rotation.y = 0.63;
    bench.scale.setScalar(2.4);
    bench.updateMatrixWorld(true);
    const socket = new DimmSocket();
    const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7);
    const originals = slots.map(({ id }) => groups.get(id)!.position.clone());
    for (const [i, { id }] of slots.entries()) {
      const dimm = groups.get(id)!;
      const card = dimm.children[0];
      const cardStart = new Box3().setFromObject(card);
      socket.update(dimm, "seated");
      bench.updateMatrixWorld(true);
      const contact = socket.root.getObjectByName("socket-contact")!;
      const seated = new Box3().setFromObject(contact);
      close(seated.max.y, cardStart.min.y);
      const front = socket.root.getObjectByName("socket-front-clip")!;
      const rear = socket.root.getObjectByName("socket-rear-clip")!;
      for (const pose of ["separated", "seated", "separated"] as const) {
        socket.update(dimm, pose);
        bench.updateMatrixWorld(true);
        const raised = pose === "separated";
        const cardNow = new Box3().setFromObject(card);
        const seatNow = new Box3().setFromObject(contact);
        close(
          cardNow.min.y - seatNow.max.y,
          raised ? socket.lift * bench.scale.y : 0,
        );
        assert.ok(
          seatNow
            .getCenter(new Vector3())
            .distanceTo(seated.getCenter(new Vector3())) < 1e-7,
        );
        assert.equal(front.rotation.x > 0, raised);
        close(front.rotation.x, -rear.rotation.x);
        assert.ok(
          dimm.position.x === originals[i].x &&
            dimm.position.z === originals[i].z,
        );
      }
      if (i > 0) {
        const previous = groups.get(slots[i - 1].id)!;
        assert.ok(previous.position.equals(originals[i - 1]));
        assert.equal(previous.getObjectByName("dimm-socket"), undefined);
      }
    }
    socket.dispose();
    assert.equal(root.getObjectByName("dimm-socket"), undefined);
    assert.ok(
      slots.every(({ id }, i) => groups.get(id)!.position.equals(originals[i])),
    );
  });
}
