import * as THREE from "three";
import { processorPairs } from "../assembly-pairs.ts";
import { modelById } from "../catalog.ts";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";
import type { Box } from "./equipment-model.ts";

const model = modelById("server-1u"),
  mount = model.processorSeat!;
const guides = [
  [-0.0345, 0.0549],
  [0.0339, -0.0449],
];
const studs = [
  [-0.0288, -0.0513],
  [0.0288, -0.0513],
  [-0.0288, 0.0513],
  [0.0288, 0.0513],
];

function plate(
  root: THREE.Group,
  name: string,
  w: number,
  d: number,
  thickness: number,
  y: number,
  color: string,
  holes: THREE.Path[],
) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -d / 2);
  shape.lineTo(w / 2, -d / 2);
  shape.lineTo(w / 2, d / 2);
  shape.lineTo(-w / 2, d / 2);
  shape.closePath();
  shape.holes.push(...holes);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 20,
  }).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.52 }),
  );
  mesh.position.y = y;
  mesh.name = name;
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
}

// 简模以封装顶面的接触区为原点。前伸换热段与封装错开，以接触块底面核对落座。
export function compactHeatsink(root: THREE.Group, box: Box) {
  box(root, [0.03, 0.0013, 0.042], [0, 0.00065, 0], "#b39772", 0.65).name =
    "compact-contact-shoe";
  const holes = [...studs, ...guides].map(([x, z]) => {
    const hole = new THREE.Path();
    hole.absarc(x, -z, 0.0026, 0, Math.PI * 2, true);
    return hole;
  });
  plate(
    root,
    "compact-sink-plate",
    0.078,
    0.118,
    0.0035,
    0.0013,
    "#88969c",
    holes,
  );
  for (let i = -6; i <= 6; i++)
    box(root, [0.002, 0.017, 0.086], [i * 0.004, 0.0133, 0], "#9ca8ad", 0.65);
  const end = 0.151;
  for (const x of [-0.018, -0.006, 0.006, 0.018])
    box(
      root,
      [0.008, 0.004, end - 0.045],
      [x, 0.005, (end + 0.045) / 2],
      "#aa9170",
      0.55,
    );
  box(root, [0.182, 0.003, 0.031], [0, 0.005, end], "#8a989e", 0.55);
  for (let i = -15; i <= 15; i++)
    box(
      root,
      [0.0016, 0.019, 0.031],
      [i * 0.0059, 0.016, end],
      "#9aa7ad",
      0.65,
    );
}

export function compactPackage(root: THREE.Group, box: Box) {
  const [w, h, d] = mount.packageSize;
  box(root, [w, 0.0007, d], [0, -h + 0.00035, 0], "#355c4a", 0.2);
  box(
    root,
    [w - 0.0006, h - 0.0007, d - 0.0006],
    [0, -(h - 0.0007) / 2, 0],
    "#a4aaac",
    0.65,
  );
}

// 座框和两组高低固定柱按贡献装配的范围近似，开口保留封装外廓。
function fallbackSocket(board: THREE.Group, at: THREE.Vector3) {
  const group = new THREE.Group();
  group.position.copy(board.worldToLocal(at.clone()));
  board.add(group);
  const [w, h, d] = mount.frameSize;
  const halfW = mount.packageSize[0] / 2 + mount.frameClearance,
    halfD = mount.packageSize[2] / 2 + mount.frameClearance;
  const opening = new THREE.Path();
  opening.moveTo(-halfW, -halfD);
  opening.lineTo(-halfW, halfD);
  opening.lineTo(halfW, halfD);
  opening.lineTo(halfW, -halfD);
  opening.closePath();
  plate(
    group,
    "compact-seat-frame",
    w,
    d,
    h,
    -mount.packageSize[1],
    "#69777c",
    [opening],
  );
  const metal = new THREE.MeshStandardMaterial({
    color: "#aca28a",
    roughness: 0.44,
    metalness: 0.6,
  });
  for (const [points, height] of [
    [studs, 0.0091],
    [guides, 0.0202],
  ] as const) {
    const geometry = new THREE.CylinderGeometry(0.0014, 0.0017, height, 16);
    for (const [x, z] of points) {
      const post = new THREE.Mesh(geometry, metal);
      post.name = "compact-seat-post";
      post.position.set(x, -mount.packageSize[1] + height / 2, z);
      group.add(post);
    }
  }
  return group;
}

