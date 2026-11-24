import {
  entranceCabinetPlacement,
  entranceCabinetSweep,
  entranceCabinet,
} from "./entrance-cabinet.ts";
import { Vector3 } from "three";
import {
  entranceSettings as s,
  entranceFixture,
  entranceLeaf,
  entranceOpening,
  emergencyLight,
  exitSign,
} from "./entrance.ts";
import { fixtureById } from "./fixtures.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";
import { emergencyHeadInspection } from "./emergency-light.ts";
import {
  entranceHingeFrame,
  entranceHingeInspection,
} from "./entrance-hinges.ts";
import {
  entranceFrameSectionInspection,
  entranceFrameSectionViewFrame,
} from "./entrance-frame-section.ts";

export const entranceViews = [
  { id: "all", label: "入口全貌" },
  { id: "cabinet", label: "门扇与配电柜" },
  { id: "sweep", label: "门扇扫掠与配电柜" },
  { id: "hinges", label: "门轴与铰链" },
  { id: "opening", label: "洞口尺寸" },
  { id: "section", label: "框内截面" },
  { id: "access", label: "读卡器与把手" },
  { id: "lintel", label: "出口标志与门楣" },
  { id: "lights", label: "标志与应急灯" },
  { id: "heads", label: "应急灯头朝向" },
  { id: "jamb", label: "读卡器与洞口侧缘" },
] as const;
export type EntranceView = (typeof entranceViews)[number]["id"];
export type EntranceViewCommand = {
  revision: number;
  view: EntranceView | null;
  sample?: number;
};
export const entranceViewIncludes = (id: string, view?: EntranceView) =>
  view === "heads"
    ? id === emergencyLight.id
    : view === "hinges" || view === "section"
      ? id === s.fixtureId
      : view === "sweep"
        ? id === s.fixtureId || id === entranceCabinet.id
        : (view === "cabinet" && id === entranceCabinet.id) ||
          [s.fixtureId, s.readerId, exitSign.id, emergencyLight.id].includes(
            id,
          );

