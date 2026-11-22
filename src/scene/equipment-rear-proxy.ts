import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { modelById } from "../catalog.ts";

const settings = definition.installationProxy.rear;
type Finish = keyof typeof settings.colors;

/** 安装外观的低细节背板；整机拾取，不声明物理端口或贡献模型节点映射。 */
export function createEquipmentRearProxy(modelId: string) {
  const model = modelById(modelId);
  const root = new THREE.Group();
  root.name = `rear-proxy-${modelId}`;
  const geometries = new Map<Finish, THREE.BufferGeometry[]>();
  const back = -model.depth / 2;
  const panelDepth = settings.panelDepth;
  const detailDepth = settings.detailDepth;
  const box = (
    finish: Finish,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    geometry.translate(x, y, z);
    const list = geometries.get(finish) ?? [];
    list.push(geometry);
    geometries.set(finish, list);
  };
  box(
    "inset",
    0.464,
    model.units * 0.04445 - 0.005,
    panelDepth,
    0,
    0,
    back - panelDepth / 2,
  );
  for (const panel of model.rearPanels) {
    const [x, y] = panel.center;
    const [w, h] = panel.size;
    const face = back - panelDepth * 2;
    box("panel", w, h, panelDepth, x, y, face + panelDepth / 2);
    if (panel.kind === "vent") {
      // 深色凹面与静态横筋；不伪装为穿透孔、风量或运行中的风扇。
      box(
        "inset",
        w - settings.panelGap * 2,
        h - settings.panelGap * 2,
        detailDepth,
        x,
        y,
        face - detailDepth / 2,
      );
      const rows = Math.max(3, Math.floor(h / 0.008));
      for (let i = 0; i < rows; i++)
        box(
          "panel",
          w - settings.panelGap * 2,
          0.0015,
          detailDepth,
          x,
          y + ((i - (rows - 1) / 2) * h) / (rows + 1),
          face - detailDepth * 1.5,
        );
    } else if (panel.kind === "power") {
      box(
        "inset",
        w * 0.44,
        h * 0.48,
        detailDepth,
        x - w * 0.13,
        y,
        face - detailDepth / 2,
      );
      box(
        "grip",
        w * 0.1,
        h * 0.64,
        detailDepth * 2,
        x + w * 0.32,
        y,
        face - detailDepth,
      );
      for (const sign of [-1, 1])
        box(
          "inset",
          w * 0.45,
          h * 0.05,
          detailDepth,
          x - w * 0.13,
          y + sign * h * 0.37,
          face - detailDepth / 2,
        );
    } else if (panel.kind === "expansion") {
      box(
        "inset",
        w * 0.78,
        h * 0.36,
        detailDepth,
        x,
        y,
        face - detailDepth / 2,
      );
    } else {
      // 接口区域只表示轮廓，不按这些矩形定位网络逻辑端口。
      for (const sign of [-1, 1])
        box(
          "inset",
          w * 0.29,
          h * 0.6,
          detailDepth,
          x + sign * w * 0.23,
          y,
          face - detailDepth / 2,
        );
    }
  }
  for (const [finish, pieces] of geometries) {
    const geometry = mergeGeometries(pieces)!;
    for (const piece of pieces) piece.dispose();
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: settings.colors[finish],
        roughness: settings.roughness,
        metalness: finish === "inset" ? 0.15 : settings.metalness,
      }),
    );
    mesh.name = `${root.name}-${finish}`;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}
