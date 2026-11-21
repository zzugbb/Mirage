import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Box3, Group, Texture, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { compactDriveBays } from "./compact-drive-bays.ts";
import { mapCompactServer } from "./scene/compact-server.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

test("M1 的四个盘位与贡献模型同列同层，托架与同号 SSD 在简模及详细装配中对应", async () => {
  const bytes = readFileSync(
    new URL("../assets/public/models/server-1u.glb", import.meta.url),
  );
  const source = (
    await new GLTFLoader()
      .register(() => ({
        name: "test-textures",
        loadTexture: async () => new Texture(),
      }))
      .parseAsync(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
        "",
      )
  ).scene;
  const bounds = new Box3().setFromObject(source);
  const scale = definition.server.size[0] / bounds.getSize(new Vector3()).x;
  const normalized = new Group(),
    imported = new Group();
  normalized.add(imported);
  imported.add(source);
  imported.position
    .copy(bounds.getCenter(new Vector3()))
    .multiplyScalar(-scale);
  imported.scale.setScalar(scale);
  const detailed = mapCompactServer(normalized),
    fallback = createEquipmentAssembly("server-1u");
  assert.deepEqual(
    compactDriveBays.map((b) => b.position),
    ["左列上层", "左列下层", "右列上层", "右列下层"],
  );
  for (const { tray, disk, x, y } of compactDriveBays) {
    for (const assembly of [detailed, fallback]) {
      const frame = new Box3().setFromObject(assembly.groups.get(tray.id)!);
      const ssd = new Box3().setFromObject(assembly.groups.get(disk.id)!);
      const center = frame.getCenter(new Vector3());
      assert.ok(
        Math.abs(center.x - x) < 0.001 && Math.abs(center.y - y) < 0.001,
        tray.slot,
      );
      assert.ok(
        ssd.min.x >= frame.min.x - 0.001 &&
          ssd.max.x <= frame.max.x + 0.001 &&
          ssd.min.y >= frame.min.y - 0.001 &&
          ssd.max.y <= frame.max.y + 0.001,
        disk.slot,
      );
    }
  }
});
