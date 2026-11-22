import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Box3, Group, type Object3D, Raycaster, Texture, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { poseAssemblyLayer } from "./scene/assembly-layer.ts";
import { assemblyChecks, assemblyMember } from "./assembly-pairs.ts";
import { compactDriveBays } from "./compact-drive-bays.ts";
import { mapCompactServer } from "./scene/compact-server.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

test("M1 的四个盘位与贡献模型同列同层，托架与同号 SSD 在简模及详细装配中对应", async (t) => {
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
  await t.test(
    "四个盘位沿用同号配对，精模与简模的盖边和四个固定点反复开合后归位",
    () => {
      const check = assemblyChecks("srv-44").find(
        (c) => c.tool === "compact-drive",
      )!;
      assert.ok(check && check.pairs.length === 4);
      const lift = definition.equipmentModels.find((m) => m.id === "server-1u")!
        .compactDrive!.coverLift;
      for (const { primary, companion } of check.pairs) {
        assert.equal(assemblyMember(check, companion.id)?.id, companion.id);
        assert.equal(primary.slot.slice(-2), companion.slot.slice(-2));
        for (const a of [detailed, fallback]) {
          const tray = a.groups.get(primary.id)!,
            disk = a.groups.get(companion.id)!;
          const b = (o: Object3D) => new Box3().setFromObject(o);
          const lid = disk.getObjectByName("ssd-cover-sheet")!;
          const pcb = disk.getObjectByName("ssd-pcb")!;
          const tail = disk.getObjectByName("ssd-tail-port")!;
          const fixed = [
            pcb,
            tail,
            tray,
            ...disk.getObjectsByProperty("name", "ssd-lid-seat"),
          ];
          const rest = fixed.map(b);
          const trayBox = b(tray),
            diskBox = b(disk);
          assert.ok(
            trayBox.min.z < diskBox.min.z && diskBox.max.z < trayBox.max.z,
          );
          if (a === fallback)
            for (const bar of tray.getObjectsByProperty(
              "name",
              "compact-tray-crossbar",
            ))
              assert.ok(
                Math.abs(
                  b(bar).max.y -
                    b(disk.getObjectByName("ssd-case-base")!).min.y,
                ) < 1e-7,
              );
          assert.ok(b(tail).min.z < b(lid).min.z);
          const seats = fixed.slice(3),
            pins = disk.getObjectsByProperty("name", "ssd-cover-pin");
          assert.equal(seats.length, 4);
          assert.equal(pins.length, 4);
          for (const separated of [true, true, false, true, false]) {
            poseAssemblyLayer(disk, separated);
            disk.updateWorldMatrix(true, true);
            for (const seat of seats) {
              const pos = b(seat).getCenter(new Vector3());
              const pin = pins.find((o) => {
                const c = b(o).getCenter(new Vector3());
                return Math.hypot(c.x - pos.x, c.z - pos.z) < 1e-7;
              })!;
              const seatBox = b(seat),
                pinBox = b(pin);
              if (separated) assert.ok(pinBox.min.y > seatBox.max.y);
              else
                assert.ok(
                  pinBox.min.y > seatBox.min.y && pinBox.min.y < seatBox.max.y,
                );
              const ray = new Raycaster(
                new Vector3(pos.x, pinBox.max.y + 0.01, pos.z),
                new Vector3(0, -1, 0),
              );
              assert.equal(ray.intersectObject(seat).length, 0);
              ray.ray.origin.x += 0.0016;
              assert.ok(
                Math.abs(ray.intersectObject(seat)[0].point.y - seatBox.max.y) <
                  1e-7,
              );
              assert.ok(
                Math.abs(
                  b(lid).min.y - b(seat).max.y - (separated ? lift : 0),
                ) < 1e-7,
              );
            }
            assert.deepEqual(fixed.map(b), rest);
          }
        }
      }
    },
  );
});
