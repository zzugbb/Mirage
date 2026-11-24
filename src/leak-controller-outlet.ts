import { Vector3 } from "three";
import { leakController, leakDetection } from "./leak-detection.ts";

export const leakControllerOutlet = leakDetection.controllerOutlet;
export const leakControllerOutletDirection = new Vector3(1, 0.35, 0.52);

/** 装配基准取引线登记起点。壳内短段仅供辨认穿孔关系。 */
export function leakControllerOutletPlacement() {
  const origin = new Vector3().fromArray(leakDetection.leadPoints[0]);
  const inward = origin
    .clone()
    .sub(new Vector3().fromArray(leakDetection.leadPoints[1]))
    .normalize();
  const innerEnd = origin
    .clone()
    .addScaledVector(inward, leakControllerOutlet.innerLeadLength);
  return { origin, inward, innerEnd };
}

export function leakControllerOutletObservation(opened: boolean) {
  const { controllerId, cableId, controllerSize } = leakDetection;
  const { bottomThickness, guideHeight } = leakControllerOutlet;
  const { origin, inward } = leakControllerOutletPlacement();
  const [x, y, z] = leakController.position;
  const cover = new Vector3(x + controllerSize[0] / 2, y - 0.082, z - 0.048);
  const plate = new Vector3(
    x + controllerSize[0] / 2,
    origin.y + bottomThickness / 2,
    z + 0.044,
  );
  const guide = origin
    .clone()
    .add(new Vector3(0.005, bottomThickness + guideHeight * 0.66, 0.009));
  const lead = origin.clone().addScaledVector(inward, -0.024);
  const markers = [
    opened
      ? {
          id: "leak-outlet-guide",
          title: "孔内导向环",
          point: guide,
          objectId: controllerId,
        }
      : {
          id: "leak-outlet-cover",
          title: "控制器盖板",
          point: cover,
          objectId: controllerId,
        },
    {
      id: "leak-outlet-plate",
      title: "固定底板",
      point: plate,
      objectId: controllerId,
    },
    {
      id: "leak-outlet-sleeve",
      title: opened ? "外部引线" : "线首护套",
      point: lead,
      objectId: opened ? cableId : controllerId,
    },
  ];
  const ruler = origin
    .clone()
    .add(new Vector3(controllerSize[0] / 2 - (origin.x - x) + 0.013, 0, 0.024));
  const measure = [
    ruler,
    ruler.clone().addScaledVector(inward, bottomThickness),
  ];
  const tick = new Vector3(0, 0, 0.006);
  const guides = [
    measure,
    ...measure.map((end) => [end.clone().sub(tick), end.clone().add(tick)]),
  ];
  const paths = [[origin, origin.clone().addScaledVector(inward, -0.055)]];
  const points = [
    cover,
    plate,
    guide,
    lead,
    ...paths.flat(),
    ...guides.flat(),
    origin.clone().add(new Vector3(0.028, 0.065, 0.035)),
  ];
  return { points, paths, guides, markers };
}
