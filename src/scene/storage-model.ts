import * as THREE from "three";
import { storageAssembly, storageSlot } from "../storage-layout.ts";

type Box = (
  root: THREE.Object3D,
  size: number[],
  position: number[],
  color: string,
  metalness?: number,
) => THREE.Mesh;

/** 接点用于说明盘组与中板的对应，不表示精确连接器或电气走线。 */
export function storageMidplane(root: THREE.Group, size: number[], box: Box) {
  const [w, h, d] = size;
  box(root, size, [0, 0, 0], "#294d3f", 0.15).name = "storage-midplane-board";
  const [cw, ch, cd] = storageAssembly.socketSize;
  for (let i = 0; i < storageAssembly.columns * storageAssembly.rows; i++) {
    const [x, y] = storageSlot(i);
    const socket = box(
      root,
      [cw, ch, cd],
      [x, y, d / 2 + cd / 2],
      "#222a2d",
      0.15,
    );
    socket.name = `storage-socket-${String(i + 1).padStart(2, "0")}`;
    box(
      root,
      [cw * 0.7, ch * 0.35, 0.0006],
      [x, y, d / 2 + cd + 0.0003],
      "#a28e5b",
      0.5,
    );
    // 短焊盘留在竖直板面，不在板顶复制水平主板元件。
    for (const dx of [-1, 1])
      box(
        root,
        [0.006, 0.001, 0.0003],
        [x + dx * (cw / 2 + 0.004), y, d / 2 + 0.00015],
        "#82794f",
        0.4,
      );
  }
  for (const x of [-w / 2 + 0.008, w / 2 - 0.008])
    for (const y of [-h / 2 + 0.008, h / 2 - 0.008])
      box(root, [0.004, 0.004, 0.002], [x, y, d / 2 + 0.001], "#9ca5a9", 0.7);
}

export function storageDrive(
  root: THREE.Group,
  index: number,
  size: number[],
  box: Box,
) {
  const {
    driveSize,
    columns,
    rows,
    railThickness: rail,
    socketSize,
  } = storageAssembly;
  const [w, h, d] = driveSize;
  const [x, y] = storageSlot(index);
  root.position.set(x, y, 0);
  // 两侧托架包住盘体，盘位间留缝；每块盘沿用原有可选子件身份。
  box(
    root,
    [w - rail * 2, h - rail, d - 0.003],
    [0, 0, 0.0015],
    "#89949b",
    0.65,
  ).name = "storage-drive-body";
  for (const side of [-1, 1])
    box(
      root,
      [rail, h, size[2] - 0.004],
      [(side * (w - rail)) / 2, 0, 0.01],
      "#505e68",
      0.65,
    ).name = "storage-drive-rail";
  box(
    root,
    [socketSize[0] * 0.8, socketSize[1] * 0.7, 0.003],
    [0, 0, -d / 2 + 0.0015],
    "#a28e5b",
    0.5,
  ).name = "storage-drive-contact";
  const faceW = (size[0] / columns) * 0.94,
    faceH = (size[1] / rows) * 0.88;
  box(root, [faceW, faceH, 0.008], [0, 0, size[2] / 2], "#28333d", 0.4);
  for (const side of [-1, 1])
    box(
      root,
      [0.004, faceH * 0.65, 0.006],
      [side * faceW * 0.3, 0, size[2] / 2 + 0.006],
      "#7c8992",
      0.65,
    );
  box(
    root,
    [faceW * 0.6, 0.003, 0.003],
    [0, -faceH * 0.2, size[2] / 2 + 0.009],
    "#a2adb4",
    0.7,
  );
}
