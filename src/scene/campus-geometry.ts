import * as THREE from "three";
import {
  campusBuildingEntrance,
  campusChildren,
  campusFloorPlan,
  campusSitePlan,
  type CampusNode,
  type SpacePoint,
} from "../campus-layout.ts";
import { createCampusTrees } from "./campus-trees.ts";
import { floorGrilleRows, floorGrilleSettings } from "../floor-grilles.ts";
import { entranceFixture, entranceOpening } from "../entrance.ts";
import { buildEntrance } from "./entrance.ts";
import { createRoomFloorMap } from "./room-surfaces.ts";

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

function facadeElevations(
  target: THREE.Group,
  width: number,
  height: number,
  depth: number,
  bands: number,
  sectionEntrance?: ReturnType<typeof campusBuildingEntrance>,
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
  const glass = exteriorGlass();
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
    if (sectionEntrance !== undefined && x >= 0 && z >= 0) continue;
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
        for (const [base, cap] of courses) {
          const half = (bayWidth - 0.037) / 2;
          const start = center - half;
          const end = center + half;
          const skin = (left: number, right: number, bottom: number) => {
            if (right <= left || cap <= bottom) return;
            box(
              face,
              [right - left, cap - bottom, 0.233],
              [(left + right) / 2, (bottom + cap) / 2, -0.111],
              cladding[(bay + story) % cladding.length],
              coatedMetal,
            );
          };
          if (sectionEntrance && x < 0 && base < 2.62) {
            const [left, right] = [-1, 1].map(
              (side) =>
                sectionEntrance.point[2] + (side * sectionEntrance.width) / 2,
            );
            skin(start, Math.min(end, left), base);
            skin(Math.max(start, right), end, base);
            skin(Math.max(start, left), Math.min(end, right), 2.62);
          } else skin(start, end, base);
        }
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
}

function facade(
  target: THREE.Group,
  width: number,
  height: number,
  depth: number,
  bands: number,
) {
  const metal = { roughness: 0.48, metalness: 0.16 };
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
  facadeElevations(target, width, height, depth, bands);
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
  stair?: FloorStair,
  front?: FloorFront,
) {
  // 分层图显示楼板截面和外围框架的断面。
  const thickness = front ? 0.28 : 0.54;
  const borderY = -thickness + 0.09;
  const finish = floorConcreteFinish();
  floorDeck(
    level,
    width - 0.56,
    depth - 0.56,
    -0.015 - thickness / 2,
    thickness,
    "#858b8b",
    stair,
    front,
    finish,
  );
  const start = -depth / 2 + 0.47;
  const end = depth / 2 - 0.47;
  const edge = front?.edge ?? end;
  for (const side of [-1, 1]) {
    box(
      level,
      [0.32, 0.2, edge - start],
      [side * (width / 2 - 0.31), borderY, (start + edge) / 2],
      "#9a9f9e",
    );
    if (front)
      box(
        front.group,
        [0.32, 0.2, end - edge],
        [side * (width / 2 - 0.31), borderY, (edge + end) / 2],
        "#9a9f9e",
      );
    box(
      side > 0 && front ? front.group : level,
      [width - 0.3, 0.2, 0.32],
      [0, borderY, side * (depth / 2 - 0.31)],
      "#9a9f9e",
    );
  }
  if (front)
    box(
      level,
      [width - 0.56, 0.064, 0.07],
      [0, -0.249, edge - 0.027],
      "#677274",
    ).name = "floor-section-edge";
  for (const x of [-width / 2 + 0.46, width / 2 - 0.46])
    box(level, [0.42, 1.34, 0.42], [x, 0.62, -depth / 2 + 0.47], "#ada99a");
}

// 按机房当前取景校准楼层灯光下的可见墙面与地砖。
const floorFinishColor = "#848e92";
const corridorFinishColor = "#8b9599";
const interiorWallColor = "#a0a8ac";
const floorFinishHeight = 0.05;
const corridorFinishHeight = 0.033;
const floorRearWallInset = 0.1;
const floorRearWallThickness = 0.17;

function floorFinishes() {
  return { map: createRoomFloorMap(8, 8, 0.014), roughness: 0.98 };
}

function floorConcreteFinish() {
  const map = surfaceTexture((u, v, grain) => {
    const shade = 232 + (concreteSurface(u, v, grain) - 232) * 0.43;
    return [shade, shade, shade, 255];
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return { map, roughness: 0.96 };
}

/** 楼层坐标决定砖缝相位，分段铺面与装配剖面共用贴图尺度。 */
function floorSurfaceUV(mesh: THREE.Mesh) {
  const { position, normal, uv } = mesh.geometry.attributes;
  const point = new THREE.Vector3();
  mesh.updateWorldMatrix(true, false);
  for (let i = 0; i < uv.count; i++) {
    point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    const horizontal = Math.abs(normal.getY(i)) > 0.5;
    const u = Math.abs(normal.getX(i)) > 0.5 ? point.z : point.x;
    uv.setXY(i, u / 8, (horizontal ? -point.z : point.y) / 8);
  }
}

function floorContactFinish() {
  const map = surfaceTexture(
    (u, v) => {
      const end = Math.min(u, 1 - u);
      const fade = THREE.MathUtils.smoothstep(v, 0.04, 1);
      return [
        0,
        0,
        0,
        Math.round(54 * fade ** 2 * THREE.MathUtils.smoothstep(end, 0, 0.045)),
      ];
    },
    64,
    64,
  );
  return new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
  });
}

