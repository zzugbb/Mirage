import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import { poseAssemblyLayer } from "./scene/assembly-layer.ts";
import { RearModuleSeats } from "./scene/rear-module-seats.ts";
import {
  assemblyChecks,
  assemblyMember,
  rearMemberLayer,
  rearLayoutFor,
} from "./assembly-pairs.ts";
import { devices } from "./installation.ts";
import { inletPart, powerLinks } from "./power-config.ts";
import { sourcePorts } from "./network.ts";
import { modelById } from "./catalog.ts";

const bounds = (object: THREE.Object3D) =>
  new THREE.Box3().setFromObject(object);
const center = (object: THREE.Object3D) =>
  bounds(object).getCenter(new THREE.Vector3());
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-7, `${a} ≠ ${b}`);

test("存储 24 盘的后部接触面与竖直中板逐位对齐，接点不再排在板顶", () => {
  const assembly = createEquipmentAssembly("storage-4u");
  const plane = assembly.groups.get("sto-midplane")!;
  const board = bounds(plane.getObjectByName("storage-midplane-board")!);
  assert.equal(
    plane.children.filter((o) => o.name.startsWith("storage-socket-")).length,
    24,
  );
  for (let i = 1; i <= 24; i++) {
    const suffix = String(i).padStart(2, "0");
    const disk = assembly.groups.get(`sto-disk-${suffix}`)!;
    const socket = plane.getObjectByName(`storage-socket-${suffix}`)!;
    const contact = disk.getObjectByName("storage-drive-contact")!;
    close(center(socket).x, center(contact).x);
    close(center(socket).y, center(contact).y);
    close(bounds(socket).max.z, bounds(contact).min.z);
    close(bounds(socket).min.z, board.max.z);
    assert.ok(
      bounds(socket).min.y > board.min.y && bounds(socket).max.y < board.max.y,
    );
  }
});

test("24 个盘体逐一落在两道横托上，盘尾端子随盘抬起并回到同号中板接点", () => {
  const { root, groups } = createEquipmentAssembly("storage-4u");
  const midplane = groups.get("sto-midplane")!;
  for (const [id, disk] of groups) {
    if (!id.startsWith("sto-disk-")) continue;
    const suffix = id.slice("sto-disk-".length);
    const body = disk.getObjectByName("storage-drive-body")!;
    const contact = disk.getObjectByName("storage-drive-contact")!;
    const tray = disk.getObjectByName("storage-drive-tray")!;
    const supports = tray.children.filter(
      (o) => o.name === "storage-drive-support",
    );
    const rails = tray.children.filter((o) => o.name === "storage-drive-rail");
    const socket = midplane.getObjectByName("storage-socket-" + suffix)!;
    const trayRest = bounds(tray),
      bodyRest = bounds(body),
      socketRest = bounds(socket);
    assert.equal(supports.length, 2);
    assert.equal(rails.length, 2);
    assert.ok(bounds(supports[0]).max.z < bounds(supports[1]).min.z);
    for (const support of supports) {
      close(bounds(support).max.y, bodyRest.min.y);
      close(bounds(support).min.x, bounds(rails[0]).max.x);
      close(bounds(support).max.x, bounds(rails[1]).min.x);
    }
    for (const separated of [true, true, false]) {
      poseAssemblyLayer(disk, separated);
      root.updateMatrixWorld(true);
      const current = bounds(body),
        tip = bounds(contact);
      const lift = current.min.y - bodyRest.min.y;
      if (separated) assert.ok(current.min.y > trayRest.max.y);
      else close(lift, 0);
      assert.deepEqual(bounds(tray), trayRest);
      close(tip.max.z, current.min.z);
      close(center(contact).y - center(socket).y, lift);
      close(tip.min.z, socketRest.max.z);
      close(center(contact).x, center(socket).x);
    }
  }
});

