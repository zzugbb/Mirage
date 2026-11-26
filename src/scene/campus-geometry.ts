import * as THREE from "three";
import {
  campusBuildingEntrance,
  campusChildren,
  campusFloorPlan,
  campusSitePlan,
  type CampusNode,
  type SpacePoint,
} from "../campus-layout";
import { createCampusTrees } from "./campus-trees";

function box(
  parent: THREE.Group,
  size: SpacePoint,
  position: SpacePoint,
  color: string,
  finish?: Pick<
    THREE.MeshStandardMaterialParameters,
    "roughness" | "metalness" | "map"
  >,
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...finish }),
  );
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function contactMaterial(rounded = false) {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = Math.abs((2 * x + 1) / size - 1);
      const v = Math.abs((2 * y + 1) / size - 1);
      const edge = rounded ? Math.hypot(u, v) : Math.max(u, v);
      pixels[(y * size + x) * 4 + 3] = Math.round(
        (1 - THREE.MathUtils.smoothstep(edge, rounded ? 0.21 : 0.71, 1)) * 255,
      );
    }
  }
  const map = new THREE.DataTexture(pixels, size, size);
  map.magFilter = map.minFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  return new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    opacity: rounded ? 0.4 : 0.54,
    depthWrite: false,
  });
}

function contactShadow(
  parent: THREE.Group,
  material: THREE.MeshBasicMaterial,
  width: number,
  depth: number,
  position: SpacePoint,
) {
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    material,
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(...position);
  parent.add(shadow);
}

function outline(mesh: THREE.Mesh<THREE.BoxGeometry>, color: string) {
  const lines = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color }),
  );
  mesh.add(lines);
  return lines;
}

function surfaceTexture(
  shade: (
    u: number,
    v: number,
    grain: number,
  ) => [number, number, number, number],
  width = 128,
  height = 128,
) {
  const pixels = new Uint8Array(width * height * 4);
  let seed = 193;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      pixels.set(
        shade((x + 0.5) / width, (y + 0.5) / height, seed / 2 ** 32),
        (y * width + x) * 4,
      );
    }
  const map = new THREE.DataTexture(pixels, width, height);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}

function concreteSurface(u: number, v: number, grain: number) {
  return (
    226 +
    Math.sin(u * 29 + Math.sin(v * 17) * 2) *
      Math.sin(v * 31 + Math.sin(u * 18)) *
      9 +
    (grain - 0.5) * 22
  );
}

function exteriorGlass() {
  return {
    roughness: 0.29,
    metalness: 0.08,
    map: surfaceTexture((u, v) => {
      const sky = THREE.MathUtils.smoothstep(v + 0.105 * u, 0.08, 0.94);
      const horizon =
        1 - THREE.MathUtils.smoothstep(Math.abs(v + 0.09 * u - 0.4), 0, 0.21);
      const light = 134 + sky * 92 + horizon * 13;
      return [light - 13, light - 4, light + 10, 255];
    }),
  };
}

function facade(
  target: THREE.Group,
  width: number,
  height: number,
  depth: number,
  bands: number,
) {
  const metal = { roughness: 0.48, metalness: 0.16 };
  const coatedMetal = {
    roughness: 0.68,
    metalness: 0.06,
    map: surfaceTexture((u, v, grain) => {
      const rain = 2.4 * Math.sin(u * 48 + Math.cos(v * 5)) * v ** 1.6;
      const light = 246 - 12 * (1 - v) ** 7 + rain + (grain - 0.5) * 7;
      return [light, light, light, 255];
    }),
  };
  const foundation = {
    roughness: 0.94,
    map: surfaceTexture((u, v, grain) => {
      const light = concreteSurface(u, v, grain) - 35 * (1 - v) ** 4;
      return [light, light, light, 255];
    }),
  };
  const roofing = {
    roughness: 0.94,
    map: surfaceTexture(
      (u, v, grain) => {
        const sheet = u * 12 + 0.3;
        const lap = sheet % 1;
        const crossLap = (v * 4.7 + (Math.floor(sheet) % 2) * 0.46) % 1;
        const seam = 1 - THREE.MathUtils.smoothstep(lap, 0.015, 0.049);
        const endSeam = 1 - THREE.MathUtils.smoothstep(crossLap, 0.008, 0.024);
        const edge = Math.min(u, 1 - u, v, 1 - v);
        const perimeter = 1 - THREE.MathUtils.smoothstep(edge, 0.012, 0.038);
        const weathering =
          8 * Math.sin(u * 19 + v * 14) * Math.cos(v * 12 - u * 7);
        const light =
          235 -
          seam * 20 -
          endSeam * 14 -
          perimeter * 17 +
          weathering +
          (grain - 0.5) * 14;
        return [light, light, light, 255];
      },
      512,
      384,
    ),
  };
  const glass = exteriorGlass();
  box(
    target,
    [width - 0.42, height - 0.32, depth - 0.42],
    [0, (height - 0.32) / 2, 0],
    "#4d5d66",
  );
  box(
    target,
    [width - 0.22, 0.18, depth - 0.22],
    [0, height - 0.325, 0],
    "#61737d",
  );
  const roofLevel = height - 0.145;
  box(
    target,
    [width - 0.18, 0.1, depth - 0.18],
    [0, roofLevel - 0.05, 0],
    "#5b6060",
    roofing,
  );
  for (const [index, x] of [-9, 3, 9].entries()) {
    const z = -4;
    const top = roofLevel + 0.66 + (index === 1 ? 0.13 : 0);
    box(target, [4.64, 0.037, 2.48], [x, roofLevel + 0.012, z], "#424a48");
    box(target, [4.37, 0.142, 2.26], [x, roofLevel + 0.083, z], "#747972");
    const bodyBottom = roofLevel + 0.154;
    box(
      target,
      [4.19, top - bodyBottom, 2.08],
      [x, (bodyBottom + top) / 2, z],
      "#798581",
    );
    box(target, [4.29, 0.06, 2.18], [x, top + 0.03, z], "#929c96", metal);
    for (const side of [-1, 1]) {
      box(
        target,
        [1.54, 0.29, 0.035],
        [x - 0.79, (top + bodyBottom) / 2, z + side * 1.051],
        "#394748",
      );
      box(
        target,
        [1.42, 0.31, 0.027],
        [x + 0.88, (top + bodyBottom) / 2, z + side * 1.052],
        "#646f6c",
        metal,
      );
      for (let louver = -2; louver <= 2; louver++)
        box(
          target,
          [1.42, 0.02, 0.027],
          [x - 0.79, (top + bodyBottom) / 2 + louver * 0.045, z + side * 1.073],
          "#89948b",
        );
    }
  }
  box(
    target,
    [width + 0.106, 0.57, depth + 0.106],
    [0, 0.285, 0],
    "#a39c8d",
    foundation,
  );
  box(target, [width + 0.11, 0.043, depth + 0.11], [0, 0.592, 0], "#616764");
  const wallMargin = {
    roughness: 0.98,
    map: surfaceTexture((u, v, grain) => {
      const light = 221 + (grain - 0.5) * 39 + 4 * Math.sin(u * 22 - v * 18);
      return [light, light, light, 255];
    }),
  };
  wallMargin.map.wrapS = wallMargin.map.wrapT = THREE.RepeatWrapping;
  for (const side of [-1, 1])
    siteSurface(
      target,
      { center: [0, side * (depth / 2 + 0.22)], width, depth: 0.52 },
      "#777568",
      -0.022,
      wallMargin,
    );
  siteSurface(
    target,
    { center: [width / 2 + 0.24, 0], width: 0.48, depth: depth + 0.96 },
    "#777568",
    -0.022,
    wallMargin,
  );
  const elevations = [
    { x: 0, z: depth / 2, yaw: 0, span: width, glazing: true },
    { x: width / 2, z: 0, yaw: Math.PI / 2, span: depth, glazing: false },
    { x: 0, z: -depth / 2, yaw: Math.PI, span: width, glazing: false },
    { x: -width / 2, z: 0, yaw: -Math.PI / 2, span: depth, glazing: true },
  ];
  const cladding = ["#b0b0a6", "#aaa99f", "#b0aea1", "#acafa6"];
  const floorHeight = height / bands;
  const sillThickness = 0.043;
  for (const { x, z, yaw, span, glazing } of elevations) {
    const face = new THREE.Group();
    face.position.set(x, 0, z);
    face.rotation.y = yaw;
    target.add(face);

    // 转角的短边收进长边内缘，压顶面连续拼接。
    box(
      face,
      [x === 0 ? span + 0.05 : span - 0.21, 0.365, 0.13],
      [0, height + 0.0275, -0.04],
      "#7b8584",
    );
    box(
      face,
      [x === 0 ? span + 0.17 : span - 0.27, 0.072, 0.22],
      [0, height + 0.246, -0.025],
      "#9daba9",
      metal,
    );
    const bays = Math.ceil(span / 4.2);
    const bayWidth = (span - 0.14) / bays;
    for (let story = 0; story < bands; story++) {
      const bottom = story ? story * floorHeight + 0.07 : 0.635;
      const top = (story + 1) * floorHeight - 0.09;
      const sill = story * floorHeight + floorHeight * 0.65;
      const head = sill + floorHeight * 0.15;
      const courses = glazing
        ? [
            [bottom, sill - sillThickness],
            [head, top],
          ]
        : [[bottom, top]];
      for (let bay = 0; bay < bays; bay++) {
        const center = (bay + 0.5) * bayWidth - (span - 0.14) / 2;
        for (const [base, cap] of courses)
          box(
            face,
            [bayWidth - 0.037, cap - base, 0.233],
            [center, (base + cap) / 2, -0.111],
            cladding[(bay + story) % cladding.length],
            coatedMetal,
          );
        if (glazing) {
          const windowY = (sill + head) / 2;
          const opening = bayWidth - 0.07;
          box(
            face,
            [opening, head - sill, 0.035],
            [center, windowY, -0.175],
            "#3d484b",
          );
          box(
            face,
            [opening - 0.03, 0.061, 0.128],
            [center, head - 0.0305, -0.081],
            "#788584",
            metal,
          );
          const paneWidth = (opening - 0.14) / 3;
          for (const pane of [-1, 0, 1]) {
            box(
              face,
              [paneWidth - 0.041, head - sill - 0.086, 0.014],
              [center + pane * paneWidth, windowY - 0.014, -0.143],
              (bay + pane) % 3 ? "#5b6d71" : "#62767b",
              glass,
            );
          }
          for (const mullion of [-1.5, -0.5, 0.5, 1.5])
            box(
              face,
              [0.043, head - sill - 0.052, 0.089],
              [center + mullion * paneWidth, windowY - 0.026, -0.113],
              "#647575",
              metal,
            );
        }
      }
      if (glazing)
        box(
          face,
          [span - 0.15, sillThickness, 0.186],
          [0, sill - sillThickness / 2, -0.054],
          "#87918d",
          metal,
        );
      if (story)
        box(
          face,
          [span - 0.17, 0.067, 0.113],
          [0, bottom - 0.062, -0.073],
          "#838b85",
          metal,
        );
    }
  }
  for (const x of [-width / 2 + 0.055, width / 2 - 0.055])
    for (const z of [-depth / 2 + 0.055, depth / 2 - 0.055])
      box(
        target,
        [0.14, height - 0.72, 0.14],
        [x, (height + 0.54) / 2, z],
        "#939f9f",
        metal,
      );
}

