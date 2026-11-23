import type { PanelPort } from "../patch-panels.ts";
import { isAsicBoardStage } from "../assembly-pairs.ts";
import { compactPathModules } from "../compact-drive-bays";
import { roomLayoutCameraDirection } from "../room-layout.ts";
import { rangeObservationTarget } from "../range-segments.ts";
import {
  rangeViewPoints,
  rangeViewFrame,
  type RangeView,
} from "../range-view.ts";
import {
  inletInspection,
  inletViewFrame,
  type InletInspection,
  type InletViewPair,
} from "../inlet-view.ts";
import {
  environmentInspection,
  environmentViewFrame,
  type EnvironmentInspection,
} from "../environment-view.ts";
import type { EnvironmentPair } from "../environment-pair.ts";
import {
  entranceInspection,
  entranceViewFrame,
  type EntranceInspection,
  type EntranceView,
} from "../entrance-view.ts";
import { entranceSettings } from "../entrance.ts";
import { leakDetection } from "../leak-detection.ts";
import {
  leakInspection,
  leakViewFrame,
  type LeakInspection,
  type LeakView,
  type LeakTarget,
} from "../leak-view.ts";
import {
  maintenanceInspection,
  maintenanceViewFrame,
  type MaintenanceInspection,
  type MaintenanceView,
} from "../maintenance-view.ts";
import {
  crossingDirection,
  crossingObjectIds,
  crossingViewFrame,
  type FixtureCrossing,
} from "../fixture-crossing.ts";
import { SceneLoop } from "../scene-loop.ts";
import { AnchorProjection } from "../anchor-projection.ts";
import { RenderDemand } from "../render-demand.ts";
import {
  powerViewPoints,
  powerViewFrame,
  powerViewSource,
} from "../power-view";
import {
  networkViewFrame,
  networkViewPoints,
  networkViewSource,
  type NetworkView,
} from "../network-view";
import {
  isPatchGuide,
  guidesOnPatch,
  patchGuideCenter,
  patchSectionRange,
  patchSettings,
  type PatchGuide,
} from "../network-patch";
import { slicePlanePoints, slicePlaneFrame } from "../slice-plane-view";
import type { TemperatureSlice } from "../temperature-slice";
import { sliceViewPoints, sliceViewFrame } from "../slice-view";
import type { SliceDeviceInspection } from "../slice-device";
import type { RackUnitRange } from "../rack-space";
import { RackUnitGuide } from "./rack-unit-guide";
import { RearModuleSeats, type RearRowPose } from "./rear-module-seats";
import { DimmSocket } from "./dimm-socket";
import { PartIsolation } from "./part-isolation";
import { storageSlots } from "../storage-slots";
import { ControllerMountGuide } from "./controller-mount";
import {
  assemblyLayer,
  layerScopeFor,
  scopeBounds,
  includeSeparatedLayer,
  poseAssemblyLayer,
  type LayerPose,
} from "./assembly-layer";
import {
  StorageContactGuide,
  storageContactObjects,
  connectorBounds,
} from "./storage-contact";
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
import type { MaintenanceArea, MaintenanceAisle } from "../maintenance.ts";
import { updateRackBlanking } from "./rack-blanking";
import {
  roomFacilityById,
  fixtureSightOffsets,
  fixtureMountReference,
} from "../fixtures";
import { modelForDevice, partsForDevice, unitLabel } from "../catalog";
import { createEquipmentAssembly } from "./equipment-model";
import { advanceAssembly, assemblyPartPosition } from "../assembly-motion";
import { createExteriorAssembly, poseExterior } from "./equipment-exterior";
import { mapCompactServer } from "./compact-server";
import { metricAttentionColor, signalStyles } from "../status.ts";
import { SpatialSignals, visibleSignal } from "./signals";
import { SurfaceObservation } from "./surface";
import {
  dialBearingRadius,
  dockScaleAndPosition,
  dockWithdrawalAt,
} from "./inspection-platforms";
import { InspectionBackdrop } from "./inspection-backdrop";
import { InstallationScene } from "./installation";
import {
  rackForDevice,
  deviceById,
  deviceHeight,
  installedFrontZ,
} from "../installation";
import { PduMountWindow } from "./rack-enclosure.ts";
import { pduMountInspection, type PduMountInspection } from "../pdu-mounts.ts";
import * as THREE from "three";
import { observationFrame } from "../observation-frame";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { box, buildModels, disposeModels, text } from "./models";
import { entityById, parts, presentationKey } from "../domain";
import type { AppState, Level } from "../domain";
import {
  frameDistance,
  inspectionReturnDistance,
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
export type ObservationMemory = {
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
type RangeObservation = {
  range: RackUnitRange;
  targets: THREE.Vector3[];
  side: RangeView;
  segmentId: string | null;
  previous: ObservationMemory;
};
export type TaskViewMemory = ObservationMemory & {
  level: AppState["level"];
  range?: RangeObservation;
};
export class SceneEngine {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  pipeline: RenderPipeline;
  private inspectionLight = new THREE.PointLight("#f4f2ed", 0, 4);
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
  private roomBackdrop = createBackdrop();
  private skyLight = new THREE.HemisphereLight("#faf9f5", "#343333", 0.45);

  camera = new THREE.PerspectiveCamera(40, 1, 0.01, 150);
  controls: OrbitControls;
  models = buildModels();
  private dockSweep = 0;
  private dockWithdrawal = 0;
  private lastDialDraw = 0;
  private inspectionBackdrop = new InspectionBackdrop();
  private roomGround = new THREE.Group();
  private roomTransition?: HTMLCanvasElement;
  studioOrigin: TaskViewMemory | null = null;
  private keyLight = new THREE.DirectionalLight("#fff9f0", 1.6);
  unitRange: RackUnitRange | null = null;
  isolatedPartId: string | null = null;
  companionPartIds: readonly string[] = [];
  layerPose?: LayerPose;
  layerScopeId?: string;
  compactStoragePose?: "installed" | "mount-seated" | "mount-raised";
  dimmPose?: LayerPose;
  rearRowPose?: RearRowPose;
  private rearModuleSeats = new RearModuleSeats();
  private dimmSocket = new DimmSocket();
  private liftedPart?: THREE.Object3D;
  private extractedLayers?: readonly THREE.Object3D[];
  storageContact = false;
  storageConnectorPose?: LayerPose;
  storageBoardDisk?: string | null;
  controllerMountGuide = new ControllerMountGuide();
  storageContactGuide = new StorageContactGuide();
  partIsolation = new PartIsolation();
  partInspection: {
    deviceId: string;
    targetId: string;
    previous: ObservationMemory & { aspect: number };
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
  assemblies = new Map<
    string,
    ReturnType<typeof createEquipmentAssembly> & { baseHeight: number }
  >();
  paused = false;
  contextAvailable = true;
  state: AppState;
  observer: ResizeObserver;
  private viewportSize = new THREE.Vector2();
  private loop = new SceneLoop((time, delta) => this.animate(time, delta));
  private renderDemand = new RenderDemand();
  private renderView = new Float64Array(32);
  destroyed = false;
  targetPosition = new THREE.Vector3();
  targetLook = new THREE.Vector3();
  moving = true;
  pointerStart = new THREE.Vector2();
  raycaster = new THREE.Raycaster();
  private rackHint = document.createElement("span");
  reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  onInspectPanelPort?: (target: PanelPort) => void;
  onSelect: (id: string, enter?: boolean) => void;
  onError: (message: string) => void;
  host: HTMLElement;
  lastTime = 0;
  explosion = 0;
  cover = 0;
  environment: THREE.WebGLRenderTarget;
  showLabels = false;
  retainMaterials = false;
  analysisLayer = false;
  onRenderFrame: ((time: number, roomReady: boolean) => void) | null = null;
  pendingComponentFocus = false;
  onAnchorsProjected: (() => void) | null = null;
  private anchorProjection = new AnchorProjection();
  private anchorsChanged = false;
  anchors: HTMLElement | null = null;
  anchorElements: HTMLElement[] = [];
  anchorPosition = new THREE.Vector3();
  anchorBounds = new THREE.Box3();
  private anchorCorner = new THREE.Vector3();
  axesElements: HTMLElement[] = [];
  axesQuaternion = new THREE.Quaternion();
  axesVector = new THREE.Vector3();
  guides: THREE.LineSegments;
  guidePositions = new Float32Array(parts.length * 6);
  partBases = this.models.initialPartBases;
  autoOrbit = !this.reducedMotion;
  lastManualInteraction = 0;
  interior = false;
  currentView: View = "iso";
  currentFocus = false;
  comparedAisle?: MaintenanceAisle;
  frontServiceFrame?: {
    area: MaintenanceArea;
    deviceY: number;
    chassisDepth?: number;
  };
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
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor("#181b1f");
    this.scene.background = this.roomBackdrop;
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
    this.rackHint.className = "rack-surface-hint";
    this.rackHint.hidden = true;
    host.append(this.renderer.domElement, this.rackHint);
    this.scene.fog = new THREE.FogExp2("#0b0e10", 0.008);
    this.scene.add(this.skyLight);
    const key = this.keyLight;
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
    createRoomLights(this.models.room);
    this.scene.add(this.inspectionLight);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ opacity: 0.25 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.3;
    ground.receiveShadow = true;
    this.roomGround.add(ground);
    const grid = new THREE.GridHelper(
      40,
      80,
      ...(definition.rendering.roomBackdrop.grid as [string, string]),
    );
    grid.position.y = -0.285;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.2;
    this.roomGround.add(grid);
    this.scene.add(this.roomGround);
    for (const group of [
      this.models.room,
      this.models.floorGroup,
      ...this.models.shellOccluders,
      this.models.rack,
      this.models.rackDoor,
      this.models.rackSlide,
      this.models.server,
      ...this.models.facilities.values(),
      ...this.models.parts.values(),
    ])
      this.batch(group);
    this.shellCutaway = new ShellCutaway(this.models.shellOccluders);
    this.scene.add(this.models.root, this.inspectionBackdrop);
    this.scene.add(this.telemetry.root, this.signals.root);
    this.scene.add(
      this.storageContactGuide.root,
      this.controllerMountGuide.root,
    );
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
    this.controls.addEventListener("change", this.invalidate);
    this.controls.addEventListener("change", this.hideRackHint);
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
    this.renderer.domElement.addEventListener(
      "pointerleave",
      this.hideRackHint,
    );
    this.activateAssembly(state);
    this.update(state);
    this.controls.autoRotateSpeed = 0.35;
    this.loop.wake();
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
        this.registerAssembly(id, result);
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
      }
      this.invalidate();
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
    this.clearNetworkView();
    this.clearPowerView();
    this.clearCrossingView();
    this.clearLeakView();
    this.clearEntranceView();
    this.clearEnvironmentView();
    this.clearInletView();
    this.clearMaintenanceView();
    this.clearSliceView();
    this.clearRangeView();
    this.clearAirflowView();
    this.panelViewport = undefined;
    this.currentView = saved.view;
    this.currentFocus = saved.focus;
    this.interior = saved.interior;
    Object.assign(this.controls, saved.limits);
    this.targetPosition.copy(saved.position);
    this.targetLook.copy(saved.target);
    this.moving = true;
    this.invalidate();
    return true;
  }
  onAirflowView: (view: AirflowView | null) => void = () => {};
  private airflowObservation?: {
    route: AirflowRoute;
    view: AirflowView;
    targets: THREE.Vector3[];
    previous: ObservationMemory;
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
    this.clearNetworkView();
    this.clearPowerView();
    this.clearCrossingView();
    this.clearLeakView();
    this.clearEntranceView();
    this.clearEnvironmentView();
    this.clearInletView();
    this.clearMaintenanceView();
    this.clearSliceView();
    this.clearRangeView();
    const previous =
      this.airflowObservation?.previous ?? this.captureObservationView();
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
  frameAirflow() {
    const observation = this.airflowObservation;
    if (!observation) return;
    const { width, height, rect, legendRect } = this.observationViewport();
    const fit = airflowViewFrame(
      observation.route,
      observation.view,
      width,
      height,
      rect,
      legendRect,
    );
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.controls.maxDistance = Math.max(45, fit.distance * 1.2);
    this.moving = true;
    this.invalidate();
  }
  restoreAirflowView() {
    const previous = this.airflowObservation?.previous;
    if (!previous) return;
    this.clearAirflowView();
    this.restoreObservationView(previous);
  }
  taskReturnView: TaskViewMemory | null = null;
  captureTaskView(level: TaskViewMemory["level"]): TaskViewMemory | null {
    if (this.state.level !== level) return null;
    return {
      ...this.captureObservationView(),
      level,
      range: level === "rack" ? this.rangeObservation : undefined,
    };
  }
  private captureObservationView(): ObservationMemory {
    return {
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
  }
  private restoreObservationView(previous: ObservationMemory) {
    this.deviceOrbit = undefined;
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
    this.moving = true;
    this.invalidate();
  }
  private observationViewport() {
    const frame = this.host.getBoundingClientRect();
    let left = 20,
      top = 20;
    const stage = this.host.closest(".study-stage");
    const legend = stage?.querySelector<HTMLElement>(".review-legend");
    const bounds = legend?.getBoundingClientRect();
    const legendRect = bounds?.width
      ? { right: bounds.right - frame.left, top: bounds.top - frame.top }
      : undefined;
    if (legendRect) left = Math.min(frame.width * 0.48, legendRect.right + 20);
    for (const control of stage?.querySelectorAll<HTMLElement>(
      ".study-layer-control, .review-camera, .review-scene-tools",
    ) ?? []) {
      const bounds = control.getBoundingClientRect();
      if (bounds.height) top = Math.max(top, bounds.bottom - frame.top + 20);
    }
    return {
      width: frame.width,
      height: frame.height,
      legendRect,
      rect: {
        left,
        top: Math.min(top, frame.height * 0.35),
        right: frame.width - 40,
        bottom: frame.height - 48,
      },
    };
  }
  onRangeView: (side: RangeView | null, segmentId: string | null) => void =
    () => {};
  private rangeObservation?: RangeObservation;
  clearRangeView() {
    if (!this.rangeObservation) return;
    this.rangeObservation = undefined;
    this.moving = false;
    this.onRangeView(null, null);
  }
  observeRange(
    range: RackUnitRange,
    side: RangeView,
    segmentId: string | null = null,
  ) {
    if (
      this.state.level !== "rack" ||
      this.moving ||
      range.rackId !== rackForDevice(this.state.deviceId).id
    )
      return;
    const target = rangeObservationTarget(range, segmentId);
    if (!target) return;
    const targets = rangeViewPoints(target, side);
    if (!targets.length) return;
    const previous =
      this.rangeObservation?.previous ?? this.captureObservationView();
    this.clearNetworkView();
    this.clearPowerView();
    this.clearSliceView();
    this.clearAirflowView();
    this.panelViewport = undefined;
    this.rangeObservation = {
      range: target,
      targets,
      side,
      segmentId,
      previous,
    };
    this.currentView = side;
    this.currentFocus = false;
    this.interior = false;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.minDistance = 0.5;
    this.autoOrbit = false;
    this.frameRange();
    this.onRangeView(side, segmentId);
  }
  private frameRange() {
    if (!this.rangeObservation) return;
    const { width, height, rect } = this.observationViewport();
    const fit = rangeViewFrame(
      this.rangeObservation.targets,
      this.rangeObservation.side,
      width,
      height,
      rect,
    );
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.controls.maxDistance = Math.max(45, fit.distance * 1.2);
    this.moving = true;
    this.invalidate();
  }
  restoreRangeView() {
    const previous = this.rangeObservation?.previous;
    if (!previous) return;
    this.clearRangeView();
    this.restoreObservationView(previous);
  }
  onSlicePlaneView: (active: boolean) => void = () => {};
  onSliceView: (active: boolean) => void = () => {};
  private sliceObservation?: {
    plane: boolean;
    targets: THREE.Vector3[];
    key: string;
    previous: ObservationMemory;
  };
  clearSliceView() {
    if (!this.sliceObservation) return;
    this.sliceObservation = undefined;
    this.moving = false;
    this.onSliceView(false);
    this.onSlicePlaneView(false);
  }
  observeSlice(context: SliceDeviceInspection) {
    if (!context.point) return;
    this.startSliceView(sliceViewPoints(context), false);
  }
  observeSlicePlane(slice: TemperatureSlice) {
    this.startSliceView(slicePlanePoints(slice), true);
  }
  private startSliceView(targets: THREE.Vector3[], plane: boolean) {
    if (this.state.level !== "room" || !targets.length || this.moving) return;
    if (this.sliceObservation?.plane !== plane) this.clearSliceView();
    this.clearNetworkView();
    this.clearPowerView();
    this.clearCrossingView();
    this.clearLeakView();
    this.clearEntranceView();
    this.clearEnvironmentView();
    this.clearInletView();
    this.clearMaintenanceView();
    const previous =
      this.sliceObservation?.previous ?? this.captureObservationView();
    this.clearAirflowView();
    this.panelViewport = undefined;
    this.sliceObservation = {
      plane,
      targets,
      key: JSON.stringify(targets),
      previous,
    };
    this.currentView = "front";
    this.currentFocus = false;
    this.interior = false;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 0.5;
    this.autoOrbit = false;
    this.frameSlice();
    this.onSliceView(!plane);
    this.onSlicePlaneView(plane);
  }
  updateSliceView(context: SliceDeviceInspection | null) {
    if (this.sliceObservation?.plane) return;
    this.updateSliceTargets(sliceViewPoints(context));
  }
  updateSlicePlane(slice: TemperatureSlice | null) {
    if (!this.sliceObservation?.plane) return;
    this.updateSliceTargets(slicePlanePoints(slice));
  }
  private updateSliceTargets(targets: THREE.Vector3[]) {
    if (!this.sliceObservation) return;
    if (!targets.length) {
      this.clearSliceView();
      return;
    }
    const key = JSON.stringify(targets);
    if (key === this.sliceObservation.key) return;
    this.sliceObservation.targets = targets;
    this.sliceObservation.key = key;
    this.frameSlice();
  }
  refitSlicePlane() {
    if (this.sliceObservation?.plane) this.frameSlice();
  }
  private frameSlice() {
    if (!this.sliceObservation) return;
    const { width, height, rect } = this.observationViewport();
    if (this.sliceObservation.plane) {
      const frame = this.host.getBoundingClientRect();
      const legend = this.host
        .closest(".study-stage")
        ?.querySelector(".review-legend")
        ?.getBoundingClientRect();
      const bottom = Math.min(
        height - 48,
        (legend?.top ?? frame.bottom) - frame.top - 20,
      );
      // 长覆盖说明展开后，上方不足以容纳整排时改用图例右侧画幅。
      if (bottom - rect.top >= 160) {
        rect.left = 24;
        rect.right = width - 24;
        rect.bottom = bottom;
      }
    }
    const fit = (
      this.sliceObservation.plane ? slicePlaneFrame : sliceViewFrame
    )(this.sliceObservation.targets, width, height, rect);
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.controls.maxDistance = Math.max(45, fit.distance * 1.2);
    this.moving = true;
    this.invalidate();
  }
  restoreSliceView() {
    const previous = this.sliceObservation?.previous;
    if (!previous) return;
    this.clearSliceView();
    this.restoreObservationView(previous);
  }
  patchPoints: THREE.Vector3[] | null = null;
  onNetworkView: (view: NetworkView | null) => void = () => {};
  private networkObservation?: {
    view: NetworkView;
    sourceId: string;
    targets: THREE.Vector3[];
    key: string;
    previous: ObservationMemory;
  };
  clearNetworkView() {
    if (!this.networkObservation) return;
    this.networkObservation = undefined;
    this.moving = false;
    this.onNetworkView(null);
  }
  observeNetwork(
    selected: string,
    linkId: string | null,
    view: NetworkView = "observe",
  ) {
    const targets = networkViewPoints(this.state, selected, linkId);
    const sourceId = networkViewSource(linkId);
    if (
      !targets.length ||
      !sourceId ||
      this.moving ||
      (view !== "observe" && !this.patchPoints) ||
      (isPatchGuide(view) &&
        this.patchPoints &&
        !guidesOnPatch(this.patchPoints, sourceId).includes(view))
    )
      return;
    const current = this.networkObservation;
    if (
      isPatchGuide(view) &&
      current?.view === view &&
      rackForDevice(current.sourceId).id === rackForDevice(sourceId).id
    ) {
      // 同一实体环位换线只替换分支，保留近景和进入核查前的镜头。
      current.sourceId = sourceId;
      current.targets = targets;
      current.key = JSON.stringify(this.patchPoints);
      return;
    }
    const previous =
      this.networkObservation?.previous ?? this.captureObservationView();
    this.clearAirflowView();
    this.clearSliceView();
    this.clearRangeView();
    this.panelViewport = undefined;
    this.clearPowerView();
    this.clearCrossingView();
    this.clearLeakView();
    this.clearEntranceView();
    this.clearEnvironmentView();
    this.clearInletView();
    this.clearMaintenanceView();
    this.networkObservation = {
      view,
      sourceId,
      targets,
      key: JSON.stringify(this.patchPoints ?? targets),
      previous,
    };
    this.currentFocus = false;
    this.interior = false;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 0.5;
    this.autoOrbit = false;
    this.frameNetwork();
    this.onNetworkView(view);
  }
  updateNetworkView(selected: string, linkId: string | null) {
    if (!this.networkObservation) return;
    const targets = networkViewPoints(this.state, selected, linkId);
    if (
      !targets.length ||
      networkViewSource(linkId) !== this.networkObservation.sourceId
    ) {
      this.clearNetworkView();
      this.clearPowerView();
      return;
    }
    const key = JSON.stringify(this.patchPoints ?? targets);
    if (key === this.networkObservation.key) return;
    if (!this.patchPoints) this.networkObservation.view = "observe";
    else if (
      isPatchGuide(this.networkObservation.view) &&
      !guidesOnPatch(
        this.patchPoints,
        this.networkObservation.sourceId,
      ).includes(this.networkObservation.view)
    )
      this.networkObservation.view = "side";
    this.networkObservation.targets = targets;
    this.networkObservation.key = key;
    this.frameNetwork();
    this.onNetworkView(this.networkObservation.view);
  }
  private frameNetwork() {
    if (!this.networkObservation) return;
    if (this.patchPoints) {
      const view = this.networkObservation.view;
      if (view === "observe") this.frameNetworkPatch(this.patchPoints, "iso");
      else if (isPatchGuide(view)) {
        const center = patchGuideCenter(view).add(this.models.rack.position);
        this.frameNetworkPatch([center], view);
      } else {
        const { start, end } = patchSectionRange(this.patchPoints.length, view);
        this.frameNetworkPatch(this.patchPoints.slice(start, end + 1), view);
      }
      return;
    }
    const { width, height, rect } = this.observationViewport();
    this.currentView = "front";
    const fit = networkViewFrame(
      this.networkObservation.targets,
      width,
      height,
      rect,
    );
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.controls.maxDistance = Math.max(45, fit.distance * 1.2);
    this.moving = true;
    this.invalidate();
  }
  private frameNetworkPatch(
    points: THREE.Vector3[],
    view: "iso" | "front" | "rear" | "side" | PatchGuide,
  ) {
    const { width, height, rect, legendRect } = this.observationViewport();
    const guide = isPatchGuide(view);
    this.currentView = guide || view === "side" ? "right" : view;
    const direction = guide
      ? new THREE.Vector3(1, 0.78, -0.65)
      : view === "iso"
        ? new THREE.Vector3(1.05, 0.32, 1)
        : view === "side"
          ? new THREE.Vector3(1, 0.14, 0.15)
          : new THREE.Vector3(0, 0.1, view === "rear" ? -1 : 1);
    const fit = observationFrame(
      points,
      direction,
      width,
      height,
      {
        ...rect,
        left: width - rect.right,
        bottom: Math.min(
          rect.bottom,
          legendRect ? legendRect.top - 12 : rect.bottom,
        ),
      },
      guide ? 0.32 : 1.55,
      guide ? 0.045 : 0.18,
    );
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.controls.minDistance = guide ? 0.22 : 0.5;
    this.moving = true;
    this.invalidate();
  }
  restoreNetworkView() {
    const previous = this.networkObservation?.previous;
    if (!previous) return;
    this.clearNetworkView();
    this.restoreObservationView(previous);
  }
  onPowerView: (active: boolean) => void = () => {};
  private pduMountWindow = new PduMountWindow();
  private powerObservation?: {
    mount?: PduMountInspection;
    paired: boolean;
    sourceId: string;
    targets: THREE.Vector3[];
    key: string;
    previous: ObservationMemory;
  };
  clearPowerView() {
    if (!this.powerObservation) return;
    this.powerObservation = undefined;
    this.moving = false;
    this.onPowerView(false);
  }
  observePower(
    selected: string,
    linkId: string | null,
    paired = false,
    mountIndex?: number,
  ) {
    this.clearCrossingView();
    this.clearLeakView();
    this.clearEntranceView();
    this.clearEnvironmentView();
    this.clearInletView();
    this.clearMaintenanceView();
    const targets = powerViewPoints(
      this.state,
      selected,
      linkId,
      paired,
      mountIndex,
    );
    const sourceId =
      mountIndex === undefined ? powerViewSource(linkId) : selected;
    if (!targets.length || !sourceId || this.moving) return;
    const previous =
      this.powerObservation?.previous ?? this.captureObservationView();
    this.clearNetworkView();
    this.clearAirflowView();
    this.clearSliceView();
    this.clearRangeView();
    this.panelViewport = undefined;
    this.powerObservation = {
      mount:
        mountIndex === undefined
          ? undefined
          : (pduMountInspection(this.state, selected, mountIndex) ?? undefined),
      paired,
      sourceId,
      targets,
      key: JSON.stringify(targets),
      previous,
    };
    this.currentView = "rear";
    this.currentFocus = false;
    this.interior = false;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = mountIndex === undefined ? 0.5 : 0.18;
    this.autoOrbit = false;
    this.framePower();
    this.onPowerView(true);
  }
  updatePowerView(selected: string, linkId: string | null) {
    if (!this.powerObservation) return;
    const targets = powerViewPoints(
      this.state,
      selected,
      linkId,
      this.powerObservation.paired,
      this.powerObservation.mount?.index,
    );
    if (
      !targets.length ||
      (!this.powerObservation.mount ? powerViewSource(linkId) : selected) !==
        this.powerObservation.sourceId
    ) {
      this.clearPowerView();
      return;
    }
    const key = JSON.stringify(targets);
    if (key === this.powerObservation.key) return;
    this.powerObservation.targets = targets;
    this.powerObservation.key = key;
    this.framePower();
  }
  private framePower() {
    if (!this.powerObservation) return;
    const { width, height, rect } = this.observationViewport();
    const fit = powerViewFrame(
      this.powerObservation.targets,
      width,
      height,
      rect,
      this.powerObservation.mount?.side,
      this.state.level === "rack" &&
        this.state.rearDoorOpen &&
        !this.powerObservation.paired
        ? this.models.rack.position.x
        : undefined,
    );
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.controls.maxDistance = Math.max(45, fit.distance * 1.2);
    this.moving = true;
    this.invalidate();
  }
  refitPowerView() {
    this.framePower();
  }
  restorePowerView() {
    const previous = this.powerObservation?.previous;
    if (!previous) return;
    this.clearPowerView();
    this.restoreObservationView(previous);
  }
  onCrossingView: (pair: FixtureCrossing | null) => void = () => {};
  private crossingObservation?: {
    pair: FixtureCrossing;
    previous: ObservationMemory;
  };
  clearCrossingView() {
    if (!this.crossingObservation) return;
    this.models.grilles.setRemovedFace(-1);
    this.crossingObservation = undefined;
    this.moving = false;
    this.onCrossingView(null);
    this.invalidate();
  }
  observeCrossing(pair: FixtureCrossing) {
    if (
      this.state.level !== "room" ||
      (this.moving && !this.crossingObservation)
    )
      return;
    this.clearMaintenanceView();
    this.clearLeakView();
    this.clearEntranceView();
    this.clearEnvironmentView();
    this.clearInletView();
    const previous =
      this.crossingObservation?.previous ?? this.captureObservationView();
    this.clearNetworkView();
    this.clearPowerView();
    this.clearSliceView();
    this.clearRangeView();
    this.clearAirflowView();
    this.panelViewport = undefined;
    this.models.grilles.setRemovedFace(
      pair.kind === "grille-seat" && pair.removed ? pair.instance : -1,
    );
    this.crossingObservation = { pair, previous };
    this.currentView =
      pair.kind === "roof-entry" || pair.kind === "grille-seat"
        ? "top"
        : "front";
    this.currentFocus = false;
    this.interior = false;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.maxPolarAngle =
      pair.kind === "smoke-tray" || pair.kind === "smoke-light"
        ? Math.PI * 0.65
        : Math.PI / 2 - 0.03;
    this.controls.minDistance = 0.5;
    this.autoOrbit = false;
    this.onCrossingView(pair);
    this.frameCrossing();
  }
  frameCrossing() {
    if (!this.crossingObservation) return;
    const { width, height, rect } = this.observationViewport();
    const { pair } = this.crossingObservation;
    const direction = crossingDirection(pair);
    const fit =
      pair.kind === "grille-seat"
        ? observationFrame(
            pair.points,
            direction,
            width,
            height,
            rect,
            0.95,
            0.12,
          )
        : crossingViewFrame(pair.points, width, height, rect, direction);
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.controls.maxDistance = Math.max(45, fit.distance * 1.2);
    this.moving = true;
    this.invalidate();
  }
  restoreCrossingView() {
    const previous = this.crossingObservation?.previous;
    if (!previous) return;
    this.clearCrossingView();
    this.restoreObservationView(previous);
  }
  onEnvironmentView: (inspection: EnvironmentInspection | null) => void =
    () => {};
  private environmentObservation?: {
    inspection: EnvironmentInspection;
    previous: ObservationMemory;
  };
  clearEnvironmentView() {
    if (!this.environmentObservation) return;
    this.environmentObservation = undefined;
    this.moving = false;
    this.onEnvironmentView(null);
    this.invalidate();
  }
  observeEnvironment(pair: EnvironmentPair) {
    const inspection = environmentInspection(pair);
    if (!inspection || this.state.level !== "room" || this.moving) return;
    const previous =
      this.environmentObservation?.previous ?? this.captureObservationView();
    this.clearEntranceView();
    this.clearLeakView();
    this.clearMaintenanceView();
    this.clearCrossingView();
    this.clearNetworkView();
    this.clearPowerView();
    this.clearSliceView();
    this.clearRangeView();
    this.clearAirflowView();
    this.panelViewport = undefined;
    this.clearInletView();
    this.environmentObservation = { inspection, previous };
    this.currentView = "iso";
    this.currentFocus = false;
    this.interior = false;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 0.5;
    this.autoOrbit = false;
    this.onEnvironmentView(inspection);
    this.frameEnvironment();
  }
  frameEnvironment() {
    if (!this.environmentObservation) return;
    const { width, height, rect } = this.observationViewport();
    // 两点沿墙横向展开，给底部图例留高，而不占去整列横向空间。
    rect.left = 40;
    rect.right = width - 150;
    const frame = this.host.getBoundingClientRect();
    const legend = this.host
      .closest(".study-stage")
      ?.querySelector<HTMLElement>(".review-legend")
      ?.getBoundingClientRect();
    if (legend?.height)
      rect.bottom = Math.max(
        rect.top + 120,
        Math.min(rect.bottom, legend.top - frame.top - 24),
      );
    const fit = environmentViewFrame(
      this.environmentObservation.inspection,
      width,
      height,
      rect,
    );
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.controls.maxDistance = Math.max(45, fit.distance * 1.2);
    this.moving = true;
    this.invalidate();
  }
  restoreEnvironmentView() {
    const previous = this.environmentObservation?.previous;
    if (!previous) return;
    this.clearEnvironmentView();
    this.clearInletView();
    this.restoreObservationView(previous);
  }
  onInletView: (inspection: InletInspection | null) => void = () => {};
  private inletObservation?: {
    inspection: InletInspection;
    previous: ObservationMemory;
  };
  clearInletView() {
    if (!this.inletObservation) return;
    this.inletObservation = undefined;
    this.moving = false;
    this.onInletView(null);
    this.invalidate();
  }
  observeInlet(pair: InletViewPair) {
    const inspection = inletInspection(pair);
    if (!inspection || this.state.level !== "room" || this.moving) return;
    const previous =
      this.inletObservation?.previous ?? this.captureObservationView();
    this.clearEntranceView();
    this.clearLeakView();
    this.clearMaintenanceView();
    this.clearCrossingView();
    this.clearNetworkView();
    this.clearPowerView();
    this.clearSliceView();
    this.clearRangeView();
    this.clearAirflowView();
    this.panelViewport = undefined;
    this.clearEnvironmentView();
    this.inletObservation = { inspection, previous };
    this.currentView = "iso";
    this.currentFocus = false;
    this.interior = false;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 0.5;
    this.autoOrbit = false;
    this.onInletView(inspection);
    this.frameInlet();
  }
  frameInlet() {
    if (!this.inletObservation) return;
    const { width, height, rect } = this.observationViewport();
    rect.left = 90;
    rect.right = width - 140;
    rect.bottom = Math.min(rect.bottom, height - 210);
    const fit = inletViewFrame(
      this.inletObservation.inspection,
      width,
      height,
      rect,
    );
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.controls.maxDistance = Math.max(45, fit.distance * 1.2);
    this.moving = true;
    this.invalidate();
  }
  restoreInletView() {
    const previous = this.inletObservation?.previous;
    if (!previous) return;
    this.clearInletView();
    this.restoreObservationView(previous);
  }
  onEntranceView: (pair: EntranceInspection | null) => void = () => {};
  private entranceObservation?: {
    pair: EntranceInspection;
    previous: ObservationMemory;
  };
  clearEntranceView() {
    if (!this.entranceObservation) return;
    this.entranceObservation = undefined;
    this.moving = false;
    this.onEntranceView(null);
    this.invalidate();
  }
  observeEntrance(view: EntranceView) {
    if (
      this.state.level !== "room" ||
      (this.moving && !this.entranceObservation)
    )
      return;
    const pair = entranceInspection(view);
    this.clearEnvironmentView();
    this.clearInletView();
    this.clearLeakView();
    this.clearMaintenanceView();
    this.clearCrossingView();
    const previous =
      this.entranceObservation?.previous ?? this.captureObservationView();
    this.clearNetworkView();
    this.clearPowerView();
    this.clearSliceView();
    this.clearRangeView();
    this.clearAirflowView();
    this.panelViewport = undefined;
    this.entranceObservation = { pair, previous };
    this.currentView = "iso";
    this.currentFocus = false;
    this.interior = false;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 0.5;
    this.autoOrbit = false;
    this.onEntranceView(pair);
    this.frameEntrance();
  }
  frameEntrance() {
    if (!this.entranceObservation) return;
    const { width, height, rect } = this.observationViewport();
    const fit = entranceViewFrame(
      this.entranceObservation.pair,
      width,
      height,
      rect,
    );
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.controls.maxDistance = Math.max(45, fit.distance * 1.2);
    this.moving = true;
    this.invalidate();
  }
  restoreEntranceView() {
    const previous = this.entranceObservation?.previous;
    if (!previous) return;
    this.clearEntranceView();
    this.clearEnvironmentView();
    this.clearInletView();
    this.restoreObservationView(previous);
  }
  onLeakView: (pair: LeakInspection | null) => void = () => {};
  private leakObservation?: {
    pair: LeakInspection;
    previous: ObservationMemory;
  };
  clearLeakView() {
    if (!this.leakObservation) return;
    this.leakObservation = undefined;
    this.moving = false;
    this.onLeakView(null);
    this.invalidate();
  }
  observeLeak(view: LeakView, target?: LeakTarget) {
    // 同一次观察内允许改选目标段，保留首次镜头并接续尚未结束的取景。
    if (this.state.level !== "room" || (this.moving && !this.leakObservation))
      return;
    const pair = leakInspection(view, target);
    this.clearEntranceView();
    this.clearEnvironmentView();
    this.clearInletView();
    this.clearMaintenanceView();
    this.clearCrossingView();
    const previous =
      this.leakObservation?.previous ?? this.captureObservationView();
    this.clearNetworkView();
    this.clearPowerView();
    this.clearSliceView();
    this.clearRangeView();
    this.clearAirflowView();
    this.panelViewport = undefined;
    this.leakObservation = { pair, previous };
    this.currentView =
      view === "all" ||
      view === "sensing" ||
      view === "floor" ||
      (pair.route && !pair.route.isLead)
        ? "top"
        : "iso";
    this.currentFocus = false;
    this.interior = false;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 0.5;
    this.autoOrbit = false;
    this.onLeakView(pair);
    this.frameLeak();
  }
  frameLeak() {
    if (!this.leakObservation) return;
    const { width, height, rect } = this.observationViewport();
    const fit = leakViewFrame(this.leakObservation.pair, width, height, rect);
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.controls.maxDistance = Math.max(45, fit.distance * 1.2);
    this.moving = true;
    this.invalidate();
  }
  restoreLeakView() {
    const previous = this.leakObservation?.previous;
    if (!previous) return;
    this.clearLeakView();
    this.restoreObservationView(previous);
  }
  onMaintenanceView: (inspection: MaintenanceInspection | null) => void =
    () => {};
  private maintenanceObservation?: {
    inspection: MaintenanceInspection;
    previous: ObservationMemory;
  };
  clearMaintenanceView() {
    if (!this.maintenanceObservation) return;
    this.maintenanceObservation = undefined;
    this.moving = false;
    this.onMaintenanceView(null);
    this.invalidate();
  }
  observeMaintenance(rackId: string, view: MaintenanceView, grilleId?: string) {
    if (this.state.level !== "room" || this.moving) return;
    const inspection = maintenanceInspection(rackId, view, grilleId);
    if (!inspection) return;
    const previous =
      this.maintenanceObservation?.previous ?? this.captureObservationView();
    this.clearNetworkView();
    this.clearPowerView();
    this.clearSliceView();
    this.clearRangeView();
    this.clearAirflowView();
    this.clearCrossingView();
    this.clearLeakView();
    this.clearEntranceView();
    this.clearEnvironmentView();
    this.clearInletView();
    this.panelViewport = undefined;
    this.maintenanceObservation = { inspection, previous };
    this.currentView = "top";
    this.currentFocus = false;
    this.interior = false;
    this.autoOrbit = false;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 0.5;
    this.onMaintenanceView(inspection);
    this.frameMaintenance();
  }
  frameFrontService(
    area: MaintenanceArea,
    deviceY: number,
    chassisDepth?: number,
  ) {
    this.frontServiceFrame = { area, deviceY, chassisDepth };
    const { width, height, rect } = this.observationViewport();
    const { minX, maxX, minZ, maxZ } = area.bounds;
    const points =
      chassisDepth !== undefined
        ? [deviceY - 0.2, deviceY + 0.22].flatMap((y) => [
            new THREE.Vector3(maxX, y, minZ - chassisDepth),
            new THREE.Vector3(
              maxX,
              y,
              minZ + definition.rack.motion.trayTravel,
            ),
            new THREE.Vector3(
              area.position[0],
              y,
              minZ + definition.rack.motion.trayTravel,
            ),
          ])
        : [minX, maxX].flatMap((x) => [
            new THREE.Vector3(x, area.position[1], maxZ),
            new THREE.Vector3(x, area.position[1], minZ),
            new THREE.Vector3(x, Math.max(0.85, deviceY + 0.18), minZ),
          ]);
    const fit = observationFrame(
      points,
      chassisDepth === undefined
        ? new THREE.Vector3(0.78, 0.67, 1)
        : new THREE.Vector3(1, 0.31, 0.46),
      width,
      height,
      rect,
      1.6,
      0.12,
    );
    this.currentView = "iso";
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.moving = true;
    this.invalidate();
  }
  frameRearService(area: MaintenanceArea, hingeX: number) {
    const { width, height, rect } = this.observationViewport();
    const { minX, maxX, minZ, maxZ } = area.bounds;
    const points = [minX, maxX].flatMap((x) => [
      new THREE.Vector3(x, area.position[1], minZ),
      new THREE.Vector3(x, area.position[1], maxZ),
      new THREE.Vector3(x, area.position[1] + definition.rack.size[1], maxZ),
    ]);
    // 从相对门扇一侧看向插座，给图例和门扇自由边留出画面。
    const margin = Math.min(rect.left, width * 0.18);
    const fit = observationFrame(
      points,
      new THREE.Vector3(-Math.sign(hingeX - area.position[0]) * 0.32, 0.5, -1),
      width,
      height,
      { ...rect, right: width - margin },
      1.5,
      0.1,
    );
    this.currentView = "rear";
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.moving = true;
    this.invalidate();
  }
  frameMaintenance() {
    if (!this.maintenanceObservation) return;
    const { width, height, rect } = this.observationViewport();
    const fit = maintenanceViewFrame(
      this.maintenanceObservation.inspection,
      width,
      height,
      rect,
    );
    this.targetPosition.copy(fit.position);
    this.targetLook.copy(fit.target);
    this.controls.maxDistance = Math.max(45, fit.distance * 1.2);
    this.moving = true;
    this.invalidate();
  }
  restoreMaintenanceView() {
    const previous = this.maintenanceObservation?.previous;
    if (!previous) return;
    this.clearMaintenanceView();
    this.restoreObservationView(previous);
  }
  private panelViewport?: { width: number; height: number };
  // 预览打开和还原侧栏时仅更新投影，真实窗口缩放与主动定位仍按目标取景。
  preservePanelView() {
    this.panelViewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  invalidate = () => {
    this.renderDemand.invalidate();
    this.loop.setEnabled(!this.paused && this.contextAvailable);
    this.loop.wake();
  };
  resize() {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    if (this.viewportSize.x === width && this.viewportSize.y === height) return;
    this.viewportSize.set(width, height);
    this.invalidate();
    if (
      this.roomViewMemory &&
      (width !== this.roomViewMemory.width ||
        height !== this.roomViewMemory.height)
    )
      this.clearRoomViewMemory();
    const previousAspect = this.camera.aspect;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // 画布随容器布局，只调整绘图缓冲区，避免折叠侧栏时旧宽度撑出滚动条。
    this.renderer.setSize(width, height, false);
    this.pipeline.resize(width, height);
    if (this.frontServiceFrame && this.state.level === "rack") {
      const { area, deviceY, chassisDepth } = this.frontServiceFrame;
      this.frameFrontService(area, deviceY, chassisDepth);
      return;
    }
    if (this.maintenanceObservation) {
      this.frameMaintenance();
      return;
    }
    if (this.inletObservation) {
      this.frameInlet();
      return;
    }
    if (this.environmentObservation) {
      this.frameEnvironment();
      return;
    }
    if (this.entranceObservation) {
      this.frameEntrance();
      return;
    }
    if (this.leakObservation) {
      this.frameLeak();
      return;
    }
    if (this.crossingObservation) {
      this.frameCrossing();
      return;
    }
    if (this.powerObservation) {
      this.framePower();
      return;
    }
    if (this.networkObservation) {
      this.frameNetwork();
      return;
    }
    if (this.rangeObservation) {
      this.frameRange();
      return;
    }
    if (this.sliceObservation) {
      this.frameSlice();
      return;
    }
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
    this.hideRackHint();
    event.preventDefault();
    this.contextAvailable = false;
    this.loop.setEnabled(false);
    const feedback: SceneFeedback = {
      key: presentationKey(this.state),
      phase: this.lastPhase ?? "closed",
      settled: false,
    };
    this.lastFeedback = `${feedback.key}:${feedback.phase}:false`;
    this.onFeedback(feedback);
    this.onError("三维图形上下文已丢失，请重新加载场景。");
  };
  captureRecoveryPose() {
    return {
      key: presentationKey(this.state),
      camera: this.captureObservationView(),
      destination: this.moving
        ? {
            position: this.targetPosition.clone(),
            target: this.targetLook.clone(),
          }
        : null,
      mechanism: { ...this.presentation.pose },
      rearDoor: this.presentation.rearDoor,
      cover: this.cover,
      explosion: this.explosion,
      observations: {
        airflowObservation: this.airflowObservation,
        rangeObservation: this.rangeObservation,
        sliceObservation: this.sliceObservation,
        networkObservation: this.networkObservation,
        powerObservation: this.powerObservation,
        crossingObservation: this.crossingObservation,
        environmentObservation: this.environmentObservation,
        inletObservation: this.inletObservation,
        entranceObservation: this.entranceObservation,
        leakObservation: this.leakObservation,
        maintenanceObservation: this.maintenanceObservation,
      },
      partInspection: this.partInspection,
      roomView: this.roomViewMemory,
      studioOrigin: this.studioOrigin,
      pendingDeviceView: this.pendingDeviceView,
      pendingDeviceFocus: this.pendingDeviceFocus,
      pendingComponentFocus: this.pendingComponentFocus,
      pendingReturnView: this.pendingReturnView,
    };
  }
  restoreRecoveryPose(saved: ReturnType<SceneEngine["captureRecoveryPose"]>) {
    // 故障期间仍可查找或切换对象，旧姿态只属于丢失上下文时的检视。
    if (saved.key !== presentationKey(this.state)) return;
    this.presentation.pose = saved.mechanism;
    this.presentation.rearDoor = saved.rearDoor;
    this.cover = saved.cover;
    this.explosion = saved.explosion;
    this.partInspection = saved.partInspection;
    this.view(saved.camera.view, saved.camera.focus);
    Object.assign(this, saved.observations);
    const crossing = this.crossingObservation?.pair;
    this.models.grilles.setRemovedFace(
      crossing?.kind === "grille-seat" && crossing.removed
        ? crossing.instance
        : -1,
    );
    this.restoreObservationView(saved.camera);
    this.camera.position.copy(saved.camera.position);
    this.controls.target.copy(saved.camera.target);
    if (saved.destination) {
      this.targetPosition.copy(saved.destination.position);
      this.targetLook.copy(saved.destination.target);
    }
    this.moving = !!saved.destination;
    this.studioOrigin = saved.studioOrigin;
    this.pendingDeviceView = saved.pendingDeviceView;
    this.pendingDeviceFocus = saved.pendingDeviceFocus;
    this.pendingComponentFocus = saved.pendingComponentFocus;
    this.pendingReturnView = saved.pendingReturnView;
    const { width, height } = this.host.getBoundingClientRect();
    if (saved.roomView?.width === width && saved.roomView.height === height) {
      this.roomViewMemory = saved.roomView;
      this.onRoomViewMemory(true);
    }
  }
  cancelFlight = () => {
    this.invalidate();
    this.clearNetworkView();
    this.clearPowerView();
    this.clearCrossingView();
    this.clearLeakView();
    this.clearEntranceView();
    this.clearEnvironmentView();
    this.clearInletView();
    this.clearMaintenanceView();
    this.clearSliceView();
    this.clearRangeView();
    this.clearAirflowView();
    this.moving = false;
    this.lastManualInteraction = performance.now();
  };
  private registerAssembly(
    id: string,
    assembly: ReturnType<typeof createEquipmentAssembly>,
  ) {
    // 在装配尚未挂入场景、部件仍在原位时量取底面。不同外观的实际高度可略超出名义 U 高。
    const body = assembly.representations?.exterior ?? assembly.root;
    const baseHeight = -new THREE.Box3().setFromObject(body).min.y;
    const registered = { ...assembly, baseHeight };
    this.assemblies.set(id, registered);
    return registered;
  }
  activateAssembly(state: AppState) {
    this.partIsolation.restore();
    const model = modelForDevice(state.deviceId);
    if (model.id === this.assemblyModel) return;
    this.rearModuleSeats.clear();
    this.dimmSocket.update();
    const assembly =
      this.assemblies.get(model.id) ??
      this.registerAssembly(model.id, createEquipmentAssembly(model.id));
    this.presentation.workbench.y =
      definition.inspectionBench.surfaceY + assembly.baseHeight;
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
    this.models.patchGuides.visible = patchSettings.rackIds.includes(rack.id);
    this.models.bench.position.set(
      rack.position[0],
      0,
      rack.position[2] + definition.inspectionBench.frontOffset,
    );
    this.presentation.workbench.copy(this.models.bench.position);
    const model = modelForDevice(state.deviceId);
    this.inspectionBackdrop.datum.scale.z =
      model.depth / definition.server.size[2];
    this.models.benchContact.scale.set(
      definition.server.size[0] + 0.05,
      model.depth + 0.06,
      1,
    );
    const baseHeight =
      this.assemblies.get(model.id)?.baseHeight ??
      this.models.server.position.y -
        new THREE.Box3().setFromObject(this.models.server).min.y;
    this.presentation.workbench.y =
      definition.inspectionBench.surfaceY + baseHeight;
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
      rack.position[2] +
        installedFrontZ -
        modelForDevice(state.deviceId).depth / 2,
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
  // 保留进入前的一帧作短过渡，随后整柜在新工位继续靠近；快照不接收操作。
  private fadeRoomView() {
    this.roomTransition?.remove();
    if (
      !this.contextAvailable ||
      this.paused ||
      this.reducedMotion ||
      !this.lastTime
    )
      return;
    const source = this.renderer.domElement;
    const snapshot = document.createElement("canvas");
    snapshot.width = source.width;
    snapshot.height = source.height;
    const context = snapshot.getContext("2d");
    if (!context) return;
    this.pipeline.render(0, 0, false);
    context.drawImage(source, 0, 0);
    snapshot.className = "inspection-transition";
    snapshot.setAttribute("aria-hidden", "true");
    source.after(snapshot);
    this.roomTransition = snapshot;
    const fade = snapshot.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 280,
      easing: "ease-out",
      fill: "forwards",
    });
    fade.onfinish = () => {
      snapshot.remove();
      if (this.roomTransition === snapshot) this.roomTransition = undefined;
    };
  }
  update(state: AppState) {
    this.invalidate();
    if (state.level !== "room" && this.roomViewMemory)
      this.clearRoomViewMemory();
    if (this.state.level === "room" && state.level !== "room") {
      this.studioOrigin = this.captureTaskView("room");
      this.fadeRoomView();
    } else if (state.level === "room") {
      this.roomTransition?.remove();
      if (state.selected !== "room-01") this.studioOrigin = null;
    }
    const deviceChanged = state.deviceId !== this.state.deviceId;
    if (deviceChanged) {
      this.installDevice(state);
      this.activateAssembly(state);
    }
    const levelChanged = state.level !== this.state.level;
    if (
      levelChanged ||
      deviceChanged ||
      state.doorOpen !== this.state.doorOpen ||
      state.trayExtended !== this.state.trayExtended
    )
      this.hideRackHint();
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
  private deviceOrbit?: {
    center: THREE.Vector3;
    points: number[][];
    direction: THREE.Vector3;
    fit: number;
    top: number;
    bottom: number;
  };
  private adaptDeviceOrbit() {
    const frame = this.deviceOrbit;
    if (
      !frame ||
      this.moving ||
      frame.center.distanceToSquared(this.controls.target) > 1e-6
    )
      return;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = offset.length();
    offset.normalize();
    if (offset.distanceToSquared(frame.direction) < 1e-8) return;
    const fit = pointsFrameDistance(
      frame.points,
      offset.toArray(),
      this.camera.aspect,
      this.controls.minDistance,
      frame.top,
      frame.bottom,
    );
    // 随当前投影调整取景，保留用户相对整机的缩放比例。平移或聚焦部件时交还镜头。
    const radius = THREE.MathUtils.clamp(
      (distance * fit) / frame.fit,
      this.controls.minDistance,
      this.controls.maxDistance,
    );
    this.camera.position
      .copy(this.controls.target)
      .addScaledVector(offset, radius);
    this.camera.updateMatrixWorld();
    frame.direction.copy(offset);
    frame.fit = fit;
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
    const withdrawal = dockWithdrawalAt(this.state.explosion);
    if (withdrawal < 1) {
      const offset = new THREE.Vector3();
      for (const side of [-1, 1]) {
        const scale = dockScaleAndPosition(withdrawal, 1, side, offset);
        offset.add(this.models.bench.position);
        const box = this.models.dockHalfBounds.clone();
        box.min.multiplyScalar(scale);
        box.max.multiplyScalar(scale);
        include(box.translate(offset));
      }
    }
    const representations = this.assemblies.get(
      this.assemblyModel,
    )?.representations;
    const exterior =
      representations &&
      !this.state.coverOpen &&
      this.state.explosion <= internalStructureThreshold;
    const body = representations
      ? exterior
        ? representations.exterior
        : representations.schematic
      : this.models.server;
    // 按目标姿态取景，包括即将显示的外观或示意机壳。
    body.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      for (
        let node: THREE.Object3D | null = object;
        node && node !== body;
        node = node.parent
      ) {
        if (!node.visible || this.models.parts.has(node.userData.entityId))
          return;
      }
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      include(
        object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld),
      );
    });
    if (exterior) return bounds;
    for (const part of partsForDevice(this.state.deviceId)) {
      const group = this.models.parts.get(part.id);
      if (!group) continue;
      const base = this.partBases.get(part.id)?.toArray() ?? part.position;
      const target = new THREE.Vector3().fromArray(
        assemblyPartPosition(
          { ...part, position: base },
          this.state.explosion,
          this.state.coverOpen ||
            (modelForDevice(this.state.deviceId).category === "server" &&
              this.state.explosion > 0)
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
    this.deviceOrbit = undefined;
    this.invalidate();
    this.clearNetworkView();
    this.clearPowerView();
    this.clearCrossingView();
    this.clearLeakView();
    this.clearEntranceView();
    this.clearEnvironmentView();
    this.clearInletView();
    this.clearMaintenanceView();
    this.clearSliceView();
    this.clearRangeView();
    // 隔离盘组时允许选择其硬盘子件，画幅始终覆盖可见隔离范围。
    const inspectionTarget =
      this.state.level === "device" &&
      this.partInspection?.deviceId === this.state.deviceId
        ? this.isolatedPartId
        : null;
    focus = focus || !!inspectionTarget;
    this.clearAirflowView();
    this.panelViewport = undefined;
    const fixture =
      this.state.level === "room" && focus
        ? roomFacilityById(this.state.selected)
        : undefined;
    if (fixture && view === "interior") view = "iso";
    const returning =
      this.taskReturnView?.level === this.state.level
        ? this.taskReturnView
        : this.state.level === "room"
          ? this.studioOrigin
          : null;
    // 先在当前镜头中完成复原与合盖，再随设备返回机柜。
    if (
      (this.state.level !== "device" &&
        (this.explosion > 0 || this.cover > 0)) ||
      (this.state.level === "room" && this.presentation.rearDoor > 0)
    ) {
      this.currentView = returning?.view ?? view;
      this.currentFocus = focus;
      this.pendingReturnView = true;
      return;
    }
    this.pendingReturnView = false;
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
    if (returning) {
      if (level === "room") this.studioOrigin = null;
      this.restoreObservationView(returning);
      if (returning.range) {
        this.rangeObservation = returning.range;
        this.onRangeView(returning.range.side, returning.range.segmentId);
      }
      this.preservePanelView();
      return;
    }
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
      this.invalidate();
      return;
    }
    if (
      this.state.level === "rack" &&
      !focus &&
      this.patchPoints &&
      (view === "iso" || view === "front" || view === "rear")
    ) {
      this.frameNetworkPatch(this.patchPoints, view);
      return;
    }
    // 机房内聚焦设备时保留整柜参照，选择轮廓仍落在设备的实际安装位。
    const roomDevice =
      level === "room" && focus && this.telemetry.mode === "status"
        ? deviceById(this.state.selected)
        : undefined;
    const object = this.objectFor(
      roomDevice?.rackId ?? inspectionTarget ?? this.state.selected,
    );
    const framingPoints: THREE.Vector3[] = [];
    const wholeDevice =
      level === "device" &&
      !inspectionTarget &&
      (!focus || this.state.selected === this.state.deviceId);
    const wholeRack =
      level === "rack" && (!focus || object === this.models.rack);
    // 一帧内展开并定位子件时，所属模组的新姿态还未经过渲染器更新。
    if (level === "device" && focus) object?.updateWorldMatrix(true, false);
    const bounds = wholeDevice
      ? this.deviceBounds(framingPoints)
      : object && focus && !wholeRack
        ? new THREE.Box3().setFromObject(object)
        : null;
    // 两种姿态共用取景范围，窗口在部件落座时缩小也能容纳分层几何。
    const scope = layerScopeFor(object, this.layerScopeId);
    if (scope && bounds) scopeBounds(bounds, scope);
    const layerRoot = scope?.layerRoot ?? object;
    const layer =
      inspectionTarget && this.layerPose ? assemblyLayer(layerRoot) : undefined;
    if (layer && this.layerPose === "seated" && bounds && layerRoot)
      includeSeparatedLayer(bounds, layerRoot, layer, scope?.moving);
    if (this.dimmPose === "seated" && inspectionTarget && object && bounds)
      bounds.max.y +=
        this.dimmSocket.lift * object.getWorldScale(new THREE.Vector3()).y;
    const contactPair =
      inspectionTarget && this.storageContact
        ? storageContactObjects(
            this.state.deviceId,
            inspectionTarget,
            this.models.parts,
          )
        : null;
    const hasCompanions = inspectionTarget && this.companionPartIds.length > 0;
    if (hasCompanions && bounds) {
      for (const id of this.companionPartIds) {
        const companion = this.models.parts.get(id);
        if (!companion) continue;
        companion.updateWorldMatrix(true, false);
        bounds.expandByObject(companion);
      }
    }
    if (
      (this.compactStoragePose === "mount-seated" ||
        this.compactStoragePose === "mount-raised") &&
      bounds &&
      object
    ) {
      const mount = modelForDevice(this.state.deviceId).controllerMount!;
      const travel = new THREE.Vector3()
        .fromArray(mount.controllerTravel)
        .multiplyScalar(this.explosion);
      if (this.compactStoragePose === "mount-raised") travel.negate();
      const local = object.parent!;
      travel.applyMatrix3(
        new THREE.Matrix3().setFromMatrix4(local.matrixWorld),
      );
      bounds.union(new THREE.Box3().setFromObject(object).translate(travel));
    }
    if (contactPair && bounds) {
      if (this.storageConnectorPose) connectorBounds(bounds, contactPair);
      else bounds.expandByObject(contactPair.board);
    }
    if (this.rearRowPose && bounds) this.rearModuleSeats.includeFrame(bounds);
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
          level === "room"
            ? view === "top"
              ? definition.room.size[1] / 2
              : 0.5
            : level === "rack"
              ? 1.1
              : 0.65,
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
          : level === "room"
            ? roomLayoutCameraDirection
            : [0.001, 1, 0.001]
        : view === "rear"
          ? [0, 0.13, -1]
          : view === "front"
            ? [0, 0.13, 1]
            : view === "right"
              ? [1, 0.2, 0.001]
              : level === "rack"
                ? [0.48, 0.28, 1.5]
                : wholeDevice && this.state.explosion > 0
                  ? [-0.58, 0.65, 1.22]
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
      if (this.rearRowPose)
        direction
          .fromArray(
            modelForDevice(this.state.deviceId).powerBays?.focusDirection ??
              definition.rearModuleSeats.focusDirection,
          )
          .transformDirection(object.matrixWorld);
      if (this.dimmPose)
        direction.set(1, 0.51, 0.46).transformDirection(object.matrixWorld);
      if (layer) {
        direction
          .fromArray(scope?.direction ?? layer.direction)
          .transformDirection(object.matrixWorld);
        // 从板底核查贯通孔时，轨道须允许镜头到达该层配置的下视点。
        if (scope && direction.y < 0)
          this.controls.maxPolarAngle = Math.PI - 0.03;
      }
      // 从侧前方看清分离的接触面和中板；仍保留实体遮挡。
      if (contactPair) {
        if (this.storageConnectorPose)
          direction
            .fromArray(
              definition.storageAssembly.contactInspection.focusDirection,
            )
            .transformDirection(contactPair.socket.matrixWorld);
        else direction.set(0.8, 0.7, 0.12).normalize();
      }
    }
    if (fixture && view === "iso")
      direction.fromArray(fixture.focus.direction).normalize();
    const minimum = fixture
      ? fixture.focus.distance
      : (layer || this.storageConnectorPose) && bounds
        ? Math.min(
            cameraMinimumDistance.device,
            Math.max(
              this.camera.near * 4,
              bounds.getSize(new THREE.Vector3()).length(),
            ),
          )
        : cameraMinimumDistance[level];
    let topInsetFraction = 0;
    let bottomInsetFraction = 0;
    if (wholeRack) {
      const [width, height, depth] = definition.rack.size;
      const rack = this.models.rack.position;
      center.copy(rack);
      center.y += height / 2;
      // 柜门占整高，伸出的导轨仅占所选 U 位；不为上方的空角预留导轨行程。
      for (const x of [-width / 2, width / 2])
        for (const y of [0, height + 0.03])
          for (const z of [-depth / 2 - width / 2, depth / 2 + width])
            framingPoints.push(new THREE.Vector3(x, y, z).add(rack));
      const dialRadius =
        dialBearingRadius *
        definition.rendering.inspectionStudio.dialWidthScale;
      for (let i = 0; i < 24; i++) {
        const angle = (i * Math.PI) / 12;
        framingPoints.push(
          new THREE.Vector3(
            rack.x + dialRadius * Math.cos(angle),
            rack.y + definition.rendering.floor.surfaceY,
            rack.z + dialRadius * Math.sin(angle),
          ),
        );
      }
      const mounted = this.presentation.mounted;
      for (const x of [-width / 2, width / 2])
        for (const dy of [-0.1, 0.1])
          framingPoints.push(
            new THREE.Vector3(
              rack.x + x,
              mounted.y + dy,
              rack.z + depth / 2 + definition.rack.motion.trayTravel,
            ),
          );
    }
    const reserveActions =
      wholeDevice ||
      wholeRack ||
      hasCompanions ||
      !!layer ||
      !!this.storageConnectorPose;
    if (reserveActions) {
      const frame = this.host.getBoundingClientRect();
      const actions = this.host
        .closest(".study-stage")
        ?.querySelector(".review-object-actions")
        ?.getBoundingClientRect();
      if (actions?.height && frame.height)
        bottomInsetFraction = (frame.bottom - actions.top) / frame.height;
    }
    if (
      reserveActions ||
      (level === "room" &&
        focus &&
        (roomDevice ||
          entityById(this.state.selected)?.kind === "rack" ||
          (fixture &&
            "kind" in fixture &&
            ["cable-tray", "ceiling-light", "floor-grille-row"].includes(
              fixture.kind,
            ))))
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
    const radius = framingPoints.reduce(
      (r, point) => Math.max(r, point.distanceTo(center)),
      0,
    );
    const orbitMinimum = Math.max(minimum, radius + 2 * this.camera.near);
    const points = framingPoints.map((point) => point.sub(center).toArray());
    const distance = points.length
      ? pointsFrameDistance(
          points,
          direction.toArray(),
          this.camera.aspect,
          orbitMinimum,
          topInsetFraction,
          bottomInsetFraction,
        )
      : bounds
        ? boundsFrameDistance(
            bounds.getSize(new THREE.Vector3()).toArray(),
            direction.toArray(),
            this.camera.aspect,
            minimum,
            topInsetFraction,
            bottomInsetFraction,
          )
        : level === "room" && view === "top"
          ? boundsFrameDistance(
              definition.room.size,
              direction.toArray(),
              this.camera.aspect,
              minimum,
              0.1,
            )
          : frameDistance(size, this.camera.aspect, minimum);
    if (wholeDevice && points.length)
      this.deviceOrbit = {
        center: center.clone(),
        points,
        direction: direction.clone(),
        fit: distance,
        top: topInsetFraction,
        bottom: bottomInsetFraction,
      };
    this.targetLook.copy(center);
    this.targetPosition
      .copy(center)
      .addScaledVector(direction, contactPair ? distance * 1.15 : distance);
    // 柜式设施的初始取景给工具栏和周边设施留出空间，随后仍可手动拉近。
    this.controls.minDistance =
      fixture && "size" in fixture
        ? cameraMinimumDistance[level]
        : orbitMinimum;
    this.controls.maxDistance = Math.max(
      distance * 1.1,
      level === "device" ? 5 : level === "rack" ? 9 : 24,
    );
    this.moving = true;
    this.invalidate();
  }
  zoom(factor: number) {
    this.invalidate();
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
  private pickSurface(
    event: MouseEvent | PointerEvent,
  ): { id: string; blankUnit?: number; panelPort?: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    for (const hit of this.raycaster.intersectObjects(
      this.state.level === "device"
        ? [this.models.server]
        : this.state.level === "rack"
          ? [
              this.models.rack,
              this.models.server,
              ...this.installation.batches.map((batch) => batch.mesh),
              this.signals.root,
            ]
          : [this.models.root, this.signals.root],
      true,
    )) {
      if (!(hit.object instanceof THREE.Mesh) || !this.visible(hit.object))
        continue;
      if (
        hit.object instanceof THREE.InstancedMesh &&
        hit.instanceId !== undefined &&
        hit.object.userData.instanceEntityIds
      ) {
        const id = hit.object.userData.instanceEntityIds[hit.instanceId];
        if (
          hit.object.userData.instanceVisible[hit.instanceId] &&
          (this.state.level !== "rack" ||
            deviceById(id)?.rackId === this.models.rack.userData.entityId)
        )
          return { id };
        continue;
      }
      if (
        this.storageBoardDisk !== undefined &&
        this.isolatedPartId === "sto-midplane" &&
        this.state.level === "device" &&
        hit.object.userData.storageSlotIndex !== undefined
      ) {
        const slot = storageSlots(this.state.deviceId)[
          hit.object.userData.storageSlotIndex
        ];
        if (slot) return { id: slot.id };
      }
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        if (
          object.userData.fanSlot &&
          this.layerScopeId?.startsWith("fan-bank:")
        )
          return { id: object.userData.fanSlot };
        if (object.userData.entityId) {
          const id = object.userData.entityId as string;
          const index = hit.instanceId;
          const blankUnit =
            index !== undefined && hit.object.parent?.name === "rack-blanking"
              ? hit.object.parent.userData.units[
                  hit.object.name === "blanking-fasteners"
                    ? Math.floor(index / 2)
                    : index
                ]
              : undefined;
          return {
            id:
              entityById(id)?.kind === "part" && this.state.level !== "device"
                ? this.state.deviceId
                : id,
            panelPort:
              index === undefined
                ? undefined
                : hit.object.userData.panelPorts?.[index],
            blankUnit,
          };
        }
        object = object.parent;
      }
    }
    return null;
  }
  pick(event: MouseEvent | PointerEvent) {
    return this.pickSurface(event)?.id ?? null;
  }
  pointerDown = (event: PointerEvent) => {
    this.hideRackHint();
    this.pointerStart.set(event.clientX, event.clientY);
  };
  pointerUp = (event: PointerEvent) => {
    if (
      this.pointerStart.distanceTo(
        new THREE.Vector2(event.clientX, event.clientY),
      ) < 5
    ) {
      const surface = this.pickSurface(event);
      if (
        surface?.panelPort &&
        surface.id === this.state.selected &&
        !this.moving &&
        this.onInspectPanelPort
      ) {
        this.onInspectPanelPort({
          panelId: surface.id,
          port: surface.panelPort,
        });
      } else if (surface) this.onSelect(surface.id);
    }
  };
  doubleClick = (event: MouseEvent) => {
    const id = this.pick(event);
    if (id) this.onSelect(id, true);
  };
  private hideRackHint = () => {
    this.rackHint.hidden = true;
  };
  hover = (event: PointerEvent) => {
    const surface = this.pickSurface(event);
    this.renderer.domElement.style.cursor = surface ? "pointer" : "grab";
    if (
      event.buttons ||
      event.pointerType === "touch" ||
      this.moving ||
      this.state.level !== "rack" ||
      !this.state.doorOpen ||
      !surface
    ) {
      this.hideRackHint();
      return;
    }
    const device = deviceById(surface.id);
    const label = device
      ? `${device.name} · ${unitLabel(device.id)}`
      : surface.blankUnit
        ? `U${surface.blankUnit} · 空置封板`
        : null;
    if (!label) {
      this.hideRackHint();
      return;
    }
    const rect = this.host.getBoundingClientRect();
    this.rackHint.textContent = label;
    this.rackHint.hidden = false;
    this.rackHint.style.left =
      Math.max(
        0,
        Math.min(
          event.clientX - rect.left + 12,
          rect.width - this.rackHint.offsetWidth,
        ),
      ) + "px";
    this.rackHint.style.top =
      Math.max(
        0,
        Math.min(
          event.clientY - rect.top + 12,
          rect.height - this.rackHint.offsetHeight,
        ),
      ) + "px";
  };
  private projectAnchor(
    element: HTMLElement,
    x: number,
    y: number,
    hidden: boolean,
  ) {
    const point = this.anchorProjection.update(element, x, y, hidden);
    if (!point) return;
    if (element.dataset.screenX !== String(point.x))
      element.dataset.screenX = String(point.x);
    if (element.dataset.screenY !== String(point.y))
      element.dataset.screenY = String(point.y);
    if (element.hidden !== point.hidden) element.hidden = point.hidden;
    this.anchorsChanged = true;
  }
  private projectHotspotBounds(
    element: HTMLElement,
    width: number,
    height: number,
  ) {
    const { min, max } = this.anchorBounds;
    let left = Infinity,
      right = -Infinity,
      top = Infinity,
      bottom = -Infinity;
    for (let i = 0; i < 8; i++) {
      const corner = this.anchorCorner
        .set(
          i & 1 ? max.x : min.x,
          i & 2 ? max.y : min.y,
          i & 4 ? max.z : min.z,
        )
        .project(this.camera);
      const x = ((corner.x + 1) * width) / 2,
        y = ((1 - corner.y) * height) / 2;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    const bounds = [left, top, right, bottom].map(Math.round).join(",");
    if (element.dataset.hotspotBounds !== bounds) {
      element.dataset.hotspotBounds = bounds;
      this.anchorsChanged = true;
    }
  }
  bindAnchors(element: HTMLElement) {
    this.invalidate();
    this.anchorProjection = new AnchorProjection();
    this.anchors = element;
    this.anchorElements = [
      ...element.querySelectorAll<HTMLElement>("[data-anchor]"),
    ];
  }
  bindAxes(element: HTMLElement) {
    this.invalidate();
    this.axesElements = [
      ...element.querySelectorAll<HTMLElement>("[data-axis]"),
    ];
  }
  poseParts() {
    this.rearModuleSeats.restoreModule();
    const assembly = this.assemblies.get(this.assemblyModel);
    if (assembly) poseExterior(assembly, this.explosion, this.cover);
    this.guidePositions.fill(0);
    for (const [index, part] of partsForDevice(this.state.deviceId).entries()) {
      const base = this.partBases.get(part.id)?.toArray() ?? part.position;
      // 接合面横跨控制板和风扇组，两侧都沿用机内安装坐标。
      const processorSeat =
        this.layerScopeId?.startsWith("processor-") &&
        (part.id === "board-01" ||
          part.node === "chip" ||
          part.node === "processor");
      const fanContact =
        this.layerScopeId?.startsWith("fan-") &&
        (part.id === "net-board" || part.id === "net-fans");
      const position = assemblyPartPosition(
        { ...part, position: base },
        processorSeat ||
          (this.layerScopeId === "rear-seat" &&
            (part.node === "adapter" ||
              part.node === "riser" ||
              part.id === "riser-01")) ||
          (this.layerScopeId === "bay-contact" && part.node === "psu") ||
          (isAsicBoardStage(this.layerScopeId) &&
            (part.id === "net-board" || part.id === "net-asic")) ||
          fanContact ||
          (this.compactStoragePose &&
            compactPathModules.has(part.id) &&
            !(
              this.compactStoragePose === "mount-raised" &&
              part.id ===
                modelForDevice(this.state.deviceId).controllerMount
                  ?.controllerId
            ))
          ? 0
          : this.explosion,
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
    this.dimmSocket.update(target, this.dimmPose);
    const scope = layerScopeFor(target, this.layerScopeId);
    const layerRoot = scope?.layerRoot ?? target;
    const lifted =
      this.layerPose === "separated" && assemblyLayer(layerRoot)
        ? layerRoot
        : undefined;
    const extracted = scope?.extractedLayers;
    if (this.liftedPart !== lifted || this.extractedLayers !== extracted) {
      if (this.liftedPart) poseAssemblyLayer(this.liftedPart, false);
      if (this.extractedLayers)
        for (let i = this.extractedLayers.length - 1; i >= 0; i--)
          poseAssemblyLayer(this.extractedLayers[i], false);
      if (extracted)
        for (const outer of extracted) poseAssemblyLayer(outer, true);
      if (lifted) poseAssemblyLayer(lifted, true);
      this.extractedLayers = extracted;
      this.liftedPart = lifted;
    }
    this.rearModuleSeats.update(
      this.models.parts,
      this.partBases,
      this.state.selected,
      this.assemblyModel,
      id ? this.rearRowPose : undefined,
    );
    const pair =
      id && this.storageContact
        ? storageContactObjects(this.state.deviceId, id, this.models.parts)
        : null;
    this.storageContactGuide.poseConnector(pair, this.storageConnectorPose);
    const companions =
      id && this.companionPartIds.length
        ? this.companionPartIds.map((member) => this.models.parts.get(member))
        : null;
    const applied =
      !!id &&
      (scope
        ? this.partIsolation.applyMany(
            this.models.server,
            scope.members,
            scope.cutaway,
          )
        : pair
          ? this.partIsolation.applyMany(this.models.server, [
              this.storageConnectorPose ? pair.plug : pair.disk,
              this.storageConnectorPose ? pair.socket : pair.board,
            ])
          : companions && target
            ? companions.every((part) => !!part) &&
              this.partIsolation.applyMany(this.models.server, [
                target,
                ...companions,
                ...(this.rearRowPose
                  ? [
                      this.rearModuleSeats.guides,
                      ...this.rearModuleSeats.receivers,
                    ]
                  : []),
              ])
            : this.partIsolation.apply(this.models.server, target));
    const mount =
      applied &&
      companions &&
      modelForDevice(this.state.deviceId).controllerMount;
    const board =
      mount &&
      id === mount.controllerId &&
      this.companionPartIds.includes(mount.boardId)
        ? this.models.parts.get(mount.boardId)
        : undefined;
    this.controllerMountGuide.root.visible = !!board;
    if (board && target && mount) {
      const base = this.partBases.get(mount.boardId)!;
      const lift =
        target.position.y - this.partBases.get(mount.controllerId)!.y;
      this.controllerMountGuide.update(
        board,
        base,
        lift - (board.position.y - base.y),
      );
    }
    const boardOnly =
      id === "sto-midplane" && this.storageBoardDisk !== undefined;
    const marked =
      boardOnly && this.storageBoardDisk
        ? storageContactObjects(
            this.state.deviceId,
            this.storageBoardDisk,
            this.models.parts,
          )
        : pair;
    this.storageContactGuide.update(
      applied && !this.storageConnectorPose ? marked : null,
      boardOnly,
    );
    const inspectionKey = scope
      ? `${id}:scope:${this.layerScopeId}`
      : pair
        ? `${id}:${this.storageConnectorPose ? "connector" : "contact"}`
        : companions
          ? [id, ...this.companionPartIds].join(":")
          : id;
    if (id && applied) {
      if (!this.partInspection) {
        this.partInspection = {
          deviceId: this.state.deviceId,
          targetId: "",
          previous: {
            ...this.captureObservationView(),
            aspect: this.camera.aspect,
          },
        };
      }
      if (this.partInspection.targetId !== inspectionKey) {
        this.partInspection.targetId = inspectionKey!;
        target!.updateWorldMatrix(true, true);
        this.view(this.currentView, true);
      }
    } else if (this.partInspection && !id) {
      const { deviceId, previous } = this.partInspection;
      this.partInspection = null;
      // 跨层级或实例导航由原导航流程取景，不把旧设备镜头带到新位置。
      if (this.state.level === "device" && this.state.deviceId === deviceId) {
        // 合盖或收拢后按当前外观取景，旧部件特写的距离可能已不在整机轨道范围内。
        const focusDevice = this.state.selected === deviceId;
        if (focusDevice || !canInspectPart(this.state)) {
          this.view(this.currentView, focusDevice);
          this.host.dataset.isolatedPart = "";
          return;
        }
        this.restoreObservationView(previous);
        const distance = inspectionReturnDistance(
          previous.position.distanceTo(previous.target),
          previous.aspect,
          this.camera.aspect,
          previous.minDistance,
          previous.maxDistance,
        );
        this.targetPosition
          .sub(previous.target)
          .setLength(distance)
          .add(previous.target);
      }
    }
    this.host.dataset.isolatedPart = applied ? id! : "";
  }
  animate = (time: number, delta: number) => {
    if (this.destroyed || this.paused || !this.contextAvailable) return false;
    this.partIsolation.restore();
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
    // 补光随镜头靠近自然增强，室内光源和地面一直保留。
    const near =
      1 -
      THREE.MathUtils.smoothstep(
        this.camera.position.distanceTo(this.models.server.position),
        1.5,
        7,
      );
    this.inspectionLight.position
      .copy(this.camera.position)
      .sub(this.controls.target)
      .normalize()
      .multiplyScalar(1.6)
      .add(this.controls.target);
    this.inspectionLight.position.y += 0.8;
    this.inspectionLight.intensity = this.state.level === "room" ? 0 : 3 * near;
    const explosionTarget =
      this.state.level === "device" && frame.ready ? this.state.explosion : 0;
    const hasCover =
      modelForDevice(this.state.deviceId).category === "server" ||
      this.state.coverOpen ||
      this.cover > 0;
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
    const poseChanged =
      nextAssembly.cover !== this.cover ||
      nextAssembly.explosion !== this.explosion;
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
    const arrival = THREE.MathUtils.smoothstep(frame.relocation, 0.58, 0.88);
    const withdrawalTarget = dockWithdrawalAt(
      Math.max(explosionTarget, this.explosion),
    );
    const withdrawStep = instant ? 1 : delta / 0.78;
    this.dockWithdrawal += THREE.MathUtils.clamp(
      withdrawalTarget - this.dockWithdrawal,
      -withdrawStep,
      withdrawStep,
    );
    if (frame.relocation < 0.88 || this.state.level !== "device")
      this.dockSweep = 0;
    else
      this.dockSweep = instant ? 1 : Math.min(1, this.dockSweep + delta / 0.92);
    this.models.bench.visible =
      arrival > 0 && this.dockWithdrawal < 1 && !this.partInspection;
    if (this.models.bench.visible) {
      const { depth } = definition.inspectionBench;
      this.models.dockHalves.forEach((half, i) => {
        half.scale.setScalar(
          dockScaleAndPosition(
            this.dockWithdrawal,
            arrival,
            i === 0 ? -1 : 1,
            half.position,
          ),
        );
        const trail = this.models.dockTrails[i];
        trail.visible =
          this.dockSweep > 0 &&
          this.dockWithdrawal === 0 &&
          !this.reducedMotion &&
          !this.analysisLayer;
        const t = THREE.MathUtils.smoothstep(this.dockSweep, 0, 1);
        trail.scale.z = 1 - 0.9 * THREE.MathUtils.smoothstep(t, 0.85, 1);
        trail.position.z = (t - 0.5) * (depth - 0.12) - 0.0575 * trail.scale.z;
      });
    }
    const dockMoving =
      this.dockWithdrawal !== withdrawalTarget ||
      (this.dockSweep > 0 && this.dockSweep < 1 && this.models.bench.visible);
    this.models.benchContact.material.opacity =
      0.36 *
      (1 - THREE.MathUtils.smoothstep(this.dockWithdrawal, 0, 0.32)) *
      THREE.MathUtils.smoothstep(frame.relocation, 0.88, 1);
    if (
      this.pendingReturnView &&
      this.cover === 0 &&
      this.explosion === 0 &&
      this.presentation.rearDoor === 0
    )
      this.view(this.currentView, this.currentFocus);
    // 隔离对象随所属模组移动；用机构到位后的可见范围适配当前观察侧。
    if (
      (this.pendingComponentFocus || (poseChanged && this.partInspection)) &&
      frame.ready &&
      !assemblyBusy
    ) {
      this.pendingComponentFocus = false;
      this.view(this.currentView, true);
    }
    if (this.state.playing && !this.reducedMotion && frame.ready)
      for (const rotor of this.models.rotors) rotor.rotation.z += delta * 2.4;
    if (this.state.playing && !this.reducedMotion && this.models.room.visible)
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
    if (!this.paused) {
      this.controls.update();
      this.adaptDeviceOrbit();
    }
    this.pduMountWindow.update(this.models.rack, this.powerObservation?.mount);
    const observedPowerRack =
      this.powerObservation &&
      !this.powerObservation.mount &&
      this.state.level === "room"
        ? rackForDevice(this.powerObservation.sourceId).id
        : null;
    const patchCutaway =
      !!this.patchPoints && this.state.level === "rack" && !frame.busy;
    this.models.rackRightSide.visible = !patchCutaway;
    const rearObservation =
      (this.state.level === "rack" &&
        (!!pduById(this.state.selected) || this.telemetry.mode === "power")) ||
      observedPowerRack === rackForDevice(this.state.deviceId).id;
    for (const [id, rack] of this.installation.racks) {
      rack.getObjectByName("rack-rear-shell")!.visible =
        id !== observedPowerRack;
      rack.getObjectByName("rack-rear-doors")!.visible =
        id !== observedPowerRack;
    }
    this.models.rack.getObjectByName("rack-rear-shell")!.visible =
      !rearObservation;
    this.models.rack.getObjectByName("rack-rear-doors")!.visible =
      (!rearObservation && !patchCutaway) ||
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
    this.installation.update(this.state, frame.relocation);
    const studio = !this.models.surroundings.visible;
    this.models.floorGroup.visible = this.roomGround.visible = !studio;
    this.inspectionBackdrop.visible = studio;
    this.scene.background = studio
      ? this.inspectionBackdrop.sky(
          frame.relocation > 0.58,
          this.controls.getAzimuthalAngle(),
          this.explosion,
          this.reducedMotion || this.analysisLayer,
        )
      : this.roomBackdrop;
    this.scene.backgroundIntensity = studio
      ? (this.analysisLayer ? 0.66 : 1) *
        (1 - 0.32 * THREE.MathUtils.smoothstep(this.explosion, 0, 0.85))
      : 1;
    this.keyLight.shadow.intensity = studio ? 0.45 : 1;
    if (studio) {
      this.inspectionBackdrop.dial.rotor.visible = !this.analysisLayer;
      this.inspectionBackdrop.update(
        frame.relocation,
        this.dockWithdrawal,
        !!this.partInspection,
        this.controls.getAzimuthalAngle(),
        delta,
        this.reducedMotion || this.analysisLayer,
      );
      this.inspectionBackdrop.position.lerpVectors(
        this.models.rack.position,
        this.models.bench.position,
        frame.relocation,
      );
      this.inspectionBackdrop.dial.root.position
        .copy(this.models.rack.position)
        .sub(this.inspectionBackdrop.position);
    }
    const cutCount = this.shellCutaway.update(
      this.camera.position,
      this.inletObservation?.inspection.points ??
        this.environmentObservation?.inspection.points ??
        this.entranceObservation?.pair.points ??
        this.leakObservation?.pair.sightPoints ??
        this.maintenanceObservation?.inspection.points ??
        this.crossingObservation?.pair.points ??
        this.powerObservation?.targets ??
        this.networkObservation?.targets ??
        this.sliceObservation?.targets ??
        this.airflowObservation?.targets ??
        (selectedFixture ? this.fixtureTargets : this.shellTargets),
      this.models.surroundings.visible,
      this.environmentObservation
        ? this.models.fixtures.get(
            fixtureMountReference(
              this.environmentObservation.inspection.pair.firstId,
            ),
          )
        : this.entranceObservation
          ? this.models.fixtures.get(entranceSettings.fixtureId)
          : this.leakObservation
            ? this.models.fixtures.get(leakDetection.controllerId)
            : this.crossingObservation
              ? crossingObjectIds(this.crossingObservation.pair).flatMap(
                  (id) => {
                    const object =
                      this.models.fixtures.get(id) ??
                      this.models.facilities.get(id);
                    return object ? [object] : [];
                  },
                )
              : selectedFixture &&
                  !this.airflowObservation &&
                  !this.sliceObservation &&
                  !this.networkObservation &&
                  !this.powerObservation
                ? this.models.fixtures.get(
                    fixtureMountReference(this.state.selected),
                  )
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
        this.cover === coverTarget,
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
      patchCutaway ||
        this.presentation.pose.inspection > 0 ||
        this.frontServiceFrame?.chassisDepth !== undefined,
      this.rangeObservation?.range ?? this.unitRange,
    );
    this.models.root.updateMatrixWorld(true);
    this.telemetry.update(
      this.state,
      this.sample,
      this.models,
      this.presentation.pose.inspection,
      this.explosion,
    );
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
    const object = this.objectFor(this.state.selected);
    const showSelection =
      !this.inletObservation &&
      !this.environmentObservation &&
      !this.entranceObservation &&
      !this.leakObservation &&
      !this.crossingObservation &&
      !this.maintenanceObservation &&
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
    let faceColor: string | undefined;
    if (installed && this.state.level === "rack") {
      const reading = this.surface.snapshot.readings.get(this.state.selected);
      const alarm = visibleSignal(reading, this.telemetry.mode);
      if (alarm) faceColor = signalStyles[alarm].color;
      else if (
        this.telemetry.mode === "power" ||
        this.telemetry.mode === "temperature"
      )
        faceColor = metricAttentionColor(reading, this.telemetry.mode);
    }
    const selectedScope = showSelection
      ? layerScopeFor(object, this.layerScopeId)
      : undefined;
    if (object && showSelection) {
      if (installed)
        this.models.selection.setInstalledBox(
          object,
          installed,
          faceColor ? this.camera.position.z : undefined,
        );
      else {
        if (selectedScope?.selectedBranch)
          this.models.selection.box.setFromObject(selectedScope.selectedBranch);
        else if (selectedScope)
          scopeBounds(this.models.selection.box, selectedScope);
        else
          this.models.selection.box.setFromObject(
            this.storageContactGuide.memberFor(this.state.selected) ?? object,
          );
      }
    }
    this.models.selection.update(
      showSelection
        ? `${this.state.deviceId}:${this.state.selected}:${this.state.focusRevision}`
        : null,
      time,
      this.reducedMotion,
      selectedScope?.selectionPadding ??
        (this.storageConnectorPose ||
        this.layerScopeId?.startsWith("fan-contact:")
          ? 0.00045
          : this.state.level === "device" || selectedFixture || installed
            ? 0.006
            : 0.025),
      faceColor,
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
            this.projectAnchor(element, 0, 0, true);
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
        const anchorObject = element.dataset.anchorObject
          ? this.objectFor(element.dataset.anchorObject)
          : undefined;
        const hidden =
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
        if (!hidden && element.dataset.patchDevice) {
          // 两端保留安装简模的整机占位，短标排在其投影轮廓外。
          this.anchorBounds.setFromObject(
            this.installation.devices.get(element.dataset.patchDevice)!,
          );
          this.projectHotspotBounds(
            element,
            this.host.clientWidth,
            this.host.clientHeight,
          );
        }
        if (!hidden && element.dataset.inletDevice) {
          const device = this.inletObservation?.inspection.devices.find(
            (item) => item.id === element.dataset.inletDevice,
          );
          if (device) {
            this.anchorBounds.setFromPoints(device.corners);
            this.projectHotspotBounds(
              element,
              this.host.clientWidth,
              this.host.clientHeight,
            );
          }
        }
        this.projectAnchor(element, x, y, hidden);
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
          ? this.presentation.pose.inspection === 0 &&
            ((this.state.level === "room" &&
              (this.telemetry.mode === "alarms" ||
                this.telemetry.mode === "temperature" ||
                this.telemetry.mode === "power" ||
                this.telemetry.mode === "status") &&
              id === this.state.selected) ||
              (this.state.level === "rack" &&
                this.telemetry.mode !== "object" &&
                deviceById(id)?.rackId ===
                  rackForDevice(this.state.deviceId).id))
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
      if (!show || !target || !this.visible(target)) {
        this.projectAnchor(element, 0, 0, true);
        continue;
      }
      if (target && show) {
        const emphasizedFace =
          deviceAnchor &&
          faceColor &&
          showSelection &&
          id === this.state.selected;
        const branch = partAnchor
          ? layerScopeFor(target, this.layerScopeId)?.selectedBranch
          : undefined;
        const labelPoint = partAnchor && !branch && target.userData.labelPoint;
        if (labelPoint)
          target.localToWorld(this.anchorPosition.copy(labelPoint));
        else if (rackAnchor || deviceAnchor)
          target.getWorldPosition(this.anchorPosition);
        else
          this.anchorBounds
            .setFromObject(branch ?? target)
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
          element.dataset.hotspot || labelPoint || branch
            ? 0
            : id === "srv-01"
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
          if (emphasizedFace) {
            this.anchorBounds
              .copy(this.models.selection.box)
              .getCenter(this.anchorPosition);
          } else {
            target.getWorldPosition(this.anchorPosition);
            this.anchorPosition.z += modelForDevice(id).depth / 2;
          }
        }
        this.anchorPosition.project(this.camera);
        const selectedLabel = element.classList.contains("selected");
        const x =
          (this.anchorPosition.x * 0.5 + 0.5) * this.host.clientWidth +
          (deviceAnchor && !selectedLabel ? 80 : 0);
        const y = (-this.anchorPosition.y * 0.5 + 0.5) * this.host.clientHeight;
        // 选中标签交由布局器向内避让；不因文字宽度超出边界而直接消失。
        const hidden =
          this.anchorPosition.z < -1 ||
          this.anchorPosition.z > 1 ||
          x < 0 ||
          x > this.host.clientWidth ||
          y < 0 ||
          y > this.host.clientHeight;
        if (
          !hidden &&
          element.dataset.hotspot === "bounds" &&
          (!deviceAnchor || emphasizedFace)
        )
          this.projectHotspotBounds(
            element,
            this.host.clientWidth,
            this.host.clientHeight,
          );
        this.projectAnchor(element, x, y, hidden);
      }
    }
    if (this.anchorsChanged) {
      this.anchorsChanged = false;
      this.onAnchorsProjected?.();
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
    this.signals.update(
      this.state,
      this.telemetry.mode,
      this.surface.snapshot.readings,
      this.models,
      this.presentation.pose.inspection,
      this.camera,
      !!this.isolatedPartId,
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
        !assemblyBusy,
    );
    const structureBusy = frame.busy || assemblyBusy;
    this.camera.updateMatrixWorld();
    this.renderView.set(this.camera.matrixWorld.elements);
    this.renderView.set(this.camera.projectionMatrix.elements, 16);
    const animating =
      dockMoving ||
      structureBusy ||
      this.moving ||
      this.models.selection.animating ||
      (this.state.playing && !this.reducedMotion);
    const rotatingDial =
      studio &&
      !this.analysisLayer &&
      this.inspectionBackdrop.dial.root.visible &&
      !this.reducedMotion;
    if (rotatingDial && time - this.lastDialDraw >= 1000 / 24) {
      this.lastDialDraw = time;
      this.renderDemand.invalidate();
    }
    const drawn = this.renderDemand.consume(this.renderView, animating);
    if (drawn) this.pipeline.render(delta, frame.relocation, structureBusy);
    // 补齐终态并让镜头阻尼收敛后休止。环绕开启时保留手动接管后的等待期。
    return (
      drawn ||
      animating ||
      rotatingDial ||
      (this.autoOrbit && !this.reducedMotion)
    );
  };
  dispose() {
    this.rearModuleSeats.dispose();
    this.dimmSocket.dispose();
    this.partIsolation.restore();
    this.onRenderFrame = null;
    this.onAnchorsProjected = null;
    this.destroyed = true;
    this.assetLoader?.dispose();
    this.loop.dispose();
    this.observer.disconnect();
    this.controls.removeEventListener("start", this.cancelFlight);
    this.controls.removeEventListener("change", this.invalidate);
    this.controls.removeEventListener("change", this.hideRackHint);
    this.controls.dispose();
    this.roomTransition?.remove();
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
    canvas.removeEventListener("pointerleave", this.hideRackHint);
    this.rackHint.remove();
    canvas.removeEventListener("webglcontextlost", this.contextLost);
    disposeModels(this.scene);
    this.environment.dispose();
    this.roomBackdrop.dispose();
    this.inspectionBackdrop.disposeSkies();
    this.renderer.dispose();
    canvas.remove();
  }
}
