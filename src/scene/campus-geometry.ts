import * as THREE from "three";
import {
  campusBuildingEntrance,
  campusChildren,
  campusFloorPlan,
  campusSitePlan,
  type CampusNode,
  type SpacePoint,
} from "../campus-layout";

function box(
  parent: THREE.Group,
  size: SpacePoint,
  position: SpacePoint,
  color: string,
  finish?: { roughness: number; metalness: number },
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

function facade(
  target: THREE.Group,
  width: number,
  height: number,
  depth: number,
  bands: number,
) {
  const metal = { roughness: 0.39, metalness: 0.19 };
  box(target, [width, height, depth], [0, height / 2, 0], "#566873");
  box(
    target,
    [width + 0.48, 0.25, depth + 0.48],
    [0, height, 0],
    "#84939a",
    metal,
  );
  box(
    target,
    [width - 1.1, 0.12, depth - 1.1],
    [0, height + 0.14, 0],
    "#4f6571",
  );
  box(target, [width + 0.12, 0.34, depth + 0.12], [0, 0.17, 0], "#344651");
  for (const side of [-1, 1]) {
    box(
      target,
      [width + 0.48, 0.22, 0.13],
      [0, height + 0.22, side * (depth / 2 + 0.17)],
      "#758893",
      metal,
    );
    box(
      target,
      [0.13, 0.22, depth + 0.2],
      [side * (width / 2 + 0.17), height + 0.22, 0],
      "#758893",
      metal,
    );
    for (let x = -width / 2 + 4.0; x < width / 2 - 1; x += 4.0)
      box(
        target,
        [0.028, height - 0.44, 0.025],
        [x, height / 2 + 0.07, side * (depth / 2 + 0.013)],
        "#465a66",
      );
    for (let z = -depth / 2 + 4.0; z < depth / 2 - 1; z += 4.0)
      box(
        target,
        [0.025, height - 0.44, 0.028],
        [side * (width / 2 + 0.013), height / 2 + 0.07, z],
        "#465a66",
      );
  }
  for (let i = 0; i < bands; i++) {
    const y = ((i + 0.5) * height) / bands;
    box(
      target,
      [width - 1, 0.72, 0.06],
      [0, y, depth / 2 + 0.04],
      "#1d3442",
      metal,
    );
    box(
      target,
      [0.06, 0.72, depth - 1],
      [width / 2 + 0.04, y, 0],
      "#1d3442",
      metal,
    );
    box(
      target,
      [width - 1, 0.045, 0.15],
      [0, y - 0.36, depth / 2 + 0.09],
      "#81949c",
      metal,
    );
    box(
      target,
      [0.15, 0.045, depth - 1],
      [width / 2 + 0.09, y - 0.36, 0],
      "#81949c",
      metal,
    );
    for (let x = -width / 2 + 1.7; x < width / 2 - 1; x += 2.8)
      box(target, [0.13, 0.72, 0.13], [x, y, depth / 2 + 0.09], "#697d88");
  }
  for (const x of [-width / 2 + 0.72, width / 2 - 0.72]) {
    box(
      target,
      [0.96, height, 0.1],
      [x, height / 2, depth / 2 + 0.09],
      "#7b8c96",
    );
  }
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
) {
  return box(plan, [width, 0.026, depth], [center[0], y, center[1]], color);
}

function outdoorEquipment(
  group: THREE.Group,
  kind: "heat" | "backup" | "yard",
  width: number,
  depth: number,
  shadow: THREE.MeshBasicMaterial,
) {
  if (kind === "heat") {
    for (const z of [-2.4, 2.4]) {
      contactShadow(group, shadow, 4.55, 3.65, [-0.51, 0.024, z + 0.12]);
      box(group, [3.9, 0.12, 2.9], [-0.6, 0.08, z], "#8d9ca5");
      box(group, [3.5, 1.65, 2.45], [-0.6, 0.95, z], "#82919c");
      box(group, [0.06, 1.08, 2.14], [1.165, 0.99, z], "#303f49");
      for (let line = -4; line <= 4; line++)
        box(
          group,
          [0.09, 0.028, 2.02],
          [1.21, 0.99 + line * 0.115, z],
          "#748894",
        );
      for (const x of [-1.48, 0.25]) {
        const grille = new THREE.Mesh(
          new THREE.CylinderGeometry(0.65, 0.65, 0.08, 24),
          new THREE.MeshStandardMaterial({ color: "#344854", roughness: 0.83 }),
        );
        grille.position.set(x, 1.82, z);
        group.add(grille);
        const guard = new THREE.MeshStandardMaterial({
          color: "#738b95",
          roughness: 0.52,
          metalness: 0.18,
        });
        for (const radius of [0.24, 0.41, 0.58]) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(radius, 0.015, 5, 32),
            guard,
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(x, 1.867, z);
          group.add(ring);
        }
        box(group, [1.2, 0.023, 0.035], [x, 1.86, z], "#718893");
        box(group, [0.035, 0.023, 1.2], [x, 1.86, z], "#718893");
      }
    }
  } else if (kind === "backup") {
    contactShadow(group, shadow, 6.55, 4.2, [-0.16, 0.024, 0.13]);
    box(group, [5.8, 0.18, 3.4], [-0.26, 0.12, 0], "#7d8991");
    box(group, [5.3, 2.24, 2.75], [-0.26, 1.3, 0], "#7c8585");
    const end = 2.4;
    box(group, [0.06, 1.35, 1.8], [end, 1.33, 0], "#3d4a50");
    for (let i = -3; i <= 3; i++)
      box(
        group,
        [0.075, 0.033, 1.64],
        [end + 0.04, 1.33 + i * 0.16, 0],
        "#737f82",
      );
    for (let i = -4; i <= 4; i++)
      box(group, [0.056, 1.78, 0.04], [i * 0.54 - 0.26, 1.3, 1.4], "#627176");
  } else {
    const paint = "#a0a18b";
    for (const x of [-width * 0.32, 0, width * 0.32])
      box(group, [0.08, 0.02, depth * 0.58], [x, 0.04, 0.35], paint);
    box(group, [width * 0.64, 0.02, 0.08], [0, 0.04, depth * 0.315], paint);
    box(
      group,
      [width * 0.84, 0.14, 0.14],
      [0, 0.08, -depth / 2 + 0.24],
      "#77848b",
    );
  }
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
  const sitePlan = campusSitePlan(scope.id);
  const siteAccess = new Map<string, ReturnType<typeof siteSurface>>();
  const slab = box(
    plan,
    [width + (building ? 3 : 0), 0.3, depth + (building ? 3 : 0)],
    [0, building ? -1.15 : -0.2, 0],
    site ? "#2c4248" : building ? "#1f3442" : "#283b48",
  );
  outline(slab, "#577282");
  if (sitePlan) {
    const { mainRoad, serviceRoad, entrance } = sitePlan;
    const roadColor = "#34434c";
    siteSurface(plan, mainRoad, roadColor);
    siteSurface(plan, serviceRoad, roadColor);
    siteSurface(
      plan,
      { center: [-25.75, -3.0], width: 8, depth: 29 },
      "#374e4a",
    );
    for (const zone of sitePlan.zones)
      siteAccess.set(zone.id, siteSurface(plan, zone.access, "#517780"));
    for (let x = -29.5; x <= 30; x += 4)
      box(plan, [1.7, 0.012, 0.075], [x, 0.006, mainRoad.center[1]], "#a4a99a");
    for (let z = -15; z < 12; z += 4)
      box(
        plan,
        [0.075, 0.012, 1.7],
        [serviceRoad.center[0], 0.006, z],
        "#a4a99a",
      );
    if (entrance) {
      const [x, , z] = entrance.point;
      const length = mainRoad.center[1] - mainRoad.depth / 2 - z;
      const buildingId = children.find(({ kind }) => kind === "building")?.id;
      const entranceSurface = siteSurface(
        plan,
        { center: [x, z + length / 2], width: entrance.width, depth: length },
        "#517780",
        0.015,
      );
      if (buildingId) siteAccess.set(buildingId, entranceSurface);
    }
    const treeShadow = contactMaterial(true);
    for (const [x, z] of [
      [-26.7, -14.1],
      [-24.3, -8.6],
      [-26.1, -2.1],
      [-24.6, 4.2],
      [-26.5, 9.3],
    ]) {
      contactShadow(plan, treeShadow, 2.6, 2.1, [x + 0.35, 0.004, z + 0.14]);
      box(plan, [0.22, 1.15, 0.22], [x, 0.55, z], "#50625e");
      const crown = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.15, 1),
        new THREE.MeshStandardMaterial({ color: "#4c675e", roughness: 0.95 }),
      );
      crown.scale.y = 1.22;
      crown.position.set(x, 1.8, z);
      plan.add(crown);
    }
  } else if (floorPlan) {
    const { center, width, depth } = floorPlan.corridor;
    const corridor = box(
      plan,
      [width, 0.045, depth],
      [center[0], -0.02, center[1]],
      "#435967",
    );
    outline(corridor, "#586d78");
    const { stair } = floorPlan;
    const [x, z] = stair.center;
    const landingDepth = z - stair.depth / 2 - center[1];
    box(
      plan,
      [stair.width, 0.03, landingDepth],
      [x, 0.017, center[1] + landingDepth / 2],
      "#566b73",
    );
    const core = box(
      plan,
      [stair.width, 0.12, stair.depth],
      [x, 0.05, z],
      "#536570",
    );
    outline(core, "#90a2a7");
    for (let step = 0; step < 8; step++) {
      const height = 0.14 + step * 0.068;
      box(
        plan,
        [stair.width * 0.78, height, 0.47],
        [x, height / 2 + 0.1, z - 2 + step * 0.54],
        "#798997",
      );
    }
    const entrance = scope.parent && campusBuildingEntrance(scope.parent);
    if (scope.origin[1] === 0 && entrance) {
      const [edge, , z] = entrance.point;
      box(
        plan,
        [0.64, 0.04, entrance.width],
        [edge + 0.32, 0.023, z],
        "#73999d",
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
    if (zone) {
      pick = siteSurface(
        group,
        { center: [0, 0], width: w, depth: d },
        "#495f68",
        0.008,
      );
      outdoorEquipment(group, zone.kind, w, d, shadow);
    } else if (site || building) {
      if (building) {
        group.add(
          createCampusGeometry(child, campusChildren(child.id), shadow).plan,
        );
        box(group, [w, 0.4, d], [0, -0.44, 0], "#3a5564");
        pick = box(group, [w, 0.58, d], [0, -0.24, 0], "#6ec9d1");
      } else {
        contactShadow(group, shadow, w + 2.2, d + 2.3, [0.32, 0.006, -0.28]);
        facade(group, w, h, d, campusChildren(child.id).length);
        const entrance = campusBuildingEntrance(child.id);
        if (entrance)
          box(
            group,
            [0.07, 2.6, entrance.width],
            [entrance.point[0] - 0.04, 1.3, entrance.point[2]],
            "#203a47",
          );
        for (const x of [-9, 3, 9])
          box(group, [4.2, 0.52, 2.1], [x, h + 0.46, -4], "#607689");
        pick = box(group, [w, h, d], [0, h / 2, 0], "#6ec9d1");
      }
      pick.material.transparent = true;
      pick.material.opacity = 0;
      pick.material.depthWrite = false;
    } else {
      const room = child.kind === "room";
      const area = floorPlan?.areas.find(({ id }) => id === child.id);
      pick = box(group, [w, 0.1, d], [0, 0, 0], room ? "#2d4651" : "#354754");
      const wall = "#718391";
      box(group, [w, 0.6, 0.16], [0, 0.3, d / 2], wall);
      box(group, [0.16, 0.6, d], [-w / 2, 0.3, 0], wall);
      box(group, [0.16, 0.6, d], [w / 2, 0.3, 0], wall);
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
          box(
            group,
            [span, 0.6, 0.16],
            [sides[i] + span / 2, 0.3, doorway.z],
            wall,
          );
        }
        const { fromZ, toZ, x } = area.access;
        access = box(
          plan,
          [Math.min(doorway.width, 0.85), 0.028, toZ - fromZ + 0.2],
          [x, 0.065, (fromZ + toZ + 0.2) / 2],
          "#517780",
        );
        for (const item of equipment) {
          const height = Math.min(
            item.height,
            item.kind === "rack" ? 0.82 : 1.05,
          );
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
            box(
              group,
              [pitch - 0.07, height, item.depth],
              [x, height / 2 + 0.05, z],
              color,
            );
            if (item.kind !== "bench")
              box(
                group,
                [pitch * 0.62, height * 0.64, 0.025],
                [x, height * 0.52 + 0.05, z + item.depth / 2 + 0.012],
                item.kind === "rack" ? "#253b48" : "#3c5362",
              );
          }
        }
      } else {
        box(group, [w, 0.6, 0.16], [0, 0.3, -d / 2], wall);
      }
    }
    const border = outline(pick, "#9ae1e7");
    border.visible = false;
    return {
      child,
      pick,
      border,
      access,
      point: group.localToWorld(
        building
          ? new THREE.Vector3(
              (index % 2 ? -1 : 1) * w * 0.26,
              0.12,
              d / 2 - 1.1,
            )
          : zone?.kind === "heat"
            ? new THREE.Vector3(-0.6, 1.77, 2.4)
            : zone?.kind === "backup"
              ? new THREE.Vector3(-0.26, 2.42, 0)
              : new THREE.Vector3(0, zone ? 0.04 : site ? h + 0.8 : 1.05, 0),
      ),
    };
  });
  return { plan, marks };
}
