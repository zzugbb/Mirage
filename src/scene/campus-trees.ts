import * as THREE from "three";

const trees = [
  [-26.7, -14.1, 4.75, 1.48, -0.21, 0.23, 12],
  [-24.3, -8.6, 3.85, 1.33, 0.28, 0.14, 10],
  [-26.1, -2.1, 4.95, 1.79, -0.16, -0.29, 15],
  [-24.6, 4.2, 4.17, 1.32, 0.26, -0.17, 11],
  [-26.5, 9.3, 4.46, 1.69, -0.27, 0.13, 14],
] as const;

const leafTones = ["#526d3b", "#5d7142", "#637d44", "#71834a", "#455d35"].map(
  (color) => new THREE.Color(color),
);

// 叶片有中脊和折面，几何尺寸在近景仍以米为单位。
const leafShape = [
  [0, 0, -0.48],
  [-0.43, -0.12, -0.13],
  [-0.5, -0.1, 0.11],
  [0, -0.06, 0.54],
  [0.5, -0.1, 0.1],
  [0.39, -0.13, -0.14],
  [0, 0, 0.03],
] as const;

export function createCampusTrees(barkMap: THREE.Texture) {
  const grove = new THREE.Group();
  const barkColors = ["#5a5342", "#675e4e", "#776a57", "#635a4b"].map(
    (color) => new THREE.Color(color),
  );
  const bark = new THREE.MeshStandardMaterial({ map: barkMap, roughness: 1 });
  const trunkBark = new THREE.MeshStandardMaterial({
    color: "#6a6050",
    map: barkMap,
    roughness: 1,
  });
  const branchShape = new THREE.CylinderGeometry(0.55, 1, 1, 7);
  const foliage = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.94,
  });
  const up = new THREE.Vector3(0, 1, 0);
  const direction = new THREE.Vector3();
  const frame = new THREE.Object3D();
  const leafVertex = new THREE.Vector3();
  const leafColor = new THREE.Color();

  for (const [
    treeIndex,
    [x, z, height, spread, leanX, leanZ, limbs],
  ] of trees.entries()) {
    let seed = 84391 + treeIndex * 1579;
    const range = (min: number, max: number) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return min + ((max - min) * seed) / 2 ** 32;
    };
    const tree = new THREE.Group();
    tree.position.set(x, -0.035, z);
    const wood: { matrix: THREE.Matrix4; color: THREE.Color }[] = [];
    const positions: number[] = [];
    const colors: number[] = [];
    const faces: number[] = [];
    const trunkAt = (level: number) =>
      new THREE.Vector3(
        leanX * level ** 1.3,
        height * level,
        leanZ * level ** 2,
      );
    // 树脚向覆土略微外张，沿一根连续树干收细。
    const profile = [
      [-0.012, 0.047],
      [0.014, 0.037],
      [0.065, 0.028],
      [0.2, 0.027],
      [0.35, 0.021],
      [0.54, 0.014],
      [0.74, 0.008],
      [0.88, 0.004],
      [0.95, 0],
    ];
    const trunkShape = new THREE.LatheGeometry(
      profile.map(
        ([level, radius]) => new THREE.Vector2(height * radius, height * level),
      ),
      12,
    );
    const trunkVertices = trunkShape.getAttribute("position");
    for (let i = 0; i < trunkVertices.count; i++) {
      const at = Math.max(0, trunkVertices.getY(i) / height);
      const { x, z } = trunkAt(at);
      trunkVertices.setX(i, trunkVertices.getX(i) + x);
      trunkVertices.setZ(i, trunkVertices.getZ(i) + z);
    }
    trunkShape.computeVertexNormals();
    tree.add(new THREE.Mesh(trunkShape, trunkBark));
    const branch = (from: THREE.Vector3, to: THREE.Vector3, radius: number) => {
      direction.subVectors(to, from);
      const length = direction.length();
      frame.position.copy(from).lerp(to, 0.5);
      frame.scale.set(radius, length, radius);
      frame.quaternion.setFromUnitVectors(up, direction.normalize());
      frame.updateMatrix();
      wood.push({
        matrix: frame.matrix.clone(),
        color: barkColors[Math.floor(range(0, barkColors.length))],
      });
    };
    const spray = (from: THREE.Vector3, to: THREE.Vector3, width: number) => {
      for (let i = 0; i < 34; i++) {
        const along = range(0.14, 1.12);
        const radius = width * Math.sin((along / 1.15) * Math.PI);
        const angle = range(0, 2 * Math.PI);
        const offset = range(0.09, 1) ** 0.55;
        frame.position.copy(from).lerp(to, along);
        frame.position.x += Math.cos(angle) * radius * offset;
        frame.position.y += range(-0.67, 0.6) * radius;
        frame.position.z += Math.sin(angle) * radius * offset;
        const length = range(0.096, 0.238);
        frame.scale.set(length * range(0.45, 0.69), length * 0.57, length);
        frame.rotation.set(range(-0.98, 0.98), angle, range(-0.88, 0.88));
        frame.updateMatrix();
        leafColor.copy(leafTones[Math.floor(range(0, leafTones.length))]);
        leafColor.multiplyScalar(range(0.78, 1.12));
        const base = positions.length / 3;
        for (const [index, [u, y, v]] of leafShape.entries()) {
          leafVertex.set(u, y, v).applyMatrix4(frame.matrix);
          positions.push(leafVertex.x, leafVertex.y, leafVertex.z);
          const shade = index === 6 ? 1.12 : index === 0 ? 0.79 : 0.96;
          colors.push(
            leafColor.r * shade,
            leafColor.g * shade,
            leafColor.b * shade,
          );
        }
        for (let edge = 0; edge < 6; edge++)
          faces.push(base + edge, base + ((edge + 1) % 6), base + 6);
      }
    };

    for (let limb = 0; limb < limbs; limb++) {
      const tier = limb / (limbs - 1);
      const level = 0.32 + tier * 0.47 + range(-0.021, 0.018);
      const angle = treeIndex * 1.12 + limb * 2.4 + range(-0.32, 0.32);
      const reach = spread * (1 - tier * 0.62) * range(0.77, 1.12);
      const from = trunkAt(level);
      const elbow = new THREE.Vector3(
        from.x + Math.cos(angle - 0.24) * reach * 0.49,
        from.y + height * range(0.066, 0.107),
        from.z + Math.sin(angle - 0.24) * reach * 0.49,
      );
      const tip = new THREE.Vector3(
        from.x + Math.cos(angle) * reach,
        from.y + height * (0.211 - tier * 0.083),
        from.z + Math.sin(angle) * reach,
      );
      const radius = (0.064 - tier * 0.04) * range(0.8, 1.17);
      branch(from, elbow, radius);
      branch(elbow, tip, radius * 0.57);
      for (let shoot = 0; shoot < 9; shoot++) {
        const start = elbow.clone().lerp(tip, (shoot + 0.2) / 9);
        const twigAngle = angle + (shoot % 2 ? 1 : -1) * range(0.46, 1.76);
        const twigReach = range(0.17, 0.49) * (1 - tier * 0.33);
        const end = new THREE.Vector3(
          start.x + Math.cos(twigAngle) * twigReach,
          start.y + range(0.07, 0.38),
          start.z + Math.sin(twigAngle) * twigReach,
        );
        branch(start, end, radius * 0.17);
        spray(start, end, range(0.22, 0.46) * (1 - tier * 0.25));
      }
    }

    const branches = new THREE.InstancedMesh(branchShape, bark, wood.length);
    for (const [index, { matrix, color }] of wood.entries()) {
      branches.setMatrixAt(index, matrix);
      branches.setColorAt(index, color);
    }
    const leafGeometry = new THREE.BufferGeometry();
    leafGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    leafGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3),
    );
    leafGeometry.setIndex(faces);
    leafGeometry.computeVertexNormals();
    leafGeometry.computeBoundingBox();
    const crown = new THREE.Mesh(leafGeometry, foliage);
    tree.add(branches, crown);
    grove.add(tree);
  }
  return grove;
}
