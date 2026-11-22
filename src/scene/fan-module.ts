import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };

/** 原创静态风扇配置示意；开口与叶轮用于表达装配，不推断真实叶型或性能。 */
export function createFanModule(size: number[], separableRotor = false) {
  const [w, h, d] = size;
  const s = definition.fanModule;
  const inspection = definition.switchAssembly.fanRotor;
  const wall = Math.min(w, h) * s.wallRatio;
  const radius = Math.min(w, h) * s.openingRadiusRatio;
  const hubRadius = Math.min(w, h) * s.hubRadiusRatio;
  const thickness = h * s.rotorThicknessRatio;
  const root = new THREE.Group();
  root.name = "fan-module";
  const materials = [s.frameColor, s.rotorColor, s.hardwareColor].map(
    (color, i) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: i === 0 ? 0.7 : 0.5,
        metalness: i === 0 ? 0.15 : 0.45,
      }),
  );
  const mesh = (
    name: string,
    geometry: THREE.BufferGeometry,
    position: number[],
    material = 0,
    parent = root,
  ) => {
    const object = new THREE.Mesh(geometry, materials[material]);
    object.name = name;
    object.position.fromArray(position);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const box = (
    name: string,
    size: number[],
    position: number[],
    material = 0,
  ) => {
    const object = mesh(name, cube, position, material);
    object.scale.fromArray(size);
    return object;
  };
  // 四壁与两端带孔框板保留真实空隙，不再用整块实体封住风扇。
  for (const side of [-1, 1]) {
    box("fan-side", [wall, h, d], [(side * (w - wall)) / 2, 0, 0]);
    box("fan-side", [w - wall * 2, wall, d], [0, (side * (h - wall)) / 2, 0]);
  }
  const face = new THREE.Shape();
  face.moveTo(-w / 2 + wall, -h / 2 + wall);
  face.lineTo(w / 2 - wall, -h / 2 + wall);
  face.lineTo(w / 2 - wall, h / 2 - wall);
  face.lineTo(-w / 2 + wall, h / 2 - wall);
  face.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, radius, 0, Math.PI * 2, true);
  face.holes.push(hole);
  const plate = new THREE.ExtrudeGeometry(face, {
    depth: wall,
    bevelEnabled: false,
    curveSegments: 32,
    steps: 1,
  });
  mesh("fan-front-frame", plate, [0, 0, d / 2 - wall]);
  const rearFaceZ = -d / 2 + (separableRotor ? wall * 2.1 : 0);
  mesh("fan-rear-frame", plate, [0, 0, rearFaceZ]);
  if (separableRotor) {
    const screw = new THREE.CylinderGeometry(
      wall * 0.64,
      wall * 0.76,
      wall * 0.3,
      12,
    );
    for (const side of [-1, 1])
      for (const end of [-1, 1])
        mesh(
          "fan-frame-fastener",
          screw,
          [
            side * (w / 2 - wall * 3),
            end * (h / 2 - wall * 2),
            rearFaceZ - wall * 0.15,
          ],
          2,
        ).rotation.x = Math.PI / 2;
  }

  // 叶轮靠近后侧开口，静止呈现；所有细节保持在原模块包围范围内。
  const rotorZ =
    -d * (separableRotor ? inspection.rearDepthRatio : s.rotorRearRatio);
  const rotor = separableRotor ? new THREE.Group() : root;
  if (separableRotor) {
    rotor.name = "fan-rotor";
    root.add(rotor);
  }
  const shaftRadius = hubRadius * 0.38;
  // 轮毂背面留盲孔，沿机后方向抽离固定轴头。外端封闭，叶片与轮毂同轴。
  const hubGeometry = separableRotor
    ? new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, -thickness),
          new THREE.Vector2(hubRadius * 0.92, -thickness),
          new THREE.Vector2(hubRadius, -thickness * 0.85),
          new THREE.Vector2(hubRadius, thickness),
          new THREE.Vector2(shaftRadius * 1.12, thickness),
          new THREE.Vector2(shaftRadius * 1.12, -thickness * 0.4),
          new THREE.Vector2(0, -thickness * 0.4),
        ],
        32,
      )
    : new THREE.CylinderGeometry(hubRadius, hubRadius, thickness * 2, 24);
  const hub = mesh("fan-hub", hubGeometry, [0, 0, rotorZ], 1, rotor);
  hub.rotation.x = Math.PI / 2;
  const blade = new THREE.Shape();
  blade.moveTo(hubRadius * 0.75, -radius * 0.12);
  blade.quadraticCurveTo(
    radius * 0.65,
    -radius * 0.34,
    radius * 0.94,
    -radius * 0.13,
  );
  blade.quadraticCurveTo(
    radius * 0.96,
    radius * 0.04,
    radius * 0.5,
    radius * 0.25,
  );
  blade.lineTo(hubRadius * 0.75, radius * 0.1);
  blade.closePath();
  const bladeGeometry = new THREE.ExtrudeGeometry(blade, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 8,
    steps: 1,
  });
  // 叶片由根部到外缘逐渐偏转，保留轴向厚度；仅为可读的静态叶型。
  const vertices = bladeGeometry.getAttribute("position");
  for (let i = 0; i < vertices.count; i++)
    vertices.setZ(
      i,
      vertices.getZ(i) -
        (vertices.getY(i) * s.bladeTwist * vertices.getX(i)) / radius,
    );
  // 按同一弯曲变换修正法线，保留框边硬度并避免面内三角明暗块。
  const normals = bladeGeometry.getAttribute("normal");
  const normal = new THREE.Vector3();
  for (let i = 0; i < normals.count; i++) {
    const nz = normals.getZ(i);
    normal
      .set(
        normals.getX(i) + ((s.bladeTwist * vertices.getY(i)) / radius) * nz,
        normals.getY(i) + ((s.bladeTwist * vertices.getX(i)) / radius) * nz,
        nz,
      )
      .normalize();
    normals.setXYZ(i, normal.x, normal.y, normal.z);
  }
  for (let i = 0; i < s.bladeCount; i++) {
    const vane = mesh(
      "fan-blade",
      bladeGeometry,
      [0, 0, rotorZ - thickness / 2],
      1,
      rotor,
    );
    vane.rotation.z = (i * Math.PI * 2) / s.bladeCount;
  }
  const supportZ = rotorZ + thickness * 2;
  const motorRadius = hubRadius * (separableRotor ? 1 : 0.8);
  const motor = mesh(
    "fan-motor",
    new THREE.CylinderGeometry(motorRadius, motorRadius, thickness * 2, 24),
    [0, 0, supportZ],
    separableRotor ? 1 : 0,
  );
  motor.rotation.x = Math.PI / 2;
  if (separableRotor) {
    const pin = mesh(
      "fan-shaft",
      new THREE.CylinderGeometry(
        shaftRadius,
        shaftRadius,
        thickness * 1.25,
        24,
      ),
      [0, 0, rotorZ + thickness * 0.375],
      2,
    );
    pin.material = materials[2].clone();
    pin.material.color.set(inspection.shaftColor);
    pin.rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const reach = separableRotor
      ? Math.min(
          (w / 2 - wall / 2) / Math.abs(Math.sin(angle)),
          (h / 2 - wall / 2) / Math.abs(Math.cos(angle)),
        )
      : radius;
    const support = box(
      "fan-support",
      [h * s.supportWidthRatio, reach, thickness],
      [(-Math.sin(angle) * reach) / 2, (Math.cos(angle) * reach) / 2, supportZ],
      separableRotor ? 2 : 0,
    );
    support.rotation.z = angle;
  }
  // 拉取环位于框体侧边，不横跨风道，不引入额外可操作部件。
  const handleX = w / 2 - wall * 2.5;
  const handleZ = -d / 2 + wall * 0.65;
  for (const side of [-1, 1])
    box(
      "fan-handle-foot",
      [wall, h * 0.035, wall * 2],
      [handleX, side * h * 0.2, handleZ + wall],
      2,
    );
  box("fan-handle", [wall, h * 0.435, wall], [handleX, 0, handleZ], 2);
  return root;
}
