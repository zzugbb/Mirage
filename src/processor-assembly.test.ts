import { test } from "node:test";
import assert from "node:assert/strict";
import { Box3, Vector3 } from "three";
import { assemblyChecks, processorPairs } from "./assembly-pairs.ts";
import { layerScopeFor, poseAssemblyLayer } from "./scene/assembly-layer.ts";
import { devices } from "./installation.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";

test("M1 和 M2 按各自配置提供双路 CPU 与同号散热器", () => {
  for (const model of ["server-1u", "server-2u"])
    assert.deepEqual(
      processorPairs(model).map(({ primary, companion }) => [
        primary.slot,
        companion.slot,
      ]),
      [
        ["CPU-01", "HS-01"],
        ["CPU-02", "HS-02"],
      ],
    );
  for (const device of devices) {
    assert.equal(
      assemblyChecks(device.id).some(
        (check) => check.tool === "processor-pair",
      ),
      ["server-1u", "server-2u"].includes(device.modelId),
    );
  }
  assert.deepEqual(assemblyChecks("unknown"), []);
});

test("M2 简模封装顶面贴合同号散热器底面，复原坐标保留校准结果", () => {
  const { groups, positions } = createEquipmentAssembly("server-2u");
  for (const { primary, companion } of processorPairs("server-2u")) {
    const chip = groups.get(primary.id)!;
    const cap = new Box3().setFromObject(chip),
      sink = new Box3().setFromObject(groups.get(companion.id)!);
    const offset = cap
      .getCenter(new Vector3())
      .sub(sink.getCenter(new Vector3()));
    assert.ok(Math.hypot(offset.x, offset.z, cap.max.y - sink.min.y) < 1e-7);
    assert.deepEqual(
      positions.get(primary.id)?.toArray(),
      chip.position.toArray(),
    );
  }
});

test("M2 座框随主板固定，两路封装和散热器独立离座并贴回承载面", () => {
  const { root, groups } = createEquipmentAssembly("server-2u");
  const board = groups.get("board-01")!;
  for (const { primary, companion } of processorPairs("server-2u")) {
    const chip = groups.get(primary.id)!,
      sink = groups.get(companion.id)!;
    const seat = board.getObjectByName("processor-socket-" + primary.slot)!;
    const bed = new Box3().setFromObject(seat.getObjectByName("socket-bed")!);
    for (const [stage, owner] of [
      ["processor-seat", chip],
      ["processor-sink", sink],
    ] as const) {
      const scope = layerScopeFor(owner, stage + ":" + primary.id)!;
      assert.equal(
        scope.layerRoot,
        layerScopeFor(board, stage + ":" + primary.id)!.layerRoot,
      );
      for (const open of [true, false]) {
        poseAssemblyLayer(scope.layerRoot, open);
        root.updateWorldMatrix(true, true);
        const cap = new Box3().setFromObject(chip),
          cooler = new Box3().setFromObject(sink);
        const gap =
          stage === "processor-seat"
            ? cap.min.y - bed.max.y
            : cooler.min.y - cap.max.y;
        if (open) assert.ok(gap > 0.02);
        else assert.ok(Math.abs(gap) < 1e-7);
        assert.equal(
          new Box3()
            .setFromObject(seat.getObjectByName("socket-bed")!)
            .equals(bed),
          true,
        );
      }
    }
  }
});
