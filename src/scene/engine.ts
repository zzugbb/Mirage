import type { RackUnitRange } from "../rack-space";
import { RackUnitGuide } from "./rack-unit-guide";
import { PartIsolation } from "./part-isolation";
import { canInspectPart, internalStructureThreshold } from "../part-inspection";
import {
  airflowViewFrame,
  airflowViewSightPoints,
  type AirflowView,
} from "../airflow-view";
import type { AirflowRoute } from "../airflow";
import {
  ModelLoading,
  requestedModels,
  type ModelLoadState,
  type ModelAssetId,
} from "../model-loading";
import type { MaintenanceAisle } from "../maintenance.ts";
import { updateRackBlanking } from "./rack-blanking";
import {
  roomFacilityById,
  fixtureSightOffsets,
  fixtureMountReference,
} from "../fixtures";
import { modelForDevice, partsForDevice } from "../catalog";
import { createEquipmentAssembly } from "./equipment-model";
import { advanceAssembly, assemblyPartPosition } from "../assembly-motion";
import { createExteriorAssembly, poseExterior } from "./equipment-exterior";
import { mapCompactServer } from "./compact-server";
import { SpatialSignals } from "./signals";
import { SurfaceObservation } from "./surface";
import { InstallationScene } from "./installation";
import { rackForDevice, deviceById, deviceHeight } from "../installation";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { box, buildModels, disposeModels, text } from "./models";
import { entityById, parts, presentationKey } from "../domain";
import type { AppState, Level } from "../domain";
import {
  frameDistance,
  boundsFrameDistance,
  pointsFrameDistance,
  cameraMinimumDistance,
} from "../camera";
import type { CameraView } from "../camera";
import { StructurePresentation } from "./presentation";
import { ShellCutaway } from "./shell-cutaway";
import { pdus, pduById } from "../power-config.ts";
import { createBackdrop, createRoomLights, RenderPipeline } from "./rendering";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import type { PresentationPhase, SceneFeedback } from "../mechanics";
import { simulate } from "../simulation";
import type { SimulationSnapshot } from "../simulation";
import { TelemetryOverlay } from "./telemetry";
import {
  hardwareUrls,
  loadHardware,
  mapServerParts,
  normalizeModel,
} from "./hardware";