function floorWallContact(
  parent: THREE.Group,
  material: THREE.MeshBasicMaterial,
  x: number,
  z: number,
  height: number,
  length: number,
  yaw: number,
) {
  const spread = 0.32;
  const shade = new THREE.Mesh(
    new THREE.PlaneGeometry(length, spread).rotateX(-Math.PI / 2),
    material,
  );
  shade.name = "floor-wall-contact";
  shade.rotation.y = yaw;
  shade.position.set(
    x + (Math.sin(yaw) * spread) / 2,
    height + 0.002,
    z + (Math.cos(yaw) * spread) / 2,
  );
  parent.add(shade);
}

type FloorStair = NonNullable<ReturnType<typeof campusFloorPlan>>["stair"];
type FloorArea = NonNullable<
  ReturnType<typeof campusFloorPlan>
>["areas"][number];
type FloorEquipment = FloorArea["equipment"][number];
type FloorFront = { edge: number; group: THREE.Group };

function stairOpening({ center: [x, z], width, depth }: FloorStair) {
  return {
    left: x - width / 2,
    right: x + width / 2,
    near: z - depth / 2 + 0.8,
    far: z + depth / 2,
  };
}

function floorDeck(
  parent: THREE.Group,
  width: number,
  depth: number,
  y: number,
  thickness: number,
  color: string,
  stair?: FloorStair,
  front?: FloorFront,
  finish?: ReturnType<typeof floorFinishes>,
) {
  const place = (
    x1: number,
    x2: number,
    z1: number,
    z2: number,
    frame = parent,
  ) => {
    const deck = box(
      frame,
      [x2 - x1, thickness, z2 - z1],
      [(x1 + x2) / 2, y, (z1 + z2) / 2],
      color,
      finish,
    );
    deck.name = "floor-deck";
    if (finish) floorSurfaceUV(deck);
  };
  const edge = front?.edge ?? depth / 2;
  if (front) place(-width / 2, width / 2, edge, depth / 2, front.group);
  if (!stair) {
    place(-width / 2, width / 2, -depth / 2, edge);
    return;
  }
  const { left, right, near, far } = stairOpening(stair);
  place(-width / 2, width / 2, -depth / 2, near);
  place(-width / 2, width / 2, far, edge);
  place(-width / 2, left, near, far);
  place(right, width / 2, near, far);
}

function floorStair(
  plan: THREE.Group,
  stair: FloorStair,
  corridorEdge: number,
  upper: boolean,
  finish: ReturnType<typeof floorFinishes>,
) {
  const { left, right, near, far } = stairOpening(stair);
  const [x] = stair.center;
  const surface = corridorFinishHeight;
  const turn = far - 1.08;
  const run = turn - near;
  const rise = stair.rise / 2;
  const flightWidth = stair.width / 2 - 0.11;
  const center = x + ((upper ? 1 : -1) * stair.width) / 4;
  const startY = surface - (upper ? rise : 0);
  const startZ = upper ? turn : near;
  const direction = upper ? -1 : 1;
  const steps = Math.ceil(rise / 0.175);
  const riser = rise / steps;
  const tread = run / steps;
  const shape = new THREE.Shape().moveTo(0, 0);
  for (let step = 0; step < steps; step++) {
    shape.lineTo(step * tread, (step + 1) * riser);
    shape.lineTo((step + 1) * tread, (step + 1) * riser);
  }
  shape.lineTo(run, rise - 0.19);
  shape.lineTo(0, -0.19);
  shape.closePath();
  const flight = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: flightWidth,
      bevelEnabled: false,
    }),
    new THREE.MeshStandardMaterial({ color: "#929a9d", roughness: 0.94 }),
  );
  flight.name = upper ? "stair-upper-flight" : "stair-lower-flight";
  flight.position.set(center + (direction * flightWidth) / 2, startY, startZ);
  flight.rotation.y = (-direction * Math.PI) / 2;
  plan.add(flight);

  const approach = box(
    plan,
    [stair.width, 0.055, near - corridorEdge],
    [x, surface - 0.0275, (near + corridorEdge) / 2],
    corridorFinishColor,
    finish,
  );
  approach.name = "floor-stair-approach";
  floorSurfaceUV(approach);
  if (!upper)
    box(
      plan,
      [stair.width, 0.21, far - turn],
      [x, surface + rise - 0.105, (far + turn) / 2],
      "#929a9d",
    ).name = "stair-turn-landing";

  const rail = "#5c6c6d";
  for (const side of [-1, 1]) {
    const railX = center + side * (flightWidth / 2 - 0.045);
    for (const fraction of [0.08, 0.36, 0.66, 0.94])
      box(
        plan,
        [0.036, 0.94, 0.036],
        [
          railX,
          startY + fraction * rise + 0.47,
          startZ + direction * fraction * run,
        ],
        rail,
      );
    box(
      plan,
      [0.047, 0.043, Math.hypot(run, rise)],
      [railX, startY + rise / 2 + 0.94, startZ + (direction * run) / 2],
      "#879394",
      { roughness: 0.39, metalness: 0.28 },
    ).rotation.x = -direction * Math.atan2(rise, run);
  }

  const guards = upper
    ? [
        [left, near, left, far],
        [right, near, right, far],
        [left, far, right, far],
        [left, near, x, near],
      ]
    : [[left, far, right, far]];
  const landingY = surface + (upper ? 0 : rise);
  const installedPosts = new Set<string>();
  for (const [x1, z1, x2, z2] of guards) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const posts = Math.ceil(length / 1.05);
    const middle = [(x1 + x2) / 2, (z1 + z2) / 2];
    const angle = Math.atan2(x2 - x1, z2 - z1);
    for (const height of [0.49, 1.02])
      box(
        plan,
        [0.042, 0.04, length - 0.046],
        [middle[0], landingY + height, middle[1]],
        rail,
      ).rotation.y = angle;
    for (let i = 0; i <= posts; i++) {
      const t = i / posts;
      const x = THREE.MathUtils.lerp(x1, x2, t);
      const z = THREE.MathUtils.lerp(z1, z2, t);
      const key = `${x},${z}`;
      if (installedPosts.has(key)) continue;
      installedPosts.add(key);
      box(plan, [0.046, 1.035, 0.046], [x, landingY + 0.5175, z], rail);
    }
  }
}

