import type { Object3D } from "three";

export type LayerPose = "seated" | "separated";

interface MovingLayer {
  node: string;
  lift: number;
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
  if (moving) moving.position.y = separated ? layer.lift : 0;
}