export type View = CameraView;
export class SceneEngine {
  renderer: THREE.WebGLRenderer;
  pipeline: RenderPipeline;
  roomLights: THREE.RectAreaLight[];
  shellCutaway: ShellCutaway;
  shellTargets = definition.installation.racks.flatMap((rack) =>
    [definition.rack.size[1] / 2, definition.rack.size[1]].map(
      (y) =>
        new THREE.Vector3(
          rack.position[0],
          rack.position[1] + y,
          rack.position[2],
        ),
    ),
  );
  fixtureTargets = [new THREE.Vector3()];
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1, 0.01, 150);
  controls: OrbitControls;
  models = buildModels();
  unitRange: RackUnitRange | null = null;
  isolatedPartId: string | null = null;
  partIsolation = new PartIsolation();
  partInspection: {
    deviceId: string;
    targetId: string;
    previous: {
      position: THREE.Vector3;
      target: THREE.Vector3;
      view: View;
      focus: boolean;
      minDistance: number;
      maxDistance: number;
      aspect: number;
    };
  } | null = null;
  unitGuide = new RackUnitGuide((label) =>
    text(new THREE.Group(), label, [0, 0, 0], 0.075),
  );
  telemetry = new TelemetryOverlay();
  signals = new SpatialSignals();
  installation: InstallationScene;
  surface: SurfaceObservation;
  sample: SimulationSnapshot;
  presentation = new StructurePresentation(this.models);
  pendingDeviceView = false;
  pendingReturnView = false;
  pendingDeviceFocus = false;
  lastPhase: PresentationPhase | null = null;
  onPhase: (phase: PresentationPhase) => void;
  onFeedback: (feedback: SceneFeedback) => void;
  lastFeedback = "";
  assemblyModel = "server-2u";
  assemblies = new Map<string, ReturnType<typeof createEquipmentAssembly>>();
  paused = false;
  contextAvailable = true;
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
  cover = 0;
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
  keyLight: THREE.DirectionalLight;
  showLabels = false;
  retainMaterials = false;
  onRenderFrame: ((time: number, roomReady: boolean) => void) | null = null;
  pendingComponentFocus = false;
  anchors: HTMLElement | null = null;
  anchorElements: HTMLElement[] = [];
  anchorPosition = new THREE.Vector3();
  anchorBounds = new THREE.Box3();
  axesElements: HTMLElement[] = [];
  axesQuaternion = new THREE.Quaternion();
  axesVector = new THREE.Vector3();
  guides: THREE.LineSegments;
  guidePositions = new Float32Array(parts.length * 6);
  partBases = new Map<string, THREE.Vector3>();
  autoOrbit = !this.reducedMotion;
  lastManualInteraction = 0;
  interior = false;
  currentView: View = "iso";
  currentFocus = false;
  comparedAisle?: MaintenanceAisle;
  onAssets: (state: ModelLoadState) => void = () => {};
  assetLoader: ModelLoading;

  constructor(
    host: HTMLElement,
    state: AppState,
    onSelect: (id: string, enter?: boolean) => void,
    onError: (message: string) => void,
    onPhase: (phase: PresentationPhase) => void = () => {},
    onFeedback: (feedback: SceneFeedback) => void = () => {},
  ) {
    this.host = host;
    this.state = state;
    this.sample = simulate(state.time, state.replayCycle, state.deviceId);
    this.onSelect = onSelect;
    this.onError = onError;
    this.onPhase = onPhase;
    this.onFeedback = onFeedback;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor("#181b1f");
    this.scene.background = createBackdrop();
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.87;
    const environmentScene = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(environmentScene, 0.04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.55;
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
    this.scene.fog = new THREE.FogExp2("#0b0e10", 0.008);
    this.scene.add(new THREE.HemisphereLight("#faf9f5", "#343333", 0.45));
    const key = (this.keyLight = new THREE.DirectionalLight("#fff9f0", 1.6));
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
    const rim = new THREE.DirectionalLight("#ffead2", 0.85);
    rim.position.set(4, 2, 3);
    this.scene.add(rim);
    this.roomLights = createRoomLights(this.models.room);
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
      ...this.models.shellOccluders,
      this.models.rack,
      this.models.rackDoor,
      this.models.rackSlide,
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
    this.shellCutaway = new ShellCutaway(this.models.shellOccluders);
    this.scene.add(this.models.root);
    this.scene.add(this.telemetry.root, this.signals.root);
    this.installation = new InstallationScene(this.models);
    this.models.root.add(this.installation.root);
    this.installDevice(state);
    this.surface = new SurfaceObservation(
      this.models,
      this.installation,
      () => this.state,
    );
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
    this.pipeline = new RenderPipeline(this.renderer, this.scene, this.camera);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.renderer.domElement.addEventListener("pointerdown", this.pointerDown);
    this.renderer.domElement.addEventListener("pointerup", this.pointerUp);
    this.renderer.domElement.addEventListener("dblclick", this.doubleClick);
    this.renderer.domElement.addEventListener("pointermove", this.hover);
    this.activateAssembly(state);
    this.update(state);
    this.controls.autoRotateSpeed = 0.35;
    this.animate(0);
    this.assetLoader = new ModelLoading(
      (id, signal) => this.loadEnhancedModel(id, signal),
      (status) => {
        if (this.destroyed) return;
        this.onAssets(status);
      },
    );
    void this.assetLoader.ensure(requestedModels(state));
  }

  retryModels() {
    void this.assetLoader.retry();
  }

  async loadEnhancedModel(id: ModelAssetId, signal: AbortSignal) {
    const urls = {
      "server-2u": hardwareUrls.server,
      "server-1u": hardwareUrls.compact,
      "switch-1u": hardwareUrls.switch,
      "storage-4u": hardwareUrls.storage,
      "cooling-01": hardwareUrls.cooling,
      "power-01": hardwareUrls.power,
    };
    const scene = await loadHardware(urls[id], signal);
    if (this.destroyed || signal.aborted) {
      disposeModels(scene, false);
      throw Error("模型加载已结束");
    }
    try {
      if (
        id === "server-2u" ||
        id === "server-1u" ||
        id === "switch-1u" ||
        id === "storage-4u"
      ) {
        const result: ReturnType<typeof createEquipmentAssembly> =
          id === "server-2u"
            ? mapServerParts(scene)
            : id === "server-1u"
              ? mapCompactServer(
                  normalizeModel(scene, "width", definition.server.size[0]),
                )
              : createExteriorAssembly(id, scene);
        if (result.representations)
          this.installation.installExterior(
            id,
            result.representations.exterior,
          );
        const old = this.assemblies.get(id);
        this.assemblies.set(id, result);
        if (modelForDevice(this.state.deviceId).id === id) {
          this.assemblyModel = "";
          this.activateAssembly(this.state);
        } else if (old) disposeModels(old.root, false);
      } else {
        const height = id === "cooling-01" ? 1.9 : 1.8;
        const normalized = normalizeModel(scene, "height", height);
        normalized.rotation.y =
          ((definition.facilities.find((facility) => facility.id === id)
            ?.modelRotationYDegrees ?? 0) *
            Math.PI) /
          180;
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
      }
    } catch (error) {
      disposeModels(scene, false);
      throw error;
    }
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
  onRoomViewMemory: (saved: boolean) => void = () => {};
  private roomViewMemory?: {
    position: THREE.Vector3;
    target: THREE.Vector3;
    view: View;
    focus: boolean;
    interior: boolean;
    width: number;
    height: number;
    limits: Pick<
      OrbitControls,
      | "minDistance"
      | "maxDistance"
      | "minAzimuthAngle"
      | "maxAzimuthAngle"
      | "maxPolarAngle"
    >;
  };
  clearRoomViewMemory() {
    this.roomViewMemory = undefined;
    this.onRoomViewMemory(false);
  }
  rememberRoomView() {
    if (this.state.level !== "room" || this.moving) return false;
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return false;
    this.autoOrbit = false;
    this.roomViewMemory = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      view: this.currentView,
      focus: this.currentFocus,
      interior: this.interior,
      width,
      height,
      limits: {
        minDistance: this.controls.minDistance,
        maxDistance: this.controls.maxDistance,
        minAzimuthAngle: this.controls.minAzimuthAngle,
        maxAzimuthAngle: this.controls.maxAzimuthAngle,
        maxPolarAngle: this.controls.maxPolarAngle,
      },
    };
    this.onRoomViewMemory(true);
    return true;
  }
  restoreRoomViewMemory() {
    const saved = this.roomViewMemory;
    const { width, height } = this.host.getBoundingClientRect();
    if (
      !saved ||
      this.state.level !== "room" ||
      width !== saved.width ||
      height !== saved.height
    ) {
      this.clearRoomViewMemory();
      return false;
    }
    this.autoOrbit = false;
    this.clearAirflowView();
    this.panelViewport = undefined;
    this.currentView = saved.view;
    this.currentFocus = saved.focus;
    this.interior = saved.interior;
    Object.assign(this.controls, saved.limits);
    this.targetPosition.copy(saved.position);
    this.targetLook.copy(saved.target);
    this.moving = true;
    return true;
  }
  onAirflowView: (view: AirflowView | null) => void = () => {};
  private airflowObservation?: {
    route: AirflowRoute;
    view: AirflowView;
    targets: THREE.Vector3[];
    previous: {
      position: THREE.Vector3;
      target: THREE.Vector3;
      view: View;
      focus: boolean;
      interior: boolean;
      minDistance: number;
      maxDistance: number;
      minAzimuthAngle: number;
      maxAzimuthAngle: number;
      maxPolarAngle: number;
    };
  };
  clearAirflowView() {
    if (!this.airflowObservation) return;
    this.airflowObservation = undefined;
    this.moving = false;
    this.onAirflowView(null);
  }
  observeAirflow(route: AirflowRoute, view: AirflowView) {
    if (this.state.level !== "room") return;
    this.panelViewport = undefined;
    const previous = this.airflowObservation?.previous ?? {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      view: this.currentView,
      focus: this.currentFocus,
      interior: this.interior,
      minDistance: this.controls.minDistance,
      maxDistance: this.controls.maxDistance,
      minAzimuthAngle: this.controls.minAzimuthAngle,
      maxAzimuthAngle: this.controls.maxAzimuthAngle,
      maxPolarAngle: this.controls.maxPolarAngle,
    };
    this.airflowObservation = {
      route,
      view,
      previous,
      targets: airflowViewSightPoints(route, view),
    };
    this.currentView = "iso";
    this.currentFocus = false;
    this.interior = false;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 0.8;
    this.frameAirflow();
    this.onAirflowView(view);
  }
  private frameAirflow() {
    const observation = this.airflowObservation;
    if (!observation) return;
    const frame = this.host.getBoundingClientRect();
    let left = 20,
      top = 20;
    const stage = this.host.closest(".study-stage");
    const legend = stage?.querySelector<HTMLElement>(".review-legend");
    if (legend) {
      const bounds = legend.getBoundingClientRect();
      if (bounds.width)
        left = Math.min(frame.width * 0.48, bounds.right - frame.left + 20);
    }
    for (const control of stage?.querySelectorAll<HTMLElement>(
      ".study-layer-control, .review-camera, .review-scene-tools",
    ) ?? []) {
      const bounds = control.getBoundingClientRect();
      if (bounds.height) top = Math.max(top, bounds.bottom - frame.top + 20);
    }
    const fit = airflowViewFrame(
      observation.route,
      observation.view,
      frame.width,
      frame.height,
      {
        left,
        top: Math.min(top, frame.height * 0.35),
        right: frame.width - 40,
        bottom: frame.height - 48,
      },
    );
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.controls.maxDistance = Math.max(45, fit.distance * 1.2);
    this.moving = true;
  }
  restoreAirflowView() {
    const previous = this.airflowObservation?.previous;
    if (!previous) return;
    this.panelViewport = undefined;
    this.currentView = previous.view;
    this.currentFocus = previous.focus;
    this.interior = previous.interior;
    for (const key of [
      "minDistance",
      "maxDistance",
      "minAzimuthAngle",
      "maxAzimuthAngle",
      "maxPolarAngle",
    ] as const)
      this.controls[key] = previous[key];
    this.targetPosition.copy(previous.position);
    this.targetLook.copy(previous.target);
    this.clearAirflowView();
    this.moving = true;
  }
  private panelViewport?: { width: number; height: number };
  // 预览打开和还原侧栏时仅更新投影，真实窗口缩放与主动定位仍按目标取景。
  preservePanelView() {
    this.panelViewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  resize() {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    if (
      this.roomViewMemory &&
      (width !== this.roomViewMemory.width ||
        height !== this.roomViewMemory.height)
    )
      this.clearRoomViewMemory();
    const previousAspect = this.camera.aspect;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.pipeline.resize(width, height);
    if (
      this.panelViewport?.width === window.innerWidth &&
      this.panelViewport.height === window.innerHeight
    )
      return;
    this.panelViewport = undefined;
    if (this.airflowObservation) {
      this.frameAirflow();
      return;
    }
    if (
      this.lastTime > 0 &&
      Math.abs(previousAspect - this.camera.aspect) > 0.1
    )
      this.view(this.currentView, this.currentFocus);
  }
  contextLost = (event: Event) => {
    event.preventDefault();
    this.contextAvailable = false;
    this.onError("三维图形上下文已丢失，请重新加载场景。");
  };
  cancelFlight = () => {
    this.clearAirflowView();
    this.moving = false;
    this.lastManualInteraction = performance.now();
  };
  activateAssembly(state: AppState) {
    this.partIsolation.restore();
    const model = modelForDevice(state.deviceId);
    if (model.id === this.assemblyModel) return;
    let assembly = this.assemblies.get(model.id);
    if (!assembly) {
      assembly = createEquipmentAssembly(model.id);
      this.assemblies.set(model.id, assembly);
    }
    this.surface?.dispose();
    const cachedRoots = new Set(
      [...this.assemblies.values()].map((value) => value.root),
    );
    for (const child of this.models.server.children)
      if (child !== this.guides && !cachedRoots.has(child as THREE.Group))
        disposeModels(child, false);
    this.models.server.clear();
    this.models.server.add(assembly.root, this.guides);
    this.models.parts.clear();
    for (const [id, group] of assembly.groups) this.models.parts.set(id, group);
    this.partBases = assembly.positions;
    this.assemblyModel = model.id;
    this.models.rotors.length = 0;
    this.surface = new SurfaceObservation(
      this.models,
      this.installation,
      () => this.state,
    );
    this.poseParts();
  }
  installDevice(state: AppState) {
    const rack = rackForDevice(state.deviceId);
    if (this.models.rack.userData.entityId !== rack.id)
      this.presentation.resetRearDoor();
    this.models.rack.position.fromArray(rack.position);
    this.models.rack.userData.entityId = rack.id;
    this.host.dataset.blankingUnits = updateRackBlanking(
      this.models.rack,
      rack.id,
    ).join(",");
    this.host.dataset.blankingRack = rack.id;
    for (const pdu of pdus.filter((pdu) => pdu.rackId === rack.id))
      this.models.rack.getObjectByName(`pdu-${pdu.feed}`)!.userData.entityId =
        pdu.id;
    this.models.rack.updateWorldMatrix(true, true);
    const label = this.models.rack.getObjectByName("rack-label") as
      THREE.Sprite | undefined;
    if (label) {
      const texture = (label.material as THREE.SpriteMaterial).map!;
      const canvas = texture.image as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#bac1c9";
      ctx.font = "500 52px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(rack.name.slice(0, 3), 256, 82);
      texture.needsUpdate = true;
    }
    this.models.server.userData.entityId = state.deviceId;
    this.models.railMount.position.y = this.models.rackSlide.position.y =
      deviceHeight(state.deviceId) - definition.server.position[1];
    this.presentation.mounted.set(
      rack.position[0],
      deviceHeight(state.deviceId),
      rack.position[2] + 0.555 - modelForDevice(state.deviceId).depth / 2,
    );
  }
  objectFor(id: string) {
    if (this.models.fixtures.has(id)) return this.models.fixtures.get(id);
    const pdu = pduById(id);
    if (pdu)
      return (
        pdu.rackId === rackForDevice(this.state.deviceId).id
          ? this.models.rack
          : this.installation.racks.get(pdu.rackId)
      )?.getObjectByName(`pdu-${pdu.feed}`);
    if (id === rackForDevice(this.state.deviceId).id) return this.models.rack;
    if (id === this.state.deviceId) return this.models.server;
    if (this.installation?.racks.has(id))
      return this.installation.racks.get(id);
    if (this.installation?.devices.has(id))
      return this.installation.devices.get(id);
    return id === "room-01"
      ? this.models.room
      : id === "rack-a01"
        ? this.models.rack
        : id === "srv-01"
          ? this.models.server
          : (this.models.facilities.get(id) ?? this.models.parts.get(id));
  }
  update(state: AppState) {
    if (state.level !== "room" && this.roomViewMemory)
      this.clearRoomViewMemory();
    const deviceChanged = state.deviceId !== this.state.deviceId;
    if (deviceChanged) {
      this.installDevice(state);
      this.activateAssembly(state);
    }
    const levelChanged = state.level !== this.state.level;
    if (levelChanged || state.selected !== this.state.selected)
      this.pendingComponentFocus = false;
    const explosionChanged = state.explosion !== this.state.explosion;
    const coverChanged = state.coverOpen !== this.state.coverOpen;
    const focusChanged = state.focusRevision !== this.state.focusRevision;
    // 机房 / 机柜内单击只切换选择，保留镜头，避免双击期间标签被镜头带走。
    const changed =
      levelChanged ||
      focusChanged ||
      (deviceChanged && state.level === "device");
    this.state = state;
    void this.assetLoader?.ensure(requestedModels(state));
    this.sample = simulate(state.time, state.replayCycle, state.deviceId);
    if (levelChanged) this.pendingDeviceView = state.level === "device";
    if (focusChanged && entityById(state.selected)?.kind === "part")
      this.pendingComponentFocus = true;
    if (changed || this.lastTime === 0)
      this.view(
        state.level === "room" && (levelChanged || this.lastTime === 0)
          ? "interior"
          : "iso",
        focusChanged &&
          !this.pendingComponentFocus &&
          (!levelChanged ||
            ["facility", "part"].includes(
              entityById(state.selected)?.kind ?? "",
            )),
      );
    if (state.level === "device" && (explosionChanged || coverChanged))
      this.view(this.currentView);
  }
  deviceBounds(points?: THREE.Vector3[]) {
    const include = (box: THREE.Box3) => {
      if (box.isEmpty()) return;
      if (points)
        for (const x of [box.min.x, box.max.x])
          for (const y of [box.min.y, box.max.y])
            for (const z of [box.min.z, box.max.z])
              points.push(new THREE.Vector3(x, y, z));
      bounds.union(box);
    };
    this.models.server.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3();
    this.models.server.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (!this.visible(object)) return;
      let parent = object.parent;
      while (parent && parent !== this.models.server) {
        if (this.models.parts.has(parent.userData.entityId)) return;
        parent = parent.parent;
      }
      include(new THREE.Box3().setFromObject(object));
    });
    for (const part of parts) {
      const group = this.models.parts.get(part.id);
      if (!group) continue;
      const representations = this.assemblies.get(
        this.assemblyModel,
      )?.representations;
      if (representations && this.state.explosion <= internalStructureThreshold)
        continue;
      const base = this.partBases.get(part.id)?.toArray() ?? part.position;
      const target = new THREE.Vector3().fromArray(
        assemblyPartPosition(
          { ...part, position: base },
          this.state.explosion,
          modelForDevice(this.state.deviceId).category === "server" &&
            (this.state.coverOpen || this.state.explosion > 0)
            ? 1
            : 0,
        ),
      );
      include(
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
    focus =
      focus ||
      !!(
        this.partInspection &&
        this.isolatedPartId &&
        this.state.level === "device" &&
        this.partInspection.deviceId === this.state.deviceId &&
        this.isolatedPartId === this.state.selected
      );
    this.clearAirflowView();
    this.panelViewport = undefined;
    const fixture =
      this.state.level === "room" && focus
        ? roomFacilityById(this.state.selected)
        : undefined;
    if (fixture && view === "interior") view = "iso";
    // 先在当前镜头中完成复原与合盖，再随设备返回机柜。
    if (
      (this.state.level !== "device" &&
        (this.explosion > 0 || this.cover > 0)) ||
      (this.state.level === "room" && this.presentation.rearDoor > 0)
    ) {
      this.currentView = view;
      this.currentFocus = focus;
      this.pendingReturnView = true;
      return;
    }
    this.pendingReturnView = false;
    const shadowExtent = this.state.level === "device" ? 1.6 : 7;
    const shadowCamera = this.keyLight.shadow.camera;
    if (shadowCamera.right !== shadowExtent) {
      shadowCamera.left = shadowCamera.bottom = -shadowExtent;
      shadowCamera.right = shadowCamera.top = shadowExtent;
      shadowCamera.updateProjectionMatrix();
    }
    this.currentView = view;
    const pixelRatio = Math.min(
      devicePixelRatio,
      this.state.level === "device" ? 2.5 : 2,
    );
    if (this.renderer.getPixelRatio() !== pixelRatio) {
      this.renderer.setPixelRatio(pixelRatio);
      this.pipeline.setPixelRatio(pixelRatio);
      this.pipeline.resize(this.host.clientWidth, this.host.clientHeight);
    }
    this.currentFocus = focus;
    const deferDevice =
      this.state.level === "device" && this.presentation.pose.inspection < 1;
    if (deferDevice) {
      this.pendingDeviceView = true;
      this.pendingDeviceFocus = focus;
    }
    const level: Level = deferDevice ? "rack" : this.state.level;
    if (deferDevice) focus = false;
    this.controls.maxPolarAngle =
      fixture && "kind" in fixture && fixture.kind === "smoke"
        ? Math.PI * 0.65
        : Math.PI / 2 - 0.03;
    this.interior = view === "interior" && level === "room";
    this.controls.minAzimuthAngle = this.interior ? -0.65 : -Infinity;
    this.controls.maxAzimuthAngle = this.interior ? 0.65 : Infinity;
    if (this.interior) {
      this.targetLook.set(0, 0.85, 0);
      const fit = Math.max(1, 1.4 / Math.max(0.4, this.camera.aspect));
      this.targetPosition.set(8.8 * fit, 8.5 * fit, 12 * fit);
      this.controls.minDistance = 0.8;
      this.controls.maxDistance = 45;
      this.moving = true;
      return;
    }
    const object = this.objectFor(this.state.selected);
    const framingPoints: THREE.Vector3[] = [];
    const bounds =
      object && focus
        ? new THREE.Box3().setFromObject(object)
        : level === "device"
          ? this.deviceBounds(framingPoints)
          : null;
    const aisle =
      level === "room" && focus && view === "top"
        ? this.comparedAisle
        : undefined;
    if (aisle && bounds) {
      for (const side of [aisle.front, aisle.rear]) {
        const rack = this.objectFor(side.rackId);
        if (rack) bounds.expandByObject(rack);
      }
    }
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
    const direction = new THREE.Vector3(
      ...((view === "top"
        ? aisle
          ? [0, 1, 0.025]
          : [0.001, 1, 0.001]
        : view === "rear"
          ? [0, 0.13, -1]
          : view === "front"
            ? [0, 0.13, 1]
            : view === "right"
              ? [1, 0.2, 0.001]
              : level === "rack"
                ? [0.45, 0.42, 1.5]
                : [0.85, 0.85, 1.05]) as [number, number, number]),
    ).normalize();
    if (level === "device" && focus && view === "iso" && object) {
      const part = partsForDevice(this.state.deviceId).find(
        (part) => part.id === this.state.selected,
      );
      const focusDirection =
        object.userData.focusDirection ??
        (part && "focusDirection" in part ? part.focusDirection : null);
      if (focusDirection)
        direction
          .fromArray(focusDirection)
          .transformDirection(object.matrixWorld);
    }
    if (fixture && view === "iso")
      direction.fromArray(fixture.focus.direction).normalize();
    const minimum = fixture
      ? fixture.focus.distance
      : cameraMinimumDistance[level];
    let topInsetFraction = 0;
    if (
      level === "room" &&
      focus &&
      (entityById(this.state.selected)?.kind === "rack" ||
        (fixture &&
          "kind" in fixture &&
          ["cable-tray", "ceiling-light", "floor-grille-row"].includes(
            fixture.kind,
          )))
    ) {
      const frame = this.host.getBoundingClientRect();
      const controls = this.host
        .closest(".study-stage")
        ?.querySelectorAll<HTMLElement>(
          ".study-layer-control, .review-camera, .review-scene-tools",
        );
      for (const control of controls ?? []) {
        const rect = control.getBoundingClientRect();
        if (rect.height && frame.height)
          topInsetFraction = Math.max(
            topInsetFraction,
            (rect.bottom - frame.top + 8) / frame.height,
          );
      }
    }
    const distance = framingPoints.length
      ? pointsFrameDistance(
          framingPoints.map((point) => point.sub(center).toArray()),
          direction.toArray(),
          this.camera.aspect,
          minimum,
        )
      : bounds
        ? boundsFrameDistance(
            bounds.getSize(new THREE.Vector3()).toArray(),
            direction.toArray(),
            this.camera.aspect,
            minimum,
            topInsetFraction,
          )
        : frameDistance(size, this.camera.aspect, minimum);
    if (!bounds && level === "rack") {
      center.x = rackForDevice(this.state.deviceId).position[0];
      center.z = rackForDevice(this.state.deviceId).position[2];
    }
    this.targetLook.copy(center);
    this.targetPosition.copy(center).addScaledVector(direction, distance);
    // 柜式设施的初始取景给工具栏和周边设施留出空间，随后仍可手动拉近。
    this.controls.minDistance =
      fixture && "size" in fixture ? cameraMinimumDistance[level] : minimum;
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
    for (const hit of this.raycaster.intersectObjects(
      [this.models.root, this.signals.root],
      true,
    )) {
      if (!(hit.object instanceof THREE.Mesh) || !this.visible(hit.object))
        continue;
      if (
        hit.object instanceof THREE.InstancedMesh &&
        hit.instanceId !== undefined &&
        hit.object.userData.instanceEntityIds
      ) {
        if (hit.object.userData.instanceVisible[hit.instanceId])
          return hit.object.userData.instanceEntityIds[
            hit.instanceId
          ] as string;
        continue;
      }
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        if (object.userData.entityId) {
          const id = object.userData.entityId as string;
          return entityById(id)?.kind === "part" &&
            this.state.level !== "device"
            ? this.state.deviceId
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
  bindAxes(element: HTMLElement) {
    this.axesElements = [
      ...element.querySelectorAll<HTMLElement>("[data-axis]"),
    ];
  }
  poseParts() {
    const assembly = this.assemblies.get(this.assemblyModel);
    if (assembly) poseExterior(assembly, this.explosion);
    this.guidePositions.fill(0);
    for (const [index, part] of partsForDevice(this.state.deviceId).entries()) {
      const base = this.partBases.get(part.id)?.toArray() ?? part.position;
      const position = assemblyPartPosition(
        { ...part, position: base },
        this.explosion,
        this.cover,
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
  private updatePartInspection() {
    const id =
      canInspectPart(this.state) && this.presentation.pose.inspection === 1
        ? this.isolatedPartId
        : null;
    const target = id ? this.models.parts.get(id) : undefined;
    const applied =
      !!id && this.partIsolation.apply(this.models.server, target);
    if (id && applied) {
      if (!this.partInspection) {
        this.partInspection = {
          deviceId: this.state.deviceId,
          targetId: "",
          previous: {
            position: this.camera.position.clone(),
            target: this.controls.target.clone(),
            view: this.currentView,
            focus: this.currentFocus,
            minDistance: this.controls.minDistance,
            maxDistance: this.controls.maxDistance,
            aspect: this.camera.aspect,
          },
        };
      }
      if (this.partInspection.targetId !== id) {
        this.partInspection.targetId = id;
        target!.updateWorldMatrix(true, true);
        this.view(this.currentView, true);
      }
    } else if (this.partInspection && !id) {
      const { deviceId, previous } = this.partInspection;
      this.partInspection = null;
      // 跨层级或实例导航由原导航流程取景，不把旧设备镜头带到新位置。
      if (this.state.level === "device" && this.state.deviceId === deviceId) {
        this.currentView = previous.view;
        this.currentFocus = previous.focus;
        this.controls.minDistance = previous.minDistance;
        this.controls.maxDistance = previous.maxDistance;
        this.targetLook.copy(previous.target);
        this.targetPosition
          .copy(previous.position)
          .sub(previous.target)
          .multiplyScalar(Math.max(1, previous.aspect / this.camera.aspect))
          .add(previous.target);
        this.moving = true;
      }
    }
    this.host.dataset.isolatedPart = applied ? id! : "";
  }
  animate = (time: number) => {
    if (this.destroyed) return;
    this.partIsolation.restore();
    const delta = this.paused
      ? 0
      : Math.min((time - this.lastTime) / 1000 || 0.016, 0.05);
    const instant = this.reducedMotion && !this.paused;
    this.lastTime = time;
    const frame = this.presentation.step(
      this.state,
      delta,
      instant,
      this.explosion,
      this.cover,
    );
    if (frame.ready && this.pendingDeviceView) {
      this.pendingDeviceView = false;
      this.view(this.currentView, this.pendingDeviceFocus);
      this.pendingDeviceFocus = false;
    }
    if (this.moving && !this.paused) {
      const alpha = instant ? 1 : 1 - Math.exp(-delta * 4.5);
      this.camera.position.lerp(this.targetPosition, alpha);
      this.controls.target.lerp(this.targetLook, alpha);
      if (
        this.camera.position.distanceTo(this.targetPosition) < 0.001 &&
        this.controls.target.distanceTo(this.targetLook) < 0.001
      ) {
        this.moving = false;
        this.camera.position.copy(this.targetPosition);
        this.controls.target.copy(this.targetLook);
      }
    }
    for (const fade of this.fades) {
      const target =
        fade.group === this.models.room
          ? this.state.level === "room" && frame.relocation === 0
            ? 1
            : 0
          : frame.rackOpacity;
      fade.opacity = instant
        ? target
        : THREE.MathUtils.damp(fade.opacity, target, 9, delta);
      if (Math.abs(fade.opacity - target) < 0.005) fade.opacity = target;
      fade.group.visible = fade.opacity > 0;
      if (fade.group === this.models.room)
        for (const light of this.roomLights)
          light.intensity = 2.4 * fade.opacity;
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
    const explosionTarget =
      this.state.level === "device" && frame.ready ? this.state.explosion : 0;
    const hasCover = modelForDevice(this.state.deviceId).category === "server";
    const coverTarget =
      hasCover &&
      this.state.level === "device" &&
      frame.ready &&
      (this.state.coverOpen || explosionTarget > 0)
        ? 1
        : 0;
    const nextAssembly = advanceAssembly(
      { cover: this.cover, explosion: this.explosion },
      { hasCover, coverOpen: coverTarget === 1, explosion: explosionTarget },
      delta,
      instant,
    );
    this.cover = nextAssembly.cover;
    this.explosion = nextAssembly.explosion;
    const assemblyBusy =
      this.cover !== coverTarget || this.explosion !== explosionTarget;
    const phase: PresentationPhase = !frame.ready
      ? frame.phase
      : this.cover < coverTarget
        ? "opening-cover"
        : this.explosion !== explosionTarget
          ? this.explosion < explosionTarget
            ? "expanding"
            : "assembling"
          : this.cover !== coverTarget
            ? "closing-cover"
            : frame.phase;
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      this.onPhase(phase);
    }
    this.poseParts();
    this.updatePartInspection();
    if (
      this.pendingReturnView &&
      this.cover === 0 &&
      this.explosion === 0 &&
      this.presentation.rearDoor === 0
    )
      this.view(this.currentView, this.currentFocus);
    if (
      this.pendingComponentFocus &&
      frame.ready &&
      this.explosion === explosionTarget &&
      this.cover === coverTarget
    ) {
      this.pendingComponentFocus = false;
      this.view(this.currentView, true);
    }
    if (!this.reducedMotion && frame.ready)
      for (const rotor of this.models.rotors) rotor.rotation.z += delta * 2.4;
    if (!this.reducedMotion && this.models.room.visible)
      for (const fan of this.models.fans) fan.rotation.y += delta * 1.5;
    if (this.interior || this.state.level === "rack") {
      const angle = this.controls.getAzimuthalAngle();
      const limit = this.interior ? 0.64 : 0.85;
      if (angle < -limit)
        this.controls.autoRotateSpeed = -Math.abs(
          this.controls.autoRotateSpeed,
        );
      if (angle > limit)
        this.controls.autoRotateSpeed = Math.abs(this.controls.autoRotateSpeed);
    }
    this.controls.autoRotate =
      this.autoOrbit &&
      !this.paused &&
      !this.moving &&
      !frame.busy &&
      !assemblyBusy &&
      !this.reducedMotion &&
      time - this.lastManualInteraction > 4000;
    if (!this.paused) this.controls.update();
    const rearObservation =
      this.state.level === "rack" &&
      (!!pduById(this.state.selected) || this.telemetry.mode === "power");
    this.models.rack.getObjectByName("rack-rear-shell")!.visible =
      !rearObservation;
    this.models.rack.getObjectByName("rack-rear-doors")!.visible =
      !rearObservation ||
      this.state.rearDoorOpen ||
      this.presentation.rearDoor > 0;
    this.host.dataset.rearObservation = String(rearObservation);
    this.host.dataset.rearDoorProgress = String(this.presentation.rearDoor);
    const selectedFixture =
      this.state.level === "room"
        ? (this.models.fixtures.get(this.state.selected) ??
          this.models.facilities.get(this.state.selected))
        : undefined;
    if (selectedFixture) {
      const offsets = fixtureSightOffsets(this.state.selected);
      for (const [i, offset] of offsets.entries()) {
        this.fixtureTargets[i] ??= new THREE.Vector3();
        selectedFixture.localToWorld(this.fixtureTargets[i].fromArray(offset));
      }
      this.fixtureTargets.length = offsets.length;
    }
    const cutCount = this.shellCutaway.update(
      this.camera.position,
      this.airflowObservation?.targets ??
        (selectedFixture ? this.fixtureTargets : this.shellTargets),
      this.models.room.visible,
      selectedFixture && !this.airflowObservation
        ? this.models.fixtures.get(fixtureMountReference(this.state.selected))
        : undefined,
    );
    this.host.dataset.fixtureTarget = selectedFixture
      ? this.state.selected
      : "";
    this.host.dataset.shellCutaway = String(cutCount);
    const feedback: SceneFeedback = {
      key: presentationKey(this.state),
      phase,
      settled:
        this.contextAvailable &&
        !this.moving &&
        !frame.busy &&
        this.explosion === explosionTarget &&
        this.cover === coverTarget &&
        this.fades.every((fade) =>
          fade.group === this.models.room
            ? fade.opacity ===
              (this.state.level === "room" && frame.relocation === 0 ? 1 : 0)
            : fade.opacity === frame.rackOpacity,
        ),
    };
    const feedbackKey = `${feedback.key}:${feedback.phase}:${feedback.settled}`;
    if (feedbackKey !== this.lastFeedback) {
      this.lastFeedback = feedbackKey;
      this.onFeedback(feedback);
    }
    if (!this.unitGuide.parent) this.models.root.add(this.unitGuide);
    this.unitGuide.update(
      this.state,
      this.camera.position,
      this.presentation.pose.inspection > 0,
      this.unitRange,
    );
    this.installation.update(this.state, this.presentation.pose.inspection);
    this.models.root.updateMatrixWorld(true);
    this.telemetry.update(
      this.state,
      this.sample,
      this.models,
      this.presentation.pose.inspection,
      this.explosion,
      this.fades.find((fade) => fade.group === this.models.room)!.opacity,
    );
    const object = this.objectFor(this.state.selected);
    const showSelection =
      !!object &&
      this.state.selected !== "room-01" &&
      !(
        this.state.level === "device" &&
        this.state.selected === this.state.deviceId
      ) &&
      !frame.busy &&
      this.visible(object);
    const installed =
      this.state.level !== "device"
        ? this.installation.devices.get(this.state.selected)
        : undefined;
    if (object && showSelection) {
      if (installed) this.models.selection.setInstalledBox(object, installed);
      else this.models.selection.box.setFromObject(object);
    }
    this.models.selection.update(
      showSelection
        ? `${this.state.deviceId}:${this.state.selected}:${this.state.focusRevision}`
        : null,
      time,
      this.reducedMotion,
      this.state.level === "device" || selectedFixture || installed
        ? 0.006
        : 0.025,
    );
    this.host.dataset.selectionTarget = showSelection
      ? this.state.selected
      : "";
    for (const element of this.anchorElements) {
      const id = element.dataset.anchor!;
      if (
        ["position", "power-part", "part-position"].includes(
          element.dataset.anchorKind ?? "",
        )
      ) {
        if (
          ["power-part", "part-position"].includes(
            element.dataset.anchorKind ?? "",
          )
        ) {
          const part = this.models.parts.get(element.dataset.anchorPart!);
          if (!part) {
            element.hidden = true;
            continue;
          }
          this.anchorBounds.setFromObject(part).getCenter(this.anchorPosition);
        } else
          this.anchorPosition.fromArray(
            element.dataset.anchorPosition!.split(",").map(Number),
          );
        this.anchorPosition.project(this.camera);
        const x = (this.anchorPosition.x * 0.5 + 0.5) * this.host.clientWidth;
        const y = (-this.anchorPosition.y * 0.5 + 0.5) * this.host.clientHeight;
        element.dataset.screenX = String(x);
        element.dataset.screenY = String(y);
        const anchorObject = element.dataset.anchorObject
          ? this.objectFor(element.dataset.anchorObject)
          : undefined;
        element.hidden =
          (!!element.dataset.anchorObject &&
            (!anchorObject || !this.visible(anchorObject))) ||
          this.state.level !== (element.dataset.anchorLevel ?? "room") ||
          frame.busy ||
          frame.relocation !==
            (element.dataset.anchorLevel === "device" ? 1 : 0) ||
          this.anchorPosition.z < -1 ||
          this.anchorPosition.z > 1 ||
          x < 0 ||
          x > this.host.clientWidth ||
          y < 0 ||
          y > this.host.clientHeight;
        continue;
      }
      const rackAnchor = element.dataset.anchorKind === "rack";
      const deviceAnchor = element.dataset.anchorKind === "device";
      const partAnchor = element.dataset.anchorKind === "part";
      const target = this.objectFor(
        id === "srv-01" && !deviceAnchor ? this.state.deviceId : id,
      );
      const show = rackAnchor
        ? this.state.level === "room" &&
          this.presentation.pose.inspection === 0 &&
          (this.showLabels || this.telemetry.mode !== "object")
        : deviceAnchor
          ? this.state.level === "rack" &&
            this.presentation.pose.inspection === 0 &&
            this.telemetry.mode !== "object" &&
            deviceById(id)?.rackId === rackForDevice(this.state.deviceId).id
          : partAnchor
            ? this.state.level === "device" &&
              this.explosion > 0.25 &&
              this.showLabels
            : id === "srv-01"
              ? this.state.level !== "rack" &&
                this.telemetry.mode !== "object" &&
                this.telemetry.mode !== "status" &&
                (this.telemetry.mode !== "alarms" ||
                  !!this.sample.alarm?.active) &&
                !(this.state.level === "device" && this.explosion > 0.1) &&
                (this.presentation.pose.inspection === 0 ||
                  this.presentation.pose.inspection === 1)
              : this.showLabels &&
                (this.state.level === "room"
                  ? ["cooling-01", "power-01"].includes(id)
                  : this.state.level === "device" &&
                    this.explosion > 0.45 &&
                    ["cpu-01", "memory-01", "fans-01", "psu-02"].includes(id));
      element.hidden = !show || !target || !this.visible(target);
      if (target && show) {
        if (rackAnchor || deviceAnchor)
          target.getWorldPosition(this.anchorPosition);
        else
          this.anchorBounds
            .setFromObject(target)
            .getCenter(this.anchorPosition);
        if (
          id === "srv-01" &&
          this.telemetry.mode === "temperature" &&
          this.explosion === 0
        ) {
          this.models.server.getWorldPosition(this.anchorPosition);
          this.anchorPosition.z += 0.46;
        }
        this.anchorPosition.y +=
          id === "srv-01"
            ? 0.16
            : id === "rack-a01"
              ? 1.17
              : this.state.level === "room"
                ? 1.05
                : 0.035;
        if (rackAnchor) {
          target.getWorldPosition(this.anchorPosition);
          this.anchorPosition.y += 2.38;
        }
        if (deviceAnchor) {
          target.getWorldPosition(this.anchorPosition);
          this.anchorPosition.z += modelForDevice(id).depth / 2;
        }
        this.anchorPosition.project(this.camera);
        const selectedLabel = element.classList.contains("selected");
        const x =
          (this.anchorPosition.x * 0.5 + 0.5) * this.host.clientWidth +
          (deviceAnchor && !selectedLabel ? 80 : 0);
        const y = (-this.anchorPosition.y * 0.5 + 0.5) * this.host.clientHeight;
        element.dataset.screenX = String(x);
        element.dataset.screenY = String(y);
        element.style.transform = `translate(${x}px,${y}px)`;
        // 选中标签交由布局器向内避让；不因文字宽度超出边界而直接消失。
        element.hidden =
          this.anchorPosition.z < -1 ||
          this.anchorPosition.z > 1 ||
          x < 0 ||
          x > this.host.clientWidth ||
          y < 0 ||
          y > this.host.clientHeight ||
          (!selectedLabel &&
            (x < 10 ||
              x > this.host.clientWidth - element.offsetWidth - 23 ||
              y < 22 ||
              y > this.host.clientHeight - 65));
      }
    }
    this.axesQuaternion.copy(this.camera.quaternion).invert();
    for (const element of this.axesElements) {
      this.axesVector
        .set(
          element.dataset.axis === "x" ? 1 : 0,
          element.dataset.axis === "y" ? 1 : 0,
          element.dataset.axis === "z" ? 1 : 0,
        )
        .applyQuaternion(this.axesQuaternion);
      const x = this.axesVector.x * 24;
      const y = -this.axesVector.y * 24;
      element.style.setProperty("--axis-x", `${x + 3}px`);
      element.style.setProperty("--axis-y", `${y - 5}px`);
      element.style.setProperty("--axis-angle", `${Math.atan2(y, x)}rad`);
      element.style.setProperty("--axis-length", `${Math.hypot(x, y)}px`);
      element.style.opacity = this.axesVector.z > 0 ? "1" : "0.55";
    }
    const surfaceMode =
      this.retainMaterials &&
      (this.telemetry.mode === "status" ||
        this.telemetry.mode === "alarms" ||
        (this.state.level !== "device" &&
          (this.telemetry.mode === "temperature" ||
            this.telemetry.mode === "power")))
        ? "object"
        : this.telemetry.mode;
    this.host.dataset.surfaceMode = surfaceMode;
    this.surface.update(this.state, surfaceMode);
    this.signals.update(
      this.state,
      this.telemetry.mode,
      this.surface.snapshot.readings,
      this.models,
      this.presentation.pose.inspection,
      this.camera,
    );
    this.host.dataset.signalCount = String(
      this.signals.root.visible
        ? [...this.signals.rackMarks, ...this.signals.deviceMarks].filter(
            (m) => m.root.visible,
          ).length
        : 0,
    );
    this.installation.updateAppearance(
      this.state,
      surfaceMode,
      this.surface.snapshot.readings,
    );
    this.onRenderFrame?.(
      time,
      this.state.level === "room" &&
        frame.relocation === 0 &&
        !frame.busy &&
        !assemblyBusy &&
        this.fades.find((fade) => fade.group === this.models.room)!.opacity ===
          1,
    );
    this.pipeline.render(
      delta,
      frame.relocation,
      frame.busy ||
        assemblyBusy ||
        this.fades.some((fade) => fade.opacity > 0 && fade.opacity < 1),
    );
    this.frame = requestAnimationFrame(this.animate);
  };
  dispose() {
    this.partIsolation.restore();
    this.onRenderFrame = null;
    this.destroyed = true;
    this.assetLoader?.dispose();
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    this.pipeline.dispose();
    this.surface.dispose();
    this.signals.dispose();
    for (const assembly of this.assemblies.values())
      if (!assembly.root.parent) disposeModels(assembly.root, false);
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
    (this.scene.background as THREE.Texture).dispose();
    this.renderer.dispose();
    canvas.remove();
  }
}
