import * as THREE from "three";
import {
  patchPanels,
  panelSettings as s,
  panelPortNumbers,
  panelPortCenter,
  type PanelPort,
} from "../patch-panels.ts";
import { panelEntryPlacement } from "../panel-raceway.ts";

// 编号印在对应孔位上方，与面板共同受深度遮挡。
function printFace(root: THREE.Group, code: string) {
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = Math.round((canvas.width * s.size[1]) / s.size[0]);
  const ctx = canvas.getContext("2d")!;
  const scale = canvas.width / s.size[0];
  ctx.fillStyle = "#444f55";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#303940";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  // 压盖紧固点和编号带随面板绘制，保留孔框的独立立体轮廓。
  for (const x of [19, canvas.width - 19])
    for (const y of [19, canvas.height - 19]) {
      ctx.fillStyle = "#adb6b8";
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#35434a";
      ctx.fillRect(x - 3, y - 1, 6, 2);
    }
  ctx.fillStyle = "#25333c";
  ctx.fillRect(39, 17, 112, 39);
  ctx.fillStyle = "#e0e8e9";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(code, 48, 45);
  ctx.textAlign = "center";
  ctx.font = "bold 20px sans-serif";
  for (const n of panelPortNumbers) {
    const [x, y] = panelPortCenter(n);
    ctx.fillText(
      String(n).padStart(2, "0"),
      canvas.width / 2 + x * scale,
      canvas.height / 2 - (y + s.bezelSize[1] / 2 + 0.004) * scale,
    );
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(s.size[0], s.size[1]),
    new THREE.MeshStandardMaterial({ map, roughness: 0.72 }),
  );
  plate.position.z = s.size[2] / 2 + 0.0002;
  root.add(plate);
}

export function buildPatchPanel(root: THREE.Group, code: string) {
  const [width, height, depth] = s.size;
  const placement = panelEntryPlacement(root.name);
  const recess = placement?.recessDepth ?? 0;
  const caseMaterial = new THREE.MeshStandardMaterial({
    color: "#414b52",
    roughness: 0.65,
  });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height - recess, depth),
    caseMaterial,
  );
  body.name = "panel-case";
  body.position.y = -recess / 2;
  root.add(body);
  if (placement) {
    const [x, , z] = placement.panel.position;
    const shape = new THREE.Shape([
      new THREE.Vector2(-width / 2, -depth / 2),
      new THREE.Vector2(width / 2, -depth / 2),
      new THREE.Vector2(width / 2, depth / 2),
      new THREE.Vector2(-width / 2, depth / 2),
    ]);
    shape.holes.push(
      new THREE.Path(
        placement.opening.map(
          (point) => new THREE.Vector2(point.x - x, z - point.z),
        ),
      ),
    );
    const top = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: recess,
        bevelEnabled: false,
      }).rotateX(-Math.PI / 2),
      caseMaterial,
    );
    top.name = "panel-top-inlet";
    top.position.y = placement.top - recess;
    root.add(top);
  }
  printFace(root, code);
  const [w, h, d] = s.bezelSize;
  const [iw, ih] = s.apertureSize;
  const corners = (width: number, height: number) =>
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([a, b]) => new THREE.Vector2((a * width) / 2, (b * height) / 2));
  const rim = new THREE.Shape(corners(w, h));
  rim.holes.push(new THREE.Path(corners(iw, ih).reverse()));
  // 孔框前伸，深色孔面留在框内；实例编号与面板正面的印字共用顺序。
  for (const [name, geometry, color] of [
    [
      "panel-bezels",
      new THREE.ExtrudeGeometry(rim, { depth: d, bevelEnabled: false }),
      "#99aeb0",
    ],
    ["panel-apertures", new THREE.PlaneGeometry(iw, ih), "#17202a"],
  ] as const) {
    const batch = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshStandardMaterial({ color }),
      panelPortNumbers.length,
    );
    batch.name = name;
    batch.userData.panelPorts = panelPortNumbers;
    for (const n of panelPortNumbers) {
      const [x, y] = panelPortCenter(n);
      batch.setMatrixAt(
        n - 1,
        new THREE.Matrix4().makeTranslation(
          x,
          y,
          depth / 2 + (name === "panel-apertures" ? 0.0006 : 0),
        ),
      );
    }
    root.add(batch);
  }
  const border = new THREE.Shape(corners(w + 0.008, h + 0.008));
  border.holes.push(new THREE.Path(corners(w + 0.003, h + 0.003).reverse()));
  const outline = new THREE.Mesh(
    new THREE.ShapeGeometry(border),
    new THREE.MeshBasicMaterial({ color: "#9ef4e8", toneMapped: false }),
  );
  outline.name = "panel-port-outline";
  outline.raycast = () => {};
  outline.visible = false;
  root.add(outline);
}

export function markPanelPort(
  fixtures: Map<string, THREE.Group>,
  target: PanelPort | null,
) {
  for (const panel of patchPanels) {
    const outline = fixtures
      .get(panel.id)
      ?.getObjectByName("panel-port-outline");
    if (!outline) continue;
    outline.visible =
      !!target &&
      target.panelId === panel.id &&
      panelPortNumbers.includes(target.port);
    if (outline.visible && target)
      outline.position.fromArray(panelPortCenter(target.port)).z += 0.002;
  }
}