type CampusLabelObstacle =
  THREE.Mesh | { frame: THREE.Group; bounds: THREE.Box3 };

function buildingEntrance(
  building: THREE.Group,
  { point, width }: { point: SpacePoint; width: number },
  facadeSpan: number,
  roadDistance: number,
  labelObstacles: CampusLabelObstacle[],
) {
  const portal = new THREE.Group();
  portal.position.set(...point);
  portal.rotation.y = -Math.PI / 2;
  building.add(portal);
  const metal = { roughness: 0.47, metalness: 0.21 };
  const doorHeight = 2.62;
  const frameWidth = width + 0.42;
  const canopyWidth = frameWidth + 0.55;
  const canopyDepth = roadDistance * 0.82;
  const canopyDeck = canopyDepth - 0.043;
  const glass = exteriorGlass();
  labelObstacles.push(
    box(
      portal,
      [width + 0.16, doorHeight + 0.16, 0.11],
      [0, (doorHeight + 0.16) / 2, 0.045],
      "#273a43",
    ),
    box(
      portal,
      [canopyWidth, 0.16, canopyDeck],
      [0, doorHeight + 0.23, canopyDeck / 2],
      "#586a72",
      metal,
    ),
  );
  labelObstacles.push(
    box(
      portal,
      [canopyWidth + 0.04, 0.062, 0.075],
      [0, doorHeight + 0.303, canopyDepth - 0.0375],
      "#a8b7bb",
      metal,
    ),
  );
  box(
    portal,
    [frameWidth - 0.18, 0.03, canopyDepth * 0.74],
    [0, doorHeight + 0.136, canopyDepth * 0.46],
    "#758b91",
  );
  for (const side of [-1, 1]) {
    const leafX = side * width * 0.25;
    const leafWidth = width / 2 - 0.053;
    const head = doorHeight - 0.105;
    const kick = 0.6;
    box(
      portal,
      [0.16, doorHeight, 0.15],
      [side * (width / 2 + 0.082), doorHeight / 2, 0.114],
      "#98a9ac",
      metal,
    );
    box(
      portal,
      [leafWidth, doorHeight - 0.105, 0.055],
      [leafX, doorHeight / 2 + 0.0275, 0.131],
      "#475a60",
      metal,
    );
    box(
      portal,
      [leafWidth - 0.119, head - kick, 0.014],
      [leafX, (head + kick) / 2, 0.164],
      "#667d82",
      glass,
    );
    box(
      portal,
      [leafWidth - 0.072, 0.46, 0.018],
      [leafX, 0.342, 0.164],
      "#627272",
      metal,
    );
    for (const offset of [-0.178, 0.178])
      box(
        portal,
        [0.041, 0.042, 0.056],
        [side * 0.125, 1.16 + offset, 0.18],
        "#889795",
        metal,
      );
    box(
      portal,
      [0.028, 0.42, 0.032],
      [side * 0.125, 1.16, 0.215],
      "#a8b6b0",
      metal,
    );
    box(
      portal,
      [0.052, 0.073, canopyDeck - 0.08],
      [
        side * (canopyWidth / 2 - 0.028),
        doorHeight + 0.148,
        0.037 + (canopyDeck - 0.08) / 2,
      ],
      "#687773",
      metal,
    );
  }
  box(
    portal,
    [0.052, doorHeight, 0.055],
    [0, doorHeight / 2, 0.133],
    "#6e8080",
  );
  labelObstacles.push(
    box(
      portal,
      [frameWidth, 0.085, 0.15],
      [0, doorHeight + 0.085 / 2, 0.114],
      "#98a9ac",
      metal,
    ),
  );

  const concrete = {
    roughness: 0.92,
    map: surfaceTexture((u, v, grain) => {
      const light = concreteSurface(u, v, grain);
      return [light, light, light, 255];
    }),
  };
  const roadJoint = 0.022;
  const slope = 0.046 / roadDistance;
  const pavingHeight = (z: number) => 0.002 + (roadDistance - z) * slope;
  const slab = (
    x: number,
    span: number,
    start: number,
    end: number,
    color: string,
    lift = 0,
  ) => {
    const center = (start + end) / 2;
    const thickness = 0.089;
    const paving = box(
      portal,
      [span, thickness, end - start],
      [x, pavingHeight(center) + lift - thickness / 2, center],
      color,
      concrete,
    );
    const vertices = paving.geometry.getAttribute("position");
    for (let i = 0; i < vertices.count; i++)
      vertices.setY(i, vertices.getY(i) - vertices.getZ(i) * slope);
    paving.geometry.computeVertexNormals();
    return paving;
  };

  // 门槛和两侧铺地采用同一坡面，在道路边留出接缝。
  const edging = 0.38;
  const pavingEdge = width / 2 + edging;
  const edgeDepth = 0.12;
  const pavingEnd = roadDistance - roadJoint;
  const curbBack = pavingEnd - edgeDepth;
  // 慢坡在入口处平接，旁侧路缘的外角向车道收斜。
  const curbSection = new THREE.Shape()
    .moveTo(curbBack, -0.064)
    .lineTo(pavingEnd, -0.064)
    .lineTo(pavingEnd, pavingHeight(pavingEnd) + 0.01)
    .lineTo(pavingEnd - 0.026, pavingHeight(curbBack) + 0.035)
    .lineTo(curbBack, pavingHeight(curbBack) + 0.035)
    .closePath();
  const curbMaterial = new THREE.MeshStandardMaterial({
    color: "#929286",
    roughness: 0.91,
  });
  for (const [start, end] of [
    [-facadeSpan / 2 - point[2], -pavingEdge],
    [pavingEdge, facadeSpan / 2 - point[2]],
  ]) {
    const span = end - start;
    if (span <= 0) continue;
    const slabs = Math.ceil(span / 2.8);
    const pitch = span / slabs;
    for (let i = 0; i < slabs; i++) {
      const sectionEnd = start + (i + 1) * pitch;
      slab(
        start + (i + 0.5) * pitch,
        pitch - Math.min(0.024, pitch * 0.06),
        0,
        curbBack,
        i % 3 ? "#898779" : "#8c897b",
      );
      const curb = new THREE.Mesh(
        new THREE.ExtrudeGeometry(curbSection, {
          depth: pitch - 0.014,
          bevelEnabled: false,
        }),
        curbMaterial,
      );
      curb.position.x = sectionEnd - 0.007;
      curb.rotation.y = -Math.PI / 2;
      portal.add(curb);
    }
  }
  slab(-point[2], facadeSpan, pavingEnd, roadDistance, "#4b504e");
  const access = slab(0, width, 0, pavingEnd, "#aaa797");
  // 控制缝留在同一铺面材质上，远景不靠叠放薄面表达。
  access.material.map = surfaceTexture((u, v, grain) => {
    const across = Math.min(Math.abs(u - 1 / 3), Math.abs(u - 2 / 3));
    const along = Math.abs(v - 0.43);
    const joint =
      1 - THREE.MathUtils.smoothstep(Math.min(across, along), 0.003, 0.009);
    const light = concreteSurface(u, v, grain) - joint * 44;
    return [light, light, light, 255];
  });
  labelObstacles.push(access);
  for (const side of [-1, 1]) {
    const curb = slab(
      (side * (width + edging)) / 2,
      edging,
      0,
      pavingEnd,
      "#aba798",
      0.007,
    );
    labelObstacles.push(curb);
  }
  slab(0, width, 0, 0.175, "#96988b", 0.009);

  const angle = Math.atan(slope);
  const shadeDepth = Math.min(roadDistance, 0.73);
  const wallShade = new THREE.Mesh(
    new THREE.PlaneGeometry(facadeSpan - 0.04, shadeDepth / Math.cos(angle)),
    new THREE.MeshBasicMaterial({
      map: surfaceTexture((_u, v) => [43, 38, 34, v ** 2.45 * 255]),
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    }),
  );
  wallShade.rotation.x = -Math.PI / 2 + angle;
  wallShade.position.set(
    -point[2],
    pavingHeight(shadeDepth / 2) + 0.015,
    shadeDepth / 2,
  );
  portal.add(wallShade);
  return access;
}

