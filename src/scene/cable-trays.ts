import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import {
  cableTraySettings as s,
  trayCeilingMount,
  trayRungXs,
  traySupportCenterY,
} from "../cable-trays.ts";

type Piece = { size: number[]; position: number[] };
/** 原创梯式桥架：两种材质各一个实例批次，不逐横档增加绘制调用。 */
export function buildCableTray(root: THREE.Group, withSuspension = true) {
  const tray: Piece[] = [],
    supports: Piece[] = [];
  for (const side of [-1, 1]) {
    tray.push({
      size: [s.length, s.railSize[1], s.railSize[0]],
      position: [0, s.railCenterY, (side * s.railSpacing) / 2],
    });
    for (const end of [-1, 1])
      tray.push({
        size: [s.capLength, s.railSize[1], s.railSize[0] + s.capOverhang * 2],
        position: [
          end * (s.length / 2 - s.capLength / 2),
          s.railCenterY,
          (side * s.railSpacing) / 2,
        ],
      });
  }
  for (const x of trayRungXs())
    tray.push({
      size: s.rungSize,
      position: [x, 0, 0],
    });
  if (withSuspension) {
    // 横托架承接连续侧梁，不依赖横档刚好落在吊点的 X 坐标。
    const supportY = traySupportCenterY;
    for (const x of s.supportXs) {
      supports.push({
        size: [s.supportDepth, s.supportHeight, s.supportWidth],
        position: [x, supportY, 0],
      });
      for (const side of [-1, 1]) {
        supports.push({
          size: [s.rodSize, s.rodTopY - supportY, s.rodSize],
          position: [x, (s.rodTopY + supportY) / 2, side * s.rodOffsetZ],
        });
        supports.push({
          size: s.nutSize,
          position: [
            x,
            supportY - s.supportHeight / 2 - s.nutSize[1] / 2,
            side * s.rodOffsetZ,
          ],
        });
      }
    }
    for (const station of s.supportXs) {
      for (const side of [-1, 1] as const) {
        const { neck, plate } = trayCeilingMount(
          root.position.y,
          station,
          side,
        );
        supports.push(neck, plate);
      }
    }
  }
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const transform = new THREE.Object3D();
  for (const [name, pieces, material] of [
    ["tray-ladder", tray, definition.rendering.shell.tray],
    ["tray-supports", supports, definition.rendering.shell.suspension],
  ] as const) {
    if (!pieces.length) continue;
    const mesh = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshStandardMaterial(material),
      pieces.length,
    );
    mesh.name = name;
    pieces.forEach((piece, i) => {
      transform.position.fromArray(piece.position);
      transform.scale.fromArray(piece.size);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    });
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
  }
}