function buildingSection(
  plan: THREE.Group,
  building: CampusNode,
  stories: number,
) {
  const section = new THREE.Group();
  section.name = "building-section";
  plan.add(section);
  const [width, height, depth] = building.size;
  const entrance = campusBuildingEntrance(building.id);
  facadeElevations(section, width, height, depth, stories, entrance);
  box(
    section,
    [width - 0.14, 0.638, 0.24],
    [0, 0.319, -depth / 2 + 0.065],
    "#878779",
  );
  const leftSide = entrance
    ? [
        [-depth / 2 + 0.185, entrance.point[2] - entrance.width / 2],
        [entrance.point[2] + entrance.width / 2, depth / 2],
      ]
    : [[-depth / 2 + 0.185, depth / 2]];
  for (const [start, end] of leftSide)
    box(
      section,
      [0.24, 0.638, end - start],
      [-width / 2 + 0.065, 0.319, (start + end) / 2],
      "#878779",
    );
  const roof = height - 0.145;
  const roofStrip = 2.2;
  box(
    section,
    [width - 0.16, 0.24, roofStrip],
    [0, roof - 0.12, -depth / 2 + roofStrip / 2 + 0.08],
    "#5b6260",
  );
  box(
    section,
    [1.56, 0.24, depth - roofStrip - 0.16],
    [-width / 2 + 0.86, roof - 0.12, roofStrip / 2],
    "#5b6260",
  );
  box(section, [width + 0.1, 0.24, depth + 0.1], [0, -0.65, 0], "#686d66");
  for (const side of [-1, 1]) {
    const columnX = side * (width / 2 - 0.68);
    const columns =
      side < 0 ? [-depth / 2 + 0.62, depth / 2 - 0.62] : [-depth / 2 + 0.62];
    for (const columnZ of columns)
      box(
        section,
        [0.49, roof + 0.53, 0.49],
        [columnX, (roof - 0.53) / 2, columnZ],
        "#a19d8f",
      );
  }
  box(
    section,
    [width - 0.85, 0.38, 0.44],
    [0, roof - 0.35, -depth / 2 + roofStrip],
    "#85877b",
  );
  if (entrance) {
    const [x, , z] = entrance.point;
    for (const side of [-1, 1])
      box(
        section,
        [0.24, 2.61, 0.085],
        [x + 0.07, 1.305, z + side * (entrance.width / 2 + 0.038)],
        "#596c70",
        { metalness: 0.24 },
      );
    box(
      section,
      [0.24, 0.09, entrance.width + 0.16],
      [x + 0.07, 2.61, z],
      "#596c70",
    );
  }
  return section;
}

function floorEnvelope(
  plan: THREE.Group,
  width: number,
  depth: number,
  entry: ReturnType<typeof campusBuildingEntrance>,
  front?: FloorFront,
) {
  const section = "#92978d";
  const back = -depth / 2 + floorRearWallInset;
  const end = depth / 2 - 0.1;
  const cut = front?.edge ?? end;
  box(
    plan,
    [width - 0.38, 1.27, floorRearWallThickness],
    [0, 0.6475, back],
    interiorWallColor,
  );
  box(plan, [width - 0.42, 0.14, 0.035], [0, 0.1, back + 0.087], "#7f8a8e");
  box(plan, [width - 0.38, 0.046, 0.194], [0, 1.293, back], section);
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - 0.1);
    if (front)
      box(
        front.group,
        [0.17, 0.46, end - cut],
        [x, 0.255, (cut + end) / 2],
        section,
      );
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
        [x, 0.255, (start + end) / 2],
        section,
      );
  }
}

function floorPlaque(
  parent: THREE.Group,
  name: string,
  title: string,
  position: SpacePoint,
  [width, height]: readonly [number, number],
  placement: "wall" | "reverse" | "ground",
  destinations?: string,
) {
  const pale = name === "floor-door-plaque";
  const background = pale ? "#d6d5c4" : "#36494d";
  const ink = pale ? "#24363d" : "#eceadb";
  const rim = new THREE.MeshStandardMaterial({
    color: background,
    roughness: 0.82,
  });
  const face = rim.clone();
  const canvas =
    typeof document === "undefined" ? null : document.createElement("canvas");
  if (canvas) {
    canvas.width = 768;
    canvas.height = Math.round((canvas.width * height) / width);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = pale ? "#999f91" : "#849990";
      ctx.lineWidth = 3;
      ctx.strokeRect(7, 7, w - 14, h - 14);
      ctx.fillStyle = ink;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.font = `600 ${Math.round(h * (destinations ? 0.64 : 0.55))}px sans-serif`;
      ctx.fillText(title, w * (destinations ? 0.155 : 0.5), h * 0.53, w * 0.85);
      if (destinations) {
        ctx.beginPath();
        ctx.moveTo(w * 0.3, h * 0.18);
        ctx.lineTo(w * 0.3, h * 0.82);
        ctx.stroke();
        ctx.textAlign = "left";
        ctx.font = `600 ${Math.round(h * 0.28)}px sans-serif`;
        ctx.fillText("楼梯", w * 0.35, h * 0.32);
        ctx.fillText(`${destinations} →`, w * 0.35, h * 0.72, w * 0.6);
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      face.color.set("#ffffff");
      face.map = map;
    }
  }
  // 把印字放在实体铭牌的正面材质上，避免贴片与铭牌在远处争抢深度。
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(
      width,
      height,
      placement === "ground" ? 0.008 : 0.026,
    ),
    [rim, rim, rim, rim, face, rim],
  );
  plaque.name = name;
  plaque.position.set(...position);
  if (placement === "ground") plaque.rotation.x = -Math.PI / 2;
  if (placement === "reverse") plaque.rotation.y = Math.PI;
  parent.add(plaque);
  return plaque;
}

