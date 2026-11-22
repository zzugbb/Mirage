import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { modelById, subpartsForModel } from "./catalog.ts";

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

const model = modelById("server-1u");
const { backplane, harness } = model.compactHarness!;
const { controllerId, boardId } = model.controllerMount!;
// 顺序从四个机前盘位经线束两端到主板，端点沿用维护部件身份。
type StorageStation = {
  id: string;
  label: string;
  members: string[];
  actions?: { seated: string; separated: string };
};
function storageStations(
  bays: {
    tray: { id: string };
    disk: { id: string; slot: string };
    position: string;
  }[],
  backplane: string,
  harness: string,
  controllerId: string,
  boardId: string,
  mountStation: string,
): StorageStation[] {
  return [
    {
      id: "route",
      label: "整条通路",
      members: [
        backplane,
        harness,
        controllerId,
        ...bays.flatMap((b) => [b.disk.id, b.tray.id]),
      ],
    },
    ...bays.map(({ disk, position }) => ({
      id: disk.id,
      label: disk.slot + " · " + position,
      members: [disk.id, backplane],
    })),
    ...[
      { id: "backplane-plug", label: "背板端", owner: backplane },
      { id: "controller-plug", label: "控制卡端", owner: controllerId },
    ].flatMap(({ id, label, owner }) => [
      { id, label: "SAS · " + label, members: [harness, owner] },
      {
        id: id + "-tongue",
        label: label + " · 插舌与壳口",
        members: [harness],
        actions: { seated: "抽出插舌", separated: "推回壳口" },
      },
      {
        id: id + "-bridge",
        label: label + " · 承片与导柱",
        members: [owner],
        actions: { seated: "抬起承片", separated: "放回导柱" },
      },
    ]),
    {
      id: mountStation,
      label: "控制卡 · 主板安装位",
      actions: { seated: "抬起控制卡", separated: "落回主板" },
      members: [controllerId, boardId],
    },
  ];
}
export const compactStorageStations = storageStations(
  compactDriveBays,
  backplane,
  harness,
  controllerId,
  boardId,
  "mount",
);
const server = modelById("server-2u");
const rear = server.storageHarness!;
const children = subpartsForModel(server);
const verticalBays = children
  .filter((p) => p.parent === "storage-01")
  .map((tray) => {
    const number = tray.slot.slice(4);
    const disk = children.find(
      (p) => p.parent === "drives-01" && p.slot === "SSD-" + number,
    )!;
    return { tray, disk, position: "柜前第 " + Number(number) + " 槽" };
  });
export const verticalStorageStations = storageStations(
  verticalBays,
  rear.backplane,
  rear.harness,
  rear.controller,
  server.rtcMount!.boardId,
  "card-seat",
);
export const compactPathModules = new Set([
  backplane,
  harness,
  controllerId,
  boardId,
  compactDriveBays[0].tray.parent,
  compactDriveBays[0].disk.parent,
]);