function movingBody(owner: THREE.Group, distance: number) {
  const bundle = new THREE.Group();
  bundle.name = "processor-moving-body";
  bundle.add(...owner.children.slice());
  owner.add(bundle);
  const [x, y, z] = mount.focusDirection;
  registerLayer(bundle, {
    node: bundle.name,
    offset: [0, distance, 0],
    direction: [x, y, z],
  });
  return bundle;
}

export function registerCompactProcessorSeats(
  groups: Map<string, THREE.Group>,
) {
  const board = groups.get(mount.board)!;
  for (const { primary, companion } of processorPairs(model.id)) {
    const chip = groups.get(primary.id)!,
      sink = groups.get(companion.id)!;
    const contact = model.processorContacts!.find(
      (item) => item.slot === companion.slot,
    )!;
    const seat =
      board.getObjectByName(contact.socketNode) ??
      fallbackSocket(board, new THREE.Vector3().fromArray(contact.center));
    seat.name = contact.socketNode;
    // 将座框挂到主板组下。隔离时可隐藏贡献主板网格本身，同时保留座框的原世界变换。
    if (seat.parent !== board) board.attach(seat);
    if (chip.getObjectByName(contact.packageNode)) {
      // 原封装只含顶面与四侧。近看翻到底部时用一张无针脚的示意背面封闭外廓。
      const bounds = new THREE.Box3().setFromObject(chip, true),
        size = bounds.getSize(new THREE.Vector3());
      const underside = new THREE.Mesh(
        new THREE.PlaneGeometry(size.x, size.z),
        new THREE.MeshStandardMaterial({ color: "#3f5549", roughness: 0.62 }),
      );
      const center = bounds.getCenter(new THREE.Vector3());
      center.y = bounds.min.y;
      underside.position.copy(chip.worldToLocal(center));
      underside.rotation.x = Math.PI / 2;
      underside.name = "package-underside";
      chip.add(underside);
    }
    registerSocketLayers(primary.id, board, seat, chip, sink);
  }
}

// M2 封装的位置已经按同路散热器底面校准。座框留在主板上，框内承载面接至板面。
export function registerServerProcessorSeats(groups: Map<string, THREE.Group>) {
  const board = groups.get(mount.board)!;
  for (const { primary, companion } of processorPairs("server-2u")) {
    const chip = groups.get(primary.id)!;
    const sink = groups.get(companion.id)!;
    const bounds = new THREE.Box3().setFromObject(chip, true);
    const center = bounds.getCenter(new THREE.Vector3());
    center.y = bounds.min.y;
    const { x: w, z: d } = bounds.getSize(new THREE.Vector3());
    const gap = 0.0006,
      rim = 0.003,
      hw = w / 2 + gap,
      hd = d / 2 + gap;
    const opening = new THREE.Path();
    opening
      .moveTo(-hw, -hd)
      .lineTo(-hw, hd)
      .lineTo(hw, hd)
      .lineTo(hw, -hd)
      .closePath();
    const seat = new THREE.Group();
    seat.name = "processor-socket-" + primary.slot;
    seat.position.copy(board.worldToLocal(center.clone()));
    board.add(seat);
    const surface = new THREE.Raycaster(
      center,
      new THREE.Vector3(0, -1, 0),
    ).intersectObject(board)[0];
    const base = Math.max(0.0008, surface?.distance ?? 0.002);
    plate(
      seat,
      "socket-bed",
      2 * (hw + rim),
      2 * (hd + rim),
      base,
      -base,
      "#46544f",
      [],
    );
    plate(
      seat,
      "socket-rim",
      2 * (hw + rim),
      2 * (hd + rim),
      0.002,
      0,
      "#7b8488",
      [opening],
    );
    registerSocketLayers(primary.id, board, seat, chip, sink);
  }
}

function registerSocketLayers(
  chipId: string,
  board: THREE.Group,
  seat: THREE.Object3D,
  chip: THREE.Group,
  sink: THREE.Group,
) {
  const cap = movingBody(chip, mount.packageLift);
  const cooler = movingBody(sink, mount.sinkLift);
  for (const [id, moving, members] of [
    ["processor-seat", cap, [cap, seat]],
    ["processor-sink", cooler, [cap, seat, cooler]],
  ] as const) {
    for (const [owner, branch] of [
      [chip, cap],
      [board, seat],
      [sink, cooler],
    ] as const) {
      registerLayerScope(owner, id + ":" + chipId, {
        layerRoot: moving,
        moving,
        members: [...members],
        selectedBranch: branch,
        selectionPadding: 0.001,
      });
    }
  }
}
