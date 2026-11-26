import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { placeFlowLabel } from "../airflow-label-layout";
import {
  campusChildren,
  type CampusNode,
  type SpacePoint,
} from "../campus-layout";
import { createCampusGeometry } from "../scene/campus-geometry";

type CameraPreset = "overview" | "top";
type CampusPose = {
  position: SpacePoint;
  target: SpacePoint;
  zoom: number;
  preset: CameraPreset | { id: string } | null;
  separated?: boolean;
};
export type CampusCamera = CampusPose & {
  near?: { id: string; returnTo: CampusPose };
};
type CampusSceneControls = {
  select: (id: string) => void;
  show: (view: CameraPreset) => void;
  toggleNear: (id: string) => void;
  resize: () => void;
};

type LabelRect = { left: number; right: number; top: number; bottom: number };
type LabelLayout = "static" | "moving" | "settling";

const labelSettleDelay = 150;
const labelSettleStep = 6;
const campusSampleBudget = 3_250_000;

function shiftLabel(rect: LabelRect, x: number, y: number): LabelRect {
  return {
    left: rect.left + x,
    right: rect.right + x,
    top: rect.top + y,
    bottom: rect.bottom + y,
  };
}

function placeOutdoorLabel(
  preferred: LabelRect,
  radius: number,
  available: (box: LabelRect) => boolean,
) {
  // 先尝试同一设施周围的空白，避免名称飘到另一处场坪。
  for (let distance = 12; distance <= radius; distance += 12) {
    for (let step = 0; step < 16; step++) {
      const angle = (step * Math.PI) / 8;
      const box = shiftLabel(
        preferred,
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
      );
      if (available(box)) return box;
    }
  }
  return null;
}

function projectBuildingFootprint(
  corners: THREE.Vector3[],
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
) {
  if (!corners.length) return undefined;
  const view = corners.map((point) =>
    point.clone().applyMatrix4(camera.matrixWorldInverse),
  );
  const near = -camera.near;
  const visible = view.filter((point) => point.z <= near);
  if (!visible.length) return undefined;
  if (visible.length < view.length) {
    for (const axis of [1, 2, 4]) {
      for (const [index, start] of view.entries()) {
        if (index & axis) continue;
        const end = view[index | axis];
        const startVisible = start.z <= near;
        const endVisible = end.z <= near;
        if (startVisible === endVisible) continue;
        visible.push(
          start.clone().lerp(end, (near - start.z) / (end.z - start.z)),
        );
      }
    }
  }
  const points = visible
    .map((point) => {
      point.applyMatrix4(camera.projectionMatrix);
      return new THREE.Vector2(
        ((point.x + 1) * width) / 2,
        ((1 - point.y) * height) / 2,
      );
    })
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const outerEdge = (points: THREE.Vector2[]) => {
    const edge: THREE.Vector2[] = [];
    for (const point of points) {
      while (edge.length >= 2) {
        const a = edge[edge.length - 2];
        const b = edge[edge.length - 1];
        if ((b.x - a.x) * (point.y - a.y) > (b.y - a.y) * (point.x - a.x))
          break;
        edge.pop();
      }
      edge.push(point);
    }
    return edge.slice(0, -1);
  };
  const outline = [...outerEdge(points), ...outerEdge(points.reverse())];
  if (outline.length < 3) return undefined;

  // 沿建筑的投影轮廓避让，斜视时楼体两侧的空白仍可使用。
  const axes = [
    new THREE.Vector2(1, 0),
    new THREE.Vector2(0, 1),
    ...outline.map((point, index) => {
      const next = outline[(index + 1) % outline.length];
      return new THREE.Vector2(next.y - point.y, point.x - next.x);
    }),
  ];
  const intervals = axes.map(({ x, y }) => {
    const projected = outline.map((point) => point.x * x + point.y * y);
    return { x, y, min: Math.min(...projected), max: Math.max(...projected) };
  });
  return ({ left, right, top, bottom }: LabelRect) =>
    intervals.every(({ x, y, min, max }) => {
      const padding = 4 * (Math.abs(x) + Math.abs(y));
      const start = x * (x < 0 ? right : left) + y * (y < 0 ? bottom : top);
      const end = x * (x < 0 ? left : right) + y * (y < 0 ? top : bottom);
      return start < max + padding && end > min - padding;
    });
}

