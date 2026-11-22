import { Box3, type Object3D, Vector3 } from "three";

export type LayerPose = "seated" | "separated";

interface MovingLayer {
  node: string;
  offset: [number, number, number];
  direction: [number, number, number];
}

// 两种姿态均从零位计算，切换或重入时不会累加间距。
export function registerLayer(root: Object3D, layer: MovingLayer) {
  root.userData.assemblyLayer = layer;
}

export function assemblyLayer(root?: Object3D): MovingLayer | undefined {
  return root?.userData.assemblyLayer;
}

export function poseAssemblyLayer(root: Object3D, separated: boolean) {
  const layer = assemblyLayer(root);
  if (!layer) return;
  const moving = root.getObjectByName(layer.node);
  if (moving) {
    if (separated) moving.position.fromArray(layer.offset);
    else moving.position.set(0, 0, 0);
  }
}

// 落座时也把活动件的分离终点计入镜头，位移沿其父节点的局部坐标计算。
export function includeSeparatedLayer(
  bounds: Box3,
  root: Object3D,
  layer: MovingLayer,
) {
  const moving = root.getObjectByName(layer.node);
  if (!moving?.parent) return;
  const end = moving.parent.localToWorld(new Vector3().fromArray(layer.offset));
  const delta = end.sub(moving.getWorldPosition(new Vector3()));
  bounds.union(new Box3().setFromObject(moving).translate(delta));
}