function siteSurface(
  plan: THREE.Group,
  {
    center,
    width,
    depth,
  }: {
    center: readonly [number, number];
    width: number;
    depth: number;
  },
  color: string,
  y = -0.013,
  finish?: Pick<THREE.MeshStandardMaterialParameters, "roughness" | "map">,
  thickness = 0.026,
) {
  const surface = box(
    plan,
    [width, thickness, depth],
    [center[0], y, center[1]],
    color,
    finish,
  );
  if (finish?.map) surfaceUV(surface, width, depth);
  return surface;
}

function surfaceUV(mesh: THREE.Mesh, width: number, depth: number) {
  const uv = mesh.geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, (uv.getX(i) * width) / 8, (uv.getY(i) * depth) / 8);
}

function pavementPaint(
  parent: THREE.Group,
  center: SpacePoint,
  width: number,
  depth: number,
  material: THREE.MeshStandardMaterial,
) {
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(...center);
  parent.add(mark);
}

function siteLandscape(plan: THREE.Group) {
  const bark = surfaceTexture(
    (u, v, grain) => {
      const ridges =
        Math.sin(u * 22 * Math.PI + 0.8 * Math.sin(v * 7 + u * 4 * Math.PI)) *
          12 +
        Math.sin(u * 42 * Math.PI - v * 1.9) * 6;
      const light = 224 + ridges + (grain - 0.5) * 12;
      return [light, light, light, 255];
    },
    64,
    128,
  );
  const trees = createCampusTrees(bark);
  plan.add(trees);
  const roots = trees.children.map(({ position }) => [position.x, position.z]);
  const covers = [
    { x: -25.8, z: -3.4, width: 9.3, depth: 31, aroundTrees: true },
    { x: 25.9, z: -13.2, width: 10.8, depth: 14.9, aroundTrees: false },
    { x: 0, z: 21.44, width: 63.4, depth: 2.82, aroundTrees: false },
  ];
  const samples = (meters: number) => 2 ** Math.ceil(Math.log2(meters * 8));
  for (const { x, z, width, depth, aroundTrees } of covers) {
    const map = surfaceTexture(
      (u, v, grain) => {
        const px = x + (u - 0.5) * width;
        const pz = z + (0.5 - v) * depth;
        const patches =
          Math.sin(px * 0.76 + 1.7 * Math.sin(pz * 0.45)) *
          Math.sin(pz * 0.91 + Math.cos(px * 0.53));
        const grainPattern =
          Math.sin(px * 8.8 + pz * 6.4) * Math.sin(pz * 7.2 - px * 5.1);
        const groundVariation =
          patches * 6 + grainPattern * 3 + (grain - 0.5) * 20;
        const border = Math.min(
          u * width,
          (1 - u) * width,
          v * depth,
          (1 - v) * depth,
        );
        const edge = THREE.MathUtils.smoothstep(
          border + patches * 0.13,
          0.04,
          aroundTrees ? 0.73 : 0.48,
        );
        let mulch = 0;
        if (aroundTrees) {
          const rootDistance = Math.min(
            ...roots.map(([rx, rz]) => Math.hypot(px - rx, pz - rz)),
          );
          mulch =
            1 -
            THREE.MathUtils.smoothstep(
              rootDistance + patches * 0.13,
              0.34,
              0.85,
            );
        }
        return [
          79 + mulch * 19 + groundVariation,
          92 - mulch * 10 + groundVariation,
          63 + mulch * 2 + groundVariation,
          edge * 255,
        ];
      },
      samples(width),
      samples(depth),
    );
    const verge = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshStandardMaterial({
        map,
        roughness: 1,
        transparent: true,
        depthWrite: false,
      }),
    );
    verge.rotation.x = -Math.PI / 2;
    verge.position.set(x, -0.031, z);
    verge.receiveShadow = true;
    plan.add(verge);
  }

  const rootsShadow = contactMaterial(true);
  for (const tree of trees.children) {
    contactShadow(plan, rootsShadow, 1.55, 1.25, [
      tree.position.x + 0.17,
      -0.025,
      tree.position.z + 0.14,
    ]);
  }
}

