import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Box3, Mesh, Texture, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { assemblyChecks } from "./assembly-pairs.ts";
import { assemblyPartPosition } from "./assembly-motion.ts";
import { partsForDevice } from "./catalog.ts";
import { createState, transition } from "./domain.ts";
import { deviceHeight, rackForDevice } from "./installation.ts";
import { inletPart } from "./power-config.ts";
import { powerScene } from "./power-paths.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";

test("M2 两路输入在精模、简模和柜内供电路径上对应同一后部槽位", async () => {
  const bytes = readFileSync(
    new URL("../assets/public/models/server-2u.glb", import.meta.url),
  );
  const { scene } = await new GLTFLoader()
    .register(() => ({
      name: "test-textures",
      loadTexture: async () => new Texture(),
    }))
    .parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
  const bounds = new Box3().setFromObject(scene);
  const scale = definition.server.size[0] / bounds.getSize(new Vector3()).x;
  scene.scale.setScalar(scale);
  scene.position.copy(bounds.getCenter(new Vector3())).multiplyScalar(-scale);
  scene.updateMatrixWorld(true);

  const id = "srv-54",
    model = "server-2u";
  const state = transition(createState(), {
    type: "navigate",
    level: "rack",
    id,
  });
  const paths = powerScene(state, id)!.paths;
  const { groups } = createEquipmentAssembly(model);
  const check = assemblyChecks(id).find((c) => c.tool === "server-power")!;
  const { primary, companion } = check.pairs[0];
  const slots = (
    [
      ["A", primary],
      ["B", companion],
    ] as const
  ).map(([feed, member]) => {
    assert.equal(member.id, inletPart(model, feed));
    assert.deepEqual(assemblyChecks(id, member.id), [check]);
    const part = partsForDevice(id).find((p) => p.id === member.id)!;
    const detailed = new Box3().setFromObject(
      scene.getObjectByName(part.modelNodes[0])!,
    );
    const proxy = new Box3().setFromObject(groups.get(part.id)!);
    assert.ok(
      proxy.min.distanceTo(detailed.min) < 0.001 &&
        proxy.max.distanceTo(detailed.max) < 0.001,
      part.slot,
    );
    const center = detailed.getCenter(new Vector3());
    const [x, y] = paths.find((p) => p.feed === feed)!.points.at(-1)!;
    assert.ok(Math.abs(x - rackForDevice(id).position[0] - center.x) < 0.001);
    assert.ok(Math.abs(y - deviceHeight(id) - center.y) < 0.001);
    for (const [otherId, other] of groups) {
      if (part.id === otherId) continue;
      other.traverse((mesh) => {
        if (mesh instanceof Mesh)
          assert.ok(
            !proxy.intersectsBox(new Box3().setFromObject(mesh, true)),
            otherId,
          );
      });
    }
    return part;
  });
  for (const amount of [0, check.startExplosion, 1, 0]) {
    const [a, b] = slots.map((p) => {
      const group = groups.get(p.id)!;
      group.position.fromArray(assemblyPartPosition(p, amount, 1));
      return new Box3().setFromObject(group);
    });
    assert.ok(b.max.x < a.min.x, "机后观察，输入 B 始终在 A 的右侧");
  }
});