/** 把手轴沿用门扇局部坐标与静态展示角；高度为机房坐标，不是从洞口底部重算的安装规范。 */
export function entranceHandlePoint() {
  return new Vector3(
    entranceLeaf.width - s.handleInset,
    s.handleHeight - s.openingHeight / 2,
    s.handleStandOff,
  )
    .applyAxisAngle(new Vector3(0, 1, 0), s.displayAngle)
    .add(new Vector3(entranceLeaf.pivotX, 0, entranceLeaf.pivotZ))
    .add(new Vector3().fromArray(entranceFixture.position));
}
export function entranceInspection(view: EntranceView, sample?: number) {
  const opening = entranceOpening;
  const z = entranceFixture.position[2] + s.frameDepth / 2 + 0.025;
  const corner = (x: number, y: number) => new Vector3(x, y, z);
  const reader = new Vector3().fromArray(fixtureById(s.readerId)!.position);
  reader.z += 0.065;
  const handle = entranceHandlePoint();
  const heights = {
    readerHeight: reader.y,
    handleHeight: handle.y,
    openingBottom: opening.bottom,
  };
  if (view === "cabinet") {
    const { displayed, closed, hinge, footprint, paths, markers, points } =
      entranceCabinetPlacement();
    return {
      view,
      jamb: null,
      cabinet: { displayed, closed, hinge, footprint },
      paths,
      markers,
      points,
      ...heights,
    };
  }
  if (view === "sweep") {
    return { view, jamb: null, ...entranceCabinetSweep(sample), ...heights };
  }
  if (view === "heads") {
    return { view, jamb: null, ...emergencyHeadInspection(), ...heights };
  }
  if (view === "hinges") {
    return { view, jamb: null, ...entranceHingeInspection(sample), ...heights };
  }
  if (view === "section") {
    return {
      view,
      jamb: null,
      ...entranceFrameSectionInspection(sample),
      ...heights,
    };
  }
  if (view === "lintel" || view === "lights") {
    const sign = new Vector3().fromArray(exitSign.position);
    const lamp = new Vector3().fromArray(emergencyLight.position);
    const [w, h, d] = s.lighting.signSize;
    const [lw, lh, ld] = s.lighting.lampBodySize;
    const bottom = sign.y - h / 2;
    const signFront = sign.z + d / 2 + 0.001;
    const lintel = view === "lintel";
    const measure = lintel ? bottom - opening.top : Math.abs(lamp.x - sign.x);
    const dimZ = Math.max(z, signFront, lamp.z + ld / 2) + 0.015;
    const lineY =
      Math.max(
        sign.y + h / 2,
        lamp.y + lh / 2 + s.lighting.headRise + s.lighting.headRadius,
      ) + 0.065;
    const dimX = sign.x - w / 2 - 0.06;
    const line = lintel
      ? [opening.top, bottom].map((y) => new Vector3(dimX, y, dimZ))
      : [sign.x, lamp.x].map((x) => new Vector3(x, lineY, dimZ));
    const tick = lintel ? new Vector3(0.029, 0, 0) : new Vector3(0, 0.029, 0);
    const markers = lintel
      ? [
          {
            id: "entrance-sign",
            title: exitSign.name,
            point: new Vector3(sign.x + w * 0.4, bottom + 0.008, signFront),
          },
          {
            id: "entrance-head",
            title: "门框上缘",
            point: corner(sign.x, opening.top - 0.008),
          },
        ]
      : [
          {
            id: "entrance-sign",
            title: exitSign.name,
            point: new Vector3(sign.x + w * 0.44, sign.y, signFront),
          },
          {
            id: "entrance-light",
            title: emergencyLight.name,
            point: new Vector3(lamp.x, lamp.y, lamp.z + ld / 2 + 0.001),
          },
        ];
    const paths = [
      line,
      ...line.map((p) => [p.clone().sub(tick), p.clone().add(tick)]),
    ];
    const points = [
      ...paths.flat(),
      ...markers.map((m) => m.point),
      new Vector3(sign.x - w / 2, bottom, signFront),
      new Vector3(sign.x + w / 2, sign.y + h / 2, signFront),
      ...(lintel
        ? [
            corner(opening.left, opening.top - 0.2),
            corner(opening.right, opening.top),
          ]
        : [
            new Vector3(lamp.x + lw / 2, lamp.y - lh / 2, lamp.z + ld / 2),
            new Vector3(lamp.x - lw / 2, lineY, lamp.z),
          ]),
    ];
    return { view, jamb: null, measure, paths, markers, points, ...heights };
  }
  if (view === "jamb") {
    const left = reader.x <= entranceFixture.position[0];
    const x = left ? opening.left : opening.right;
    const jamb = { side: left ? "左" : "右", distance: Math.abs(reader.x - x) };
    // 尺寸线在两者前方的同一平面，仅量机房 X 方向的投影差。
    const depth = Math.max(reader.z, z);
    const lineY = reader.y + 0.18;
    const dimension = [reader.x, x].map((px) => new Vector3(px, lineY, depth));
    const paths = [
      dimension,
      ...dimension.map((p) => [
        p.clone().setY(lineY - 0.04),
        p.clone().setY(lineY + 0.04),
      ]),
    ];
    const markers = [
      { id: "entrance-reader", title: "读卡器中心", point: reader },
      {
        id: "entrance-jamb",
        title: `洞口${jamb.side}缘 · ${jamb.distance.toFixed(3)} m`,
        point: corner(x, reader.y),
      },
    ];
    return {
      view,
      jamb,
      paths,
      markers,
      points: [...paths.flat(), ...markers.map((m) => m.point)],
      ...heights,
    };
  }
  const outline = [
    corner(opening.left, opening.bottom),
    corner(opening.left, opening.top),
    corner(opening.right, opening.top),
    corner(opening.right, opening.bottom),
    corner(opening.left, opening.bottom),
  ];
  const widthLine = [
    corner(opening.left, opening.top + 0.14),
    corner(opening.right, opening.top + 0.14),
  ];
  const heightLine = [
    corner(opening.right + 0.12, opening.bottom),
    corner(opening.right + 0.12, opening.top),
  ];
  const heightPath = (p: Vector3) => [new Vector3(p.x, 0, p.z), p.clone()];
  // 相邻布置只用各自的高度参考线，不画成门锁接线或信号流向。
  const paths =
    view === "access"
      ? [heightPath(reader), heightPath(handle)]
      : view === "all"
        ? [outline]
        : [
            outline,
            widthLine,
            heightLine,
            ...[opening.left, opening.right].map((x) => [
              corner(x, opening.top + 0.1),
              corner(x, opening.top + 0.18),
            ]),
            ...[opening.bottom, opening.top].map((y) => [
              corner(opening.right + 0.08, y),
              corner(opening.right + 0.16, y),
            ]),
          ];
  const markers =
    view === "opening"
      ? [
          {
            id: "entrance-opening",
            title: `洞口 ${s.openingWidth.toFixed(2)} × ${s.openingHeight.toFixed(2)} m`,
            point: corner((opening.left + opening.right) / 2, opening.top),
          },
        ]
      : [
          ...(view === "all"
            ? [
                {
                  id: "entrance-opening",
                  title: "① 入口门",
                  point: corner(opening.right, opening.top),
                },
              ]
            : []),
          {
            id: "entrance-reader",
            title:
              view === "access"
                ? `读卡器中心 ${reader.y.toFixed(3)} m`
                : "② 读卡器",
            point: reader,
          },
          {
            id: "entrance-handle",
            title:
              view === "access"
                ? `把手轴 ${handle.y.toFixed(3)} m`
                : "③ 把手轴",
            point: handle,
          },
        ];
  const leafEnd = new Vector3(entranceLeaf.width, 0, 0)
    .applyAxisAngle(new Vector3(0, 1, 0), s.displayAngle)
    .add(new Vector3(entranceLeaf.pivotX, 0, entranceLeaf.pivotZ))
    .add(new Vector3().fromArray(entranceFixture.position));
  const points = [
    ...paths.flat(),
    ...markers.map((m) => m.point),
    ...(view !== "access"
      ? [
          leafEnd.clone().setY(opening.top),
          leafEnd.clone().setY(opening.bottom),
        ]
      : []),
  ];
  return {
    view,
    paths,
    points,
    markers,
    jamb: null,
    ...heights,
  };
}
export type EntranceInspection = ReturnType<typeof entranceInspection>;
export type SweepInspection = Extract<EntranceInspection, { view: "sweep" }>;
export function entranceViewFrame(
  inspection: EntranceInspection,
  width: number,
  height: number,
  rect: FrameRect,
) {
  if (inspection.view === "hinges")
    return entranceHingeFrame(inspection, width, height, rect);
  if (inspection.view === "section")
    return entranceFrameSectionViewFrame(inspection, width, height, rect);
  if (inspection.view === "heads")
    return observationFrame(
      inspection.points,
      new Vector3(0, 0.31, 1),
      width,
      height,
      rect,
      0.78,
      0.052,
    );
  return observationFrame(
    inspection.points,
    inspection.view === "cabinet" || inspection.view === "sweep"
      ? new Vector3(0.03, 1, 0.22)
      : inspection.jamb || "measure" in inspection
        ? new Vector3(0, 0.05, 1)
        : new Vector3(0.3, 0.12, 1),
    width,
    height,
    rect,
    inspection.view === "sweep"
      ? 3.6
      : inspection.jamb || "measure" in inspection
        ? 1.6
        : inspection.view === "access"
          ? 2.4
          : 4.2,
    0.15,
  );
}
