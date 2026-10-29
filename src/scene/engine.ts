import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { box, buildModels, disposeModels } from "./models";
import { entityById, partPosition, parts } from "../domain";
import type { AppState, Level } from "../domain";
import { frameDistance } from "../camera";
import {
  hardwareUrls,
  loadHardware,
  mapServerParts,
  normalizeModel,
} from "./hardware";

export type View = "iso" | "top" | "front" | "right" | "interior";
export class SceneEngine {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1, 0.01, 150);
  controls: OrbitControls;
  models = buildModels();
  assembledServerPosition = this.models.server.position.clone();
  state: AppState;
  observer: ResizeObserver;
  frame = 0;
  destroyed = false;
  targetPosition = new THREE.Vector3();
  targetLook = new THREE.Vector3();
  moving = true;
  pointerStart = new THREE.Vector2();
  raycaster = new THREE.Raycaster();
  reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  onSelect: (id: string, enter?: boolean) => void;
  onError: (message: string) => void;
  host: HTMLElement;
  lastTime = 0;
  explosion = 0;
  environment: THREE.WebGLRenderTarget;
  fades: {
    group: THREE.Group;
    opacity: number;
    materials: {
      material: THREE.Material;
      opacity: number;
      transparent: boolean;
      depthWrite: boolean;
    }[];
  }[] = [];
  anchors: HTMLElement | null = null;
  anchorElements: HTMLElement[] = [];
  anchorPosition = new THREE.Vector3();
  anchorBounds = new THREE.Box3();
  guides: THREE.LineSegments;
  guidePositions = new Float32Array(parts.length * 6);
  partBases = new Map<string, THREE.Vector3>();
  autoOrbit = !this.reducedMotion;
  lastManualInteraction = 0;
  interior = false;
  currentView: View = "iso";
  onAssets: (status: string) => void = () => {};

  constructor(
    host: HTMLElement,
    state: AppState,
    onSelect: (id: string, enter?: boolean) => void,
    onError: (message: string) => void,
  ) {
    this.host = host;
    this.state = state;
    this.onSelect = onSelect;
    this.onError = onError;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setClearColor("#181b1f");
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    const environmentScene = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(environmentScene, 0.04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.8;
    environmentScene.dispose();
    pmrem.dispose();
    this.renderer.domElement.setAttribute(
      "aria-label",
      "机房三维场景，可拖动旋转、滚轮缩放、点击选择、双击进入",
    );
    this.renderer.domElement.setAttribute("role", "img");
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    host.append(this.renderer.domElement);
    this.scene.fog = new THREE.FogExp2("#181b1f", 0.012);
    this.scene.add(new THREE.HemisphereLight("#faf9f5", "#343333", 0.7));
    const key = new THREE.DirectionalLight("#fff9f0", 2.6);
    key.position.set(0, 9, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -7;
    key.shadow.normalBias = 0.004;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight("#e4e8ef", 0.5);
    fill.position.set(-4, 4, -2);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight("#ffead2", 0.7);
    rim.position.set(4, 2, 3);
    this.scene.add(rim);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ opacity: 0.25 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.3;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const grid = new THREE.GridHelper(40, 80, "#393d42", "#24282d");
    grid.position.y = -0.285;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.2;
    this.scene.add(grid);
    for (const group of [
      this.models.room,
      this.models.rack,
      this.models.server,
      ...this.models.facilities.values(),
      ...this.models.parts.values(),
    ])
      this.batch(group);
    for (const group of [this.models.room, this.models.rack]) {
      const clones = new Map<THREE.Material, THREE.Material>();
      group.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
          const convert = (mat: THREE.Material) => {
            if (!clones.has(mat)) clones.set(mat, mat.clone());
            return clones.get(mat)!;
          };
          object.material = Array.isArray(object.material)
            ? object.material.map(convert)
            : convert(object.material);
        }
      });
      this.fades.push({
        group,
        opacity: 1,
        materials: [...clones.values()].map((material) => ({
          material,
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
        })),
      });
    }
    this.scene.add(this.models.root);
    const guideGeometry = new THREE.BufferGeometry();
    guideGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.guidePositions, 3),
    );
    this.guides = new THREE.LineSegments(
      guideGeometry,
      new THREE.LineDashedMaterial({
        color: "#78b9ba",
        transparent: true,
        opacity: 0.28,
        dashSize: 0.015,
        gapSize: 0.01,
      }),
    );
    this.guides.frustumCulled = false;
    this.models.server.add(this.guides);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 0.35;
    this.controls.maxDistance = 24;
    this.controls.addEventListener("start", this.cancelFlight);
    this.camera.position.set(13, 11, 16);
    this.controls.target.set(0, 0.8, 0);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.renderer.domElement.addEventListener("pointerdown", this.pointerDown);
    this.renderer.domElement.addEventListener("pointerup", this.pointerUp);
    this.renderer.domElement.addEventListener("dblclick", this.doubleClick);
    this.renderer.domElement.addEventListener("pointermove", this.hover);
    this.update(state);
    this.controls.autoRotateSpeed = 0.35;
    this.animate(0);
    void this.loadEnhancedModels();
  }

  async loadEnhancedModels() {
    let completed = 0;
    await Promise.allSettled([
      (async () => {
        const scene = await loadHardware(hardwareUrls.server);
        if (this.destroyed) {
          disposeModels(scene, false);
          return;
        }
        let result;
        try {
          result = mapServerParts(scene);
        } catch (error) {
          disposeModels(scene, false);
          throw error;
        }
        // 释放被增强模型替代的几何；共享材质在引擎退出时统一释放。
        this.models.server.traverse((object) => {
          if (object instanceof THREE.Mesh) object.geometry.dispose();
        });
        this.models.server.clear();
        this.models.server.add(result.root, this.guides);
        this.models.parts.clear();
        for (const [id, group] of result.groups)
          this.models.parts.set(id, group);
        this.partBases = result.positions;
        this.models.rotors.length = 0;
        this.poseParts();
        completed++;
      })(),
      ...(
        [
          ["cooling-01", hardwareUrls.cooling, 1.9],
          ["power-01", hardwareUrls.power, 1.8],
        ] as const
      ).map(async ([id, url, height]) => {
        const scene = await loadHardware(url);
        if (this.destroyed) {
          disposeModels(scene, false);
          return;
        }
        const normalized = normalizeModel(scene, "height", height);
        if (id === "power-01") {
          const size = new THREE.Box3()
            .setFromObject(normalized)
            .getSize(new THREE.Vector3());
          box(
            normalized,
            [size.x * 0.32, 0.17, 0.02],
            [size.x * 0.08, 0.36, size.z / 2 + 0.012],
            "#202328",
          );
          box(
            normalized,
            [size.x * 0.25, 0.1, 0.006],
            [size.x * 0.08, 0.37, size.z / 2 + 0.026],
            "#5e6a71",
          );
          box(
            normalized,
            [0.018, 0.27, 0.035],
            [size.x * 0.35, -0.05, size.z / 2 + 0.018],
            "#4d5157",
            0.7,
          );
          for (const [i, color] of ["#85a38a", "#baa570", "#4d525a"].entries())
            box(
              normalized,
              [0.025, 0.025, 0.012],
              [-0.06 + i * 0.065, 0.17, size.z / 2 + 0.017],
              color,
            );
          for (let i = 0; i < 12; i++)
            box(
              normalized,
              [size.x * 0.64, 0.008, 0.007],
              [0, -0.64 + i * 0.025, size.z / 2 + 0.01],
              "#555a60",
            );
        }
        const group = this.models.facilities.get(id)!;
        group.traverse((object) => {
          if (object instanceof THREE.Mesh) object.geometry.dispose();
        });
        group.clear();
        group.add(normalized);
        const fade = this.fades.find(
          (item) => item.group === this.models.room,
        )!;
        const materials = new Set<THREE.Material>();
        normalized.traverse((object) => {
          if (object instanceof THREE.Mesh)
            for (const material of Array.isArray(object.material)
              ? object.material
              : [object.material])
              materials.add(material);
        });
        for (const material of materials)
          fade.materials.push({
            material,
            opacity: material.opacity,
            transparent: material.transparent,
            depthWrite: material.depthWrite,
          });
        completed++;
      }),
    ]);
    if (!this.destroyed)
      this.onAssets(
        completed === 3
          ? "贡献模型 · 已载入"
          : "部分模型不可用 · 已使用简化结构",
      );
  }

  batch(group: THREE.Group) {
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of group.children)
      if (child instanceof THREE.Mesh && !Array.isArray(child.material)) {
        const list = batches.get(child.material) ?? [];
        list.push(child);
        batches.set(child.material, list);
      }
    for (const [mat, meshes] of batches) {
      if (meshes.length < 2) continue;
      const transformed = meshes.map((mesh) => {
        mesh.updateMatrix();
        return mesh.geometry.clone().applyMatrix4(mesh.matrix);
      });
      const geometry = mergeGeometries(transformed);
      transformed.forEach((g) => g.dispose());
      if (!geometry) continue;
      const merged = new THREE.Mesh(geometry, mat);
      merged.castShadow = true;
      merged.receiveShadow = true;
      for (const mesh of meshes) {
        group.remove(mesh);
        mesh.geometry.dispose();
      }
      group.add(merged);
    }
  }
  resize() {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    const previousAspect = this.camera.aspect;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (
      this.lastTime > 0 &&
      Math.abs(previousAspect - this.camera.aspect) > 0.1
    )
      this.view(this.currentView);
  }
  contextLost = (event: Event) => {
    event.preventDefault();
    this.onError("三维图形上下文已丢失，请重新加载场景。");
  };
  cancelFlight = () => {
    this.moving = false;
    this.lastManualInteraction = performance.now();
  };
  objectFor(id: string) {
    return id === "room-01"
      ? this.models.room
      : id === "rack-a01"
        ? this.models.rack
        : id === "srv-01"
          ? this.models.server
          : (this.models.facilities.get(id) ?? this.models.parts.get(id));
  }
  update(state: AppState) {
    const levelChanged = state.level !== this.state.level;
    const explosionChanged = state.explosion !== this.state.explosion;
    const focusChanged = state.focusRevision !== this.state.focusRevision;
    const changed = levelChanged || focusChanged;
    this.state = state;
    this.models.server.position.y =
      state.level === "device" ? 0.65 : this.assembledServerPosition.y;
    if (changed || this.lastTime === 0)
      this.view(
        state.level === "room" && (levelChanged || this.lastTime === 0)
          ? "interior"
          : "iso",
        focusChanged && !levelChanged,
      );
    if (state.level !== "device") {
      this.explosion = 0;
      this.poseParts();
    }
    if (state.level === "device" && explosionChanged)
      this.view(this.currentView);
  }
  deviceBounds() {
    this.models.server.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3();
    this.models.server.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      let parent = object.parent;
      while (parent && parent !== this.models.server) {
        if (this.models.parts.has(parent.userData.entityId)) return;
        parent = parent.parent;
      }
      bounds.union(new THREE.Box3().setFromObject(object));
    });
    for (const part of parts) {
      const group = this.models.parts.get(part.id);
      if (!group) continue;
      const base = this.partBases.get(part.id)?.toArray() ?? part.position;
      const target = new THREE.Vector3().fromArray(
        partPosition({ ...part, position: base }, this.state.explosion),
      );
      bounds.union(
        new THREE.Box3()
          .setFromObject(group)
          .translate(target.sub(group.position)),
      );
    }
    return bounds;
  }
  visible(object: THREE.Object3D): boolean {
    return object.visible && (!object.parent || this.visible(object.parent));
  }
  view(view: View, focus = false) {
    this.currentView = view;
    const level: Level = this.state.level;
    this.interior = view === "interior" && level === "room";
    this.controls.minAzimuthAngle = this.interior ? -0.65 : -Infinity;
    this.controls.maxAzimuthAngle = this.interior ? 0.65 : Infinity;
    if (this.interior) {
      this.targetLook.set(0, 1.05, 0);
      this.targetPosition.set(1.25, 1.6, 4.4);
      this.controls.minDistance = 0.8;
      this.controls.maxDistance = 20;
      this.moving = true;
      return;
    }
    const object = this.objectFor(this.state.selected);
    const bounds =
      object && focus
        ? new THREE.Box3().setFromObject(object)
        : level === "device"
          ? this.deviceBounds()
          : null;
    const center = bounds
      ? bounds.getCenter(new THREE.Vector3())
      : new THREE.Vector3(
          0,
          level === "room" ? 0.5 : level === "rack" ? 1.1 : 0.65,
          0,
        );
    const size = bounds
      ? Math.max(0.2, bounds.getSize(new THREE.Vector3()).length())
      : level === "room"
        ? new THREE.Box3()
            .setFromObject(this.models.room)
            .getSize(new THREE.Vector3())
            .length()
        : level === "rack"
          ? 2.4
          : 1.3;
    const distance = frameDistance(
      size,
      this.camera.aspect,
      level === "device" ? 0.35 : level === "rack" ? 1 : 3,
    );
    const direction = new THREE.Vector3(
      ...((view === "top"
        ? [0.001, 1, 0.001]
        : view === "front"
          ? [0, 0.13, 1]
          : view === "right"
            ? [1, 0.2, 0.001]
            : level === "rack"
              ? [0.45, 0.42, 1.5]
              : [0.85, 0.85, 1.05]) as [number, number, number]),
    ).normalize();
    this.targetLook.copy(center);
    this.targetPosition.copy(center).addScaledVector(direction, distance);
    this.controls.minDistance =
      level === "device" ? 0.35 : level === "rack" ? 1 : 3;
    this.controls.maxDistance = Math.max(
      distance * 1.1,
      level === "device" ? 5 : level === "rack" ? 9 : 24,
    );
    this.moving = true;
  }
  zoom(factor: number) {
    this.moving = false;
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.setLength(
      THREE.MathUtils.clamp(
        offset.length() * factor,
        this.controls.minDistance,
        this.controls.maxDistance,
      ),
    );
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }
  pick(event: MouseEvent | PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    for (const hit of this.raycaster.intersectObject(this.models.root, true)) {
      if (!(hit.object instanceof THREE.Mesh) || !this.visible(hit.object))
        continue;
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        if (object.userData.entityId) {
          const id = object.userData.entityId as string;
          return entityById(id)?.kind === "part" &&
            this.state.level !== "device"
            ? "srv-01"
            : id;
        }
        object = object.parent;
      }
    }
    return null;
  }
  pointerDown = (event: PointerEvent) => {
    this.pointerStart.set(event.clientX, event.clientY);
  };
  pointerUp = (event: PointerEvent) => {
    if (
      this.pointerStart.distanceTo(
        new THREE.Vector2(event.clientX, event.clientY),
      ) < 5
    ) {
      const id = this.pick(event);
      if (id) this.onSelect(id);
    }
  };
  doubleClick = (event: MouseEvent) => {
    const id = this.pick(event);
    if (id) this.onSelect(id, true);
  };
  hover = (event: PointerEvent) => {
    this.renderer.domElement.style.cursor = this.pick(event)
      ? "pointer"
      : "grab";
  };
  bindAnchors(element: HTMLElement) {
    this.anchors = element;
    this.anchorElements = [
      ...element.querySelectorAll<HTMLElement>("[data-anchor]"),
    ];
  }
  poseParts() {
    for (const [index, part] of parts.entries()) {
      const base = this.partBases.get(part.id)?.toArray() ?? part.position;
      const position = partPosition(
        { ...part, position: base },
        this.explosion,
      );
      this.models.parts.get(part.id)?.position.fromArray(position);
      this.guidePositions.set(base, index * 6);
      this.guidePositions.set(position, index * 6 + 3);
    }
    if (this.guides) {
      this.guides.geometry.attributes.position.needsUpdate = true;
      this.guides.computeLineDistances();
      this.guides.visible =
        this.state.level === "device" && this.explosion > 0.05;
    }
  }
  animate = (time: number) => {
    if (this.destroyed) return;
    const delta = Math.min((time - this.lastTime) / 1000 || 0.016, 0.05);
    this.lastTime = time;
    if (this.moving) {
      const alpha = this.reducedMotion ? 1 : 1 - Math.exp(-delta * 4.5);
      this.camera.position.lerp(this.targetPosition, alpha);
      this.controls.target.lerp(this.targetLook, alpha);
      if (this.camera.position.distanceTo(this.targetPosition) < 0.001)
        this.moving = false;
    }
    for (const fade of this.fades) {
      const target =
        fade.group === this.models.room
          ? this.state.level === "room"
            ? 1
            : 0
          : this.state.level === "device"
            ? 0
            : 1;
      fade.opacity = this.reducedMotion
        ? target
        : THREE.MathUtils.damp(fade.opacity, target, 9, delta);
      if (Math.abs(fade.opacity - target) < 0.005) fade.opacity = target;
      fade.group.visible = fade.opacity > 0;
      for (const item of fade.materials) {
        const transparent = item.transparent || fade.opacity < 1;
        if (item.material.transparent !== transparent) {
          item.material.transparent = transparent;
          item.material.needsUpdate = true;
        }
        item.material.opacity = item.opacity * fade.opacity;
        item.material.depthWrite = item.depthWrite && fade.opacity === 1;
      }
    }
    if (this.state.level === "device") {
      this.explosion = this.reducedMotion
        ? this.state.explosion
        : THREE.MathUtils.damp(this.explosion, this.state.explosion, 5, delta);
      if (Math.abs(this.explosion - this.state.explosion) < 0.0001)
        this.explosion = this.state.explosion;
      this.poseParts();
      if (!this.reducedMotion)
        for (const rotor of this.models.rotors) rotor.rotation.z += delta * 2.4;
    }
    if (!this.reducedMotion && this.models.room.visible)
      for (const fan of this.models.fans) fan.rotation.y += delta * 1.5;
    if (this.interior) {
      const angle = this.controls.getAzimuthalAngle();
      if (angle < -0.64)
        this.controls.autoRotateSpeed = -Math.abs(
          this.controls.autoRotateSpeed,
        );
      if (angle > 0.64)
        this.controls.autoRotateSpeed = Math.abs(this.controls.autoRotateSpeed);
    }
    this.controls.autoRotate =
      this.autoOrbit &&
      !this.moving &&
      !this.reducedMotion &&
      time - this.lastManualInteraction > 4000;
    this.controls.update();
    this.models.root.updateMatrixWorld(true);
    const object = this.objectFor(this.state.selected);
    this.models.selection.visible =
      !!object &&
      this.state.selected !== "room-01" &&
      !(this.state.level === "device" && this.state.selected === "srv-01") &&
      this.visible(object);
    if (object && this.models.selection.visible) {
      this.models.selection.box.setFromObject(object);
      this.models.selection.box.expandByScalar(
        this.state.level === "device" ? 0.006 : 0.025,
      );
    }
    for (const element of this.anchorElements) {
      const id = element.dataset.anchor!;
      const target = this.objectFor(id);
      const show =
        this.state.level === "room"
          ? ["rack-a01", "cooling-01", "power-01"].includes(id)
          : this.state.level === "device" &&
            this.explosion > 0.45 &&
            ["cpu-01", "memory-01", "fans-01", "psu-02"].includes(id);
      element.hidden = !show || !target;
      if (target && show) {
        this.anchorBounds.setFromObject(target).getCenter(this.anchorPosition);
        this.anchorPosition.y +=
          id === "rack-a01" ? 1.17 : this.state.level === "room" ? 1.05 : 0.035;
        this.anchorPosition.project(this.camera);
        const x = (this.anchorPosition.x * 0.5 + 0.5) * this.host.clientWidth;
        const y = (-this.anchorPosition.y * 0.5 + 0.5) * this.host.clientHeight;
        element.style.transform = `translate(${x}px,${y}px)`;
        element.hidden =
          this.anchorPosition.z > 1 ||
          x < 10 ||
          x > this.host.clientWidth - 70 ||
          y < 100 ||
          y > this.host.clientHeight - 65;
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.animate);
  };
  dispose() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.pointerDown);
    canvas.removeEventListener("pointerup", this.pointerUp);
    canvas.removeEventListener("dblclick", this.doubleClick);
    canvas.removeEventListener("pointermove", this.hover);
    canvas.removeEventListener("webglcontextlost", this.contextLost);
    disposeModels(this.scene);
    for (const fade of this.fades)
      for (const item of fade.materials) item.material.dispose();
    this.environment.dispose();
    this.renderer.dispose();
    canvas.remove();
  }
}
