import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { partsForDevice, modelForDevice } from "./catalog.ts";
import {
  deviceHeight,
  installedFrontZ,
  rackForDevice,
} from "./installation.ts";
import {
  networkEndpoints,
  networkSettings,
  supportsNetworkPatch,
  type NetworkLink,
} from "./network.ts";
import type { AppState } from "./domain.ts";
import type { ModelLoadState } from "./model-loading.ts";
import { Vector3 } from "three";

export const patchSettings = networkSettings.patchIllustration;

export const sideGuides = patchSettings.sideGuides;
export type PatchGuide = "lower" | "upper";
export function isPatchGuide(view: string | null): view is PatchGuide {
  return view === "lower" || view === "upper";
}

export function patchGuideCenter(guide: PatchGuide) {
  return new Vector3(
    (sideGuides.innerEdgeX + sideGuides.wallX) / 2,
    definition.rack.unitOrigin +
      sideGuides[guide].unit * definition.rack.unitPitch,
    sideGuides.centerZ,
  );
}

// 相邻观察段共用同一折点。尺寸取自当前分支的示意中心线。
export const patchSections = {
  rear: { label: "柜后引出", start: 0, end: 2, axis: "x", measure: "柜后横移" },
  side: { label: "柜侧上行", start: 2, end: 4, axis: "y", measure: "柜侧上升" },
  front: {
    label: "柜前接入",
    start: 4,
    end: 9,
    axis: "x",
    measure: "柜前横移",
  },
} as const;
export type PatchSection = keyof typeof patchSections;
export function patchSectionOffsetMm(points: Vector3[], section: PatchSection) {
  const { start, end, axis } = patchSections[section];
  // 同一柜内偏移换到另一柜的世界坐标后，去除相减产生的浮点尾差。
  return (
    Math.round(Math.abs(points[end][axis] - points[start][axis]) * 1_000_000) /
    1_000
  );
}

export function canShowNetworkPatch(state: AppState, link?: NetworkLink) {
  return (
    !!link &&
    state.level === "rack" &&
    !state.trayExtended &&
    supportsNetworkPatch(link) &&
    rackForDevice(link.source).id === rackForDevice(state.deviceId).id
  );
}

/** 端点身份、部件和安装高度来自同一条逻辑接入。折点只是有避让余量的柜侧示意。 */
export function networkPatch(
  state: AppState,
  link: NetworkLink,
  assets: ModelLoadState,
) {
  if (!canShowNetworkPatch(state, link)) return null;
  const [source, target] = networkEndpoints(link.id);
  const controller = partsForDevice(source.deviceId).find(
    (part) => part.id === source.partId,
  )!;
  const front = installedFrontZ;
  const depth = modelForDevice(source.deviceId).depth;
  const rear = front - depth;
  const rack = new Vector3(...rackForDevice(source.deviceId).position);
  const point = (x: number, y: number, z: number) =>
    new Vector3(x, y, z).add(rack);
  const exterior = assets["storage-4u"] === "ready";
  const mountedStructure = state.deviceId === source.deviceId && !exterior;
  const storageY = deviceHeight(source.deviceId);
  const exitY =
    storageY +
    (exterior ? patchSettings.exteriorInterfaceY : controller.position[1]);
  // 外观只有后面板的公共接口区，按配置部件的左右顺序放置代表点。
  const sx = exterior
    ? (Math.sign(controller.position[0]) *
        patchSettings.exteriorInterfaceWidth) /
      2
    : controller.position[0];
  const sz = mountedStructure
    ? front -
      depth / 2 +
      controller.position[2] -
      controller.size[2] / 2 -
      0.006
    : rear - (exterior ? 0 : patchSettings.controllerPanelDepth);
  const ty = deviceHeight(target.deviceId);
  // 安装简模的端口凸出面板；详细外观和活动安装结构的端口组基本齐平。
  const tz =
    front +
    (assets["switch-1u"] === "ready" || state.deviceId === target.deviceId
      ? 0.002
      : 0.024);
  const { sideX, postBypassX, accessBankX, rearClearance, frontClearance } =
    patchSettings;
  const rz = rear - rearClearance,
    fz = front + frontClearance;
  const above = ty + definition.rack.unitPitch * 0.66;
  return [
    point(sx, exitY, sz),
    point(sx, exitY, rz),
    point(sideX, exitY, rz),
    point(sideX, above, rz),
    point(sideX, above, front - 0.13),
    point(postBypassX, above, front - 0.1),
    point(postBypassX, above, fz),
    point(accessBankX, above, fz),
    point(accessBankX, ty, fz),
    point(accessBankX, ty, tz),
  ];
}
