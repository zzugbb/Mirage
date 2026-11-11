import { Vector3 } from "three";
import {
  entranceSettings as s,
  entranceFixture,
  entranceLeaf,
  entranceOpening,
} from "./entrance.ts";
import { fixtureById } from "./fixtures.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

export const entranceViews = [
  { id: "all", label: "入口全貌" },
  { id: "opening", label: "洞口尺寸" },
  { id: "access", label: "读卡器与把手" },
] as const;
export type EntranceView = (typeof entranceViews)[number]["id"];
export type EntranceViewCommand = {
  revision: number;
  view: EntranceView | null;
};
export const entranceViewIncludes = (id: string) =>
  [s.fixtureId, s.readerId].includes(id);

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
export function entranceInspection(view: EntranceView) {
  const opening = entranceOpening;
  const z = entranceFixture.position[2] + s.frameDepth / 2 + 0.025;
  const corner = (x: number, y: number) => new Vector3(x, y, z);
  const reader = new Vector3().fromArray(fixtureById(s.readerId)!.position);
  reader.z += 0.065;
  const handle = entranceHandlePoint();
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
                ? `读卡器中心 ${fixtureById(s.readerId)!.position[1].toFixed(2)} m`
                : "② 读卡器",
            point: reader,
          },
          {
            id: "entrance-handle",
            title:
              view === "access"
                ? `把手轴 ${handle.y.toFixed(2)} m`
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
    readerHeight: fixtureById(s.readerId)!.position[1],
    handleHeight: handle.y,
    openingBottom: opening.bottom,
  };
}
export type EntranceInspection = ReturnType<typeof entranceInspection>;
export function entranceViewFrame(
  inspection: EntranceInspection,
  width: number,
  height: number,
  rect: FrameRect,
) {
  return observationFrame(
    inspection.points,
    new Vector3(0.3, 0.12, 1),
    width,
    height,
    rect,
    inspection.view === "access" ? 2.4 : 4.2,
    0.15,
  );
}
