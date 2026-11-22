import * as THREE from "three";

export function localMeshBounds(target: THREE.Object3D, reference = target) {
  target.updateWorldMatrix(true, true);
  reference.updateWorldMatrix(true, false);
  const local = reference.matrixWorld.clone().invert();
  const matrix = new THREE.Matrix4();
  const bounds = new THREE.Box3();
  target.traverse((mesh) => {
    if (!(mesh instanceof THREE.Mesh)) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    bounds.union(
      mesh.geometry.boundingBox
        .clone()
        .applyMatrix4(matrix.multiplyMatrices(local, mesh.matrixWorld)),
    );
  });
  return bounds;
}