function serviceCurb(
  plan: THREE.Group,
  roadEdge: number,
  side: number,
  start: number,
  end: number,
  material: THREE.MeshStandardMaterial,
) {
  const section = new THREE.Shape()
    .moveTo(0, -0.065)
    .lineTo(0.154, -0.065)
    .lineTo(0.154, 0.091)
    .lineTo(0.035, 0.091)
    .lineTo(0, 0.061)
    .closePath();
  const taper = Math.min(0.62, (end - start) / 3);
  const fullStart = start + taper;
  const fullEnd = end - taper;
  const blocks = Math.ceil((fullEnd - fullStart) / 2.4);
  const edges = [
    start,
    ...Array.from({ length: blocks + 1 }, (_, i) =>
      THREE.MathUtils.lerp(fullStart, fullEnd, i / blocks),
    ),
    end,
  ];
  const height = (z: number) =>
    THREE.MathUtils.lerp(0.44, 1, Math.min(z - start, end - z, taper) / taper);
  for (let i = 1; i < edges.length; i++) {
    const gap = Math.min(0.012, (edges[i] - edges[i - 1]) * 0.1);
    const from = edges[i - 1] + gap / 2;
    const to = edges[i] - gap / 2;
    const geometry = new THREE.ExtrudeGeometry(section, {
      depth: to - from,
      bevelEnabled: false,
    });
    const vertices = geometry.getAttribute("position");
    for (let j = 0; j < vertices.count; j++)
      vertices.setY(
        j,
        -0.065 + (vertices.getY(j) + 0.065) * height(from + vertices.getZ(j)),
      );
    geometry.computeVertexNormals();
    const curb = new THREE.Mesh(geometry, material);
    curb.scale.x = side;
    curb.position.set(roadEdge + side * 0.007, 0, from);
    plan.add(curb);
  }
}

