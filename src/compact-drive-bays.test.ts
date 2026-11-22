import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Box3, Group, type Object3D, Raycaster, Texture, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  poseAssemblyLayer,
  layerScopeFor,
  scopeBounds,
  includeSeparatedLayer,
  assemblyLayer,
} from "./scene/assembly-layer.ts";
import { assemblyChecks, assemblyMember } from "./assembly-pairs.ts";
import {
  compactDriveBays,
  compactStorageStations,
} from "./compact-drive-bays.ts";
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
    "精模与简模的六个接合点分别归属可拾取部件，分离和复位时接触面对齐",
    () => {
      for (const { groups, root } of [detailed, fallback]) {
        const board = groups.get("backplane-01")!;
        const sockets = board.getObjectsByProperty("name", "disk-socket-shelf");
        assert.equal(sockets.length, 4);
        assert.equal(
          board.getObjectsByProperty("name", "disk-socket-support").length,
          2,
        );
        for (const station of compactStorageStations.filter(
          (s) => s.id !== "route" && s.id !== "mount",
        )) {
          const [moving, fixed] = station.members.map((id) => groups.get(id)!);
          const scope = layerScopeFor(moving, station.id)!;
          const socket = layerScopeFor(fixed, station.id)!.selectedBranch!;
          assert.equal(scope.selectedBranch, scope.moving);
          assert.ok(scope.members.includes(socket));
          const disk = station.id.startsWith("disk");
          const pads = scope.moving.getObjectsByProperty(
            "name",
            disk ? "ssd-tail-pad" : "sas-pad",
          );
          const fingers = socket.getObjectsByProperty(
            "name",
            disk ? "disk-socket-finger" : "sas-finger",
          );
          assert.equal(pads.length, disk ? 10 : 2);
          assert.equal(fingers.length, pads.length);
          const box = (o: Object3D) => new Box3().setFromObject(o);
          const rest = box(scope.moving),
            fixedRest = box(socket);
          const frame = scopeBounds(new Box3(), scope);
          includeSeparatedLayer(
            frame,
            scope.layerRoot,
            assemblyLayer(scope.layerRoot)!,
            scope.moving,
          );
          for (const separated of [true, false, true, false]) {
            poseAssemblyLayer(scope.layerRoot, separated);
            root.updateMatrixWorld(true);
            assert.ok(box(socket).equals(fixedRest));
            assert.ok(
              frame.clone().expandByScalar(1e-7).containsBox(box(scope.moving)),
            );
            if (!separated) assert.ok(box(scope.moving).equals(rest));
            for (const [i, pad] of pads.entries()) {
              const face = box(pad),
                finger = box(fingers[i]);
              assert.ok(Math.abs(face.max.y - finger.min.y) < 1e-7);
              assert.ok(face.min.x < finger.min.x && finger.max.x < face.max.x);
              assert.equal(
                face.min.z < finger.max.z && finger.min.z < face.max.z,
                !separated,
              );
            }
          }
        }
      }
    },
  );
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
  const layout = definition.equipmentModels.find(
    (model) => model.id === "server-1u",
  )!.compactDrive!;
  const boundsOf = (o: Object3D) => new Box3().setFromObject(o);
  const near = (a: number, b: number) =>
    assert.ok(Math.abs(a - b) < 1e-7, a + " / " + b);
  await t.test(
    "四盘盖底各有四个导热垫，上面贴导热板、下面对准封装；开盖只移动盖底组件",
    () => {
      for (const assembly of [detailed, fallback])
        for (const { disk } of compactDriveBays) {
          const drive = assembly.groups.get(disk.id)!;
          const scope = layerScopeFor(drive, "ssd-pads")!;
          const pads = scope.moving.getObjectsByProperty(
            "name",
            "ssd-thermal-pad",
          );
          const chips = drive.getObjectsByProperty("name", "ssd-package");
          const home = chips.map(boundsOf);
          assert.deepEqual([pads.length, chips.length], [4, 4]);
          for (const raised of [true, false, true, false]) {
            poseAssemblyLayer(scope.layerRoot, raised);
            drive.updateWorldMatrix(true, true);
            const spreader = boundsOf(drive.getObjectByName("ssd-spreader")!);
            near(
              spreader.max.y,
              boundsOf(drive.getObjectByName("ssd-cover-sheet")!).min.y,
            );
            assert.deepEqual(chips.map(boundsOf), home);
            for (const [n, pad] of pads.entries()) {
              const b = boundsOf(pad),
                chip = home[n];
              const c = b.getCenter(new Vector3());
              assert.ok(
                b.min.x > chip.min.x &&
                  b.max.x < chip.max.x &&
                  b.min.z > chip.min.z &&
                  b.max.z < chip.max.z,
              );
              near(b.max.y, spreader.min.y);
              const hit = new Raycaster(
                new Vector3(c.x, b.min.y + 0.0001, c.z),
                new Vector3(0, -1, 0),
              ).intersectObject(chips[n])[0];
              assert.ok(hit);
              near(b.min.y - hit.point.y, raised ? layout.coverLift : 0);
            }
          }
        }
    },
  );
  await t.test(
    "开盖后盘内板和尾端接口一起离壳，板孔对柱，抬升避开壳沿、盖销与导热垫",
    () => {
      for (const assembly of [detailed, fallback])
        for (const { disk } of compactDriveBays) {
          const drive = assembly.groups.get(disk.id)!;
          const scope = layerScopeFor(drive, "ssd-board")!;
          const [cover] = scope.extractedLayers!;
          assert.equal(cover, drive);
          const pcb = drive.getObjectByName("ssd-pcb")!,
            plug = drive.getObjectByName("ssd-tail-port")!;
          const pins = drive.getObjectsByProperty("name", "ssd-board-pin"),
            posts = drive.getObjectsByProperty("name", "ssd-board-post");
          const rims = pcb.parent!.getObjectsByProperty(
            "name",
            "ssd-board-rim",
          );
          assert.deepEqual([pins.length, posts.length, rims.length], [4, 4, 4]);
          const initial = boundsOf(plug),
            floor = boundsOf(drive.getObjectByName("ssd-case-base")!);
          const rest = boundsOf(drive);
          const fixed = pins.map(boundsOf);
          poseAssemblyLayer(cover, true);
          for (const up of [true, true, false, true, false]) {
            poseAssemblyLayer(scope.layerRoot, up);
            drive.updateWorldMatrix(true, true);
            const rise = up ? layout.boardMount.lift : 0;
            assert.deepEqual(pins.map(boundsOf), fixed);
            near(boundsOf(plug).min.y - initial.min.y, rise);
            for (const [i, pin] of pins.entries()) {
              const axis = boundsOf(pin).getCenter(new Vector3()),
                rim = boundsOf(rims[i]).getCenter(new Vector3());
              near(axis.x, rim.x);
              near(axis.z, rim.z);
              near(boundsOf(posts[i]).min.y, floor.max.y);
              near(boundsOf(pcb).min.y - boundsOf(posts[i]).max.y, rise);
              for (const r of [
                0,
                (layout.boardMount.pinRadius + layout.boardMount.boreRadius) /
                  2,
                layout.boardMount.boreRadius * 1.2,
              ]) {
                const ray = new Raycaster(
                  new Vector3(axis.x + r, rim.y + 0.01, axis.z),
                  new Vector3(0, -1, 0),
                );
                assert.equal(
                  ray.intersectObject(pcb).length > 0,
                  r > layout.boardMount.boreRadius,
                );
              }
            }
            const moving = boundsOf(scope.moving);
            assert.ok(
              moving.max.y <
                boundsOf(drive.getObjectByName("ssd-cover")!).min.y,
            );
            for (const rail of drive.getObjectsByProperty(
              "name",
              "ssd-case-rim",
            ))
              assert.ok(!moving.intersectsBox(boundsOf(rail)));
            for (const seat of drive.getObjectsByProperty(
              "name",
              "ssd-lid-seat",
            ))
              assert.ok(!moving.intersectsBox(boundsOf(seat)));
          }
          poseAssemblyLayer(cover, false);
          drive.updateWorldMatrix(true, true);
          assert.ok(boundsOf(drive).equals(rest));
        }
    },
  );
  await t.test(
    "盘尾近看复用同一块板与壳口，十片触点随板，接头从开口中无碰撞抬出",
    () => {
      for (const assembly of [detailed, fallback])
        for (const { disk } of compactDriveBays) {
          const drive = assembly.groups.get(disk.id)!;
          const scope = layerScopeFor(drive, "ssd-tail")!,
            board = layerScopeFor(drive, "ssd-board")!;
          assert.equal(scope.layerRoot, board.layerRoot);
          assert.equal(scope.extractedLayers, board.extractedLayers);
          const plug = scope.moving.getObjectByName("ssd-tail-port")!,
            tab = scope.moving.getObjectByName("ssd-tail-board")!;
          const pads = scope.moving.getObjectsByProperty(
            "name",
            "ssd-tail-pad",
          );
          const edges = drive.getObjectsByProperty("name", "ssd-tail-edge");
          assert.equal(pads.length, 10);
          assert.equal(edges.length, 2);
          const lip = boundsOf(drive.getObjectByName("ssd-tail-lip")!),
            fixed = edges.map(boundsOf);
          poseAssemblyLayer(drive, true);
          for (const raised of [true, false, true, false]) {
            poseAssemblyLayer(scope.layerRoot, raised);
            drive.updateWorldMatrix(true, true);
            const p = boundsOf(plug);
            near(p.max.z, boundsOf(tab).min.z);
            for (const rim of drive.getObjectsByProperty(
              "name",
              "ssd-board-rim",
            )) {
              assert.ok(boundsOf(tab).max.z < boundsOf(rim).min.z);
            }
            near(p.min.x - fixed[0].max.x, 0.0003);
            near(fixed[1].min.x - p.max.x, 0.0003);
            assert.deepEqual(edges.map(boundsOf), fixed);
            assert.ok(p.min.z < fixed[0].min.z && p.max.z > fixed[0].max.z);
            assert.ok(p.min.y > lip.max.y);
            assert.equal(p.min.y > fixed[0].max.y, raised);
            for (const face of pads) near(boundsOf(face).min.y, p.max.y);
          }
          poseAssemblyLayer(drive, false);
        }
    },
  );
});
