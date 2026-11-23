import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RearModuleSeats } from "./scene/rear-module-seats.ts";
import { ControllerMountGuide } from "./scene/controller-mount.ts";
import { mapCompactServer } from "./scene/compact-server.ts";
import { assemblyChecks } from "./assembly-pairs.ts";
import { poseAssemblyLayer, layerScopeFor } from "./scene/assembly-layer.ts";
import { assemblyPartPosition } from "./assembly-motion.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import { devices, rackForDevice } from "./installation.ts";
import sceneDefinition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { createState, transition } from "./domain.ts";
import { powerScene } from "./power-paths.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";

test("精细 1U 模型保留内嵌贴图和材质，维护部件仍与八内存四盘配置一致", async (t) => {
  const bytes = readFileSync(
    new URL("../assets/public/models/server-1u.glb", import.meta.url),
  );
  const json = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  assert.equal(json.images.length, 23);
  assert.ok(
    json.images.every(
      (image: { bufferView?: number; uri?: string }) =>
        Number.isInteger(image.bufferView) && !image.uri,
    ),
  );
  assert.ok(
    json.nodes.every((n: { name: string }) =>
      /^(compact_|object_)/.test(n.name),
    ),
  );
  const source =
    // Node 中仅替代图像解码，保留真实 GLB 的纹理绑定；实际解码由浏览器页面验证。
    (
      await new GLTFLoader()
        .register(() => ({
          name: "texture-binding-test",
          loadTexture: async () => new THREE.Texture(),
        }))
        .parseAsync(
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
          "",
        )
    ).scene;
  const wrapper = new THREE.Group();
  const bounds = new THREE.Box3().setFromObject(source),
    size = bounds.getSize(new THREE.Vector3()),
    center = bounds.getCenter(new THREE.Vector3());
  const scale = sceneDefinition.server.size[0] / size.x;
  source.scale.setScalar(scale);
  source.position.copy(center).multiplyScalar(-scale);
  wrapper.add(source);
  wrapper.updateMatrixWorld(true);
  const textured: {
    mesh: THREE.Mesh;
    material: THREE.MeshStandardMaterial;
    color: number;
    metalness: number;
    roughness: number;
    map: THREE.Texture;
  }[] = [];
  source.traverse((object) => {
    if (
      object instanceof THREE.Mesh &&
      object.material instanceof THREE.MeshStandardMaterial &&
      object.material.map
    ) {
      textured.push({
        mesh: object,
        material: object.material,
        color: object.material.color.getHex(),
        metalness: object.material.metalness,
        roughness: object.material.roughness,
        map: object.material.map,
      });
    }
  });
  assert.ok(textured.length > 20);
  const assembly = mapCompactServer(wrapper);
  for (const { mesh, material, color, metalness, roughness, map } of textured) {
    assert.equal(mesh.material, material, "适配不能用统一材质替换原材质");
    assert.equal(material.map, map);
    assert.equal(material.color.getHex(), color);
    assert.equal(material.metalness, metalness);
    assert.equal(material.roughness, roughness);
  }
  await t.test(
    "时钟电池贴在 M1 两种板面的可用安装区，反复抬起只移动电池",
    () => {
      for (const variant of [assembly, createEquipmentAssembly("server-1u")]) {
        const check = assemblyChecks("srv-44", "battery-01").find(
          (c) => c.tool === "rtc-mount",
        )!;
        const { primary, companion } = check.pairs[0];
        assert.deepEqual(primary.explode, companion.explode);
        const battery = variant.groups.get(primary.id)!,
          board = variant.groups.get(companion.id)!;
        const box = (name: string) =>
          new THREE.Box3().setFromObject(battery.getObjectByName(name)!, true);
        const foot = box("rtc-holder-base");
        const center = foot.getCenter(new THREE.Vector3());
        for (const dx of [-0.009, 0, 0.009])
          for (const dz of [-0.009, 0, 0.009]) {
            const hit = new THREE.Raycaster(
              new THREE.Vector3(center.x + dx, 0.1, center.z + dz),
              new THREE.Vector3(0, -1, 0),
            ).intersectObject(board, true)[0];
            assert.ok(
              hit && Math.abs(hit.point.y - foot.min.y) < 1e-6,
              JSON.stringify([dx, dz, hit?.point.y, foot.min.y]),
            );
          }
        for (const lifted of [false, true, false, true, false]) {
          poseAssemblyLayer(battery, lifted);
          battery.updateMatrixWorld(true);
          assert.ok(
            Math.abs(
              box("rtc-cell-can").min.y -
                box("rtc-floor-contact").max.y -
                (lifted ? 0.014 : 0),
            ) < 1e-6,
          );
          assert.ok(foot.equals(box("rtc-holder-base")));
        }
      }
    },
  );
  const expected = [...partsForDevice("srv-08"), ...subpartsForDevice("srv-08")]
    .map((p) => p.id)
    .sort();
  assert.deepEqual([...assembly.groups.keys()].sort(), expected);
  for (const [id, group] of assembly.groups) {
    assert.ok(!new THREE.Box3().setFromObject(group).isEmpty(), id);
    assert.equal(group.userData.entityId, id);
  }
  assert.equal(
    assembly.groups.get("dimm-08")!.parent,
    assembly.groups.get("memory-01"),
  );
  assert.equal(
    assembly.groups.get("fan-04")!.parent,
    assembly.groups.get("fans-01"),
  );
  assert.equal(
    assembly.groups.get("disk-04")!.parent,
    assembly.groups.get("drives-01"),
  );
  await t.test(
    "M1 四盘背板与控制卡两端贴合，侧边线束绕开主板和散热组件",
    () => {
      const check = assemblyChecks("srv-44", "cables-01")[0];
      assert.equal(check?.tool, "storage-harness");
      assert.ok("additionalParts" in check);
      const { primary: board, companion: cable } = check.pairs[0],
        card = check.additionalParts[0];
      for (const id of ["srv-44", board.id, cable.id, card.id])
        assert.ok(assemblyChecks("srv-44", id).includes(check));
      for (const model of [assembly, createEquipmentAssembly("server-1u")]) {
        const harness = model.groups.get(cable.id)!;
        const wire = harness.children.find(
          (o) => o instanceof THREE.Mesh && o.geometry.type === "TubeGeometry",
        ) as THREE.Mesh<THREE.TubeGeometry>;
        const vertices = wire.geometry.attributes.position;
        const obstacles = [
          "fans-01",
          "duct-01",
          "memory-01",
          "cpu-01",
          "cpu-02",
          "psu-01",
          "psu-02",
        ].map((id) => new THREE.Box3().setFromObject(model.groups.get(id)!));
        const from = new THREE.Vector3(),
          to = new THREE.Vector3(),
          direction = new THREE.Vector3();
        const ray = new THREE.Raycaster();
        const steps = wire.geometry.parameters.radialSegments + 1;
        const boardObjects = ["board-01", "riser-01"].map((id) =>
          model.groups.get(id)!,
        );
        for (let i = 0; i < vertices.count; i++) {
          from.fromBufferAttribute(vertices, i).applyMatrix4(wire.matrixWorld);
          assert.ok(
            obstacles.every((box) => !box.containsPoint(from)),
            "绕开散热与供电组件",
          );
          if (i + steps >= vertices.count) continue;
          // 主板和转接架的外廓含有留空区，逐段检查导线外缘与实体三角面。
          to.fromBufferAttribute(vertices, i + steps).applyMatrix4(
            wire.matrixWorld,
          );
          ray.far = direction.subVectors(to, from).length();
          ray.set(from, direction.normalize());
          assert.equal(
            ray.intersectObjects(boardObjects).length,
            0,
            "线束避开板上凸起",
          );
        }
        for (const amount of [0, check.startExplosion, 1, 0]) {
          for (const part of [board, cable, card]) {
            const base = model.positions.get(part.id)!.toArray();
            model.groups
              .get(part.id)!
              .position.fromArray(
                assemblyPartPosition({ ...part, position: base }, amount, 1),
              );
          }
          model.root.updateMatrixWorld(true);
          for (const [part, plugName] of [
            [board, "backplane-plug"],
            [card, "controller-plug"],
          ] as const) {
            const socket = new THREE.Box3().setFromObject(
              model.groups.get(part.id)!.getObjectByName("harness-socket")!,
            );
            const plug = new THREE.Box3().setFromObject(
              harness.getObjectByName(plugName)!,
            );
            const a = socket.getCenter(from),
              b = plug.getCenter(to);
            assert.ok(
              Math.abs(a.x - b.x) < 1e-6 &&
                Math.abs(a.y - b.y) < 1e-6 &&
                Math.abs(socket.max.z - plug.min.z) < 1e-6,
              part.slot,
            );
          }
        }
      }
    },
  );
  await t.test(
    "机后网卡、转接架与管理接口在简模和精模对齐机后面，展开时保留三件身份",
    () => {
      const check = assemblyChecks("srv-53").find(
        (item) => item.tool === "rear-interfaces",
      )!;
      const { primary: nic, companion: riser } = check.pairs[0];
      assert.ok("additionalParts" in check);
      const io = check.additionalParts[0];
      assert.deepEqual(
        [nic.slot, riser.slot, io.slot],
        ["NIC", "PCIe-01", "MGMT"],
      );
      assert.ok(assembly.groups.get(riser.id)!.getObjectByName("compact_io"));
      assert.ok(assembly.groups.get(nic.id)!.getObjectByName("compact_nic"));
      for (const part of [nic, riser, io])
        assert.deepEqual(assemblyChecks("srv-53", part.id), [check]);
      for (const device of devices)
        assert.equal(
          assemblyChecks(device.id).includes(check),
          device.modelId === "server-1u",
        );
      const fallback = createEquipmentAssembly("server-1u");
      for (const model of [assembly, fallback]) {
        const adapter = model.groups.get(nic.id)!,
          upper = model.groups.get(riser.id)!,
          mgmt = model.groups.get(io.id)!;
        const bounds = (mesh: THREE.Group) =>
          new THREE.Box3().setFromObject(mesh);
        for (const [part, group] of [
          [nic, adapter],
          [riser, upper],
          [io, mgmt],
        ] as const) {
          const box = bounds(group);
          assert.ok(
            Math.abs(box.getCenter(new THREE.Vector3()).x - part.position[0]) <
              0.0001,
          );
          assert.ok(
            Math.abs(box.getSize(new THREE.Vector3()).z - part.size[2]) <
              0.0001,
          );
        }
        assert.ok(
          Math.abs(bounds(adapter).min.z - bounds(upper).min.z) < 0.001,
        );
        assert.ok(bounds(mgmt).max.x < bounds(adapter).min.x);
        assert.ok(Math.abs(bounds(mgmt).min.z - bounds(adapter).min.z) < 0.001);
        for (const amount of [check.startExplosion, 1, 0]) {
          for (const [part, group] of [
            [nic, adapter],
            [riser, upper],
            [io, mgmt],
          ] as const) {
            const position = model.positions.get(part.id)!.toArray();
            group.position.fromArray(
              assemblyPartPosition({ ...part, position }, amount, 1),
            );
          }
          if (amount) {
            assert.ok(bounds(adapter).max.y < bounds(upper).min.y);
            assert.ok(bounds(adapter).min.z < bounds(upper).min.z);
          }
        }
        assert.ok(
          Math.abs(bounds(adapter).min.z - bounds(upper).min.z) < 0.001,
        );
      }
    },
  );
  await t.test(
    "M1 管理接口板在精模和简模均穿过面板开口，双轨承托板边，推回时板端贴合止挡",
    () => {
      const config = sceneDefinition.equipmentModels.find(
        (m) => m.id === "server-1u",
      )!.managementSlide!;
      const check = assemblyChecks("srv-53", config.partId).find(
        (item) => item.tool === "rear-interfaces",
      )!;
      assert.ok(
        "layer" in check &&
          "partId" in check.layer &&
          check.layer.partId === config.partId,
      );
      const bounds = (node: THREE.Object3D) =>
        new THREE.Box3().setFromObject(node, true);
      const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7);
      for (const model of [assembly, createEquipmentAssembly("server-1u")]) {
        const part = model.groups.get(config.partId)!;
        const tray = part.getObjectByName("management-tray")!;
        const face = part.getObjectByName("management-face")!;
        const pcb = part.getObjectByName("management-pcb")!;
        const port = part.getObjectByName("management-port-roof")!;
        const rails = part.getObjectsByProperty("name", "management-rail");
        const lips = part.getObjectsByProperty("name", "management-guide-lip");
        const stops = part.getObjectsByProperty("name", "management-stop");
        assert.equal(rails.length, 2);
        assert.equal(lips.length, 2);
        assert.equal(stops.length, 2);
        const fixed = [tray, face, ...rails, ...lips, ...stops],
          original = fixed.map(bounds);
        const resting = bounds(pcb);
        const housing = new THREE.Box3();
        for (const side of part.getObjectsByProperty(
          "name",
          "management-port-side",
        ))
          housing.union(bounds(side));
        assert.ok(!housing.isEmpty());
        // 整个接口外廓须能穿过框孔，不能只让中心视线通过。
        for (const x of [housing.min.x, housing.max.x])
          for (const y of [housing.min.y, housing.max.y]) {
            const corner = new THREE.Raycaster(
              new THREE.Vector3(x, y, bounds(face).min.z - 0.01),
              new THREE.Vector3(0, 0, 1),
            );
            assert.equal(corner.intersectObject(face).length, 0);
          }
        for (const out of [false, true, true, false]) {
          poseAssemblyLayer(part, out);
          part.updateWorldMatrix(true, true);
          assert.deepEqual(fixed.map(bounds), original);
          const board = bounds(pcb),
            distance = out ? config.travel : 0;
          close(board.min.z - resting.min.z, distance);
          close(bounds(port).min.z - bounds(face).min.z, distance);
          for (const [i, rail] of rails.entries()) {
            const ledge = bounds(rail);
            close(ledge.max.y, board.min.y);
            assert.ok(bounds(lips[i]).min.y > board.max.y);
            assert.ok(board.min.x < ledge.max.x && ledge.min.x < board.max.x);
            close(board.min.z - bounds(stops[i]).max.z, distance);
          }
          const ray = new THREE.Raycaster(
            bounds(face)
              .getCenter(new THREE.Vector3())
              .add(new THREE.Vector3(0, 0, -0.01)),
            new THREE.Vector3(0, 0, 1),
          );
          assert.equal(ray.intersectObject(face).length, 0);
          assert.equal(
            ray.intersectObject(part)[0].object.name,
            "management-port-backing",
          );
          if (out) assert.ok(board.min.z > bounds(tray).max.z);
          else assert.ok(board.equals(resting));
        }
      }
    },
  );
  await t.test(
    "M1 管理笼口退出孔缘，两侧长短插脚穿过板孔，提升外罩时绝缘座留在滑出的接口板",
    () => {
      const bounds = (o: THREE.Object3D) =>
        new THREE.Box3().setFromObject(o, true);
      for (const model of [assembly, createEquipmentAssembly("server-1u")]) {
        const io = model.groups.get("io-01")!;
        const byName = (name: string) => io.getObjectByName(name)!;
        const board = byName("management-board-center"),
          face = byName("management-aperture-rim");
        const insert = byName("management-insulator"),
          shield = byName("management-shield");
        const feet = shield.getObjectsByProperty(
          "name",
          "management-cage-foot",
        );
        const rims = io.getObjectsByProperty("name", "management-slot-rim");
        assert.equal(feet.length, 4);
        assert.equal(rims.length, 4);
        const original = bounds(io);
        const aperture = layerScopeFor(io, "management-mouth")!;
        const mouth = bounds(byName("management-port-roof"));
        for (const x of [mouth.min.x, mouth.max.x])
          for (const y of [
            bounds(byName("management-port-floor")).min.y,
            mouth.max.y,
          ]) {
            const ray = new THREE.Raycaster(
              new THREE.Vector3(x, y, mouth.min.z - 0.01),
              new THREE.Vector3(0, 0, 1),
            );
            assert.equal(ray.intersectObject(face).length, 0);
          }
        poseAssemblyLayer(aperture.layerRoot, true);
        io.updateWorldMatrix(true, true);
        assert.ok(bounds(shield).min.z > bounds(face).max.z);
        poseAssemblyLayer(aperture.layerRoot, false);
        for (const id of ["management-shield", "management-feet"]) {
          const scope = layerScopeFor(io, id)!;
          const [outer] = scope.extractedLayers!;
          poseAssemblyLayer(outer, true);
          io.updateWorldMatrix(true, true);
          const fixed = bounds(insert),
            sheet = bounds(board);
          assert.ok(sheet.min.z > bounds(byName("management-tray")).max.z);
          for (const separated of [true, false, true, false]) {
            poseAssemblyLayer(scope.layerRoot, separated);
            io.updateWorldMatrix(true, true);
            assert.ok(bounds(insert).equals(fixed));
            assert.ok(bounds(board).equals(sheet));
            for (const [i, foot] of feet.entries()) {
              const f = bounds(foot),
                rim = bounds(rims[i]),
                c = f.getCenter(new THREE.Vector3());
              assert.ok(
                Math.abs(rim.getCenter(new THREE.Vector3()).x - c.x) < 1e-7,
              );
              for (const x of [f.min.x, f.max.x])
                for (const z of [f.min.z, f.max.z]) {
                  const ray = new THREE.Raycaster(
                    new THREE.Vector3(x, sheet.min.y - 0.01, z),
                    new THREE.Vector3(0, 1, 0),
                  );
                  assert.equal(ray.intersectObject(board).length, 0);
                  assert.equal(ray.intersectObject(rims[i]).length, 0);
                }
              const edge = new THREE.Raycaster(
                new THREE.Vector3(rim.min.x + 0.00012, sheet.min.y - 0.01, c.z),
                new THREE.Vector3(0, 1, 0),
              );
              assert.ok(
                edge.intersectObject(board).length &&
                  edge.intersectObject(rims[i]).length,
              );
              if (separated) assert.ok(f.min.y > fixed.max.y);
              else
                assert.ok(
                  f.min.y < rim.min.y && Math.abs(f.max.y - sheet.max.y) < 1e-7,
                );
            }
          }
          poseAssemblyLayer(outer, false);
          io.updateWorldMatrix(true, true);
          assert.ok(bounds(io).equals(original));
        }
      }
    },
  );
  await t.test(
    "M1 存储控制卡在精模和简模均贴合主板，展开及复原保持对位",
    () => {
      const check = assemblyChecks("srv-53").find(
        (item) => item.tool === "controller-mount",
      )!;
      const { primary: card, companion: board } = check.pairs[0];
      assert.deepEqual([card.slot, board.slot], ["RAID", "MB-01"]);
      assert.ok(assemblyChecks("srv-53", board.id).includes(check));
      assert.deepEqual(
        assemblyChecks("srv-53", card.id)
          .map((item) => item.tool)
          .sort(),
        ["controller-mount", "storage-harness"],
      );
      for (const device of devices)
        assert.equal(
          assemblyChecks(device.id).some((tool) => tool.tool === check.tool),
          device.modelId === "server-1u",
        );
      const guide = new ControllerMountGuide();
      const fallback = createEquipmentAssembly("server-1u");
      for (const model of [assembly, fallback]) {
        const controller = model.groups.get(card.id)!,
          pcb = model.groups.get(board.id)!;
        for (const amount of [0, check.startExplosion, 1, 0]) {
          for (const part of [card, board]) {
            const base = model.positions.get(part.id)!.toArray();
            model.groups
              .get(part.id)!
              .position.fromArray(
                assemblyPartPosition({ ...part, position: base }, amount, 1),
              );
          }
          pcb.updateWorldMatrix(true, true);
          const box = new THREE.Box3().setFromObject(controller);
          const center = box.getCenter(new THREE.Vector3());
          assert.ok(Math.abs(center.x - card.position[0]) < 0.00002);
          assert.ok(Math.abs(center.z - card.position[2]) < 0.00002);
          const lift = amount * (card.explode[1] - board.explode[1]);
          guide.update(pcb, model.positions.get(board.id)!, lift);
          guide.root.updateMatrixWorld(true);
          const [footprint, projection] = guide.root.children;
          const seat = new THREE.Box3().setFromObject(footprint);
          assert.ok(Math.abs(seat.min.x - box.min.x) < 0.00002);
          assert.ok(Math.abs(seat.max.z - box.max.z) < 0.00002);
          if (amount > 0)
            assert.ok(
              Math.abs(
                new THREE.Box3().setFromObject(projection).max.y - box.min.y,
              ) < 0.00002,
            );
          const origin = new THREE.Vector3(
            center.x,
            box.min.y + 0.001 - lift,
            center.z,
          );
          for (const dx of [-0.008, 0, 0.008]) {
            const ray = new THREE.Raycaster(
              origin.clone().add(new THREE.Vector3(dx, 0, 0)),
              new THREE.Vector3(0, -1, 0),
            );
            const hit = ray.intersectObject(pcb)[0];
            assert.ok(hit, "控制卡正下方有主板");
            assert.ok(Math.abs(hit.distance - 0.001) < 0.00002, board.slot);
          }
        }
      }
    },
  );
  await t.test(
    "M1 两路封装贴合各自精模的底部接触面，简模与复原坐标一致",
    () => {
      const check = assemblyChecks("srv-44").find(
        (item) => item.tool === "processor-pair",
      )!;
      const fallback = createEquipmentAssembly("server-1u");
      for (const { primary, companion } of check.pairs) {
        const sink = assembly.groups.get(companion.id)!;
        const chip = assembly.groups.get(primary.id)!;
        const bounds = new THREE.Box3().setFromObject(chip);
        const top = bounds.getCenter(new THREE.Vector3());
        top.y = bounds.max.y;
        const above = new THREE.Vector3(0, 1, 0);
        // 中心及接触区四角均应向上命中实物网格的同一底面。
        for (const [dx, dz] of [
          [0, 0],
          [-0.01, -0.014],
          [-0.01, 0.014],
          [0.01, -0.014],
          [0.01, 0.014],
        ]) {
          const ray = new THREE.Raycaster(
            top.clone().add(new THREE.Vector3(dx, -0.001, dz)),
            above,
          );
          const hit = ray.intersectObject(sink)[0];
          assert.ok(
            hit && Math.abs(hit.distance - 0.001) < 0.00001,
            companion.slot,
          );
        }
        const simpleCap = new THREE.Box3().setFromObject(
          fallback.groups.get(primary.id)!,
        );
        const simpleSink = new THREE.Box3().setFromObject(
          fallback.groups.get(companion.id)!,
        );
        assert.ok(
          simpleCap.min.distanceTo(bounds.min) < 0.0001 &&
            simpleCap.max.distanceTo(bounds.max) < 0.0001,
        );
        assert.ok(Math.abs(simpleSink.min.y - simpleCap.max.y) < 1e-7);
        assert.deepEqual(
          assembly.positions.get(primary.id)?.toArray(),
          chip.position.toArray(),
        );
      }
    },
  );
  await t.test(
    "M1 双路座框保留原三角面和材质，两种表示可独立抬升封装或散热器",
    () => {
      const fallback = createEquipmentAssembly("server-1u");
      const board = assembly.groups.get("board-01")!;
      const boardMesh = board.getObjectByName(
        "compact_mainboard",
      ) as THREE.Mesh;
      let triangles = boardMesh.geometry.index!.count / 3;
      for (const { primary, companion } of assemblyChecks("srv-53").find(
        (c) => c.tool === "processor-pair",
      )!.pairs) {
        const contact = sceneDefinition.equipmentModels
          .find((m) => m.id === "server-1u")!
          .processorContacts!.find((c) => c.slot === companion.slot)!;
        for (const part of [
          board.getObjectByName(contact.socketNode)!,
          assembly.groups
            .get(primary.id)!
            .getObjectByName(contact.packageNode)!,
        ])
          part.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              assert.equal(obj.material, boardMesh.material);
              triangles += obj.geometry.index!.count / 3;
            }
          });
        for (const model of [assembly, fallback]) {
          const chip = model.groups.get(primary.id)!,
            sink = model.groups.get(companion.id)!,
            host = model.groups.get("board-01")!;
          const seat = host.getObjectByName(contact.socketNode)!;
          const bounds = (obj: THREE.Object3D) =>
            new THREE.Box3().setFromObject(obj, true);
          const seatBounds = bounds(seat),
            cap = bounds(chip);
          const ray = new THREE.Raycaster(
            new THREE.Vector3(
              contact.center[0],
              cap.max.y + 0.002,
              contact.center[2],
            ),
            new THREE.Vector3(0, -1, 0),
          );
          const surface = ray.intersectObject(host)[0];
          assert.ok(
            surface && Math.abs(surface.point.y - cap.min.y) < 0.00003,
            "封装移出后没有重复顶面",
          );
          for (const [stage, owner, stationary, lift] of [
            ["processor-seat", chip, sink, 0.036],
            ["processor-sink", sink, chip, 0.068],
          ] as const) {
            const id = stage + ":" + primary.id,
              scope = layerScopeFor(chip, id)!;
            assert.equal(layerScopeFor(host, id)?.selectedBranch, seat);
            assert.ok(scope.members.includes(seat));
            const rest = bounds(owner),
              other = bounds(stationary);
            for (const split of [true, true, false, true, false]) {
              poseAssemblyLayer(scope.layerRoot, split);
              model.root.updateWorldMatrix(true, true);
              assert.ok(
                Math.abs(
                  bounds(owner).min.y - rest.min.y - (split ? lift : 0),
                ) < 1e-7,
              );
              assert.ok(bounds(stationary).equals(other));
              assert.ok(bounds(seat).equals(seatBounds));
            }
          }
        }
      }
      assert.equal(triangles, 45168);
    },
  );
  await t.test("M1 四组风扇的八个转子与导风罩在精模、简模中逐一对位", () => {
    const simple = createEquipmentAssembly("server-1u");
    const box = (object: THREE.Object3D) =>
      new THREE.Box3().setFromObject(object, true);
    const middle = (object: THREE.Object3D) =>
      box(object).getCenter(new THREE.Vector3());
    const duct = assembly.groups.get("duct-01")!;
    const proxy = simple.groups.get("duct-01")!;
    assert.ok(middle(duct).distanceTo(middle(proxy)) < 0.001);
    assert.ok(
      box(duct)
        .getSize(new THREE.Vector3())
        .distanceTo(box(proxy).getSize(new THREE.Vector3())) < 0.002,
    );
    const fans = subpartsForDevice("srv-53").filter(
      (part) => part.parent === "fans-01",
    );
    assert.equal(fans.length, 4);
    for (const fan of fans) {
      const detailed = assembly.groups.get(fan.id)!;
      const fallback = simple.groups.get(fan.id)!;
      const exterior = detailed.children.filter((node) => node.visible);
      const proxyRotors = fallback.children.filter((node) => node.visible);
      assert.equal(exterior.length, 2);
      assert.equal(proxyRotors.length, 2);
      for (const [i, rotor] of exterior.entries()) {
        assert.ok(
          middle(rotor).distanceTo(middle(proxyRotors[i])) < 0.001,
          fan.slot,
        );
        assert.ok(box(rotor).min.z > box(duct).max.z, fan.slot);
        assert.ok(box(proxyRotors[i]).min.z > box(proxy).max.z, fan.slot);
      }
    }
  });
  await t.test("M1 八条内存沿用配置身份，简模与精细模型的板位逐条对应", () => {
    const fallback = createEquipmentAssembly("server-1u");
    const dimms = subpartsForDevice("srv-53").filter(
      (part) => part.parent === "memory-01",
    );
    const slots = sceneDefinition.equipmentModels.find(
      (model) => model.id === "server-1u",
    )!.memoryLayout!.slots;
    assert.deepEqual(
      slots.map((slot) => slot.id),
      dimms.map((part) => part.id),
    );
    assert.equal(dimms.length, 8);
    let previous = -Infinity;
    for (const dimm of dimms) {
      const detailed = assembly.groups.get(dimm.id)!;
      const simple = fallback.groups.get(dimm.id)!;
      assert.equal(simple.parent, fallback.groups.get(dimm.parent));
      assert.equal(detailed.parent, assembly.groups.get(dimm.parent));
      const center = new THREE.Box3()
        .setFromObject(detailed)
        .getCenter(new THREE.Vector3());
      const pcb = new THREE.Box3()
        .setFromObject(simple.children[0])
        .getCenter(new THREE.Vector3());
      assert.ok(center.distanceTo(pcb) < 0.0001, dimm.slot);
      assert.ok(center.x > previous, dimm.slot);
      previous = center.x;
    }
  });
  const before = new THREE.Box3()
    .setFromObject(assembly.groups.get("dimm-01")!)
    .getCenter(new THREE.Vector3());
  assembly.groups.get("memory-01")!.position.y += 0.2;
  wrapper.updateMatrixWorld(true);
  const after = new THREE.Box3()
    .setFromObject(assembly.groups.get("dimm-01")!)
    .getCenter(new THREE.Vector3());
  assert.ok(Math.abs(after.y - before.y - 0.2) < 1e-8);
  await t.test(
    "M1 两个电源槽与精模、安装简图及供电端点同位，展开全程保持顺序",
    () => {
      const deviceId = "srv-44";
      const check = assemblyChecks(deviceId).find(
        (check) => check.tool === "server-power",
      );
      assert.ok(check);
      const { primary, companion } = check.pairs[0];
      assert.deepEqual([primary.slot, companion.slot], ["PSU-01", "PSU-02"]);
      for (const device of devices)
        assert.equal(
          assemblyChecks(device.id).some((item) => item.tool === check.tool),
          ["server-1u", "server-2u"].includes(device.modelId),
        );
      const fallback = createEquipmentAssembly("server-1u");
      const rack = rackForDevice(deviceId);
      const state = transition(createState(), {
        type: "navigate",
        level: "rack",
        id: deviceId,
      });
      const paths = powerScene(state, deviceId)!.paths;
      for (const [part, feed] of [
        [primary, "A"],
        [companion, "B"],
      ] as const) {
        const endpointX =
          paths.find((path) => path.feed === feed)!.points.at(-1)![0] -
          rack.position[0];
        assert.ok(Math.abs(endpointX - part.position[0]) < 1e-6);
        const imported = assembly.groups.get(part.id)!;
        assert.ok(Math.abs(imported.position.x - endpointX) < 0.001);
        assert.equal(fallback.positions.get(part.id)!.x, part.position[0]);
        const slot = new THREE.Box3().setFromObject(
          fallback.groups.get(part.id)!,
        );
        for (const [id, other] of fallback.groups) {
          if (id === part.id) continue;
          other.traverse((mesh) => {
            if (mesh instanceof THREE.Mesh)
              assert.ok(
                !slot.intersectsBox(new THREE.Box3().setFromObject(mesh, true)),
                id,
              );
          });
        }
      }
      for (const model of [assembly, fallback]) {
        for (const amount of [0, check.startExplosion, 1, 0]) {
          const [a, b] = [primary, companion].map((part) => {
            const group = model.groups.get(part.id)!;
            const position = model.positions.get(part.id)!.toArray();
            group.position.fromArray(
              assemblyPartPosition({ ...part, position }, amount, 1),
            );
            return new THREE.Box3().setFromObject(group);
          });
          assert.ok(b.max.x < a.min.x, "机后观察，输入 B 始终在输入 A 右侧");
        }
      }
    },
  );
  await t.test(
    "M1 精模和简模双电源可连续换槽抽出，两侧托边与限位保持安装位置",
    () => {
      for (const model of [assembly, createEquipmentAssembly("server-1u")]) {
        const row = new RearModuleSeats();
        const ids = ["psu-01", "psu-02"];
        const box = (o: THREE.Object3D) =>
          new THREE.Box3().setFromObject(o, true);
        row.update(
          model.groups,
          model.positions,
          ids[0],
          "server-1u",
          "seated",
        );
        assert.equal(row.guides.children.length, 2);
        const slots = row.guides.children.map((slot) => slot.children.map(box));
        const modules = ids.map((id) => box(model.groups.get(id)!));
        for (const [i, slot] of slots.entries()) {
          assert.equal(slot.length, 8);
          const body = modules[i],
            [left, , right, , leftStop, rightStop] = slot;
          for (const ledge of [left, right]) {
            assert.ok(Math.abs(ledge.max.y - body.min.y) < 1e-6);
            assert.ok(
              ledge.min.z > body.min.z && ledge.max.z <= body.max.z + 1e-6,
            );
            assert.ok(ledge.max.x > body.min.x && ledge.min.x < body.max.x);
          }
          const half = body.getCenter(new THREE.Vector3()).x;
          assert.ok(leftStop.max.x < half && rightStop.min.x > half);
          const innerBar = slot[7];
          assert.ok(Math.abs(innerBar.max.y - leftStop.min.y) < 1e-7);
          assert.ok(
            innerBar.min.z < left.max.z &&
              innerBar.max.z >= leftStop.max.z - 1e-7,
          );
          assert.ok(
            leftStop.min.z > left.max.z && rightStop.min.z > right.max.z,
          );
        }
        assert.ok(
          box(row.guides.children[1]).max.x < box(row.guides.children[0]).min.x,
        );
        for (const index of [0, 1, 1, 0]) {
          row.restoreModule();
          row.update(
            model.groups,
            model.positions,
            ids[index],
            "server-1u",
            "withdrawn",
          );
          const body = box(model.groups.get(ids[index])!);
          assert.ok(body.min.z < modules[index].min.z);
          assert.ok(body.max.z > slots[index][0].min.z);
          assert.ok(
            box(model.groups.get(ids[1 - index])!).equals(modules[1 - index]),
          );
          assert.deepEqual(
            row.guides.children.map((slot) => slot.children.map(box)),
            slots,
          );
        }
        row.clear();
        assert.equal(row.guides.parent, null);
        ids.forEach((id, i) =>
          assert.ok(box(model.groups.get(id)!).equals(modules[i])),
        );
        row.dispose();
      }
    },
  );
});