function floorToolCabinet(group: THREE.Group, item: FloorEquipment) {
  const {
    center: [x, z],
    width,
    height,
    depth,
  } = item;
  const casework = box(
    group,
    [width, height - 0.09, depth],
    [x, 0.14 + (height - 0.09) / 2, z],
    "#92998a",
  );
  casework.name = "floor-tool-cabinet";
  box(group, [width - 0.1, 0.09, depth - 0.075], [x, 0.095, z], "#535f59");
  const pitch = width / 3;
  const front = z + depth / 2;
  floorBayCorners(
    group,
    x,
    front + 0.64,
    width + 0.18,
    1.12,
    "#9aa4a6",
    "floor-tool-access",
  );
  for (const bay of [-1, 0, 1]) {
    const column = x + bay * pitch;
    const sections = bay < 1 ? 1 : 3;
    const panelHeight = (height - 0.21) / sections;
    for (let i = 0; i < sections; i++) {
      const y = 0.2 + (i + 0.5) * panelHeight;
      box(
        group,
        [pitch - 0.042, panelHeight - 0.027, 0.027],
        [column, y, front + 0.008],
        "#acaa93",
      );
      box(
        group,
        [0.13, 0.033, 0.035],
        [column + pitch * 0.28, y + (bay < 1 ? 0.08 : 0), front + 0.034],
        "#61675a",
      );
    }
  }
  return casework;
}

function floorBayCorners(
  group: THREE.Group,
  x: number,
  z: number,
  width: number,
  depth: number,
  color: string,
  name: string,
) {
  const marks = new THREE.Group();
  marks.name = name;
  marks.position.set(x, floorFinishHeight + 0.003, z);
  group.add(marks);
  for (const side of [-1, 1])
    for (const end of [-1, 1]) {
      const edgeX = side * (width / 2 - 0.025);
      const edgeZ = end * (depth / 2 - 0.035);
      box(marks, [0.26, 0.004, 0.036], [edgeX - side * 0.12, 0, edgeZ], color);
      box(
        marks,
        [0.036, 0.004, 0.16],
        [edgeX - side * 0.009, 0, edgeZ - end * 0.1],
        color,
      );
    }
}

function floorServiceCart(group: THREE.Group, item: FloorEquipment) {
  const {
    center: [x, z],
    width,
    height,
    depth,
  } = item;
  const cart = new THREE.Group();
  cart.position.set(x, 0.05, z);
  group.add(cart);
  const bedWidth = width - 0.44;
  const bedDepth = depth - 0.42;
  const frame = "#636d62";
  const paint = "#7a8578";
  const lower = 0.23;
  const upper = height - 0.22;
  const shelf = box(cart, [bedWidth, 0.05, bedDepth], [0, upper, 0], paint);
  shelf.name = "floor-service-cart";
  box(cart, [bedWidth, 0.06, bedDepth], [0, lower, 0], frame);
  for (const side of [-1, 1]) {
    const sideX = side * (bedWidth / 2 - 0.075);
    box(
      cart,
      [0.027, 0.034, bedDepth],
      [side * (bedWidth / 2 - 0.015), upper + 0.033, 0],
      paint,
    );
    for (const end of [-1, 1]) {
      const endZ = end * (bedDepth / 2 - 0.072);
      box(
        cart,
        [0.036, upper - lower, 0.036],
        [sideX, (upper + lower) / 2, endZ],
        frame,
      );
      box(cart, [0.047, 0.12, 0.05], [sideX, lower - 0.073, endZ], frame);
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.061, 0.061, 0.041, 12),
        new THREE.MeshStandardMaterial({ color: "#383f3c", roughness: 0.91 }),
      );
      wheel.position.set(sideX, 0.061, endZ);
      wheel.rotation.z = Math.PI / 2;
      cart.add(wheel);
    }
    box(
      cart,
      [0.038, height - upper, 0.038],
      [
        bedWidth / 2 - 0.045,
        (height + upper) / 2,
        side * (bedDepth / 2 - 0.072),
      ],
      frame,
    );
  }
  box(
    cart,
    [0.045, 0.043, bedDepth - 0.114],
    [bedWidth / 2 - 0.045, height - 0.016, 0],
    "#4f5a52",
  );

  floorBayCorners(group, x, z, width, depth, "#b9a779", "floor-cart-parking");
  const sign = floorPlaque(
    group,
    "floor-cart-bay",
    "推车位",
    [x, 0.053, z + depth / 2 + 0.22],
    [0.84, 0.25],
    "ground",
  );
  return [shelf, sign];
}