test("24 个带托架盘位不互相穿插，正面射线仍分别选择原有硬盘子件", () => {
  const assembly = createEquipmentAssembly("storage-4u");
  const drives = assembly.groups.get("sto-drives")!;
  const disks = [...assembly.groups].filter(([id]) =>
    id.startsWith("sto-disk-"),
  );
  assert.equal(disks.length, 24);
  for (const [i, [id, disk]] of disks.entries()) {
    const b = bounds(disk);
    for (const [, other] of disks.slice(i + 1))
      assert.equal(
        b.intersectsBox(bounds(other)),
        false,
        `${id} 与相邻盘位穿插`,
      );
    const origin = center(disk);
    origin.z = b.max.z + 1;
    const hit = new THREE.Raycaster(
      origin,
      new THREE.Vector3(0, 0, -1),
    ).intersectObject(drives)[0];
    assert.ok(hit);
    let object: THREE.Object3D | null = hit.object;
    while (object && !object.userData.entityId) object = object.parent;
    assert.equal(object?.userData.entityId, id);
  }
});

test("存储后部电源及其接口保留在当前机箱深度内，四盘列六层保持 4U 高度", () => {
  const model = modelById("storage-4u");
  const assembly = createEquipmentAssembly(model.id);
  for (const id of [
    "sto-psu-a",
    "sto-psu-b",
    "sto-controller-a",
    "sto-controller-b",
    "sto-fans",
  ]) {
    const b = bounds(assembly.groups.get(id)!);
    assert.ok(b.min.z >= -model.depth / 2, `${id} 超出机箱后沿`);
    assert.ok(b.max.z <= model.depth / 2);
    assert.ok(b.min.y > (-model.units * 0.04445) / 2);
    assert.ok(b.max.y < (model.units * 0.04445) / 2);
  }
  const disks = [...assembly.groups].filter(([id]) =>
    id.startsWith("sto-disk-"),
  );
  assert.equal(new Set(disks.map(([, disk]) => disk.position.x)).size, 4);
  assert.equal(new Set(disks.map(([, disk]) => disk.position.y)).size, 6);
});

test("S4 核查选择与配置槽位、逻辑端口归属及后面板拾取一致", () => {
  const assembly = createEquipmentAssembly("storage-4u");
  for (const device of devices) {
    const check = assemblyChecks(device.id).find(
      (check) => check.tool === "storage-controllers",
    );
    assert.equal(Boolean(check), device.modelId === "storage-4u");
    if (!check) continue;
    const [{ primary, companion }] = check.pairs;
    assert.deepEqual([primary.slot, companion.slot], ["CTRL-A", "CTRL-B"]);
    for (const part of [primary, companion]) {
      const controller = assembly.groups.get(part.id)!;
      const panel = controller.getObjectByName("controller-rear-panel")!;
      const pcb = controller.getObjectByName("controller-board")!;
      assert.ok(bounds(panel).max.z < bounds(pcb).min.z);
      assert.ok(sourcePorts(device.id).some((port) => port.partId === part.id));
      const origin = center(panel);
      origin.z -= 0.02;
      const hit = new THREE.Raycaster(
        origin,
        new THREE.Vector3(0, 0, 1),
      ).intersectObject(assembly.root)[0];
      let owner: THREE.Object3D | null = hit?.object ?? null;
      while (owner && !owner.userData.entityId) owner = owner.parent;
      assert.equal(owner?.userData.entityId, part.id);
    }
    const a = bounds(assembly.groups.get(primary.id)!);
    const b = bounds(assembly.groups.get(companion.id)!);
    assert.ok(a.max.x < b.min.x);
    for (const id of ["sto-psu-a", "sto-psu-b", "sto-fans", "sto-midplane"]) {
      const other = bounds(assembly.groups.get(id)!);
      assert.ok(!a.intersectsBox(other) && !b.intersectsBox(other), id);
    }
  }
});