export function CampusScene({
  scope,
  selectedId,
  onSelect,
  cameras,
}: {
  scope: CampusNode;
  selectedId: string;
  onSelect: (id: string) => void;
  cameras: Map<string, CampusCamera>;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const cameraTools = useRef<HTMLDivElement>(null);
  const unavailableStatus = useRef<HTMLParagraphElement>(null);
  const unavailableFocus = useRef<HTMLButtonElement | null>(null);
  const nearButton = useRef<HTMLButtonElement>(null);
  const runtime = useRef<CampusSceneControls | null>(null);
  const [error, setError] = useState(false);
  const [nearScope, setNearScope] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<{
    scopeId: string;
    view: CameraPreset;
  } | null>(null);
  const activePreset =
    cameraPreset?.scopeId === scope.id ? cameraPreset.view : null;
  const select = useRef(onSelect);
  select.current = onSelect;

  useEffect(() => {
    const host = surface.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError(true);
      return;
    }
    setError(false);
    const devicePixelRatio = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.domElement.dataset.campusCanvas = scope.id;
    host.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 550);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 12;
    controls.maxDistance = Math.max(...scope.size) * 4.5;
    const outdoor = scope.kind === "campus";
    scene.add(
      new THREE.HemisphereLight(
        outdoor ? "#d7e6f3" : "#eef1f3",
        outdoor ? "#586675" : "#687075",
        1.68,
      ),
    );
    const light = new THREE.DirectionalLight(
      outdoor ? "#e8eef7" : "#f6f5f3",
      2.7,
    );
    light.position.set(-18, 32, 23);
    scene.add(light);
    const fill = new THREE.DirectionalLight(
      outdoor ? "#a5bfda" : "#e0e8ec",
      0.56,
    );
    fill.position.set(24, 12, -17);
    scene.add(fill);
    const children = campusChildren(scope.id);
    const sampleDetails =
      outdoor || children.some(({ kind }) => kind === "room");
    const { plan, marks, labelObstacles, arrangeFloors } = createCampusGeometry(
      scope,
      children,
    );
    if (outdoor) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
      light.position.multiplyScalar(2);
      light.castShadow = true;
      light.shadow.intensity = 0.56;
      light.shadow.mapSize.set(2048, 2048);
      light.shadow.bias = -0.00018;
      light.shadow.normalBias = 0.037;
      light.shadow.radius = 2;
      const sun = light.shadow.camera;
      sun.left = -42;
      sun.right = 42;
      sun.top = 38;
      sun.bottom = -38;
      sun.far = 150;
      sun.updateProjectionMatrix();
      plan.traverse((object) => {
        if (object instanceof THREE.Mesh && !object.material.transparent) {
          // 与路面贴合的标线只接收阴影。
          object.castShadow = !object.material.polygonOffset;
          object.receiveShadow = true;
        }
      });
    }
    scene.add(plan);
    const planBounds = new THREE.Box3().setFromObject(plan);
    const readObstacleBounds = () =>
      labelObstacles.map((obstacle) =>
        obstacle instanceof THREE.Mesh
          ? new THREE.Box3().setFromObject(obstacle)
          : obstacle.bounds.clone().applyMatrix4(obstacle.frame.matrixWorld),
      );
    let obstacleBounds = readObstacleBounds();
    const grid = new THREE.GridHelper(200, 50, "#385266", "#2a4355");
    grid.material.transparent = true;
    grid.material.opacity = 0.18;
    grid.position.y = scope.kind === "building" ? -0.78 : -0.39;
    scene.add(grid);
    const building = marks.find(({ child }) => child.kind === "building");
    const buildingCorners = building
      ? Array.from({ length: 8 }, (_, corner) => {
          const [width, height, depth] = building.child.size;
          return building.pick.localToWorld(
            new THREE.Vector3(
              ((corner & 1 ? 1 : -1) * width) / 2,
              ((corner & 2 ? 1 : -1) * height) / 2,
              ((corner & 4 ? 1 : -1) * depth) / 2,
            ),
          );
        })
      : [];
    const labelElements = new Map(
      Array.from(
        labels.current?.querySelectorAll<HTMLElement>("[data-space-label]") ??
          [],
      ).map((element) => [element.dataset.spaceLabel, element]),
    );
    const projected = new THREE.Vector3();
    const outward = new THREE.Vector3();
    const offset = new THREE.Vector2();
    const sight = new THREE.Raycaster();
    const sightDirection = new THREE.Vector3();
    const ownership = new Map<THREE.Object3D, string>();
    for (const { child, pick, access } of marks) {
      pick.parent?.traverse((object) => {
        if (object instanceof THREE.Mesh && !object.material.transparent)
          ownership.set(object, child.id);
      });
      if (access) ownership.set(access, child.id);
    }
    const readSolidObjects = () => {
      const meshes: THREE.Mesh[] = [];
      plan.traverseVisible((object) => {
        if (object instanceof THREE.Mesh && !object.material.transparent)
          meshes.push(object);
      });
      return meshes;
    };
    let solidObjects = readSolidObjects();
    const blocked = (id: string, point: THREE.Vector3) => {
      sightDirection.subVectors(point, camera.position);
      sight.far = sightDirection.length() - 0.05;
      sight.set(camera.position, sightDirection.normalize());
      return sight
        .intersectObjects(solidObjects, false)
        .some(({ object }) => ownership.get(object) !== id);
    };
    let preset: CampusPose["preset"] = null;
    const setPreset = (view: CampusPose["preset"]) => {
      if (preset === view) return;
      preset = view;
      setCameraPreset(
        typeof view === "string" ? { scopeId: scope.id, view } : null,
      );
    };
    let near: CampusCamera["near"];
    let interacting = false;
    let contextLost = false;
    let selected = selectedId;
    let labelTimer: number | undefined;
    const labelOffsets = new Map<HTMLElement, { x: number; y: number }>();
    const revealAfter = new Map<HTMLElement, number>();
    let separated = false;
    const showFloors = (next: boolean) => {
      if (!arrangeFloors || separated === next) return;
      separated = next;
      arrangeFloors(separated);
      plan.updateMatrixWorld(true);
      planBounds.setFromObject(plan);
      obstacleBounds = readObstacleBounds();
      solidObjects = readSolidObjects();
      labelOffsets.clear();
    };
    const labelLift = scope.kind === "floor" ? 0.5 : 1.25;
    const boxes = new Map<HTMLElement, { width: number; height: number }>();
    for (const node of labelElements.values()) {
      node.style.transform = `translate(-50%, ${-labelLift * 100}%)`;
      node.hidden = false;
      boxes.set(node, { width: node.offsetWidth, height: node.offsetHeight });
      node.hidden = true;
    }
    const viewCorners = Array.from({ length: 8 }, () => new THREE.Vector3());
    const screenCorner = new THREE.Vector3();
    const projectLabelObstacles = (width: number, height: number) => {
      const nearZ = -camera.near;
      return obstacleBounds.flatMap(({ min, max }) => {
        let left = Infinity;
        let right = -Infinity;
        let top = Infinity;
        let bottom = -Infinity;
        let inFront = 0;
        const include = (point: THREE.Vector3) => {
          const p = point.applyMatrix4(camera.projectionMatrix);
          const x = ((p.x + 1) * width) / 2;
          const y = ((1 - p.y) * height) / 2;
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        };
        for (const [i, corner] of viewCorners.entries()) {
          corner
            .set(
              i & 1 ? max.x : min.x,
              i & 2 ? max.y : min.y,
              i & 4 ? max.z : min.z,
            )
            .applyMatrix4(camera.matrixWorldInverse);
          if (corner.z <= nearZ) {
            inFront++;
            include(screenCorner.copy(corner));
          }
        }
        if (!inFront) return [];
        // 近裁面切过设备时，只投影可见一侧及其在裁面上的边。
        if (inFront < viewCorners.length) {
          for (const edge of [1, 2, 4]) {
            for (const [i, start] of viewCorners.entries()) {
              if (i & edge) continue;
              const end = viewCorners[i | edge];
              const startVisible = start.z <= nearZ;
              const endVisible = end.z <= nearZ;
              if (startVisible === endVisible) continue;
              include(
                screenCorner
                  .copy(start)
                  .lerp(end, (nearZ - start.z) / (end.z - start.z)),
              );
            }
          }
        }
        return left < width && right > 0 && top < height && bottom > 0
          ? [{ left, right, top, bottom }]
          : [];
      });
    };
    const layoutLabels = (layout: LabelLayout) => {
      const now = performance.now();
      let nextLayout = Infinity;
      const rect = host.getBoundingClientRect();
      const overlay = Array.from(
        host
          .closest(".campus-stage")
          ?.querySelectorAll<HTMLElement>(
            ".campus-camera, .campus-stage-heading, .campus-panel-switch",
          ) ?? [],
      );
      const occupied = overlay
        .filter((node) => node.checkVisibility())
        .map((node) => {
          const box = node.getBoundingClientRect();
          return {
            left: box.left - rect.left,
            right: box.right - rect.left,
            top: box.top - rect.top,
            bottom: box.bottom - rect.top,
          };
        });
      occupied.push(...projectLabelObstacles(rect.width, rect.height));
      const buildingFootprint = projectBuildingFootprint(
        buildingCorners,
        camera,
        rect.width,
        rect.height,
      );
      const viewport = {
        left: 0,
        top: 0,
        right: rect.width,
        bottom: rect.height,
      };
      const insideViewport = (box: LabelRect) =>
        box.left >= 8 &&
        box.top >= 8 &&
        box.right <= viewport.right - 8 &&
        box.bottom <= viewport.bottom - 8;
      const findOccupied = (box: LabelRect) =>
        occupied.find(
          (other) =>
            box.left < other.right + 4 &&
            box.right > other.left - 4 &&
            box.top < other.bottom + 4 &&
            box.bottom > other.top - 4,
        );
      const active = marks.find(({ child }) => child.id === selected);
      for (const mark of active
        ? [active, ...marks.filter((item) => item !== active)]
        : marks) {
        const node = labelElements.get(mark.child.id);
        if (!node) continue;
        const outdoor = mark.child.kind === "outdoor";
        const available = (box: LabelRect) =>
          insideViewport(box) &&
          !findOccupied(box) &&
          !(outdoor && buildingFootprint?.(box));
        projected.copy(mark.point).project(camera);
        const x = ((projected.x + 1) * rect.width) / 2;
        const y = ((1 - projected.y) * rect.height) / 2;
        const { width, height } = boxes.get(node)!;
        const anchor = {
          left: x - width / 2,
          right: x + width / 2,
          top: y - height * labelLift,
          bottom: y + height * (1 - labelLift),
        };
        const lastOffset = labelOffsets.get(node);
        const previous = lastOffset
          ? shiftLabel(anchor, lastOffset.x, lastOffset.y)
          : null;
        let label: LabelRect | null = null;
        if (
          Math.abs(projected.z) <= 1 &&
          x >= 0 &&
          x <= rect.width &&
          y >= 0 &&
          y <= rect.height &&
          !blocked(mark.child.id, mark.point)
        ) {
          if (layout === "moving") {
            // 镜头连续转动时保留相对锚点的位置，遇到遮挡立即让开。
            if (previous && available(previous)) label = previous;
          } else {
            offset.set(0, 0);
            if (mark.labelOutward) {
              outward.copy(mark.labelOutward).project(camera);
              offset
                .set(
                  (outward.x - projected.x) * rect.width,
                  (projected.y - outward.y) * rect.height,
                )
                .normalize();
              offset.multiplyScalar(
                (width * Math.abs(offset.x) + height * Math.abs(offset.y)) / 2 +
                  4,
              );
            }
            const preferred = shiftLabel(anchor, offset.x, offset.y);
            if (available(preferred)) {
              label = preferred;
            } else if (outdoor) {
              // 近看时设备本身占据更多画幅，为所选设施保留较大的避让范围。
              const radius =
                near?.id === mark.child.id
                  ? Math.max(96, Math.min(rect.width, rect.height) * 0.36)
                  : 96;
              label = placeOutdoorLabel(preferred, radius, available);
            } else {
              const collision = findOccupied(preferred);
              const args = [
                x + offset.x,
                preferred.top + height / 2,
                width,
                height,
                viewport,
                occupied,
                offset.x < 0,
              ] as const;
              label =
                placeFlowLabel(...args) ??
                (collision && placeFlowLabel(...args, collision)) ??
                null;
            }
          }
        }
        if (!label) revealAfter.delete(node);
        if (layout === "settling" && label) {
          const ready =
            revealAfter.get(node) ?? (previous ? now : now + labelSettleDelay);
          if (ready > now) {
            // 刚避让的标签在镜头短暂停顿时也要等到落位稳定。
            revealAfter.set(node, ready);
            nextLayout = Math.min(nextLayout, ready - now);
            label = null;
          } else if (previous) {
            const dx = label.left - previous.left;
            const dy = label.top - previous.top;
            const distance = Math.hypot(dx, dy);
            if (distance > labelSettleStep) {
              const step = labelSettleStep / distance;
              const next = shiftLabel(previous, dx * step, dy * step);
              if (available(next)) {
                label = next;
                nextLayout = Math.min(nextLayout, 16);
              } else {
                // 安全位置之间的直线经过设备时，先收起标签再恢复。
                revealAfter.set(node, now + labelSettleDelay);
                nextLayout = Math.min(nextLayout, labelSettleDelay);
                label = null;
              }
            }
          }
        }
        node.hidden = !label;
        if (label) {
          occupied.push(label);
          const x = label.left - anchor.left;
          const y = label.top - anchor.top;
          labelOffsets.set(node, { x, y });
          revealAfter.delete(node);
          node.style.translate = `${x}px ${y}px`;
        } else {
          labelOffsets.delete(node);
        }
        node.style.left = `${(projected.x + 1) * 50}%`;
        node.style.top = `${(1 - projected.y) * 50}%`;
      }
      return nextLayout;
    };
    const stopLabelSettle = () => {
      window.clearTimeout(labelTimer);
      labelTimer = undefined;
    };
    const settleLabels = () => {
      labelTimer = undefined;
      const next = layoutLabels("settling");
      if (Number.isFinite(next))
        labelTimer = window.setTimeout(settleLabels, next);
    };
    const render = (layout: "static" | "moving" = "static") => {
      stopLabelSettle();
      if (contextLost) return;
      renderer.render(scene, camera);
      revealAfter.clear();
      layoutLabels(layout);
      if (layout === "moving")
        labelTimer = window.setTimeout(settleLabels, labelSettleDelay);
    };
    const fit = (view: NonNullable<CampusPose["preset"]>) => {
      showFloors(view === "top");
      setPreset(view);
      const target =
        typeof view === "object"
          ? marks.find(({ child }) => child.id === view.id)?.pick.parent
          : null;
      const bounds = target
        ? new THREE.Box3().setFromObject(target)
        : planBounds;
      const direction =
        view === "top"
          ? (scope.kind === "building"
              ? new THREE.Vector3(0.06, 0.25, 1)
              : new THREE.Vector3(0, 1, 0.08)
            ).normalize()
          : (scope.kind === "building"
              ? new THREE.Vector3(0.31, 0.14, 1)
              : scope.kind === "floor" && view === "overview"
                ? new THREE.Vector3(0.44, 0.7, 1)
                : new THREE.Vector3(
                    0.72,
                    outdoor && view === "overview" ? 0.56 : 0.74,
                    0.97,
                  )
            ).normalize();
      const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
      const up = new THREE.Vector3().crossVectors(direction, right);
      const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const horizontalFit = !outdoor && view === "overview" ? 0.92 : 0.84;
      const { min, max } = bounds;
      bounds.getCenter(controls.target);
      if (view === "overview") controls.target.addScaledVector(up, -1.35);
      let distance = controls.minDistance;
      const relative = new THREE.Vector3();
      for (const x of [min.x, max.x])
        for (const y of [min.y, max.y])
          for (const z of [min.z, max.z]) {
            relative.set(x, y, z).sub(controls.target);
            distance = Math.max(
              distance,
              relative.dot(direction) +
                Math.max(
                  Math.abs(relative.dot(right)) /
                    (tangent * camera.aspect * horizontalFit),
                  Math.abs(relative.dot(up)) / (tangent * 0.76),
                ),
            );
          }
      camera.position
        .copy(controls.target)
        .addScaledVector(direction, distance);
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      controls.update();
      render();
    };
    const pose = (): CampusPose => ({
      position: camera.position.toArray(),
      target: controls.target.toArray(),
      zoom: camera.zoom,
      preset,
      separated: arrangeFloors ? separated : undefined,
    });
    const remember = () => cameras.set(scope.id, { ...pose(), near });
    const restore = (saved: CampusPose) => {
      if (saved.preset) {
        fit(saved.preset);
        return;
      }
      showFloors(saved.separated ?? false);
      setPreset(null);
      camera.position.set(...saved.position);
      controls.target.set(...saved.target);
      camera.zoom = saved.zoom;
      camera.updateProjectionMatrix();
      controls.update();
      render();
    };
    const returnFromNear = () => {
      if (!near) return;
      const { returnTo } = near;
      near = undefined;
      setNearScope(null);
      restore(returnTo);
      remember();
    };
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      if (sampleDetails) {
        // 远处叶片与机房预览的墙脚细边共用画布的额外采样预算。
        const samples = Math.sqrt(campusSampleBudget / (width * height));
        const pixelRatio = Math.max(devicePixelRatio, Math.min(2, samples));
        if (renderer.getPixelRatio() !== pixelRatio)
          renderer.setPixelRatio(pixelRatio);
      }
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (!initialSize) {
        initialSize = true;
        const saved = cameras.get(scope.id);
        near = saved?.near;
        setNearScope(near ? scope.id : null);
        if (saved) restore(saved);
        else fit("overview");
        return;
      } else if (preset) {
        fit(preset);
        return;
      }
      // 切栏改变画幅时重查遮挡，保留拖动后的标签稳定过程。
      render(labelTimer === undefined ? "static" : "moving");
    };
    let initialSize = false;
    runtime.current = {
      select(id) {
        selected = id;
        for (const { child, pick, border, access } of marks) {
          const active = child.id === id;
          border.visible = active;
          if (child.kind === "outdoor") {
            pick.material.emissive.set(active ? "#194d53" : "#000000");
            pick.material.emissiveIntensity = 0.4;
          }
          if (outdoor && access && access.material !== pick.material) {
            const [paving, selectedPaving] =
              child.kind === "building"
                ? ["#aaa797", "#9cada4"]
                : ["#797d74", "#839e9a"];
            access.material.color.set(active ? selectedPaving : paving);
          }
        }
        if (near && id === scope.id) {
          returnFromNear();
        } else if (near && id !== near.id) {
          near = { ...near, id };
          fit({ id });
          remember();
        } else {
          render();
        }
      },
      show(view) {
        near = undefined;
        setNearScope(null);
        fit(view);
        remember();
      },
      toggleNear(id) {
        if (near) {
          returnFromNear();
          return;
        }
        near = { id, returnTo: pose() };
        setNearScope(scope.id);
        fit({ id });
        remember();
      },
      resize,
    };
    const raycast = new THREE.Raycaster();
    const point = new THREE.Vector2();
    let down: { id: number; x: number; y: number } | null = null;
    const pointerDown = (event: PointerEvent) => {
      if (contextLost) {
        event.preventDefault();
        return;
      }
      down =
        event.isPrimary && event.button === 0
          ? { id: event.pointerId, x: event.clientX, y: event.clientY }
          : null;
    };
    const pointerMove = (event: PointerEvent) => {
      if (
        down?.id === event.pointerId &&
        Math.hypot(down.x - event.clientX, down.y - event.clientY) > 5
      )
        down = null;
    };
    const pointerCancel = (event: PointerEvent) => {
      if (down?.id === event.pointerId) down = null;
    };
    const pointerUp = (event: PointerEvent) => {
      pointerMove(event);
      if (down?.id !== event.pointerId) return;
      down = null;
      const bounds = renderer.domElement.getBoundingClientRect();
      point.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        1 - ((event.clientY - bounds.top) / bounds.height) * 2,
      );
      raycast.setFromCamera(point, camera);
      const match = raycast.intersectObjects(solidObjects, false)[0];
      const id = match && ownership.get(match.object);
      if (id) select.current(id);
    };
    const keydown = (event: KeyboardEvent) => {
      if (
        !near ||
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.key !== "Escape" ||
        (event.target instanceof Element &&
          event.target.closest("details[open]"))
      )
        return;
      event.preventDefault();
      returnFromNear();
      nearButton.current?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", keydown);
    const update = () => {
      if (interacting) setPreset(null);
      render(interacting ? "moving" : "static");
      remember();
    };
    const start = () => {
      interacting = true;
    };
    const end = () => {
      interacting = false;
      if (!contextLost) controls.enabled = true;
    };
    controls.addEventListener("start", start);
    controls.addEventListener("end", end);
    controls.addEventListener("change", update);
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointercancel", pointerCancel);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    const observer = new ResizeObserver(resize);
    const lost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      controls.enabled = false;
      down = null;
      stopLabelSettle();
      const active = document.activeElement;
      if (
        active instanceof HTMLButtonElement &&
        cameraTools.current?.contains(active)
      )
        unavailableFocus.current = active;
      setError(true);
    };
    const restored = () => {
      contextLost = false;
      // 已被中断的拖动等松手后再恢复控制，避免沿用旧指针位置。
      controls.enabled = !interacting;
      if (document.activeElement !== unavailableStatus.current)
        unavailableFocus.current = null;
      if (scope.kind === "campus") renderer.shadowMap.needsUpdate = true;
      setError(false);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    renderer.domElement.addEventListener("webglcontextrestored", restored);
    observer.observe(host);
    resize();
    return () => {
      remember();
      stopLabelSettle();
      observer.disconnect();
      window.removeEventListener("keydown", keydown);
      runtime.current = null;
      unavailableFocus.current = null;
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointercancel", pointerCancel);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      renderer.domElement.removeEventListener("webglcontextrestored", restored);
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Line))
          return;
        if (object instanceof THREE.InstancedMesh) object.dispose();
        object.geometry.dispose();
        const objectMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        objectMaterials.forEach((material) => materials.add(material));
      });
      const maps = new Set<THREE.Texture>();
      for (const material of materials) {
        if (
          (material instanceof THREE.MeshBasicMaterial ||
            material instanceof THREE.MeshStandardMaterial) &&
          material.map
        )
          maps.add(material.map);
        material.dispose();
      }
      for (const map of maps) map.dispose();
      light.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [scope, cameras]);
  useEffect(() => {
    runtime.current?.select(selectedId);
  }, [scope, selectedId]);
  useLayoutEffect(() => {
    if (!error) runtime.current?.resize();
    const previous = unavailableFocus.current;
    if (!previous) return;
    const active = document.activeElement;
    if (error && (active === previous || active === document.body)) {
      unavailableStatus.current?.focus({ preventScroll: true });
      return;
    }
    unavailableFocus.current = null;
    if (!error && active === document.body && previous.checkVisibility())
      previous.focus({ preventScroll: true });
  }, [error]);

  return (
    <div className="campus-scene">
      <div ref={surface} className="campus-canvas" />
      <div
        ref={labels}
        className="campus-scene-labels"
        aria-hidden="true"
        data-unavailable={error || undefined}
      >
        {campusChildren(scope.id).map((child) => (
          <span
            key={child.id}
            hidden
            data-space-label={child.id}
            data-selected={child.id === selectedId}
          >
            {child.name}
          </span>
        ))}
      </div>
      {error && (
        <p
          role="status"
          ref={unavailableStatus}
          tabIndex={-1}
          className="campus-render-status"
        >
          三维场景暂不可用，可继续通过资源栏查看和进入空间。
        </p>
      )}
      <div
        ref={cameraTools}
        hidden={error}
        className="campus-camera"
        role="group"
        aria-label="空间视角"
      >
        <button
          aria-pressed={activePreset === "overview"}
          onClick={() => runtime.current?.show("overview")}
        >
          全景
        </button>
        <button
          aria-pressed={activePreset === "top"}
          onClick={() => runtime.current?.show("top")}
        >
          {scope.kind === "building" ? "分层" : "俯视"}
        </button>
        {scope.kind === "campus" && selectedId !== scope.id && (
          <button
            ref={nearButton}
            onClick={() => runtime.current?.toggleNear(selectedId)}
          >
            {nearScope === scope.id ? "返回视角" : "近看选中"}
          </button>
        )}
      </div>
    </div>
  );
}