function floorCableTray(
  group: THREE.Group,
  tray: NonNullable<FloorArea["tray"]>,
  wallFace: number,
) {
  const {
    center: [x, z],
    width,
    height,
    depth,
  } = tray;
  const rails = [-1, 1].map((side) => {
    const lineZ = z + side * (depth / 2 - 0.021);
    const rail = box(
      group,
      [width, 0.088, 0.042],
      [x, height, lineZ],
      "#788581",
      { metalness: 0.26, roughness: 0.68 },
    );
    rail.name = "floor-tray-rail";
    for (const end of [-1, 1]) {
      box(
        group,
        [0.045, 0.103, 0.054],
        [x + end * (width / 2 - 0.012), height, lineZ],
        "#657477",
        {
          metalness: 0.27,
          roughness: 0.7,
        },
      ).name = "floor-tray-end";
    }
    return rail;
  });
  const spacing = 0.29;
  const count = Math.floor(width / spacing);
  const rungs = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.042, 0.03, depth - 0.078),
    new THREE.MeshStandardMaterial({
      color: "#98a19a",
      roughness: 0.7,
      metalness: 0.22,
    }),
    count,
  );
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < count; i++)
    rungs.setMatrixAt(
      i,
      matrix.makeTranslation(
        x + (i - (count - 1) / 2) * spacing,
        height - 0.025,
        z,
      ),
    );
  rungs.instanceMatrix.needsUpdate = true;
  rungs.name = "floor-tray-rungs";
  group.add(rungs);
  const armDepth = z + depth / 2 - wallFace;
  for (const fraction of [-0.46, -0.23, 0, 0.23, 0.46]) {
    const supportX = x + fraction * width;
    const plate = box(
      group,
      [0.15, 0.34, 0.045],
      [supportX, height - 0.17, wallFace + 0.02],
      "#6f7c7f",
    );
    plate.name = "floor-tray-mount";
    for (const level of [-0.282, -0.056])
      box(
        group,
        [0.032, 0.032, 0.017],
        [supportX + 0.05, height + level, wallFace + 0.047],
        "#9aa6a9",
      );
    box(
      group,
      [0.082, 0.061, armDepth],
      [supportX, height - 0.072, wallFace + armDepth / 2],
      "#818d85",
    );
    const brace = box(
      group,
      [0.054, 0.045, Math.hypot(armDepth * 0.7, 0.21)],
      [supportX, height - 0.191, wallFace + armDepth * 0.35],
      "#707e77",
    );
    brace.rotation.x = -Math.atan2(0.21, armDepth * 0.7);
  }
  return rails;
}

function floorBench(
  group: THREE.Group,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  staging: boolean,
) {
  const worktop = box(
    group,
    [width, 0.087, depth],
    [x, height + 0.0065, z],
    staging ? "#939084" : "#655f52",
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
  if (!staging) {
    const edge = width > depth ? depth / 2 - 0.065 : width / 2 - 0.065;
    box(
      group,
      [width - 0.17, 0.27, depth - 0.17],
      [x, height - 0.18, z],
      "#7b827b",
    );
    if (width > depth)
      box(
        group,
        [width * 0.44, 0.029, 0.046],
        [x, height - 0.17, z + edge],
        "#a4a69b",
      );
    else
      box(
        group,
        [0.046, 0.029, depth * 0.44],
        [x - edge, height - 0.17, z],
        "#a4a69b",
      );
  }
  return worktop;
}

const floorCabinets = {
  rack: { body: "#39474b", door: "#27383f", accent: "#718185" },
  ups: { body: "#64727a", door: "#3a4b52", accent: "#819594" },
  battery: { body: "#686e65", door: "#4f5d55", accent: "#b4b39d" },
  switchgear: { body: "#a5a699", door: "#858a80", accent: "#586660" },
} as const;

function floorCabinet(
  group: THREE.Group,
  kind: keyof typeof floorCabinets,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
) {
  const palette = floorCabinets[kind];
  const base = 0.05;
  const feet = 0.055;
  const front = z + depth / 2;
  const body = box(
    group,
    [width, height - feet, depth],
    [x, base + (height + feet) / 2, z],
    palette.body,
  );
  body.name = `floor-${kind}`;
  box(
    group,
    [width - 0.075, feet - 0.005, depth - 0.09],
    [x, base + feet / 2, z],
    "#49504b",
  );
  if (kind !== "rack") {
    for (const side of [-1, 1])
      box(
        group,
        [0.104, feet, 0.085],
        [x + side * (width / 2 - 0.062), base + feet / 2, front - 0.045],
        "#707b7d",
        { metalness: 0.23, roughness: 0.72 },
      ).name = "floor-cabinet-foot";
  }
  box(
    group,
    [width - 0.09, height * 0.83, 0.037],
    [x, base + height * 0.53, front + 0.012],
    palette.door,
  );
  const face = (w: number, h: number, y: number, color: string, offset = 0) =>
    box(
      group,
      [w, h, 0.014],
      [x + offset, base + height * y, front + 0.036],
      color,
    );
  if (kind === "battery") {
    for (const y of [0.27, 0.43, 0.59, 0.75]) {
      face(width * 0.73, 0.024, y, "#38413c");
      face(width * 0.21, 0.04, y - 0.034, palette.accent);
    }
  } else if (kind === "switchgear") {
    for (const y of [0.36, 0.65]) {
      face(width * 0.76, 0.024, y, "#57605b");
      face(width * 0.24, height * 0.082, y + 0.066, "#536661");
    }
    face(width * 0.33, 0.061, 0.83, "#bcc0ae");
  } else {
    const lines =
      kind === "rack" ? [0.2, 0.41, 0.62, 0.79] : [0.21, 0.24, 0.27];
    for (const y of lines) face(width * 0.62, 0.025, y, palette.accent);
    if (kind === "ups") face(width * 0.42, height * 0.105, 0.73, "#617d7c");
  }
  face(0.03, height * 0.11, 0.56, palette.accent, width * 0.38);
  return body;
}

function floorDoor(
  group: THREE.Group,
  { x, z, width }: FloorArea["doorway"],
  room: boolean,
) {
  const sill = box(
    group,
    [width - 0.012, 0.02, 0.258],
    [x, floorFinishHeight - 0.007, z],
    "#949fa1",
    { metalness: 0.17, roughness: 0.8 },
  );
  sill.name = "floor-door-sill";
  if (room) {
    const fixture = new THREE.Group();
    fixture.position.set(x, entranceFixture.position[1], z);
    group.add(fixture);
    buildEntrance(fixture);
    return;
  }
  const height = supportDoorHeight;
  const frame = "#607779";
  for (const side of [-1, 1])
    box(
      group,
      [0.074, height, 0.238],
      [x + side * (width / 2 + 0.035), 0.05 + height / 2, z],
      frame,
    );
  box(group, [width + 0.146, 0.084, 0.238], [x, height + 0.054, z], frame);
  const leaf = new THREE.Group();
  leaf.position.set(x - width / 2 + 0.025, 0.052, z + 0.084);
  leaf.rotation.y = -Math.PI / 2;
  group.add(leaf);
  const leafWidth = Math.min(1, width - 0.06);
  box(
    leaf,
    [leafWidth, height - 0.08, 0.049],
    [leafWidth / 2, (height - 0.08) / 2, 0],
    "#596e72",
  );
  box(
    leaf,
    [leafWidth - 0.09, 0.25, 0.013],
    [leafWidth / 2, 0.16, -0.029],
    "#7d8c8b",
    { metalness: 0.21 },
  );
  box(leaf, [0.14, 0.027, 0.048], [leafWidth - 0.15, 1.01, -0.048], "#a6aaa1", {
    metalness: 0.27,
  });
}

const supportDoorHeight = 2.3;

function floorApproach(
  plan: THREE.Group,
  x: number,
  width: number,
  start: number,
  end: number,
  finish: ReturnType<typeof floorFinishes>,
) {
  const thickness = 0.034;
  const length = end - start;
  const access = box(
    plan,
    [width, thickness, length],
    [
      x,
      (corridorFinishHeight + floorFinishHeight - thickness) / 2,
      (start + end) / 2,
    ],
    corridorFinishColor,
    finish,
  );
  const positions = access.geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++)
    positions.setY(
      i,
      positions.getY(i) +
        (positions.getZ(i) / length) *
          (floorFinishHeight - corridorFinishHeight),
    );
  access.geometry.computeVertexNormals();
  access.name = "floor-door-approach";
  floorSurfaceUV(access);
  return access;
}