test("S4 各控制器的板卡和散热片随板抬起，四个支柱及托盘留在各自槽位", () => {
  const { groups } = createEquipmentAssembly("storage-4u");
  const check = assemblyChecks("sto-04").find(
    (item) => item.tool === "storage-controllers",
  )!;
  const { primary, companion } = check.pairs[0];
  for (const [part, other] of [
    [primary, companion],
    [companion, primary],
  ]) {
    const root = groups.get(part.id)!;
    const pcb = root.getObjectByName("controller-pcb")!;
    const board = pcb.parent!;
    const tray = root.getObjectByName("controller-tray")!;
    const posts = root.children.filter((o) => o.name === "controller-standoff");
    const neighbor = groups.get(other.id)!;
    const fixed = [
      tray,
      neighbor,
      root.getObjectByName("controller-rear-panel")!,
      ...posts,
    ];
    const rest = fixed.map(bounds);
    const atRest = bounds(board);
    assert.equal(posts.length, 4);
    for (const post of posts) {
      close(bounds(post).min.y, bounds(tray).max.y);
      close(bounds(post).max.y, bounds(pcb).min.y);
      const middle = center(post);
      assert.ok(
        board.children.some(
          (o) =>
            Math.abs(center(o).x - middle.x) < 1e-7 &&
            Math.abs(center(o).z - middle.z) < 1e-7,
        ),
      );
    }
    for (const separated of [true, true, false, true, false]) {
      poseAssemblyLayer(root, separated);
      root.updateMatrixWorld(true);
      const rise = bounds(pcb).min.y - bounds(posts[0]).max.y;
      if (separated) assert.ok(rise > part.size[1]);
      else close(rise, 0);
      close(bounds(board).max.y - atRest.max.y, rise);
      if (separated) close(bounds(root).max.y, bounds(board).max.y);
      assert.deepEqual(fixed.map(bounds), rest);
    }
  }
});

test("S4 两块控制器的双口随板移动，同号端口笼从面板后方对准贯穿开口", () => {
  const { groups } = createEquipmentAssembly("storage-4u");
  const ports = sourcePorts("sto-04");
  const dir = new THREE.Vector3(0, 0, 1);
  for (const id of new Set(ports.map((p) => p.partId))) {
    const root = groups.get(id)!;
    const pcb = root.getObjectByName("controller-pcb")!;
    const panel = root.getObjectByName("controller-rear-panel")!;
    const panelBox = bounds(panel);
    close(
      panelBox.max.z,
      bounds(root.getObjectByName("controller-tray")!).min.z,
    );
    const cages = root.getObjectsByProperty("name", "controller-port-cage");
    assert.deepEqual(
      cages.map((c) => c.userData.logicalPort),
      ports.filter((p) => p.partId === id).map((p) => p.port),
    );
    assert.equal(cages.length, 2);
    const rest = cages.map(bounds);
    for (const [i, c] of cages.entries()) {
      close(rest[i].min.y, bounds(pcb).max.y);
      assert.ok(rest[i].min.z > panelBox.max.z);
      assert.ok(
        rest[i].max.x < panelBox.max.x && rest[i].min.x > panelBox.min.x,
      );
      const tongue = c.getObjectByName("controller-port-tongue")!;
      const origin = center(tongue);
      origin.z = panelBox.min.z - 0.05;
      const ray = new THREE.Raycaster(origin, dir);
      for (const lifted of [false, true, false, true, false]) {
        poseAssemblyLayer(root, lifted);
        root.updateWorldMatrix(true, true);
        const rise =
          bounds(pcb).min.y -
          bounds(root.getObjectByName("controller-standoff")!).max.y;
        close(bounds(c).min.y - rest[i].min.y, rise);
        assert.ok(bounds(panel).equals(panelBox));
        assert.equal(ray.intersectObject(panel).length, 0, "面板必须开孔");
        if (lifted) assert.equal(ray.intersectObject(c).length, 0);
        else assert.equal(ray.intersectObject(root)[0]?.object, tongue);
      }
    }
    const web = center(cages[0]).lerp(center(cages[1]), 0.5);
    web.z = panelBox.min.z - 0.05;
    assert.ok(
      new THREE.Raycaster(web, dir).intersectObject(panel).length,
      "两孔间保留实体隔边",
    );
  }
});

