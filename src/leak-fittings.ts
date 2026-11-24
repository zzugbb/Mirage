import { Vector3 } from "three";
import {
  leakControllerOutletDirection,
  leakControllerOutletObservation,
} from "./leak-controller-outlet.ts";
import {
  configuredPathLength,
  leakController,
  leakDetection,
} from "./leak-detection.ts";

const { leadPoints, sensingPoints, controllerId, cableId, fittings } =
  leakDetection;

export const leakFittingChoices = [
  { id: "controller", label: "控制器线首" },
  { id: "joint", label: "引线与感应线接头" },
  { id: "end", label: "末端封接" },
] as const;

export type LeakFittingId = (typeof leakFittingChoices)[number]["id"];
export const leakFittingShells = {
  controller: "leak-controller-sleeve",
  joint: "leak-coupling",
  end: "leak-termination",
} satisfies Record<LeakFittingId, string>;

/** 装配与观察共用线路端点和样板尺寸。管壳造型只用于辨认局部结构。 */
export function leakFitting(
  id: LeakFittingId,
  opened = false,
  inspectOutlet = false,
) {
  const { label } = leakFittingChoices.find((choice) => choice.id === id)!;
  const outlet = id === "controller" && inspectOutlet;
  const { length, diameter } = fittings[id];
  const { wallThickness, endPlugLength } = fittings;
  const point = new Vector3().fromArray(
    id === "controller"
      ? leadPoints[0]
      : id === "joint"
        ? sensingPoints[0]
        : sensingPoints.at(-1)!,
  );
  const neighbor = new Vector3().fromArray(
    id === "controller"
      ? leadPoints[1]
      : id === "joint"
        ? sensingPoints[1]
        : sensingPoints.at(-2)!,
  );
  const axis = neighbor.clone().sub(point).normalize();
  if (id === "end") axis.negate();
  const center = point.clone();
  if (id === "controller") center.addScaledVector(axis, length / 2);
  const fittingDirection =
    id === "controller"
      ? new Vector3(0.73, 0.21, 1)
      : id === "joint"
        ? new Vector3(0.08, 1, 0.92)
        : new Vector3(0.08, 1, -0.88);
  const radial = fittingDirection
    .clone()
    .addScaledVector(axis, -fittingDirection.dot(axis))
    .normalize();
  const leadLength = configuredPathLength(leadPoints);
  const station =
    id === "controller"
      ? 0
      : id === "joint"
        ? leadLength
        : leadLength + configuredPathLength(sensingPoints);
  const plug =
    id === "end"
      ? {
          center: center
            .clone()
            .addScaledVector(axis, length / 2 - endPlugLength / 2 - 0.001),
          length: endPlugLength,
          radius: diameter / 2 - wallThickness,
        }
      : null;
  return {
    id,
    opened,
    outlet,
    label,
    station,
    length,
    diameter,
    wallThickness,
    leadDiameter: id === "end" ? null : leakDetection.leadRadius * 2,
    sensingDiameter:
      id === "controller" ? null : leakDetection.sensingRadius * 2,
    objectId: id === "controller" ? controllerId : cableId,
    point,
    neighbor,
    axis,
    center,
    direction: outlet ? leakControllerOutletDirection : fittingDirection,
    radial,
    plug,
  };
}

export type LeakFitting = ReturnType<typeof leakFitting>;

export function leakFittingObservation(fitting: LeakFitting) {
  if (fitting.outlet) return leakControllerOutletObservation(fitting.opened);
  const { id, opened, center, axis, radial, diameter, length, objectId } =
    fitting;
  const half = length / 2;
  const leadIn = new Vector3().fromArray(
    id === "joint" ? leadPoints.at(-2)! : fitting.neighbor.toArray(),
  );
  const cableReference = fitting.point
    .clone()
    .lerp(leadIn, 0.084 / fitting.point.distanceTo(leadIn));
  const controllerFace = new Vector3().fromArray(leakController.position);
  controllerFace.x += leakDetection.controllerSize[0] / 2;
  controllerFace.y -= 0.082;
  controllerFace.z -= 0.048;
  const surface =
    opened && fitting.plug
      ? fitting.plug.center
      : center.clone().addScaledVector(axis, id === "joint" ? 0.009 : 0);
  const reference = id === "controller" ? controllerFace : cableReference;
  const markers = [
    {
      id: "leak-fitting-housing",
      title: opened
        ? id === "controller"
          ? "护套内引线"
          : id === "joint"
            ? "接头内感应线"
            : "末端封塞"
        : id === "controller"
          ? "线首护套"
          : id === "joint"
            ? "接头外壳"
            : "末端外壳",
      point: surface,
      objectId: opened ? cableId : objectId,
    },
    {
      id: "leak-fitting-reference",
      title:
        id === "controller" ? "控制器壳体" : id === "joint" ? "引线" : "感应线",
      point: reference,
      objectId,
    },
  ];
  const guideSide = axis.clone().cross(radial);
  const measure = center.clone().addScaledVector(guideSide, diameter * 1.23);
  const endA = measure.clone().addScaledVector(axis, -half);
  const endB = measure.clone().addScaledVector(axis, half);
  const tick = guideSide.clone().multiplyScalar(diameter * 0.21);
  const guides = [
    [endA, endB],
    [endA.clone().sub(tick), endA.clone().add(tick)],
    [endB.clone().sub(tick), endB.clone().add(tick)],
  ];
  const paths =
    id === "joint"
      ? [
          [
            cableReference,
            fitting.point,
            fitting.point.clone().addScaledVector(axis, 0.07),
          ],
        ]
      : [[fitting.point, cableReference]];
  const points = [
    ...paths.flat(),
    reference,
    surface,
    ...guides.flat(),
    center.clone().addScaledVector(axis, half),
    center.clone().addScaledVector(axis, -half),
  ];
  return { paths, points, markers, guides };
}