function siteRoads(
  plan: THREE.Group,
  {
    mainRoad,
    serviceRoad,
    zones,
  }: NonNullable<ReturnType<typeof campusSitePlan>>,
) {
  // 两段道路共享连续的沥青面，交界处没有重叠的边面或独立纹理。
  const mainWest = mainRoad.center[0] - mainRoad.width / 2;
  const mainEast = mainRoad.center[0] + mainRoad.width / 2;
  const mainNorth = mainRoad.center[1] - mainRoad.depth / 2;
  const mainSouth = mainRoad.center[1] + mainRoad.depth / 2;
  const serviceWest = serviceRoad.center[0] - serviceRoad.width / 2;
  const serviceEast = serviceRoad.center[0] + serviceRoad.width / 2;
  const serviceNorth = serviceRoad.center[1] - serviceRoad.depth / 2;
  const asphalt = surfaceTexture(
    (u, v, grain) => {
      const x = THREE.MathUtils.lerp(mainWest, mainEast, u);
      const z = THREE.MathUtils.lerp(mainSouth, serviceNorth, v);
      const serviceX = x - serviceRoad.center[0];
      const alongMain = z - mainRoad.center[1];
      const mainLane = Math.abs(Math.abs(alongMain) - 1.44);
      const serviceLane = Math.abs(Math.abs(serviceX) - 1.24);
      const mainWear =
        (1 -
          THREE.MathUtils.smoothstep(Math.abs(mainLane - 0.67), 0.12, 0.36)) *
        THREE.MathUtils.smoothstep(Math.abs(serviceX), 2.5, 5.4) *
        THREE.MathUtils.smoothstep(z, mainNorth, mainNorth + 0.55);
      const serviceWear =
        (1 -
          THREE.MathUtils.smoothstep(
            Math.abs(serviceLane - 0.61),
            0.12,
            0.34,
          )) *
        THREE.MathUtils.smoothstep(mainNorth - z, 0, 2.7);
      const aggregate =
        Math.sin(x * 5.2 + Math.cos(z * 3.5) * 1.6) *
        Math.sin(z * 6.1 - x * 2.3);
      const variation =
        4 * Math.sin(x * 0.48 + z * 0.58) * Math.cos(z * 0.71 - x * 0.14);
      const light =
        213 +
        (grain - 0.5) * 23 +
        aggregate * 3 +
        variation -
        mainWear * 7 -
        serviceWear * 6;
      return [light + 1, light, light - 1, 255];
    },
    1024,
    768,
  );
  const asphaltOutline = new THREE.Shape()
    .moveTo(mainWest, -mainSouth)
    .lineTo(mainEast, -mainSouth)
    .lineTo(mainEast, -mainNorth)
    .lineTo(serviceEast, -mainNorth)
    .lineTo(serviceEast, -serviceNorth)
    .lineTo(serviceWest, -serviceNorth)
    .lineTo(serviceWest, -mainNorth)
    .lineTo(mainWest, -mainNorth)
    .closePath();
  const roadbed = new THREE.ExtrudeGeometry(asphaltOutline, {
    depth: 0.06,
    bevelEnabled: false,
  });
  const position = roadbed.getAttribute("position");
  const uv = roadbed.getAttribute("uv");
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      (position.getX(i) - mainWest) / mainRoad.width,
      (position.getY(i) + mainSouth) / (mainSouth - serviceNorth),
    );
  const road = new THREE.Mesh(
    roadbed,
    new THREE.MeshStandardMaterial({
      color: "#555658",
      map: asphalt,
      roughness: 0.98,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = -0.06;
  plan.add(road);
  siteSurface(
    plan,
    {
      center: [mainRoad.center[0], mainSouth + 0.109],
      width: mainRoad.width - 0.05,
      depth: 0.21,
    },
    "#777b70",
    -0.037,
    undefined,
    0.064,
  );
  const junctionHalf = serviceRoad.width / 2 + 0.62;
  const marking = new THREE.MeshStandardMaterial({
    color: "#aba994",
    roughness: 0.98,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  });
  for (let x = -29.5; x <= 30; x += 4) {
    if (Math.abs(x - serviceRoad.center[0]) <= junctionHalf) continue;
    pavementPaint(plan, [x, 0.0008, mainRoad.center[1]], 1.7, 0.075, marking);
  }
  const roadEnd = serviceRoad.center[1] + serviceRoad.depth / 2;
  for (let z = -15; z < roadEnd - 2.4; z += 4)
    pavementPaint(
      plan,
      [serviceRoad.center[0], 0.0008, z],
      0.075,
      1.7,
      marking,
    );
  pavementPaint(
    plan,
    [serviceRoad.center[0] - serviceRoad.width * 0.25, 0.0008, roadEnd - 0.68],
    serviceRoad.width * 0.42,
    0.13,
    marking,
  );

  // 保留登记道口范围，带倒角的路缘在开口两侧逐段降低。
  const curb = new THREE.MeshStandardMaterial({
    color: "#909083",
    roughness: 0.95,
  });
  for (const side of [-1, 1]) {
    const x = serviceRoad.center[0] + (side * serviceRoad.width) / 2;
    const openings = zones
      .map(({ access }) => access)
      .filter(
        ({ center }) => Math.sign(center[0] - serviceRoad.center[0]) === side,
      )
      .sort((a, b) => a.center[1] - b.center[1]);
    let start = roadEnd - serviceRoad.depth;
    for (const { center, depth } of [
      ...openings,
      { center: [x, roadEnd - 0.32] as const, depth: 0 },
    ]) {
      const end = center[1] - depth / 2 - 0.02;
      if (end - start > 0.07) serviceCurb(plan, x, side, start, end, curb);
      start = center[1] + depth / 2 + 0.02;
    }
  }
}

function outdoorPlinth(
  parent: THREE.Group,
  size: SpacePoint,
  center: SpacePoint,
) {
  const plinth = box(parent, size, center, "#8c8b80", { roughness: 0.96 });
  const vertices = plinth.geometry.getAttribute("position");
  // 设备座的上沿留倒角，底面仍贴在混凝土场坪上。
  for (let i = 0; i < vertices.count; i++) {
    if (vertices.getY(i) <= 0) continue;
    const x = vertices.getX(i);
    const z = vertices.getZ(i);
    vertices.setX(i, x - Math.sign(x) * 0.038);
    vertices.setZ(i, z - Math.sign(z) * 0.038);
  }
  plinth.geometry.computeVertexNormals();
  return plinth;
}

function equipmentLouvers(
  group: THREE.Group,
  x: number,
  y: number,
  width: number,
  height: number,
  count: number,
) {
  box(
    group,
    [0.041, height - 0.064, width - 0.07],
    [x - 0.029, y, 0],
    "#344540",
  );
  const border = "#596963";
  for (const edge of [-1, 1]) {
    box(
      group,
      [0.073, 0.047, width],
      [x, y + (edge * (height - 0.047)) / 2, 0],
      border,
    );
    box(
      group,
      [0.073, height - 0.094, 0.05],
      [x, y, (edge * (width - 0.05)) / 2],
      border,
    );
  }
  const pitch = (height - 0.116) / count;
  for (let i = 0; i < count; i++) {
    const blade = box(
      group,
      [0.08, 0.023, width - 0.126],
      [x - 0.011, y + (i - (count - 1) / 2) * pitch, 0],
      "#85938a",
      { roughness: 0.71, metalness: 0.1 },
    );
    blade.rotation.z = -0.37;
  }
}

function coolingHousing(
  group: THREE.Group,
  centerZ: number,
  labelObstacles: CampusLabelObstacle[],
) {
  const casework = new THREE.Group();
  casework.position.set(-0.6, 0, centerZ);
  group.add(casework);
  const coating = { roughness: 0.72, metalness: 0.12 };
  const panel = "#a2aea9";
  labelObstacles.push(
    box(casework, [3.41, 1.49, 2.36], [0, 0.914, 0], "#7f8c8b", coating),
  );
  for (const side of [-1, 1]) {
    box(casework, [3.45, 0.055, 0.11], [0, 0.164, side * 1.045], "#56635f");
    for (const module of [-0.84, 0.84])
      box(
        casework,
        [1.637, 1.454, 0.041],
        [module, 0.98, side * 1.189],
        panel,
        coating,
      );
    box(casework, [0.048, 1.4, 0.048], [1.683, 0.945, side * 1.19], "#86948e");
  }
  box(casework, [0.048, 1.454, 2.36], [-1.719, 0.98, 0], panel, coating);
  box(casework, [0.045, 0.146, 2.352], [1.723, 1.634, 0], panel, coating);
  box(casework, [0.045, 0.174, 2.352], [1.723, 0.266, 0], "#798a82", coating);
  equipmentLouvers(casework, 1.742, 0.96, 2.22, 1.21, 10);

  const fanCenters = [-0.88, 0.85];
  const deck = new THREE.Shape()
    .moveTo(-1.758, -1.229)
    .lineTo(1.758, -1.229)
    .lineTo(1.758, 1.229)
    .lineTo(-1.758, 1.229)
    .closePath();
  for (const center of fanCenters) {
    const opening = new THREE.Path();
    opening.absarc(center, 0, 0.61, 0, Math.PI * 2, true);
    deck.holes.push(opening);
  }
  const lid = new THREE.Mesh(
    new THREE.ExtrudeGeometry(deck, {
      depth: 0.056,
      bevelEnabled: false,
      curveSegments: 20,
    }),
    new THREE.MeshStandardMaterial({ color: "#a6b0a8", ...coating }),
  );
  lid.rotation.x = -Math.PI / 2;
  lid.position.y = 1.707;
  casework.add(lid);
  labelObstacles.push(lid);

  const well = new THREE.MeshStandardMaterial({
    color: "#354743",
    roughness: 0.91,
  });
  const rotor = new THREE.MeshStandardMaterial({
    color: "#627674",
    roughness: 0.78,
  });
  const guard = new THREE.MeshStandardMaterial({
    color: "#536967",
    roughness: 0.62,
    metalness: 0.17,
  });
  const ringShape = new THREE.TorusGeometry(0.622, 0.021, 5, 36);
  const grille = [0.21, 0.38, 0.54].map(
    (radius) => new THREE.TorusGeometry(radius, 0.013, 5, 32),
  );
  const bladeShape = new THREE.Shape()
    .moveTo(0.105, -0.049)
    .quadraticCurveTo(0.31, -0.155, 0.526, -0.095)
    .lineTo(0.54, 0.064)
    .quadraticCurveTo(0.38, 0.139, 0.111, 0.067)
    .closePath();
  const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.018,
    bevelEnabled: false,
    curveSegments: 6,
  });
  bladeGeometry.rotateX(-Math.PI / 2);
  for (const x of fanCenters) {
    const fan = new THREE.Group();
    fan.position.x = x;
    casework.add(fan);
    const backing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.605, 0.605, 0.016, 32),
      well,
    );
    backing.position.y = 1.675;
    fan.add(backing);
    for (let i = 0; i < 5; i++) {
      const blade = new THREE.Mesh(bladeGeometry, rotor);
      blade.rotation.y = (i * Math.PI * 2) / 5 + (x > 0 ? 0.21 : 0);
      blade.position.y = 1.704;
      fan.add(blade);
    }
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.125, 0.045, 16),
      rotor,
    );
    hub.position.y = 1.725;
    fan.add(hub);
    for (const geometry of [ringShape, ...grille]) {
      const ring = new THREE.Mesh(geometry, guard);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = geometry === ringShape ? 1.784 : 1.791;
      fan.add(ring);
      if (geometry === ringShape) labelObstacles.push(ring);
    }
    box(fan, [1.226, 0.025, 0.029], [0, 1.787, 0], "#647773");
    box(fan, [0.029, 0.025, 1.226], [0, 1.787, 0], "#647773");
  }
}