test("S4 两个电源槽与配置输入和安装面板一致，从机后点选能命中对应模块", () => {
  const model = modelById("storage-4u");
  const assembly = createEquipmentAssembly(model.id);
  for (const device of devices) {
    const check = assemblyChecks(device.id).find(
      (c) => c.tool === "storage-power",
    );
    assert.equal(Boolean(check), device.modelId === model.id);
    if (!check) continue;
    const [{ primary, companion }] = check.pairs;
    assert.ok(
      bounds(assembly.groups.get(primary.id)!).max.x <
        bounds(assembly.groups.get(companion.id)!).min.x,
    );
    for (const [feed, part] of [
      ["A", primary],
      ["B", companion],
    ] as const) {
      assert.equal(part.id, inletPart(model.id, feed));
      assert.equal(part.slot, "PSU-" + feed);
      assert.deepEqual(assemblyChecks(device.id, part.id), [check]);
      assert.ok(
        powerLinks.some(
          (link) => link.deviceId === device.id && link.inlet === feed,
        ),
      );
      const psu = assembly.groups.get(part.id)!;
      const face = psu.getObjectByName("psu-rear-panel")!;
      const panel = model.rearPanels.find(
        (p) => p.kind === "power" && p.center[0] === psu.position.x,
      )!;
      const faceSize = bounds(face).getSize(new THREE.Vector3());
      close(center(face).y, panel.center[1]);
      close(faceSize.x, panel.size[0]);
      close(faceSize.y, panel.size[1]);
      for (const id of ["sto-controller-a", "sto-controller-b", "sto-fans"]) {
        assert.equal(
          bounds(psu).intersectsBox(bounds(assembly.groups.get(id)!)),
          false,
          id,
        );
      }
      const origin = center(face);
      origin.z = -model.depth;
      let hit: THREE.Object3D | null =
        new THREE.Raycaster(origin, new THREE.Vector3(0, 0, 1)).intersectObject(
          assembly.root,
        )[0]?.object ?? null;
      while (hit && !hit.userData.entityId) hit = hit.parent;
      assert.equal(hit, psu);
    }
  }
});

test("S4 六个后置模块逐件抽出时穿行区域有净空，固定托边避让面板并承托控制器托盘", () => {
  const { root, groups, positions } = createEquipmentAssembly("storage-4u");
  const check = assemblyChecks("sto-04").find(
    (c) => c.tool === "storage-power",
  )!;
  assert.ok("rear" in check);
  const members = check.rear.members;
  assert.deepEqual(
    members.map((p) => p.slot),
    ["CTRL-B", "CTRL-A", "PSU-B", "FAN-02", "FAN-01", "PSU-A"],
  );
  const seated = members.map((p) => bounds(groups.get(p.id)!));
  const row = new RearModuleSeats();
  const intersects = (a: THREE.Box3, b: THREE.Box3) => {
    const size = a.clone().intersect(b).getSize(new THREE.Vector3());
    return Math.min(size.x, size.y, size.z) > 1e-7;
  };
  for (const [i, part] of members.entries()) {
    assert.equal(assemblyMember(check, part.id)?.id, part.id);
    for (const pose of ["seated", "withdrawn"] as const) {
      row.restoreModule();
      row.update(groups, positions, part.id, "storage-4u", pose);
      root.updateMatrixWorld(true);
      const module = groups.get(part.id)!;
      const current = bounds(module);
      close(current.min.x, seated[i].min.x);
      close(current.min.y, seated[i].min.y);
      if (pose === "withdrawn")
        assert.ok(current.max.z < seated[i].max.z - 0.04);
      else close(current.min.z, seated[i].min.z);
      const sweep = current.clone().union(seated[i]);
      for (const [j, neighbor] of members.entries())
        if (i !== j) {
          assert.ok(bounds(groups.get(neighbor.id)!).equals(seated[j]));
          assert.ok(
            !intersects(sweep, seated[j]),
            part.slot + " / " + neighbor.slot,
          );
        }
      const rails = row.guides.getObjectByName(part.slot)!;
      if ("node" in part && part.node === "controller") {
        close(
          bounds(rails.children[0]).max.y,
          bounds(module.getObjectByName("controller-tray")!).min.y,
        );
      }
      if ("node" in part && part.node === "psu") {
        close(
          bounds(rails.children[0]).max.y,
          bounds(module.getObjectByName("psu-shell-base")!).min.y,
        );
      }
      module.traverse((mesh) => {
        if (mesh instanceof THREE.Mesh)
          for (const rail of rails.children)
            assert.ok(
              !intersects(bounds(mesh), bounds(rail)),
              part.slot + " / " + mesh.name,
            );
      });
    }
  }
  row.dispose();
  root.updateMatrixWorld(true);
  assert.ok(
    members.every((part, i) => bounds(groups.get(part.id)!).equals(seated[i])),
  );
});

