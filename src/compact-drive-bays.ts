import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { modelById } from "./catalog.ts";

// 从柜前看，M1 的四个已映射托架位于面板左侧，先上下、再向右编号。
// 简模中心按贡献外观归一到机箱宽度后的托架包围盒取整，单位为米。
export const compactDriveBays = Array.from(
  { length: modelById("server-1u").drives },
  (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    const tray = definition.subparts.find(
      (p) => p.parent === "storage-01" && p.slot === "BAY-" + number,
    )!;
    const disk = definition.subparts.find(
      (p) => p.parent === "drives-01" && p.slot === "SSD-" + number,
    )!;
    return {
      number,
      tray,
      disk,
      x: -0.1785 + Math.floor(index / 2) * 0.0744,
      y: 0.0074 - (index % 2) * 0.0172,
      position: (index < 2 ? "左列" : "右列") + (index % 2 ? "下层" : "上层"),
    };
  },
);
export function compactBayForPart(id: string) {
  return compactDriveBays.find(
    (bay) => bay.tray.id === id || bay.disk.id === id,
  );
}