function backupHousing(
  group: THREE.Group,
  labelObstacles: CampusLabelObstacle[],
) {
  const casework = new THREE.Group();
  casework.position.x = -0.26;
  group.add(casework);
  const enamel = { roughness: 0.72, metalness: 0.08 };
  labelObstacles.push(
    box(casework, [5.24, 2.14, 2.68], [0, 1.313, 0], "#74796c", enamel),
  );
  box(casework, [5.38, 0.102, 2.78], [0, 0.252, 0], "#535c53", enamel);
  box(casework, [5.42, 0.096, 2.81], [0, 2.398, 0], "#969a8b", enamel);
  equipmentLouvers(casework, 2.66, 1.35, 2.06, 1.43, 8);
  box(casework, [0.049, 1.91, 2.52], [-2.636, 1.297, 0], "#83887a", enamel);
  for (const side of [-1, 1]) {
    for (const edge of [-1, 1])
      box(
        casework,
        [0.088, 2.02, 0.06],
        [edge * 2.589, 1.317, side * 1.368],
        "#737b6e",
        enamel,
      );
    for (const [index, x] of [-1.814, -0.555, 0.704, 1.962].entries()) {
      box(
        casework,
        [1.202, 1.86, 0.051],
        [x, 1.326, side * 1.36],
        index % 2 ? "#8c9181" : "#929687",
        enamel,
      );
      box(
        casework,
        [0.993, 0.055, 0.062],
        [x, 0.474, side * 1.384],
        "#777f71",
        enamel,
      );
      for (const y of [0.66, 1.985])
        box(
          casework,
          [0.09, 0.104, 0.08],
          [x - 0.54, y, side * 1.396],
          "#697469",
        );
      box(
        casework,
        [0.065, 0.214, 0.07],
        [x + 0.435, 1.31, side * 1.404],
        "#535e55",
      );
      box(
        casework,
        [0.04, 0.124, 0.043],
        [x + 0.435, 1.317, side * 1.442],
        "#a2ada0",
        enamel,
      );
    }
  }
}