for (const modelId of ["switch-1u", "storage-4u"] as const) {
  test(`${modelId} 两路电源的输入面板随内托抽出，推回时两侧导轨承托且端面贴合止挡`, () => {
    const layout = rearLayoutFor(modelId)!;
    const { root, groups } = createEquipmentAssembly(modelId);
    root.updateMatrixWorld(true);
    for (const supply of layout.supplies) {
      assert.equal(rearMemberLayer(layout, supply.id)?.entry, "查看电源内托");
      const psu = groups.get(supply.id)!;
      const tray = psu.getObjectByName("psu-inner-tray")!;
      const shell = psu.getObjectByName("psu-shell-side")!;
      const floor = tray.getObjectByName("psu-tray-floor")!;
      const face = tray.getObjectByName("psu-rear-panel")!;
      assert.ok(
        tray.getObjectByName("psu-handle") &&
          tray.getObjectByName("psu-tray-board"),
      );
      const rails = psu.getObjectsByProperty("name", "psu-inner-rail");
      const stops = psu.getObjectsByProperty("name", "psu-tray-stop");
      assert.equal(rails.length, 2);
      assert.equal(stops.length, 2);
      const fixed = psu.children.filter((o) => o !== tray);
      const seated = bounds(tray);
      const fixedBounds = fixed.map(bounds);
      close(bounds(face).max.z, bounds(shell).min.z);
      for (const rail of rails) {
        close(bounds(floor).min.y, bounds(rail).max.y);
        assert.ok(
          bounds(rail)
            .clone()
            .intersect(bounds(floor))
            .getSize(new THREE.Vector3()).x > 0.003,
        );
      }
      for (const stop of stops) close(bounds(floor).max.z, bounds(stop).min.z);
      for (const separated of [true, true, false, true, false]) {
        poseAssemblyLayer(psu, separated);
        root.updateMatrixWorld(true);
        assert.deepEqual(fixed.map(bounds), fixedBounds);
        close(bounds(tray).min.x, seated.min.x);
        close(bounds(tray).min.y, seated.min.y);
        if (separated) assert.ok(bounds(tray).max.z < bounds(shell).min.z);
        else assert.ok(bounds(tray).equals(seated));
        // 每件沿 Z 轴平移的扫过范围都应避开固定实体，允许装配面相贴。
        tray.traverse((mesh) => {
          if (!(mesh instanceof THREE.Mesh)) return;
          const box = bounds(mesh);
          const path = box
            .clone()
            .union(
              box.clone().translate(new THREE.Vector3(0, 0, -tray.position.z)),
            );
          for (const obstacle of fixedBounds) {
            const overlap = obstacle
              .clone()
              .intersect(path)
              .getSize(new THREE.Vector3());
            assert.ok(
              Math.min(overlap.x, overlap.y, overlap.z) < 1e-7,
              mesh.name,
            );
          }
        });
      }
    }
  });
}
