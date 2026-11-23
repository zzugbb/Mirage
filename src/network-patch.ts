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
export type PatchGuide = keyof typeof sideGuides.positions;
export const patchGuideKeys = Object.keys(sideGuides.positions) as PatchGuide[];
export function isPatchGuide(view: string | null): view is PatchGuide {
  return view !== null && Object.hasOwn(sideGuides.positions, view);
}

export function patchGuideCenter(guide: PatchGuide) {
  return new Vector3(
    (sideGuides.innerEdgeX + sideGuides.wallX) / 2,
    definition.rack.unitOrigin +
      sideGuides.positions[guide].unit * definition.rack.unitPitch,
    sideGuides.centerZ,
  );
}

/** 仅提供当前分支直线穿过的环口。圆弧过渡和金属边缘不算穿环。 */
export function guidesOnPatch(points: Vector3[], sourceId: string) {
  const rack = rackForDevice(sourceId);
  if (!sideGuides.rackIds.includes(rack.id)) return [];
  const [rx, ry, rz] = rack.position;
  const span = patchSectionRange(points.length, "side");
  const start = points[span.start],
    end = points[span.start + 1];
  const radius = patchSettings.cableRadius;
  const x = start.x - rx,
    z = start.z - rz;
  if (
    x - radius <= sideGuides.innerEdgeX + sideGuides.stock ||
    x + radius >= sideGuides.wallX - sideGuides.stock ||
    Math.abs(z - sideGuides.centerZ) + radius >= sideGuides.openingDepth / 2
  )
    return [];
  return patchGuideKeys.filter((key) => {
    const y = patchGuideCenter(key).y + ry;
    const margin = patchSettings.bendRadius + sideGuides.stock;
    return start.y + margin < y && y < end.y - margin;
  });
}

// 相邻观察段共用同一折点。尺寸取自当前分支的示意中心线。
export const patchSections = {
  rear: { label: "柜后引出", axis: "x", measure: "柜后横移" },
  side: { label: "柜侧上行", axis: "y", measure: "柜侧上升" },
  front: {
    label: "柜前接入",
    axis: "x",
    measure: "柜前横移",
  },
} as const;
export type PatchSection = keyof typeof patchSections;
/** 从侧壁上行起，余下八个折点共用；服务器在此之前多一段贴侧壁的转向。 */
export function patchSectionRange(pointCount: number, section: PatchSection) {
  const side = pointCount - 8,
    front = side + 2;
  if (section === "rear") return { start: 0, end: side };
  if (section === "side") return { start: side, end: front };
  return { start: front, end: pointCount - 1 };
}
export function patchSectionOffsetMm(points: Vector3[], section: PatchSection) {
  const { start, end } = patchSectionRange(points.length, section);
  const { axis } = patchSections[section];
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

function storagePatchOrigin(
  state: AppState,
  source: ReturnType<typeof networkEndpoints>[number],
  assets: ModelLoadState,
) {
  const controller = partsForDevice(source.deviceId).find(
    (part) => part.id === source.partId,
  )!;
  const depth = modelForDevice(source.deviceId).depth;
  const front = installedFrontZ,
    rear = front - depth;
  const exterior = assets["storage-4u"] === "ready";
  const mountedStructure = state.deviceId === source.deviceId && !exterior;
  const y =
    deviceHeight(source.deviceId) +
    (exterior ? patchSettings.exteriorInterfaceY : controller.position[1]);
  // 外观只有后面板的公共接口区，按配置部件的左右顺序放置代表点。
  const x = exterior
    ? (Math.sign(controller.position[0]) *
        patchSettings.exteriorInterfaceWidth) /
      2
    : controller.position[0];
  const z = mountedStructure
    ? front -
      depth / 2 +
      controller.position[2] -
      controller.size[2] / 2 -
      0.006
    : rear - (exterior ? 0 : patchSettings.controllerPanelDepth);
  return new Vector3(x, y, z);
}

/** 端点身份、部件和安装高度来自同一条逻辑接入。折点只是有避让余量的柜侧示意。 */
export function networkPatch(
  state: AppState,
  link: NetworkLink,
  assets: ModelLoadState,
) {
  if (!canShowNetworkPatch(state, link)) return null;
  const [source, target] = networkEndpoints(link.id);
  const model = modelForDevice(source.deviceId);
  const front = installedFrontZ,
    rear = front - model.depth;
  const rack = new Vector3(...rackForDevice(source.deviceId).position);
  const point = (x: number, y: number, z: number) =>
    new Vector3(x, y, z).add(rack);
  const server = model.category === "server";
  let origin;
  if (server) {
    const panel = model.rearPanels.find(
      (p) =>
        p.kind === "interface" && "partId" in p && p.partId === source.partId,
    );
    if (
      !panel ||
      !("mountedFaceZ" in panel) ||
      typeof panel.mountedFaceZ !== "number"
    )
      return null;
    // 其他安装位始终使用统一背板；当前设备使用其装配上的网卡后缘。
    const proxy = definition.installationProxy.rear;
    const face =
      "detailedFaceZ" in panel &&
      typeof panel.detailedFaceZ === "number" &&
      assets[model.id as keyof ModelLoadState] === "ready"
        ? panel.detailedFaceZ
        : panel.mountedFaceZ;
    const z =
      state.deviceId === source.deviceId
        ? front - model.depth / 2 + face
        : rear - proxy.panelDepth * 2 - proxy.detailDepth;
    origin = new Vector3(
      panel.center[0],
      deviceHeight(source.deviceId) + panel.center[1],
      z,
    );
  } else {
    origin = storagePatchOrigin(state, source, assets);
  }
  const { x: sx, y: exitY, z: sz } = origin;
  const ty = deviceHeight(target.deviceId);
  // 安装简模的端口凸出面板；详细外观和活动安装结构的端口组基本齐平。
  const tz =
    front +
    (assets["switch-1u"] === "ready" || state.deviceId === target.deviceId
      ? 0.002
      : 0.024);
  const { sideX, postBypassX, accessBankX, rearClearance, frontClearance } =
    patchSettings;
  const rz = (server ? Math.min(sz, rear) : rear) - rearClearance,
    fz = front + frontClearance;
  const above = ty + definition.rack.unitPitch * 0.66;
  return [
    point(sx, exitY, sz),
    point(sx, exitY, rz),
    point(sideX, exitY, rz),
    ...(server ? [point(sideX, exitY, sideGuides.centerZ)] : []),
    point(sideX, above, server ? sideGuides.centerZ : rz),
    point(sideX, above, front - 0.13),
    point(postBypassX, above, front - 0.1),
    point(postBypassX, above, fz),
    point(accessBankX, above, fz),
    point(accessBankX, ty, fz),
    point(accessBankX, ty, tz),
  ];
}