function outdoorEquipment(
  group: THREE.Group,
  kind: "heat" | "backup" | "yard",
  width: number,
  depth: number,
  shadow: THREE.MeshBasicMaterial,
  labelObstacles: CampusLabelObstacle[],
) {
  if (kind === "heat") {
    for (const z of [-2.4, 2.4]) {
      contactShadow(group, shadow, 4.55, 3.65, [-0.51, 0.024, z + 0.12]);
      labelObstacles.push(
        outdoorPlinth(group, [3.9, 0.12, 2.9], [-0.6, 0.08, z]),
      );
      coolingHousing(group, z, labelObstacles);
    }
  } else if (kind === "backup") {
    contactShadow(group, shadow, 6.55, 4.2, [-0.16, 0.024, 0.13]);
    labelObstacles.push(
      outdoorPlinth(group, [5.8, 0.19, 3.4], [-0.26, 0.115, 0]),
    );
    backupHousing(group, labelObstacles);
  } else {
    const paint = new THREE.MeshStandardMaterial({
      color: "#a0a18b",
      roughness: 0.98,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    const lineStart = 0.35 - depth * 0.29;
    const lineEnd = depth * 0.315 - 0.04;
    for (const x of [-width * 0.32, 0, width * 0.32])
      pavementPaint(
        group,
        [x, 0.0218, (lineStart + lineEnd) / 2],
        0.08,
        lineEnd - lineStart,
        paint,
      );
    pavementPaint(
      group,
      [0, 0.0218, depth * 0.315],
      width * 0.64 + 0.08,
      0.08,
      paint,
    );
    box(
      group,
      [width * 0.84, 0.14, 0.14],
      [0, 0.08, -depth / 2 + 0.24],
      "#77848b",
    );
  }
}

function exposedFloorStructure(
  level: THREE.Group,
  width: number,
  depth: number,
) {
  // 分层图显示楼板截面和外围框架的断面。
  box(level, [width - 0.94, 0.196, depth - 0.94], [0, -0.45, 0], "#777c73");
  for (const side of [-1, 1]) {
    box(
      level,
      [0.32, 0.2, depth - 0.94],
      [side * (width / 2 - 0.31), -0.45, 0],
      "#a1a092",
    );
    box(
      level,
      [width - 0.3, 0.2, 0.32],
      [0, -0.45, side * (depth / 2 - 0.31)],
      "#a1a092",
    );
  }
  for (const x of [-width / 2 + 0.46, width / 2 - 0.46])
    box(level, [0.42, 1.34, 0.42], [x, 0.62, -depth / 2 + 0.47], "#ada99a");
}

function floorFinishes() {
  const map = surfaceTexture((u, v, grain) => {
    const light = 242 + (grain - 0.5) * 14 + Math.sin(u * 14 + v * 23) * 4;
    const tileEdge = Math.min((u * 10) % 1, (v * 10) % 1);
    const seam = 1 - THREE.MathUtils.smoothstep(tileEdge, 0.01, 0.095);
    const shade = light - seam * 19;
    return [shade, shade, shade, 255];
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return { map, roughness: 0.94 };
}

function floorStair(
  plan: THREE.Group,
  {
    center: [x, z],
    width,
    depth,
  }: NonNullable<ReturnType<typeof campusFloorPlan>>["stair"],
  corridorZ: number,
) {
  const start = z - depth / 2;
  const first = start + 0.7;
  const approach = first - corridorZ;
  box(
    plan,
    [width, 0.054, approach],
    [x, 0.006, corridorZ + approach / 2],
    "#99998c",
  );
  const riser = 0.167;
  const tread = 0.43;
  const steps = 8;
  const run = steps * tread;
  const stairs = new THREE.Shape().moveTo(first, 0.035);
  for (let step = 0; step < steps; step++) {
    stairs.lineTo(first + step * tread, 0.035 + riser * (step + 1));
    stairs.lineTo(first + (step + 1) * tread, 0.035 + riser * (step + 1));
  }
  stairs.lineTo(first + run + 0.88, 0.035 + riser * steps);
  stairs.lineTo(first + run + 0.88, 0.035);
  stairs.closePath();
  const flight = new THREE.Mesh(
    new THREE.ExtrudeGeometry(stairs, {
      depth: width * 0.78,
      bevelEnabled: false,
    }),
    new THREE.MeshStandardMaterial({ color: "#a19e8f", roughness: 0.93 }),
  );
  flight.rotation.y = -Math.PI / 2;
  flight.position.x = x + width * 0.39;
  plan.add(flight);
  const railLength = (steps - 1) * tread;
  const rise = (steps - 1) * riser;
  const railBase = 0.035 + riser + 0.86;
  for (const side of [-1, 1]) {
    const railX = x + side * width * 0.365;
    for (const step of [0, 3, 7])
      box(
        plan,
        [0.036, 0.86, 0.036],
        [railX, railBase - 0.43 + step * riser, first + (step + 0.5) * tread],
        "#647372",
      );
    const rail = box(
      plan,
      [0.048, 0.044, Math.hypot(railLength, rise) + 0.108],
      [railX, railBase + rise / 2, first + (railLength + tread) / 2],
      "#81908d",
      { roughness: 0.42, metalness: 0.22 },
    );
    rail.rotation.x = -Math.atan2(rise, railLength);
  }
}

function floorEnvelope(
  plan: THREE.Group,
  width: number,
  depth: number,
  entry: ReturnType<typeof campusBuildingEntrance>,
) {
  const section = "#92978d";
  const back = -depth / 2 + 0.1;
  const cut = depth / 2 - 0.1;
  box(plan, [width - 0.38, 0.46, 0.17], [0, 0.255, back], section);
  for (const side of [-1, 1]) {
    const spans =
      entry && side < 0
        ? [
            [back, entry.point[2] - entry.width / 2],
            [entry.point[2] + entry.width / 2, cut],
          ]
        : [[back, cut]];
    for (const [start, end] of spans)
      box(
        plan,
        [0.17, 0.46, end - start],
        [side * (width / 2 - 0.1), 0.255, (start + end) / 2],
        section,
      );
  }
}

function floorBench(
  group: THREE.Group,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
) {
  const worktop = box(
    group,
    [width, 0.087, depth],
    [x, height + 0.0065, z],
    "#827f72",
  );
  const legs = height - 0.087;
  for (const side of [-1, 1])
    for (const end of [-1, 1])
      box(
        group,
        [0.085, legs, 0.085],
        [
          x + side * (width / 2 - 0.12),
          0.05 + legs / 2,
          z + end * (depth / 2 - 0.12),
        ],
        "#64726f",
      );
  box(
    group,
    [width - 0.24, 0.045, depth - 0.24],
    [x, 0.05 + height * 0.38, z],
    "#666e68",
  );
  return worktop;
}

export function createCampusGeometry(
  scope: CampusNode,
  children: CampusNode[],
  shadow = contactMaterial(),
) {
  const plan = new THREE.Group();
  const [width, , depth] = scope.size;
  const site = scope.kind === "campus";
  const building = scope.kind === "building";
  const floorPlan = campusFloorPlan(scope.id);
  const floorFinish = floorPlan && floorFinishes();
  const sitePlan = campusSitePlan(scope.id);
  const labelObstacles: CampusLabelObstacle[] = [];
  const siteAccess = new Map<string, ReturnType<typeof siteSurface>>();
  const yardLevel = 0.021;
  const pavingThickness = 0.09;
  const outdoorPaving = site
    ? {
        map: surfaceTexture(
          (u, v, grain) => {
            const nearJoint = Math.min(
              Math.abs(u * 3 - Math.round(u * 3)),
              Math.abs(v * 3 - Math.round(v * 3)),
            );
            const seal =
              1 - THREE.MathUtils.smoothstep(nearJoint, 0.002, 0.014);
            const aggregate =
              5 *
              Math.sin(u * 16 * Math.PI + Math.cos(v * 14 * Math.PI)) *
              Math.sin(v * 19 * 2 * Math.PI - u * 4 * Math.PI);
            const marks =
              3.6 * Math.cos(u * 6 * Math.PI) * Math.cos(v * 8 * Math.PI);
            const light =
              226 + (grain - 0.5) * 21 + aggregate + marks - seal * 28;
            return [light + 2, light, light - 3, 255];
          },
          384,
          384,
        ),
        roughness: 0.94,
      }
    : undefined;
  if (outdoorPaving)
    outdoorPaving.map.wrapS = outdoorPaving.map.wrapT = THREE.RepeatWrapping;
  const siteGround = site
    ? {
        map: surfaceTexture((u, v, grain) => {
          const light = 217 + (concreteSurface(u, v, grain) - 226) * 0.64;
          return [light, light, light, 255];
        }),
        roughness: 0.98,
      }
    : undefined;
  if (siteGround)
    siteGround.map.wrapS = siteGround.map.wrapT = THREE.RepeatWrapping;
  const slab = box(
    plan,
    [
      width + (building ? 1.5 : 0),
      site ? 0.12 : 0.3,
      depth + (building ? 1.5 : 0),
    ],
    [0, site ? -0.11 : building ? -0.7 : -0.2, 0],
    site ? "#666754" : building ? "#62675f" : "#85877d",
    siteGround,
  );
  if (site) surfaceUV(slab, width, depth);
  if (!site) outline(slab, building ? "#78847f" : "#777f78");
  if (sitePlan) {
    siteRoads(plan, sitePlan);
    siteLandscape(plan);
    for (const zone of sitePlan.zones) {
      const apron = siteSurface(
        plan,
        zone.access,
        "#797d74",
        (yardLevel - pavingThickness) / 2,
        outdoorPaving,
        pavingThickness,
      );
      const downhill = Math.sign(
        sitePlan.serviceRoad.center[0] - zone.access.center[0],
      );
      const vertices = apron.geometry.getAttribute("position");
      for (let i = 0; i < vertices.count; i++)
        vertices.setY(
          i,
          vertices.getY(i) -
            (downhill * yardLevel * vertices.getX(i)) / zone.access.width,
        );
      apron.geometry.computeVertexNormals();
      siteAccess.set(zone.id, apron);
    }
    labelObstacles.push(...siteAccess.values());
  } else if (floorPlan) {
    const screed = box(
      plan,
      [scope.size[0] - 0.06, 0.075, scope.size[2] - 0.06],
      [0, -0.0255, 0],
      "#79827c",
      floorFinish ?? undefined,
    );
    surfaceUV(screed, scope.size[0], scope.size[2]);
    const { center, width, depth } = floorPlan.corridor;
    const corridor = box(
      plan,
      [width, 0.025, depth],
      [center[0], 0.0205, center[1]],
      "#acafa2",
      floorFinish ?? undefined,
    );
    surfaceUV(corridor, width, depth);
    floorStair(plan, floorPlan.stair, center[1] + depth / 2);
    const entrance =
      scope.origin[1] === 0 && scope.parent
        ? campusBuildingEntrance(scope.parent)
        : null;
    floorEnvelope(plan, scope.size[0], scope.size[2], entrance);
    if (entrance) {
      const [edge, , z] = entrance.point;
      labelObstacles.push(
        box(
          plan,
          [0.64, 0.04, entrance.width],
          [edge + 0.32, 0.023, z],
          "#73999d",
        ),
      );
    }
  }
  const marks = children.map((child, index) => {
    const group = new THREE.Group();
    group.position.set(...child.origin);
    if (building) group.position.y += index * 4.8;
    group.rotation.y = child.yaw;
    plan.add(group);
    const [w, h, d] = child.size;
    let pick: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    let access = siteAccess.get(child.id);
    const zone = sitePlan?.zones.find(({ id }) => id === child.id);
    const area = floorPlan?.areas.find(({ id }) => id === child.id);
    if (zone) {
      pick = siteSurface(
        group,
        { center: [0, 0], width: w, depth: d },
        zone.kind === "yard" ? "#777b74" : "#82837a",
        yardLevel - pavingThickness / 2,
        outdoorPaving,
        pavingThickness,
      );
      outdoorEquipment(group, zone.kind, w, d, shadow, labelObstacles);
    } else if (site || building) {
      if (building) {
        const floor = createCampusGeometry(
          child,
          campusChildren(child.id),
          shadow,
        );
        group.add(floor.plan);
        labelObstacles.push(...floor.labelObstacles);
        exposedFloorStructure(group, w, d);
        pick = box(group, [w, 0.58, d], [0, -0.24, 0], "#6ec9d1");
      } else {
        contactShadow(group, shadow, w + 2.2, d + 2.3, [0.32, 0.006, -0.28]);
        facade(group, w, h, d, campusChildren(child.id).length);
        const entrance = campusBuildingEntrance(child.id);
        if (entrance && sitePlan?.entrance) {
          const { mainRoad } = sitePlan;
          const roadEdge = mainRoad.center[1] - mainRoad.depth / 2;
          access = buildingEntrance(
            group,
            entrance,
            d,
            roadEdge - sitePlan.entrance.point[2],
            labelObstacles,
          );
        }
        pick = box(group, [w, h, d], [0, h / 2, 0], "#6ec9d1");
      }
      pick.material.transparent = true;
      pick.material.opacity = 0;
      pick.material.depthWrite = false;
    } else {
      const room = child.kind === "room";
      pick = box(
        group,
        [w, 0.1, d],
        [0, 0, 0],
        room ? "#727f7c" : "#a3a397",
        floorFinish ?? undefined,
      );
      surfaceUV(pick, w, d);
      const wall = "#a7ab9f";
      const cutWall = (width: number, depth: number, x: number, z: number) => {
        box(group, [width, 0.58, depth], [x, 0.325, z], wall);
        box(group, [width, 0.025, depth], [x, 0.6275, z], "#828a80");
      };
      cutWall(w, 0.16, 0, d / 2);
      cutWall(0.16, d - 0.16, -w / 2, 0);
      cutWall(0.16, d - 0.16, w / 2, 0);
      if (area) {
        const { doorway, equipment } = area;
        const sides = [
          -w / 2,
          doorway.x - doorway.width / 2,
          doorway.x + doorway.width / 2,
          w / 2,
        ];
        for (const i of [0, 2]) {
          const span = sides[i + 1] - sides[i];
          cutWall(span, 0.16, sides[i] + span / 2, doorway.z);
        }
        for (const edge of [sides[1], sides[2]]) {
          box(group, [0.06, 0.615, 0.195], [edge, 0.349, doorway.z], "#798983");
        }
        box(
          group,
          [doorway.width - 0.06, 0.029, 0.16],
          [doorway.x, 0.0525, doorway.z],
          "#8d9a91",
        );
        const { fromZ, toZ, x } = area.access;
        access = box(
          plan,
          [Math.min(doorway.width, 0.92), 0.028, toZ - fromZ + 0.17],
          [x, 0.045, (fromZ + toZ + 0.17) / 2],
          "#517780",
        );
        labelObstacles.push(access, {
          frame: group,
          bounds: new THREE.Box3(
            new THREE.Vector3(sides[1], 0, doorway.z - 0.08),
            new THREE.Vector3(sides[2], 0.66, doorway.z + 0.08),
          ),
        });
        for (const item of equipment) {
          const { height } = item;
          const count =
            item.kind === "power" ? Math.ceil(item.width / 0.88) : 1;
          const pitch = item.width / count;
          const color =
            item.kind === "rack"
              ? "#657d8b"
              : item.kind === "power"
                ? "#6d899a"
                : "#827f72";
          for (let unit = 0; unit < count; unit++) {
            const x = item.center[0] + (unit - (count - 1) / 2) * pitch;
            const z = item.center[1];
            contactShadow(group, shadow, pitch + 0.28, item.depth + 0.38, [
              x + 0.06,
              0.054,
              z + 0.06,
            ]);
            if (item.kind === "bench") {
              labelObstacles.push(
                floorBench(group, x, z, pitch - 0.07, item.depth, height),
              );
              continue;
            }
            labelObstacles.push(
              box(
                group,
                [pitch - 0.07, height, item.depth],
                [x, height / 2 + 0.05, z],
                color,
              ),
            );
            box(
              group,
              [pitch * 0.73, height * 0.82, 0.029],
              [x, height * 0.52 + 0.05, z + item.depth / 2 + 0.012],
              item.kind === "rack" ? "#253b48" : "#3c5362",
            );
            for (let louver = 0; louver < 3; louver++)
              box(
                group,
                [pitch * 0.51, 0.027, 0.022],
                [
                  x,
                  height * (0.24 + louver * 0.055) + 0.05,
                  z + item.depth / 2 + 0.032,
                ],
                "#78908c",
              );
          }
        }
      } else {
        box(group, [w, 0.6, 0.16], [0, 0.3, -d / 2], wall);
      }
    }
    const border = outline(pick, "#9ae1e7");
    border.visible = false;
    // 楼层名称沿柜列或工作台的外缘取空段，保留设备与通道的轮廓。
    const labelHeight = area ? 0.66 : 1.05;
    let labelDepth = 0;
    if (area) {
      let front = 0;
      let rear = 0;
      for (const { center, depth } of area.equipment) {
        front = Math.max(front, center[1] + depth / 2);
        rear = Math.min(rear, center[1] - depth / 2);
      }
      labelDepth =
        front <= -rear
          ? d / 2 - Math.min(1, (d / 2 - front) / 2)
          : (rear - d / 2) / 2;
    }
    // 靠通道一侧的名称贴在门洞到边墙的空段。
    let labelX = 0;
    if (area && labelDepth < 0) {
      const { x, width } = area.doorway;
      const side = x <= 0 ? 1 : -1;
      const openingEdge = x + (side * width) / 2;
      const wallEdge = (side * w) / 2;
      labelX = (openingEdge + wallEdge) / 2;
    }
    return {
      child,
      pick,
      border,
      access,
      labelOutward: area
        ? group.localToWorld(
            new THREE.Vector3(
              labelX,
              labelHeight,
              labelDepth + Math.sign(labelDepth),
            ),
          )
        : undefined,
      point: group.localToWorld(
        building
          ? new THREE.Vector3(
              (index % 2 ? -1 : 1) * w * 0.26,
              0.12,
              d / 2 - 1.1,
            )
          : zone?.kind === "heat"
            ? new THREE.Vector3(w * 0.32, 0.08, -d / 2 + 0.5)
            : zone?.kind === "backup"
              ? new THREE.Vector3(-0.26, 2.42, 0)
              : new THREE.Vector3(
                  labelX,
                  zone ? 0.04 : site ? h + 0.8 : labelHeight,
                  labelDepth,
                ),
      ),
    };
  });
  return { plan, marks, labelObstacles };
}