function floorGrilleBands(group: THREE.Group) {
  for (const {
    position: [x, , z],
    span,
    count,
  } of floorGrilleRows) {
    const depth = floorGrilleSettings.depth;
    box(group, [span, 0.006, depth], [x, 0.053, z], "#435456");
    const step = span / count;
    for (let joint = 1; joint < count; joint++)
      box(
        group,
        [0.017, 0.006, depth],
        [x - span / 2 + joint * step, 0.059, z],
        "#738382",
      );
    for (const offset of [-0.31, -0.12, 0.12, 0.31])
      box(
        group,
        [span - 0.03, 0.005, 0.019],
        [x, 0.061, z + depth * offset],
        "#5e716f",
      );
  }
}

export function createCampusGeometry(
  scope: CampusNode,
  children: CampusNode[],
  shadow = contactMaterial(),
  partOfBuilding = false,
) {
  const plan = new THREE.Group();
  const [width, , depth] = scope.size;
  const site = scope.kind === "campus";
  const building = scope.kind === "building";
  const floorPlan = campusFloorPlan(scope.id);
  const floorFinish = floorPlan && floorFinishes();
  const wallContact = floorPlan && floorContactFinish();
  const upstairs = scope.kind === "floor" && scope.origin[1] > 0;
  const front =
    partOfBuilding && upstairs
      ? {
          edge:
            Math.max(
              ...children.map((child) => child.origin[2] + child.size[2] / 2),
            ) + 0.22,
          group: new THREE.Group(),
        }
      : undefined;
  if (front) {
    front.group.name = "upper-floor-section-front";
    plan.add(front.group);
  }
  const section = building
    ? buildingSection(plan, scope, children.length)
    : null;
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
  if (!partOfBuilding) {
    if (floorPlan) {
      floorDeck(
        plan,
        width,
        depth,
        -0.2,
        0.3,
        "#81878a",
        upstairs ? floorPlan.stair : undefined,
      );
    } else {
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
      else outline(slab, building ? "#78847f" : "#777f78");
    }
  }
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
    floorDeck(
      plan,
      scope.size[0] - 0.06,
      scope.size[2] - 0.06,
      -0.0255,
      0.075,
      "#838a8c",
      upstairs ? floorPlan.stair : undefined,
      front,
      floorConcreteFinish(),
    );
    const { center, width, depth } = floorPlan.corridor;
    const corridor = box(
      plan,
      [width, 0.025, depth],
      [center[0], corridorFinishHeight - 0.0125, center[1]],
      corridorFinishColor,
      floorFinish ?? undefined,
    );
    corridor.name = "floor-corridor";
    floorSurfaceUV(corridor);
    const corridorBack = center[1] - depth / 2;
    const wallFace =
      -scope.size[2] / 2 + floorRearWallInset + floorRearWallThickness / 2;
    const edgeFill = box(
      plan,
      [width, 0.025, corridorBack - wallFace],
      [center[0], corridorFinishHeight - 0.0125, (corridorBack + wallFace) / 2],
      corridorFinishColor,
      floorFinish!,
    );
    edgeFill.name = "floor-corridor-wall-edge";
    floorSurfaceUV(edgeFill);
    floorWallContact(
      plan,
      wallContact!,
      center[0],
      wallFace + 0.025,
      corridorFinishHeight,
      width,
      0,
    );
    floorStair(
      plan,
      floorPlan.stair,
      center[1] + depth / 2,
      upstairs,
      floorFinish!,
    );
    const entrance =
      scope.origin[1] === 0 && scope.parent
        ? campusBuildingEntrance(scope.parent)
        : null;
    floorEnvelope(plan, scope.size[0], scope.size[2], entrance, front);
    labelObstacles.push(
      floorPlaque(
        plan,
        "floor-stair-direction",
        scope.name.replace(/\s*层$/u, ""),
        [floorPlan.stair.center[0], 0.948, -scope.size[2] / 2 + 0.198],
        [2.68, 0.63],
        "wall",
        children.map(({ name }) => name).join(" · "),
      ),
    );
    if (entrance) {
      const [edge, , z] = entrance.point;
      const corridorEdge = center[0] - width / 2;
      const threshold = box(
        plan,
        [corridorEdge - edge, 0.04, entrance.width],
        [(edge + corridorEdge) / 2, corridorFinishHeight - 0.02, z],
        "#98a1a4",
        floorFinish!,
      );
      threshold.name = "floor-building-threshold";
      floorSurfaceUV(threshold);
      labelObstacles.push(threshold);
    }
  }
  const marks = children.map((child, index) => {
    const group = new THREE.Group();
    group.position.set(...child.origin);
    group.rotation.y = child.yaw;
    plan.add(group);
    const [w, h, d] = child.size;
    let pick: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    let floorFront: FloorFront | undefined;
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
          true,
        );
        floorFront = floor.front;
        group.add(floor.plan);
        labelObstacles.push(...floor.labelObstacles);
        exposedFloorStructure(
          group,
          w,
          d,
          child.origin[1] > 0 ? campusFloorPlan(child.id)?.stair : undefined,
          floorFront,
        );
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
        floorFinishColor,
        floorFinish ?? undefined,
      );
      pick.name = "floor-room-finish";
      floorSurfaceUV(pick);
      const cutWall = (
        width: number,
        depth: number,
        x: number,
        z: number,
        height = 0.72,
      ) => {
        const longX = width > depth;
        const wall = box(
          group,
          [width, height, depth],
          [x, floorFinishHeight + height / 2, z],
          interiorWallColor,
        );
        wall.name = "floor-interior-wall";
        box(
          group,
          [width + (longX ? 0 : 0.04), 0.035, depth + (longX ? 0.04 : 0)],
          [x, 0.0675 + height, z],
          "#949c9e",
        );
        for (const side of [-1, 1]) {
          box(
            group,
            longX ? [width - 0.037, 0.12, 0.022] : [0.022, 0.12, depth - 0.037],
            longX
              ? [x, 0.11, z + side * (depth / 2 + 0.009)]
              : [x + side * (width / 2 + 0.009), 0.11, z],
            "#828e93",
          );
        }
        if (wallContact) {
          const side = (longX ? z : x) > 0 ? -1 : 1;
          floorWallContact(
            group,
            wallContact,
            longX ? x : x + side * (width / 2 + 0.02),
            longX ? z + side * (depth / 2 + 0.02) : z,
            floorFinishHeight,
            (longX ? width : depth) - 0.04,
            longX ? (side > 0 ? 0 : Math.PI) : (side * Math.PI) / 2,
          );
        }
        if (longX && height > 1) {
          if (room) {
            for (let joint = -w / 2 + 0.3; joint < w / 2; joint += 1.4) {
              if (Math.abs(joint - x) >= width / 2 - 0.035) continue;
              box(
                group,
                [0.009, height - 0.19, 0.008],
                [joint, height / 2 + 0.096, z + depth / 2 + 0.0035],
                "#8b969a",
              );
            }
          } else {
            const seams = Math.ceil(width / 2.9);
            for (let i = 1; i < seams; i++)
              box(
                group,
                [0.021, height - 0.19, 0.014],
                [
                  x - width / 2 + (i * width) / seams,
                  height / 2 + 0.096,
                  z + depth / 2 + 0.004,
                ],
                "#9ca4a6",
              );
          }
        }
      };
      cutWall(w, 0.17, 0, d / 2, 0.46);
      cutWall(0.17, d - 0.18, -w / 2, 0);
      cutWall(0.17, d - 0.18, w / 2, 0);
      if (area) {
        const { doorway, equipment, tray } = area;
        const wallZ = -d / 2;
        const wallDepth = room ? 0.16 : 0.19;
        const openingTop = room
          ? entranceOpening.top
          : floorFinishHeight + supportDoorHeight;
        const wallTop = 2.69;
        if (room) floorGrilleBands(group);
        const sides = [
          -w / 2,
          doorway.x - doorway.width / 2,
          doorway.x + doorway.width / 2,
          w / 2,
        ];
        for (const i of [0, 2]) {
          const span = sides[i + 1] - sides[i];
          cutWall(
            span,
            wallDepth,
            sides[i] + span / 2,
            wallZ,
            wallTop - floorFinishHeight,
          );
        }
        box(
          group,
          [doorway.width, wallTop - openingTop, wallDepth - 0.001],
          [doorway.x, (openingTop + wallTop) / 2, wallZ],
          interiorWallColor,
        );
        floorDoor(group, doorway, room);
        const plaqueWidth = 1.48;
        const jamb = doorway.width / 2 + 0.18 + plaqueWidth / 2;
        const preferredSide = tray && tray.center[0] > doorway.x ? -1 : 1;
        const preferredX = doorway.x + preferredSide * jamb;
        const plaqueX =
          Math.abs(preferredX) + plaqueWidth / 2 < w / 2
            ? preferredX
            : doorway.x - preferredSide * jamb;
        for (const side of [-1, 1])
          labelObstacles.push(
            floorPlaque(
              group,
              "floor-door-plaque",
              child.name,
              [plaqueX, 1.68, wallZ + side * (wallDepth / 2 + 0.013)],
              [plaqueWidth, 0.37],
              side === 1 ? "wall" : "reverse",
            ),
          );
        if (tray)
          labelObstacles.push(
            ...floorCableTray(group, tray, doorway.z + 0.095),
          );
        const { fromZ, x } = area.access;
        access = floorApproach(
          plan,
          x,
          doorway.width,
          fromZ + floorPlan!.corridor.depth / 2,
          child.origin[2] + wallZ,
          floorFinish!,
        );
        labelObstacles.push(access, {
          frame: group,
          bounds: new THREE.Box3(
            new THREE.Vector3(sides[1], 0, doorway.z - 0.13),
            new THREE.Vector3(sides[2], openingTop, doorway.z + 0.13),
          ),
        });
        for (const item of equipment) {
          const { kind, width, height, depth, center, name } = item;
          if (kind === "tools" || kind === "cart") {
            contactShadow(group, shadow, width + 0.19, depth + 0.24, [
              center[0] + 0.03,
              0.054,
              center[1] + 0.028,
            ]);
            if (kind === "tools")
              labelObstacles.push(floorToolCabinet(group, item));
            else labelObstacles.push(...floorServiceCart(group, item));
            continue;
          }
          const furniture = kind === "bench" || kind === "staging";
          const count =
            furniture || kind === "rack" ? 1 : Math.ceil(width / 0.88);
          if (count > 1) {
            contactShadow(group, shadow, width + 0.34, depth + 0.4, [
              center[0] + 0.06,
              floorFinishHeight + 0.004,
              center[1] + 0.053,
            ]);
            floorBayCorners(
              group,
              center[0],
              center[1] + depth / 2 + 0.86,
              width + 0.14,
              1.44,
              "#a0a9ab",
              "floor-service-area",
            );
            labelObstacles.push(
              floorPlaque(
                group,
                "floor-cabinet-group-mark",
                name.replace(/\s*柜列$/u, ""),
                [center[0], 0.053, center[1] + depth / 2 + 0.7],
                [2, 0.55],
                "ground",
              ),
            );
          }
          const pitch = width / count;
          for (let unit = 0; unit < count; unit++) {
            const x = center[0] + (unit - (count - 1) / 2) * pitch;
            const z = center[1];
            if (count === 1)
              contactShadow(group, shadow, pitch + 0.27, depth + 0.36, [
                x + 0.058,
                0.054,
                z + 0.054,
              ]);
            labelObstacles.push(
              furniture
                ? floorBench(
                    group,
                    x,
                    z,
                    pitch - 0.07,
                    depth,
                    height,
                    kind === "staging",
                  )
                : floorCabinet(group, kind, x, z, pitch - 0.07, depth, height),
            );
          }
        }
      } else {
        box(group, [w, 0.6, 0.16], [0, 0.3, -d / 2], interiorWallColor);
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
    const labelPoint = building
      ? new THREE.Vector3((index % 2 ? -1 : 1) * w * 0.26, 0.04, d / 2 - 0.5)
      : zone?.kind === "heat"
        ? new THREE.Vector3(w * 0.32, 0.08, -d / 2 + 0.5)
        : zone?.kind === "backup"
          ? new THREE.Vector3(-0.26, 2.42, 0)
          : new THREE.Vector3(
              labelX,
              zone ? 0.04 : site ? h + 0.8 : labelHeight,
              labelDepth,
            );
    return {
      child,
      pick,
      border,
      access,
      floorFront,
      labelPoint,
      labelOutward: area
        ? group.localToWorld(
            new THREE.Vector3(
              labelX,
              labelHeight,
              labelDepth + Math.sign(labelDepth),
            ),
          )
        : undefined,
      point: group.localToWorld(labelPoint.clone()),
    };
  });
  const arrangeFloors = section
    ? (separated: boolean) => {
        section.visible = !separated;
        for (const [index, mark] of marks.entries()) {
          const group = mark.pick.parent!;
          group.position.y =
            mark.child.origin[1] + (separated ? index * 4.8 : 0);
          const depth = mark.child.size[2];
          const limit = separated
            ? depth / 2
            : (mark.floorFront?.edge ?? depth / 2);
          if (mark.floorFront) mark.floorFront.group.visible = separated;
          mark.pick.scale.z = (limit + depth / 2) / depth;
          mark.pick.position.z = (limit - depth / 2) / 2;
          mark.labelPoint.z = limit - 0.5;
          group.localToWorld(mark.point.copy(mark.labelPoint));
        }
      }
    : undefined;
  arrangeFloors?.(false);
  return { plan, marks, labelObstacles, arrangeFloors, front };
}
