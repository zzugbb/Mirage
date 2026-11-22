import { Box3, type Object3D, Vector3 } from "three";

export type LayerPose = "seated" | "separated";

interface MovingLayer {
  node: string;
  offset: [number, number, number];
  direction: [number, number, number];
}

// 同一部件可按实际几何分支近看。姿态作用于完整活动件，取景只包含可见分支。
interface LayerScope {
  layerRoot: Object3D;
  // 核对内托上的板件时，内托在两种板件姿态下均保持抽出。
  extractedCarrier?: Object3D;
  moving: Object3D;
  members: Object3D[];
  selectedBranch?: Object3D;
  selectionPadding?: number;
}
const scopes = new WeakMap<Object3D, Map<string, LayerScope>>();
export function registerLayerScope(
  root: Object3D,
  id: string,
  scope: LayerScope,
) {
  let entries = scopes.get(root);
  if (!entries) {
    entries = new Map();
    scopes.set(root, entries);
  }
  entries.set(id, scope);
}
export function layerScopeFor(root?: Object3D, id?: string) {
  return root && id ? scopes.get(root)?.get(id) : undefined;
}
export function scopeBounds(bounds: Box3, scope: LayerScope) {
  bounds.makeEmpty();
  for (const item of scope.members) {
    item.updateWorldMatrix(true, false);
    bounds.expandByObject(item);
  }
  return bounds;
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
  visibleMoving?: Object3D,
) {
  const moving = root.getObjectByName(layer.node);
  if (!moving?.parent) return;
  const end = moving.parent.localToWorld(new Vector3().fromArray(layer.offset));
  const delta = end.sub(moving.getWorldPosition(new Vector3()));
  bounds.union(
    new Box3().setFromObject(visibleMoving ?? moving).translate(delta),
  );
}
