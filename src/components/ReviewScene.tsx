import type { RearRowPose } from "../scene/rear-module-seats";
import type { LayerPose } from "../scene/assembly-layer";
import { roomAirflowTarget } from "../cooling";
import { useDismissibleMenu } from "../use-dismissible-menu";
import { storageDriveGroup } from "../storage-slots";
import { AirflowPanel } from "./AirflowPanel";
import { useAirflowWorkspace } from "../use-airflow-workspace";
import type { RangeView, RangeViewCommand } from "../range-view";
import type {
  InletInspection,
  InletViewCommand,
  InletViewPair,
} from "../inlet-view";
import { inletPairSnapshot } from "../inlet-pair";
import { InletViewGeometry } from "../scene/inlet-view";
import type {
  EnvironmentInspection,
  EnvironmentViewCommand,
} from "../environment-view";
import { EnvironmentViewGeometry } from "../scene/environment-view";
import {
  entranceViews,
  entranceViewIncludes,
  type EntranceInspection,
  type EntranceView,
  type EntranceViewCommand,
} from "../entrance-view";
import { EntranceViewGeometry } from "../scene/entrance-view";
import { FixtureObservationControls } from "./FixtureObservationControls";
import {
  leakViews,
  leakViewIncludes,
  type LeakInspection,
  type LeakView,
  type LeakViewCommand,
} from "../leak-view";
import { LeakViewGeometry } from "../scene/leak-view";

import {
  maintenanceViews,
  maintenanceViewIncludes,
  type MaintenanceView,
  type MaintenanceInspection,
} from "../maintenance-view";
import { trendMetricNames } from "../trend-geometry";
import {
  environmentPairMarkers,
  type EnvironmentPair,
} from "../environment-pair";
import type { EnvironmentMetric } from "../environment-monitoring";
import {
  crossingObjectIds,
  type FixtureCrossing,
  type CrossingViewCommand,
} from "../fixture-crossing";
import { CrossingGeometry } from "../scene/fixture-crossing";
import {
  focusedPowerScene,
  pairedPowerScene,
  powerViewPoints,
  type PowerViewCommand,
} from "../power-view";
import { PowerViewActions } from "./PowerViewActions";
import type { NetworkViewCommand } from "../network-view";
import type { SliceViewCommand } from "../slice-view";
import { SliceEvidenceGeometry } from "../scene/slice-evidence";
import type { SliceDeviceInspection } from "../slice-device";
import {
  environmentObservation,
  environmentValue,
  environmentQuality,
} from "../environment-monitoring";
import { EnvironmentProbeList } from "./EnvironmentDetails";
import type { RackUnitRange } from "../rack-space";
import { type AirflowInspection } from "../airflow-inspection";
import { pduInspectionScene, type PduInspection } from "../pdu-outlets";
import { airflowStage, showAirflowEndpoint } from "../airflow-stage";
import { ModelLoadNotice } from "./ModelLoadNotice";
import { initialModelLoads, type ModelAssetId } from "../model-loading";
import { TemperatureDisclosure } from "./TemperatureDisclosure";
import { SliceDeviceContext } from "./SliceDeviceContext";
import { SliceInputPreview } from "./SliceInputPreview";
import { fixtureById, roomFacilityById } from "../fixtures";
import type { Dispatch, SetStateAction, ReactNode, RefObject } from "react";
import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  componentById,
  entityById,
  presentationKey,
  type AppState,
} from "../domain";
import type { PresentationPhase, SceneFeedback } from "../mechanics";
import { SceneEngine } from "../scene/engine";
import type { TaskViewMemory, View } from "../scene/engine";
import { deviceById, devices, racks, rackForDevice } from "../installation";
import type { SpatialReading } from "../spatial";
import type { ReviewLayer } from "../review-model";
import { reviewPresentation } from "../review-model";
import {
  partsForDevice,
  subpartsForDevice,
  modelForDevice,
  unitLabel,
} from "../catalog";
import { sceneLabels } from "../scene-labels";
import { reviewSpatialMarks } from "../review-spatial";
import { ReviewDataGeometry } from "../scene/review-data";
import {
  initialSliceControls,
  sliceSettings,
  sliceRackRows,
  temperatureSlice,
  verticalTemperatureSlice,
} from "../temperature-slice";
import type { SliceOrientation, SliceControls } from "../temperature-slice";
import { TemperatureSliceGeometry } from "../scene/temperature-slice";
import {
  type AirflowSnapshot,
  airflowVisualTime,
  type AirflowRoute,
} from "../airflow";
import { AirflowGeometry } from "../scene/airflow";
import { observeLabelLayout } from "../scene/label-layout";
import {
  maintenanceAreas,
  maintenanceAisleSequence,
  maintenanceAisle,
  reserveGapText,
  type MaintenanceAisle,
} from "../maintenance";
import { MaintenanceGeometry } from "../scene/maintenance";
import { powerScene } from "../power-paths";
import { PowerGeometry } from "../scene/power";
import { pduById, powerSettings } from "../power-config";
import { temperatureColor, powerColor } from "../scene/metric-color";
import { budgetPercent, budgetRatio, budgetStateText } from "../power-budget";
import { alarmCurrentStatus } from "../alarm-queue";
import { metricAttentionColor, qualityNames, signalStyles } from "../status";
import { networkMarkers, networkLinkById, switchRole } from "../network";
import { networkPatch } from "../network-patch";
import { NetworkGeometry } from "../scene/network";

export function ReviewScene({
  state,
  captureTaskView,
  taskReturn,
  unitRange = null,
  rangeViewCommand,
  onRangeViewChange,
  isolatedPartId = null,
  companionPartIds,
  fanViewRevision = 0,
  fanViewSide = "front",
  storageViewRevision = 0,
  layerPose,
  layerScopeId,
  compactStoragePose,
  dimmPose,
  rearRowPose,
  storageContact = false,
  storageConnectorPose,
  storageBoardDisk,
  sliceViewCommand,
  onSlicePlaneChange,
  slicePlaneActive,
  onSliceViewChange,
  sliceInspection,
  onInspectSlice,
  onInspectBudget,
  sliceControls: temperatureSliceControls,
  setSliceControls: setTemperatureSliceControls,
  layer,
  layoutViewRevision,
  readings,
  selectedId,
  roomDevice,
  alarmOriginId,
  airflow,
  onExplainAirflow,
  terminalViewRequest,
  onAirflowViewChange,
  frameRoomAirflow,
  coolingRangeObservation,
  onShowRoomAirflow,
  onOpenAirflowInstallation,
  airflowVisit,
  airflowResponseActive,
  onCompareAirflow,
  onReturnAirflowEndpoint,
  aisle,
  networkLinkId = null,
  showNetworkPatch = false,
  canStartInletPair,
  inletPair,
  inletView,
  inletViewCommand,
  onInletViewChange,
  onInletView,
  environmentPair,
  environmentPairMetric,
  environmentView,
  environmentViewCommand,
  onEnvironmentViewChange,
  onEnvironmentView,
  smokeInspectionActive,
  maintenanceView,
  aisleCommand,
  aisleRosterVisible,
  onReturnToAisles,
  onMaintenanceViewChange,
  entranceView,
  entranceViewCommand,
  onEntranceViewChange,
  onEntranceView,
  leakView,
  leakViewCommand,
  onLeakViewChange,
  onLeakView,
  crossing,
  crossingCommand,
  onCrossingChange,
  onReturnCrossing,
  powerViewCommand,
  powerViewActive,
  powerViewPaired,
  onPowerViewChange,
  onPowerView,
  networkViewCommand,
  networkViewActive,
  onNetworkViewChange,
  onNetworkView,
  powerLinkId = null,
  pduInspection = null,
  onClearPower,
  onClearNetwork,
  onSelect,
  onPreviewInput,
  onFocus,
  onPhase,
  onFeedback,
  shotRevision,
  tourShot,
  onTakeover,
  controls,
  compactTools = false,
}: {
  captureTaskView: RefObject<SceneEngine["captureTaskView"] | null>;
  taskReturn: { camera: TaskViewMemory | null; selected?: string } | null;
  canStartInletPair: boolean;
  inletPair: InletViewPair | null;
  inletView: InletInspection | null;
  inletViewCommand: InletViewCommand | null;
  onInletViewChange: (inspection: InletInspection | null) => void;
  onInletView: (action: InletViewCommand["action"]) => void;
  environmentPair: EnvironmentPair | null;
  environmentPairMetric: EnvironmentMetric;
  environmentView: EnvironmentInspection | null;
  environmentViewCommand: EnvironmentViewCommand | null;
  onEnvironmentViewChange: (inspection: EnvironmentInspection | null) => void;
  onEnvironmentView: (action: EnvironmentViewCommand["action"]) => void;
  smokeInspectionActive: boolean;
  maintenanceView: MaintenanceInspection | null;
  aisleCommand: { rackId: string | null } | null;
  aisleRosterVisible: boolean;
  onReturnToAisles?: () => void;
  onMaintenanceViewChange: (inspection: MaintenanceInspection | null) => void;
  entranceView: EntranceInspection | null;
  entranceViewCommand: EntranceViewCommand | null;
  onEntranceViewChange: (inspection: EntranceInspection | null) => void;
  onEntranceView: (view: EntranceView | null) => void;
  leakView: LeakInspection | null;
  leakViewCommand: LeakViewCommand | null;
  onLeakViewChange: (inspection: LeakInspection | null) => void;
  onLeakView: (view: LeakView | null) => void;
  crossing: FixtureCrossing | null;
  crossingCommand: CrossingViewCommand | null;
  onCrossingChange: (pair: FixtureCrossing | null) => void;
  onReturnCrossing: () => void;
  powerViewCommand: PowerViewCommand | null;
  powerViewActive: boolean;
  powerViewPaired: boolean;
  onPowerViewChange: (active: boolean) => void;
  onPowerView: (action: PowerViewCommand["action"]) => void;
  networkViewCommand: NetworkViewCommand | null;
  networkViewActive: boolean;
  onNetworkViewChange: (active: boolean) => void;
  onNetworkView: (action: NetworkViewCommand["action"]) => void;
  sliceViewCommand: SliceViewCommand | null;
  slicePlaneActive: boolean;
  onSlicePlaneChange: (active: boolean) => void;
  onSliceViewChange: (active: boolean) => void;
  sliceInspection: {
    context: SliceDeviceInspection | null;
    sourceId: string | null;
    deviceId: string;
  } | null;
  onInspectBudget: (() => void) | null;
  onInspectSlice: (id: string) => void;
  state: AppState;
  unitRange?: RackUnitRange | null;
  rangeViewCommand: RangeViewCommand | null;
  onRangeViewChange: (side: RangeView | null, segmentId: string | null) => void;
  isolatedPartId?: string | null;
  companionPartIds: readonly string[];
  fanViewRevision?: number;
  fanViewSide?: "front" | "rear" | "iso";
  storageViewRevision?: number;
  layerPose?: LayerPose;
  layerScopeId?: string;
  compactStoragePose?: "installed" | "mount-seated" | "mount-raised";
  dimmPose?: LayerPose;
  rearRowPose?: RearRowPose;
  storageContact?: boolean;
  storageConnectorPose?: LayerPose;
  storageBoardDisk?: string | null;
  sliceControls: SliceControls;
  setSliceControls: Dispatch<SetStateAction<SliceControls>>;
  layer: ReviewLayer;
  layoutViewRevision: number;
  readings: Map<string, SpatialReading>;
  selectedId: string;
  roomDevice?: ReturnType<typeof deviceById>;
  alarmOriginId?: string;
  airflowVisit: AirflowInspection | null;
  airflow: AirflowSnapshot | null;
  terminalViewRequest: number;
  onExplainAirflow: () => void;
  onAirflowViewChange: (
    view: import("../airflow-view").AirflowView | null,
  ) => void;
  frameRoomAirflow: boolean;
  coolingRangeObservation: boolean;
  onShowRoomAirflow: () => void;
  onOpenAirflowInstallation?: () => void;
  airflowResponseActive: boolean;
  onCompareAirflow: (route: AirflowRoute, preserveView: () => void) => void;
  onReturnAirflowEndpoint: () => void;
  aisle?: MaintenanceAisle;
  networkLinkId?: string | null;
  showNetworkPatch?: boolean;
  powerLinkId?: string | null;
  pduInspection?: PduInspection | null;
  onClearPower?: () => void;
  onClearNetwork?: () => void;
  onSelect: (id: string, enter?: boolean) => void;
  onPreviewInput: (id: string) => () => void;
  onFocus: () => void;
  onPhase: (phase: PresentationPhase) => void;
  onFeedback: (feedback: SceneFeedback) => void;
  shotRevision: number;
  tourShot: { revision: number; view: View; focus: boolean } | null;
  onTakeover: () => void;
  controls: ReactNode;
  compactTools?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const anchors = useRef<HTMLDivElement>(null);
  const flowLines = useRef<SVGSVGElement>(null);
  const engine = useRef<SceneEngine | null>(null);
  const labelLayout = useRef<ReturnType<typeof observeLabelLayout> | null>(
    null,
  );
  const initial = useRef(state);
  const recoveryPose = useRef<ReturnType<
    SceneEngine["captureRecoveryPose"]
  > | null>(null);
  const dataGeometry = useRef<ReviewDataGeometry | null>(null);
  const sliceEvidenceGeometry = useRef<SliceEvidenceGeometry | null>(null);
  const sliceGeometry = useRef<TemperatureSliceGeometry | null>(null);
  const airflowGeometry = useRef<AirflowGeometry | null>(null);
  const aisleOrigin = useRef<string | null>(null);
  const maintenanceGeometry = useRef<MaintenanceGeometry | null>(null);
  const powerGeometry = useRef<PowerGeometry | null>(null);
  const inletGeometry = useRef<InletViewGeometry | null>(null);
  const environmentGeometry = useRef<EnvironmentViewGeometry | null>(null);
  const entranceGeometry = useRef<EntranceViewGeometry | null>(null);
  const fixtureReturnEntry = useRef<string | null>(null);
  const fixtureRangeFocus = useRef(false);
  const leakGeometry = useRef<LeakViewGeometry | null>(null);

  const crossingGeometry = useRef<CrossingGeometry | null>(null);
  const powerReturning = useRef(false);
  const networkGeometry = useRef<NetworkGeometry | null>(null);
  const clockEpoch = useRef(performance.now());
  const previousScene = useRef(state);
  const currentState = useRef(state);
  currentState.current = state;
  const callbacks = useRef({
    onSelect,
    onPhase,
    onFeedback,
    onAirflowViewChange,
    onSlicePlaneChange,
    onSliceViewChange,
    onRangeViewChange,
    onPowerViewChange,
    onMaintenanceViewChange,
    onInletViewChange,
    onEnvironmentViewChange,
    onEntranceViewChange,
    onLeakViewChange,
    onCrossingChange,
    onNetworkViewChange,
  });
  callbacks.current = {
    onSelect,
    onPhase,
    onFeedback,
    onAirflowViewChange,
    onSlicePlaneChange,
    onSliceViewChange,
    onRangeViewChange,
    onPowerViewChange,
    onMaintenanceViewChange,
    onInletViewChange,
    onEnvironmentViewChange,
    onEntranceViewChange,
    onLeakViewChange,
    onCrossingChange,
    onNetworkViewChange,
  };
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const reloadButton = useRef<HTMLButtonElement>(null);
  const startupView = useRef<{
    key: string;
    view: View;
    focus: boolean;
  } | null>(null);
  const [assets, setAssets] = useState(initialModelLoads);
  const [sceneSettled, setSceneSettled] = useState(false);
  const [roomViewSaved, setRoomViewSaved] = useState(false);
  const planeEntry = useRef<HTMLButtonElement>(null);
  const planeReturning = useRef(false);
  useEffect(() => {
    if (!slicePlaneActive) return;
    const legend = planeEntry.current?.closest(".review-legend");
    if (!legend) return;
    const observer = new ResizeObserver(() =>
      engine.current?.refitSlicePlane(),
    );
    observer.observe(legend);
    return () => observer.disconnect();
  }, [slicePlaneActive]);
  useEffect(() => {
    if (slicePlaneActive || !planeReturning.current) return;
    let frame = 0;
    const restoreFocus = () => {
      const entry = planeEntry.current;
      if (!entry) {
        planeReturning.current = false;
        return;
      }
      // 减少动态效果可能直接落到终态，不依赖中间的 settled=false 通知。
      if (engine.current?.moving || entry.disabled) {
        frame = requestAnimationFrame(restoreFocus);
        return;
      }
      planeReturning.current = false;
      if (engine.current) setView(engine.current.currentView);
      entry.focus({ preventScroll: true });
    };
    frame = requestAnimationFrame(restoreFocus);
    return () => cancelAnimationFrame(frame);
  }, [slicePlaneActive]);
  const displayMenu = useDismissibleMenu();
  const closeDisplayMenu = () => {
    if (displayMenu.current) displayMenu.current.open = false;
  };
  useEffect(closeDisplayMenu, [state.level]);
  const restoreSliceView = () => {
    closeDisplayMenu();
    planeReturning.current = slicePlaneActive;
    engine.current?.restoreSliceView();
  };
  const temperatureTools = useRef<HTMLDetailsElement>(null);
  const inletSnapshot = inletView
    ? inletPairSnapshot(
        inletView.pair.firstId,
        inletView.pair.secondId,
        state.time,
      )
    : null;
  const [view, setView] = useState<View>("interior");
  const [quality, setQuality] = useState(true);
  const [supported, setSupported] = useState(false);
  const [orbit, setOrbit] = useState(true);
  useEffect(() => {
    if (smokeInspectionActive) setOrbit(false);
  }, [smokeInspectionActive]);
  const [cutaway, setCutaway] = useState(false);
  const [moreLabels, setMoreLabels] = useState(false);
  const airflowWorkspace = useAirflowWorkspace({
    engine,
    scope: `${layer}:${state.level}:${shotRevision}`,
    resetKey: `${shotRevision}`,
    onTakeover,
    onView: setView,
    onStopOrbit: () => setOrbit(false),
  });
  useEffect(() => {
    if (layoutViewRevision && currentState.current.level === "room") {
      setOrbit(false);
      engine.current?.view("top");
      setView("top");
    }
  }, [layoutViewRevision]);
  const framedRoomEntry = useRef(false);
  useEffect(() => {
    if (state.level !== "room") framedRoomEntry.current = false;
    const route = airflow?.routes[0];
    if (frameRoomAirflow && route && !framedRoomEntry.current) {
      framedRoomEntry.current = true;
      airflowWorkspace.observe(route, "all");
    }
  }, [state.level, frameRoomAirflow, airflow, airflowWorkspace]);
  const flowView = airflowWorkspace.view;
  const localCutaway =
    state.level === "room" &&
    ((coolingRangeObservation && !!flowView && layer === "airflow") ||
      (layer === "overview" &&
        (crossing?.kind === "lighting-round" ||
          crossing?.kind === "light-tray")));
  const [stageCutaway, setStageCutaway] = useState(true);
  useEffect(() => {
    if (!localCutaway) setStageCutaway(true);
  }, [localCutaway]);
  const shellCutaway = localCutaway ? stageCutaway : cutaway;
  useEffect(() => {
    if (!flowView) return;
    const legend = airflowWorkspace.panel.current?.closest(".review-legend");
    if (!legend) return;
    const observer = new ResizeObserver(() => engine.current?.frameAirflow());
    observer.observe(legend);
    return () => observer.disconnect();
  }, [flowView, airflowWorkspace.panel]);
  useEffect(() => {
    if (terminalViewRequest && airflow?.routes[0] && layer === "airflow")
      airflowWorkspace.observe(airflow.routes[0], "terminals");
  }, [terminalViewRequest]);
  const sliceControls =
    layer === "airflow"
      ? {
          ...airflowWorkspace.sliceControls,
          rowId:
            sliceRackRows.find((row) =>
              row.rackIds.includes(airflow?.routes[0]?.rackId ?? ""),
            )?.id ?? airflowWorkspace.sliceControls.rowId,
        }
      : temperatureSliceControls;
  const setSliceControls =
    layer === "airflow"
      ? airflowWorkspace.setSliceControls
      : setTemperatureSliceControls;
  const sliceVisible =
    !inletView && (layer !== "airflow" || airflowWorkspace.sliceEnabled);

  const ambient =
    layer === "environment" && state.level === "room"
      ? environmentObservation(selectedId, state.time)
      : null;
  const ambientSelected = !!ambient;
  const environmentMarkers =
    environmentPair && state.level === "room" && layer === "environment"
      ? environmentPairMarkers(
          environmentPair,
          environmentPairMetric,
          state.time,
        )
      : [];
  const slice = useMemo(
    () =>
      (layer === "environment" ||
        (layer === "airflow" && airflowWorkspace.sliceEnabled)) &&
      state.level === "room" &&
      !ambientSelected
        ? sliceControls.orientation === "horizontal"
          ? temperatureSlice(readings, sliceControls.height)
          : verticalTemperatureSlice(
              readings,
              sliceControls.rowId,
              sliceControls.distance,
            )
        : null,
    [
      readings,
      sliceControls,
      layer,
      state.level,
      ambientSelected,
      airflowWorkspace.sliceEnabled,
    ],
  );
  const sliceRow = sliceRackRows.find((row) => row.id === slice?.rowId);
  const supplyBase = useMemo(
    () =>
      layer === "power" && !isolatedPartId
        ? (pduInspectionScene(state, selectedId, pduInspection) ??
          powerScene(state, selectedId, powerLinkId))
        : null,
    [
      layer,
      state.level,
      state.deviceId,
      state.trayExtended,
      selectedId,
      powerLinkId,
      pduInspection,
      isolatedPartId,
    ],
  );
  const supply = useMemo(
    () =>
      powerViewPaired && supplyBase
        ? pairedPowerScene(state, selectedId, powerLinkId)
        : focusedPowerScene(supplyBase, powerViewActive),
    [supplyBase, powerViewActive, powerViewPaired],
  );
  const [showPowerInputs, setShowPowerInputs] = useState(false);
  useEffect(
    () => setShowPowerInputs(false),
    [layer, state.level, state.deviceId, supply?.rackId],
  );
  const optionalInputs =
    supply &&
    !powerViewActive &&
    !pduInspection &&
    !pduById(selectedId) &&
    selectedId !== powerSettings.sourceId &&
    !supply.traceId &&
    !supply.labels.some((label) => label.partId === selectedId);
  const showSupply = !optionalInputs || showPowerInputs;
  const supplyLabels = showSupply ? supply?.labels : undefined;
  const networkLink = networkLinkById(networkLinkId);
  const patch = useMemo(
    () =>
      showNetworkPatch && networkLink
        ? networkPatch(state, networkLink, assets)
        : null,
    [
      showNetworkPatch,
      networkLink,
      state.level,
      state.trayExtended,
      state.deviceId,
      assets,
    ],
  );
  const network = useMemo(() => {
    const markers = isolatedPartId
      ? []
      : networkMarkers(state, selectedId, networkLinkId);
    return patch
      ? markers.map((marker, index) => ({
          ...marker,
          point: (index === 0 ? patch[0] : patch[patch.length - 1]).toArray(),
        }))
      : markers;
  }, [
    state.level,
    state.deviceId,
    state.trayExtended,
    selectedId,
    networkLinkId,
    patch,
    isolatedPartId,
  ]);
  const availableAisle = networkLinkId ? undefined : aisle;
  const rackAreas = useMemo(
    () =>
      layer === "overview" && state.level === "room" && !networkLinkId
        ? maintenanceAreas(selectedId)
        : [],
    [layer, state.level, networkLinkId, selectedId],
  );
  const [maintenanceScope, setMaintenanceScope] = useState<{
    rackId: string;
    paired: boolean;
  } | null>(null);
  const inspecting =
    !!maintenanceScope &&
    rackAreas.length > 0 &&
    (maintenanceScope.rackId === selectedId ||
      (maintenanceScope.paired &&
        !!availableAisle &&
        maintenanceAisle(maintenanceScope.rackId)?.id === availableAisle.id) ||
      (!!maintenanceView &&
        maintenanceViewIncludes(maintenanceView, selectedId)));
  useEffect(() => {
    if (!maintenanceScope) return;
    if (!inspecting) setMaintenanceScope(null);
    else if (maintenanceScope.rackId !== selectedId)
      setMaintenanceScope({ ...maintenanceScope, rackId: selectedId });
  }, [inspecting, maintenanceScope, selectedId]);
  useEffect(() => setMaintenanceScope(null), [shotRevision]);
  const comparison = inspecting
    ? maintenanceView
      ? maintenanceView.aisle
      : maintenanceScope.paired
        ? availableAisle
        : undefined
    : undefined;
  const maintenance = useMemo(
    () =>
      !inspecting
        ? []
        : (maintenanceView?.areas ??
          (comparison ? [comparison.front, comparison.rear] : rackAreas)),
    [inspecting, maintenanceView, comparison, rackAreas],
  );
  const areaLabels = useMemo(() => {
    const labels = maintenance.map((area) => ({
      id: area.id,
      position: area.position,
      text: `${comparison ? area.rackName.split(" ")[0] + " " : ""}${area.kind === "front" ? "柜前操作" : "柜后检修"} ${area.depth.toFixed(2)} m`,
    }));
    if (comparison)
      labels.push({
        id: comparison.id,
        position: [
          comparison.x,
          comparison.front.position[1],
          (comparison.startZ + comparison.endZ) / 2,
        ],
        text: reserveGapText(comparison.gap),
      });
    return labels;
  }, [maintenance, comparison]);
  const visibleAirflow = airflow;
  const airflowResponseControl = visibleAirflow?.routes[0] && (
    <button
      data-airflow-response-entry
      disabled={!sceneSettled || airflowResponseActive}
      onClick={() => {
        const preserve = () => {
          if (!flowView) engine.current?.preservePanelView();
        };
        preserve();
        onCompareAirflow(visibleAirflow.routes[0], preserve);
      }}
    >
      {airflowResponseActive ? "正在对照输入与进风" : "对照输入与进风 ↗"}
    </button>
  );

  useEffect(() => {
    clockEpoch.current = performance.now();
  }, [state.time, state.playing, state.playbackRate]);
  const positionSettings =
    slice?.orientation === "vertical"
      ? sliceSettings.vertical.distance
      : sliceSettings.height;
  const presentation = reviewPresentation(
    ambientSelected ? "overview" : layer,
    state.level,
  );
  const model = modelForDevice(state.deviceId);
  const modelStatus = assets[model.id as ModelAssetId];
  const representation =
    modelStatus !== "ready"
      ? `${model.category === "server" ? "简化结构 · 详细模型" : "内部配置示意 · 外观模型"}${modelStatus === "idle" ? "进入设备后加载" : modelStatus === "loading" ? "加载中" : "暂不可用"}`
      : model.category === "server"
        ? state.explosion > 0
          ? "部件展开"
          : state.coverOpen
            ? "内部装配 · 上盖已移开"
            : "完整装配 · 可单独开盖"
        : state.coverOpen && state.explosion === 0
          ? "内部配置示意 · 上盖已移开"
          : state.explosion === 0
            ? "外观模型 · 展开可看配置示意"
            : "内部配置示意";
  useEffect(() => {
    let active: SceneEngine | null = null;
    setAssets(initialModelLoads());
    try {
      active = new SceneEngine(
        host.current!,
        initial.current,
        (id, enter) => callbacks.current.onSelect(id, enter),
        (message) => {
          recoveryPose.current = active?.captureRecoveryPose() ?? null;
          setError(message);
        },
        (phase) => callbacks.current.onPhase(phase),
        (feedback) => {
          setSceneSettled(feedback.settled);
          callbacks.current.onFeedback(feedback);
        },
      );
      active.retainMaterials = true;
      const overlay = new ReviewDataGeometry();
      active.models.root.add(overlay.root);
      dataGeometry.current = overlay;
      const thermal = new TemperatureSliceGeometry();
      active.models.root.add(thermal.root);
      sliceGeometry.current = thermal;
      const evidence = new SliceEvidenceGeometry();
      active.models.root.add(evidence.root);
      sliceEvidenceGeometry.current = evidence;
      const flow = new AirflowGeometry();
      active.models.root.add(flow.root);
      airflowGeometry.current = flow;
      const areas = new MaintenanceGeometry();
      active.models.root.add(areas.root);
      maintenanceGeometry.current = areas;
      const supplyGeometry = new PowerGeometry();
      active.models.root.add(supplyGeometry.root);
      powerGeometry.current = supplyGeometry;
      const inletLines = new InletViewGeometry();
      active.models.root.add(inletLines.root);
      inletGeometry.current = inletLines;
      const environmentLines = new EnvironmentViewGeometry();
      active.models.root.add(environmentLines.root);
      environmentGeometry.current = environmentLines;
      const entranceLines = new EntranceViewGeometry();
      active.models.root.add(entranceLines.root);
      entranceGeometry.current = entranceLines;
      const leakLines = new LeakViewGeometry();
      active.models.root.add(leakLines.root);
      leakGeometry.current = leakLines;
      const crossingLines = new CrossingGeometry();
      active.models.root.add(crossingLines.root);
      crossingGeometry.current = crossingLines;
      const networkDots = new NetworkGeometry();
      active.models.root.add(networkDots.root);
      networkGeometry.current = networkDots;
      active.onRenderFrame = (now, roomReady) => {
        const level = currentState.current.level;
        supplyGeometry.frame(
          level === "room"
            ? roomReady
            : level === "device"
              ? active!.presentation.pose.inspection === 1
              : active!.presentation.pose.inspection === 0 &&
                ["closed", "open", "extended"].includes(
                  active!.lastPhase ?? "",
                ),
          active!.models.parts,
        );
        networkDots.frame(
          level === "room"
            ? roomReady
            : level === "device"
              ? active!.presentation.pose.inspection === 1
              : active!.presentation.pose.inspection === 0 &&
                ["closed", "open", "extended"].includes(
                  active!.lastPhase ?? "",
                ),
          active!.models.parts,
          active!.camera,
        );
        evidence.frame(active!.camera, roomReady);
        areas.setReady(roomReady);
        flow.animate(
          airflowVisualTime(
            currentState.current,
            now - clockEpoch.current,
            active!.paused || active!.reducedMotion,
          ),
          active!.reducedMotion,
          roomReady,
        );
      };
      active.onMaintenanceView = (inspection) => {
        if (!inspection) aisleOrigin.current = null;
        else if (inspection.aisle) aisleOrigin.current ??= inspection.rackId;
        callbacks.current.onMaintenanceViewChange(inspection);
        if (inspection) setView(active!.currentView);
      };
      active.onInletView = (inspection) => {
        callbacks.current.onInletViewChange(inspection);
        inletLines.update(inspection);
        setView(active!.currentView);
      };
      active.onEnvironmentView = (inspection) => {
        callbacks.current.onEnvironmentViewChange(inspection);
        environmentLines.update(inspection);
        setView(active!.currentView);
      };
      active.onEntranceView = (inspection) => {
        callbacks.current.onEntranceViewChange(inspection);
        entranceLines.update(inspection);
        setView(active!.currentView);
      };
      active.onLeakView = (inspection) => {
        callbacks.current.onLeakViewChange(inspection);
        leakLines.update(inspection);
        setView(active!.currentView);
      };
      active.onCrossingView = (pair) => {
        callbacks.current.onCrossingChange(pair);
        crossingLines.update(pair);
        setView(active!.currentView);
      };
      active.onPowerView = (observing) => {
        callbacks.current.onPowerViewChange(observing);
        setView(active!.currentView);
      };
      active.onNetworkView = (observing) => {
        callbacks.current.onNetworkViewChange(observing);
        setView(active!.currentView);
      };
      active.onRangeView = (side, segmentId) => {
        callbacks.current.onRangeViewChange(side, segmentId);
        setView(active!.currentView);
      };
      active.onSlicePlaneView = (observing) => {
        callbacks.current.onSlicePlaneChange(observing);
        setView(active!.currentView);
      };
      active.onSliceView = (observing) => {
        callbacks.current.onSliceViewChange(observing);
        setView(active!.currentView);
      };
      active.onAirflowView = (next) => {
        airflowWorkspace.setView(next);
        callbacks.current.onAirflowViewChange(next);
        setView(active!.currentView);
      };
      // 重建几何时沿用现有观察；重新触发进入动作会打开已收起的侧栏。
      if (recoveryPose.current?.key === presentationKey(initial.current)) {
        inletLines.update(inletView);
        environmentLines.update(environmentView);
        entranceLines.update(entranceView);
        leakLines.update(leakView);
        crossingLines.update(crossing);
      } else {
        aisleOrigin.current = null;
        callbacks.current.onMaintenanceViewChange(null);
        callbacks.current.onInletViewChange(null);
        callbacks.current.onEnvironmentViewChange(null);
        callbacks.current.onEntranceViewChange(null);
        callbacks.current.onLeakViewChange(null);
        callbacks.current.onCrossingChange(null);
        callbacks.current.onPowerViewChange(false);
        callbacks.current.onNetworkViewChange(false);
        callbacks.current.onRangeViewChange(null, null);
        callbacks.current.onSlicePlaneChange(false);
        callbacks.current.onSliceViewChange(false);
        airflowWorkspace.setView(null);
        callbacks.current.onAirflowViewChange(null);
      }
      active.onRoomViewMemory = setRoomViewSaved;
      setRoomViewSaved(false);
      active.onAssets = setAssets;
      setAssets({ ...active.assetLoader.state });
      engine.current = active;
      setSupported(active.pipeline.available);
      setError("");
    } catch {
      active?.dispose();
      active = null;
      setError("三维场景启动失败，请检查 WebGL 2 与硬件加速。");
    }
    const visibility = () => {
      clockEpoch.current = performance.now();
      if (active) {
        active.paused = document.hidden;
        active.invalidate();
      }
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      dataGeometry.current?.dispose();
      dataGeometry.current = null;
      sliceEvidenceGeometry.current?.dispose();
      sliceEvidenceGeometry.current = null;
      sliceGeometry.current?.dispose();
      sliceGeometry.current = null;
      airflowGeometry.current?.dispose();
      airflowGeometry.current = null;
      maintenanceGeometry.current?.dispose();
      maintenanceGeometry.current = null;
      powerGeometry.current?.dispose();
      powerGeometry.current = null;
      inletGeometry.current?.dispose();
      inletGeometry.current = null;
      environmentGeometry.current?.dispose();
      environmentGeometry.current = null;
      entranceGeometry.current?.dispose();
      entranceGeometry.current = null;
      leakGeometry.current?.dispose();
      leakGeometry.current = null;
      crossingGeometry.current?.dispose();
      crossingGeometry.current = null;
      networkGeometry.current?.dispose();
      networkGeometry.current = null;
      active?.dispose();
      engine.current = null;
    };
  }, [retry]);
  useEffect(() => {
    // 连续重建失败后没有引擎可退出旧观察，改查其他范围时丢弃待恢复的姿态。
    if (!engine.current) recoveryPose.current = null;
  }, [
    layer,
    selectedId,
    networkLinkId,
    powerLinkId,
    unitRange?.first,
    unitRange?.last,
    sliceInspection?.deviceId,
    layoutViewRevision,
  ]);
  useEffect(() => {
    // 归位时选回起点对象属于同一次恢复，保留刚还原的柜面分段。
    if (
      state.level === "rack" &&
      taskReturn?.camera?.range &&
      taskReturn.selected === selectedId
    )
      return;
    engine.current?.clearRangeView();
  }, [
    unitRange?.rackId,
    unitRange?.first,
    unitRange?.last,
    state.level,
    state.deviceId,
    selectedId,
    layer,
    shotRevision,
    retry,
  ]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !rangeViewCommand) return;
    if (rangeViewCommand.action === "return") {
      closeDisplayMenu();
      active.restoreRangeView();
    } else if (unitRange && layer === "overview") {
      setOrbit(false);
      active.observeRange(
        unitRange,
        rangeViewCommand.action,
        rangeViewCommand.segmentId ?? null,
      );
    }
    setView(active.currentView);
  }, [rangeViewCommand?.revision]);
  useEffect(() => {
    if (engine.current) engine.current.unitRange = unitRange;
  }, [unitRange, retry]);
  useEffect(() => {
    const active = engine.current;
    if (!active) return;
    active.isolatedPartId = isolatedPartId;
    active.companionPartIds = companionPartIds;
    if (companionPartIds.length) setOrbit(false);
    active.layerPose = layerPose;
    active.layerScopeId = layerScopeId;
    active.compactStoragePose = compactStoragePose;
    active.dimmPose = dimmPose;
    active.rearRowPose = rearRowPose;
    active.storageContact = storageContact;
    active.storageConnectorPose = storageConnectorPose;
    active.storageBoardDisk = storageBoardDisk;
    active.invalidate();
    if (
      !isolatedPartId &&
      state.level === "device" &&
      active.partInspection?.deviceId === state.deviceId
    )
      setView(active.partInspection.previous.view);
  }, [
    isolatedPartId,
    companionPartIds,
    layerPose,
    layerScopeId,
    compactStoragePose,
    dimmPose,
    rearRowPose,
    storageContact,
    storageConnectorPose,
    storageBoardDisk,
    state.level,
    state.deviceId,
    retry,
  ]);
  useEffect(() => {
    if (!fanViewRevision || currentState.current.level !== "device") return;
    setOrbit(false);
    engine.current?.view(fanViewSide, true);
    setView(fanViewSide);
  }, [fanViewRevision]);
  useEffect(() => {
    if (!storageViewRevision || currentState.current.level !== "device") return;
    setOrbit(false);
    const next = storageContact || layerPose ? "iso" : "front";
    engine.current?.view(next, true);
    setView(next);
  }, [storageViewRevision]);
  useImperativeHandle(
    captureTaskView,
    () => (level) => engine.current?.captureTaskView(level) ?? null,
    [],
  );
  useEffect(() => {
    const active = engine.current;
    if (!active) return;
    const previous = taskReturn?.camera;
    active.taskReturnView = previous ?? null;
    if (taskReturn) closeDisplayMenu();
    if (previous) {
      setOrbit(false);
      if (active.state.level === previous.level) active.view(previous.view);
      setView(previous.view);
    }
  }, [taskReturn, retry]);
  useEffect(() => {
    const active = engine.current;
    active?.update(state);
    const rackLabel = active?.models.rack.getObjectByName("rack-label");
    if (rackLabel) rackLabel.visible = state.level === "room";
    if (
      active &&
      state.level === "rack" &&
      state.focusRevision !== previousScene.current.focusRevision
    ) {
      // 资源定位保留机柜上下文，避免自动贴到封闭设备内部。
      const rear =
        !!pduById(state.selected) ||
        (supply?.traceId && supply.deviceId === state.selected);
      const rackView = rear ? "rear" : "iso";
      active.view(rackView, false);
      setView(rackView);
      if (
        previousScene.current.level === "rack" &&
        previousScene.current.deviceId !== state.deviceId
      ) {
        active.camera.position.copy(active.targetPosition);
        active.controls.target.copy(active.targetLook);
        active.controls.update();
        active.moving = false;
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
          host.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 220,
            easing: "ease-out",
          });
      }
    }
    previousScene.current = state;
  }, [state, retry]);
  useEffect(() => {
    // 演示预设使用相同的空间构图，便于直接比较图层；普通操作不触发。
    recoveryPose.current = null;
    startupView.current = null;
    if (engine.current) engine.current.studioOrigin = null;
    const next = currentState.current.level === "room" ? "interior" : "iso";
    setTemperatureSliceControls(initialSliceControls());
    engine.current?.view(next);
    setView(next);
  }, [shotRevision, setTemperatureSliceControls]);
  useEffect(() => {
    if (engine.current) {
      engine.current.analysisLayer = layer !== "overview";
      engine.current.telemetry.mode = presentation.mode;
      engine.current.invalidate();
      // 旧遥测关系线与新的布置路径分开，避免重复叠加。
      engine.current.telemetry.enabled = false;
      engine.current.telemetry.root.visible = false;
      engine.current.showLabels = true;
    }
  }, [layer, presentation.mode, retry]);
  useEffect(() => {
    if (engine.current) engine.current.pipeline.enabled = quality;
  }, [quality, retry]);
  useEffect(() => {
    if (engine.current) {
      if (orbit) {
        engine.current.clearAirflowView();
        engine.current.clearSliceView();
        engine.current.clearRangeView();
        engine.current.clearNetworkView();
        engine.current.clearPowerView();
        engine.current.clearInletView();
        engine.current.clearEnvironmentView();
        engine.current.clearEntranceView();
        engine.current.clearLeakView();
        engine.current.clearCrossingView();
        engine.current.clearMaintenanceView();
      }
      engine.current.autoOrbit = orbit;
    }
  }, [orbit, retry]);
  useEffect(() => {
    // 层级切换与定位共用场景已经采用的视角，机房内聚焦机柜时同样是等轴近景。
    if (engine.current) setView(engine.current.currentView);
  }, [state.level, state.focusRevision]);
  useEffect(() => {
    if (!tourShot) return;
    engine.current?.view(tourShot.view, tourShot.focus);
    setView(tourShot.view);
  }, [tourShot?.revision, retry]);
  useEffect(() => {
    dataGeometry.current?.update(
      ambientSelected || inletView
        ? []
        : reviewSpatialMarks(state, layer, readings),
    );
  }, [state, layer, readings, retry, ambientSelected, inletView]);
  const maintenanceControls = useRef<HTMLDivElement>(null);
  const maintenanceFocus = useRef<
    "entry" | "view" | "previous" | "next" | "origin" | null
  >(null);
  const restoreMaintenance = () => {
    closeDisplayMenu();
    maintenanceFocus.current = "view";
    engine.current?.restoreMaintenanceView();
    if (engine.current) setView(engine.current.currentView);
  };
  const leaveMaintenanceStep = () => {
    if (!sceneSettled) return;
    if (maintenanceView) restoreMaintenance();
    else {
      maintenanceFocus.current = "entry";
      setMaintenanceScope(null);
    }
  };
  const observeMaintenance = (next: MaintenanceView) => {
    onTakeover();
    setOrbit(false);
    maintenanceFocus.current = "view";
    engine.current?.observeMaintenance(selectedId, next);
  };
  const aisleSequence = maintenanceView?.aisle
    ? maintenanceAisleSequence(selectedId)
    : null;
  const moveAlongAisle = (
    rackId: string | undefined,
    action: "previous" | "next" | "origin",
  ) => {
    if (!rackId || !sceneSettled || !engine.current || engine.current.moving)
      return;
    onTakeover();
    maintenanceFocus.current = action;
    setMaintenanceScope((scope) => scope && { ...scope, rackId });
    onSelect(rackId);
    engine.current.observeMaintenance(rackId, "aisle");
  };
  useEffect(() => {
    engine.current?.frameMaintenance();
  }, [maintenanceView]);
  useEffect(() => {
    if (!maintenanceFocus.current) return;
    let frame = 0;
    const focus = () => {
      const target =
        maintenanceFocus.current === "entry"
          ? "[data-maintenance-entry]"
          : maintenanceFocus.current === "view"
            ? "[data-maintenance-mode]"
            : `[data-aisle-step="${maintenanceFocus.current}"]:not(:disabled)`;
      const button =
        maintenanceControls.current?.querySelector<
          HTMLButtonElement | HTMLSelectElement
        >(target) ??
        maintenanceControls.current?.querySelector<
          HTMLButtonElement | HTMLSelectElement
        >("[data-maintenance-mode]");
      if (!button) {
        maintenanceFocus.current = null;
        return;
      }
      // 镜头与 React 的就绪反馈可能在不同帧提交，等按钮重新启用再归还焦点。
      if (engine.current?.moving || button.disabled) {
        frame = requestAnimationFrame(focus);
        return;
      }
      button.focus({ preventScroll: true });
      maintenanceFocus.current = null;
    };
    frame = requestAnimationFrame(focus);
    return () => cancelAnimationFrame(frame);
  }, [maintenanceView, sceneSettled, inspecting]);
  useEffect(() => {
    if (
      maintenanceView &&
      (layer !== "overview" ||
        state.level !== "room" ||
        !!networkLinkId ||
        !maintenanceViewIncludes(maintenanceView, selectedId))
    )
      engine.current?.clearMaintenanceView();
  }, [maintenanceView, layer, state.level, networkLinkId, selectedId]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !aisleCommand) return;
    maintenanceFocus.current = null;
    if (!aisleCommand.rackId) {
      active.clearMaintenanceView();
      setMaintenanceScope(null);
      return;
    }
    const { rackId } = aisleCommand;
    aisleOrigin.current = rackId;
    setMaintenanceScope({ rackId, paired: true });
    setOrbit(false);
    maintenanceFocus.current = "view";
    active.observeMaintenance(rackId, "aisle");
  }, [aisleCommand]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !inletViewCommand) return;
    if (inletViewCommand.action === "return") {
      closeDisplayMenu();
      active.restoreInletView();
    } else if (inletPair && layer === "environment") {
      setOrbit(false);
      active.observeInlet(inletPair);
    }
    setView(active.currentView);
  }, [inletViewCommand?.revision]);
  useEffect(() => {
    engine.current?.frameInlet();
  }, [inletView]);
  useEffect(() => {
    if (
      inletView &&
      (!inletPair ||
        state.level !== "room" ||
        layer !== "environment" ||
        inletPair.firstId !== inletView.pair.firstId ||
        inletPair.secondId !== inletView.pair.secondId)
    )
      engine.current?.clearInletView();
  }, [inletView, inletPair, state.level, layer]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !environmentViewCommand) return;
    if (environmentViewCommand.action === "return") {
      closeDisplayMenu();
      active.restoreEnvironmentView();
      // 返回起点会一并还原侧栏，画幅变化只更新投影。
      if (!environmentPair) active.preservePanelView();
    } else if (environmentPair && layer === "environment") {
      setOrbit(false);
      active.observeEnvironment(environmentPair);
    }
    setView(active.currentView);
  }, [environmentViewCommand?.revision]);
  useEffect(() => {
    engine.current?.frameEnvironment();
  }, [environmentView]);
  useEffect(() => {
    if (
      environmentView &&
      (!environmentPair || state.level !== "room" || layer !== "environment")
    )
      engine.current?.clearEnvironmentView();
  }, [environmentView, environmentPair, state.level, layer]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !entranceViewCommand) return;
    if (!entranceViewCommand.view) {
      fixtureReturnEntry.current = entranceView
        ? ".entrance-view-entry button"
        : null;
      active.restoreEntranceView();
    } else if (layer === "overview") {
      fixtureReturnEntry.current = null;
      fixtureRangeFocus.current = true;
      setOrbit(false);
      active.observeEntrance(entranceViewCommand.view);
    }
    setView(active.currentView);
  }, [entranceViewCommand?.revision]);
  useEffect(() => {
    engine.current?.frameEntrance();
  }, [entranceView?.view]);
  useEffect(() => {
    if (
      entranceView &&
      (layer !== "overview" ||
        state.level !== "room" ||
        !entranceViewIncludes(selectedId))
    )
      engine.current?.clearEntranceView();
  }, [entranceView, layer, state.level, selectedId]);
  useEffect(() => {
    if (!(entranceView || leakView) || !fixtureRangeFocus.current) return;
    let frame = 0;
    const focus = () => {
      const select = host.current
        ?.closest(".study-stage")
        ?.querySelector<HTMLSelectElement>(
          ".fixture-observation-controls select",
        );
      if (!select) return;
      if (engine.current?.moving || select.disabled) {
        frame = requestAnimationFrame(focus);
        return;
      }
      select.focus({ preventScroll: true });
      fixtureRangeFocus.current = false;
    };
    frame = requestAnimationFrame(focus);
    return () => cancelAnimationFrame(frame);
  }, [entranceView, leakView, sceneSettled]);
  useEffect(() => {
    const entrySelector = fixtureReturnEntry.current;
    if (entranceView || leakView || !entrySelector) return;
    let frame = 0;
    const focus = () => {
      if (engine.current?.moving) {
        frame = requestAnimationFrame(focus);
        return;
      }
      const workspace = host.current?.closest(".workspace-ui");
      const detailsEntry =
        workspace?.querySelector<HTMLButtonElement>(entrySelector);
      const entry = detailsEntry?.getClientRects().length
        ? detailsEntry
        : workspace?.querySelector<HTMLElement>(
            ".review-camera select, .review-camera button",
          );
      if (entry instanceof HTMLButtonElement && entry.disabled) {
        frame = requestAnimationFrame(focus);
        return;
      }
      entry?.focus({ preventScroll: true });
      fixtureReturnEntry.current = null;
    };
    frame = requestAnimationFrame(focus);
    return () => cancelAnimationFrame(frame);
  }, [entranceView, leakView, sceneSettled]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !leakViewCommand) return;
    if (!leakViewCommand.view) {
      fixtureReturnEntry.current = leakView ? ".leak-view-entry button" : null;
      closeDisplayMenu();
      active.restoreLeakView();
    } else if (layer === "overview") {
      fixtureReturnEntry.current = null;
      fixtureRangeFocus.current = leakViewCommand.segment === undefined;
      setOrbit(false);
      active.observeLeak(leakViewCommand.view, leakViewCommand.segment);
    }
    setView(active.currentView);
  }, [leakViewCommand?.revision]);
  useEffect(() => {
    engine.current?.frameLeak();
  }, [leakView?.view]);
  useEffect(() => {
    if (
      leakView &&
      (layer !== "overview" ||
        state.level !== "room" ||
        !leakViewIncludes(selectedId))
    )
      engine.current?.clearLeakView();
  }, [leakView, layer, state.level, selectedId]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !crossingCommand) return;
    if (crossingCommand.dismiss) active.clearCrossingView();
    else if (!crossingCommand.pair) active.restoreCrossingView();
    else if (layer === "overview") {
      setOrbit(false);
      active.observeCrossing(crossingCommand.pair);
    }
    setView(active.currentView);
  }, [crossingCommand?.revision]);
  useEffect(() => {
    engine.current?.frameCrossing();
  }, [crossing?.id]);
  useEffect(() => {
    if (
      crossing &&
      (layer !== "overview" ||
        state.level !== "room" ||
        !crossingObjectIds(crossing).includes(selectedId))
    )
      engine.current?.clearCrossingView();
  }, [crossing, layer, state.level, selectedId]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !powerViewCommand) return;
    if (powerViewCommand.action === "return") {
      closeDisplayMenu();
      powerReturning.current = true;
      active.restorePowerView();
    } else if (layer === "power") {
      powerReturning.current = false;
      setOrbit(false);
      active.observePower(
        selectedId,
        powerLinkId,
        powerViewCommand.action === "observe-pair",
      );
    }
    setView(active.currentView);
  }, [powerViewCommand?.revision]);
  useEffect(() => {
    if (!powerViewActive) return;
    const legend = host.current
      ?.closest(".study-stage")
      ?.querySelector(".review-legend");
    if (!legend) return;
    const observer = new ResizeObserver(() => engine.current?.refitPowerView());
    observer.observe(legend);
    return () => observer.disconnect();
  }, [powerViewActive, powerViewPaired]);
  useEffect(() => {
    if (powerViewActive || !powerReturning.current) return;
    let frame = 0;
    const restoreFocus = () => {
      if (engine.current?.moving) {
        frame = requestAnimationFrame(restoreFocus);
        return;
      }
      const entry = host.current
        ?.closest(".study-stage")
        ?.querySelector<HTMLSelectElement>(".power-view-actions select");
      if (entry?.disabled) {
        frame = requestAnimationFrame(restoreFocus);
        return;
      }
      powerReturning.current = false;
      entry?.focus({ preventScroll: true });
    };
    frame = requestAnimationFrame(restoreFocus);
    return () => cancelAnimationFrame(frame);
  }, [powerViewActive]);
  useEffect(() => {
    engine.current?.updatePowerView(
      selectedId,
      layer === "power" && !isolatedPartId ? powerLinkId : null,
    );
  }, [supply, layer, selectedId, isolatedPartId, shotRevision, retry]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !networkViewCommand) return;
    if (networkViewCommand.action === "return") {
      closeDisplayMenu();
      active.restoreNetworkView();
    } else if (layer === "overview") {
      setOrbit(false);
      active.observeNetwork(selectedId, networkLinkId);
    }
    setView(active.currentView);
  }, [networkViewCommand?.revision]);
  useEffect(() => {
    networkGeometry.current?.update(network, patch, selectedId);
    if (engine.current) engine.current.patchPoints = patch;
  }, [network, patch, selectedId, retry]);
  useEffect(() => {
    engine.current?.updateNetworkView(
      selectedId,
      layer === "overview" && !isolatedPartId ? networkLinkId : null,
    );
  }, [network, layer, selectedId, isolatedPartId, shotRevision, retry]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !sliceViewCommand) return;
    if (sliceViewCommand.action === "return") {
      restoreSliceView();
    } else if (sliceInspection?.context && slice && sliceVisible) {
      setOrbit(false);
      active.observeSlice(sliceInspection.context);
    }
    setView(active.currentView);
  }, [sliceViewCommand?.revision]);
  useEffect(() => {
    engine.current?.updateSliceView(
      slice && sliceVisible ? (sliceInspection?.context ?? null) : null,
    );
  }, [sliceInspection?.context, slice, sliceVisible, shotRevision, retry]);
  useEffect(() => {
    sliceEvidenceGeometry.current?.update(
      slice && sliceVisible ? (sliceInspection?.context ?? null) : null,
      sliceInspection?.sourceId ?? null,
    );
  }, [slice, sliceVisible, sliceInspection, retry]);
  useEffect(() => {
    // 换排保留原选择；只有主动换到无关对象时结束观察。
    if (!slicePlaneActive || selectedId === "room-01") return;
    const row = sliceRackRows.find((item) => item.id === sliceControls.rowId);
    const rackId =
      devices.find((item) => item.id === selectedId)?.rackId ?? selectedId;
    if (!row?.rackIds.includes(rackId)) engine.current?.clearSliceView();
  }, [selectedId]);
  useEffect(() => {
    engine.current?.updateSlicePlane(
      sliceVisible && !sliceInspection ? slice : null,
    );
  }, [slice, sliceVisible, sliceInspection, retry]);
  useEffect(() => {
    engine.current?.clearSliceView();
  }, [shotRevision]);
  useEffect(() => {
    sliceGeometry.current?.update(sliceVisible ? slice : null);
  }, [slice, sliceVisible, retry]);
  useEffect(() => {
    engine.current?.clearAirflowView();
  }, [
    airflow?.routes[0]?.id,
    airflowVisit?.originId ?? selectedId,
    layer,
    state.level,
    shotRevision,
    retry,
  ]);
  useEffect(() => {
    airflowGeometry.current?.update(visibleAirflow, flowView);
  }, [visibleAirflow, flowView, retry]);
  useEffect(() => {
    maintenanceGeometry.current?.update(maintenance, comparison);
    if (engine.current) engine.current.comparedAisle = comparison;
  }, [maintenance, comparison, retry]);
  useEffect(() => {
    powerGeometry.current?.update(showSupply ? supply : null);
  }, [supply, showSupply, retry]);
  useEffect(() => {
    if (engine.current) engine.current.shellCutaway.enabled = shellCutaway;
  }, [shellCutaway, retry]);
  // 外部图形、画质和显示选项在本次提交的 effect 中更新；统一使下一帧失效。
  useEffect(() => {
    engine.current?.invalidate();
  });
  const scope = readings.get(
    state.level === "room" ? "room-01" : rackForDevice(state.deviceId).id,
  )!;
  const roomLabelDevice =
    roomDevice ??
    (state.level === "room" &&
    ((layer === "power" && !(supply && showSupply)) ||
      (layer === "environment" && !sliceInspection && !slicePlaneActive))
      ? deviceById(selectedId)
      : undefined);
  const roomRacks = sliceRow
    ? racks.filter((rack) => sliceRow.rackIds.includes(rack.id))
    : racks;
  const candidates: { id: string; name: string }[] =
    state.level === "room"
      ? roomRacks.map((rack) =>
          roomLabelDevice?.rackId === rack.id ? roomLabelDevice : rack,
        )
      : state.level === "rack"
        ? devices.filter((d) => d.rackId === rackForDevice(state.deviceId).id)
        : [
            ...partsForDevice(state.deviceId).filter((p) => {
              if (isolatedPartId === p.id) {
                // 核对中选了子件后，整组名称已在操作条呈现。
                return (
                  layer !== "overview" ||
                  (p.node !== "fans" && p.id !== storageDriveGroup) ||
                  p.id === selectedId
                );
              }
              if (isolatedPartId)
                return (
                  companionPartIds.includes(p.id) ||
                  (storageContact && p.id === "sto-midplane")
                );
              return (
                p.id === selectedId ||
                !["lid", "duct", "cable"].includes(p.node)
              );
            }),
            ...subpartsForDevice(state.deviceId).filter(
              (p) => p.id === isolatedPartId || p.id === selectedId,
            ),
          ];
  const alarmDevice =
    state.level === "room" &&
    layer === "alarms" &&
    (readings.get(selectedId)?.alarm || selectedId === alarmOriginId)
      ? deviceById(selectedId)
      : undefined;
  const labels = sceneLabels(
    alarmDevice
      ? [alarmDevice]
      : ambientSelected ||
          !sliceVisible ||
          layerPose ||
          dimmPose ||
          storageBoardDisk !== undefined
        ? []
        : layer === "environment" && roomLabelDevice && !moreLabels && !sliceRow
          ? [roomLabelDevice]
          : candidates,
    readings,
    {
      level: state.level,
      layer,
      selectedId,
      alarmOriginId,
      more: moreLabels || !!sliceRow,
      estimates: slice?.rackEstimates,
      hasPath: !!visibleAirflow || !!supply || network.length > 0,
      annotatedIds: [
        ...network.map((marker) => marker.partId ?? marker.deviceId),
        ...(supplyLabels?.flatMap((label) =>
          label.partId ? [label.partId] : [],
        ) ?? []),
      ],
    },
  );
  const selectedFixture =
    state.level === "room" && selectedId === state.selected
      ? layer === "overview"
        ? roomFacilityById(selectedId)
        : fixtureById(selectedId)
      : undefined;
  const partMeasures =
    state.level === "device" && (layer === "environment" || layer === "power");
  const labelKey =
    layer +
    (inletView?.devices.map((device) => device.id).join(":") ?? "") +
    environmentMarkers.map((marker) => marker.id).join(":") +
    (maintenanceView?.view ?? "") +
    (entranceView?.view ?? "") +
    (leakView?.view ?? "") +
    (crossing?.id ?? "") +
    (selectedFixture?.id ?? "") +
    labels.map((r) => r.id).join(":") +
    (visibleAirflow?.routes.map((route) => route.id).join(":") ?? "") +
    flowView +
    areaLabels.map((label) => label.id).join(":") +
    (supplyLabels?.map((label) => label.id).join(":") ?? "") +
    (supply?.deviceId ?? "") +
    networkLinkId +
    network.map((marker) => marker.id).join(":");
  useEffect(() => {
    const active = engine.current;
    const viewport = host.current?.parentElement;
    const workspace = host.current?.closest<HTMLElement>(
      ".review-workspace, .study-workspace",
    );
    if (!active || !viewport || !workspace || !anchors.current) return;
    active.bindAnchors(anchors.current);
    const layout = observeLabelLayout(
      workspace,
      viewport,
      anchors.current,
      flowLines.current,
    );
    labelLayout.current = layout;
    active.onAnchorsProjected = layout.projected;
    return () => {
      layout.dispose();
      if (labelLayout.current === layout) labelLayout.current = null;
      if (active.onAnchorsProjected === layout.projected)
        active.onAnchorsProjected = null;
    };
  }, [labelKey, retry]);
  useEffect(() => {
    labelLayout.current?.invalidate();
  });
  useEffect(() => {
    engine.current?.clearRoomViewMemory();
  }, [shotRevision]);
  useEffect(() => {
    const active = engine.current;
    if (!retry || !active) return;
    if (recoveryPose.current) {
      active.restoreRecoveryPose(recoveryPose.current);
      recoveryPose.current = null;
    } else if (startupView.current?.key === presentationKey(active.state)) {
      active.view(startupView.current.view, startupView.current.focus);
    }
    startupView.current = null;
    setView(active.currentView);
    if (
      document.activeElement === document.body ||
      document.activeElement === reloadButton.current
    )
      displayMenu.current
        ?.querySelector("summary")
        ?.focus({ preventScroll: true });
  }, [retry]);
  const camera = (next: View) => {
    onTakeover();
    setOrbit(false);
    const framePair = next === "top" && !!comparison;
    if (engine.current) engine.current.view(next, framePair);
    else {
      recoveryPose.current = null;
      startupView.current = {
        key: presentationKey(state),
        view: next,
        focus: framePair,
      };
    }
    setView(engine.current?.currentView ?? next);
    if (framePair && matchMedia("(max-width: 600px)").matches)
      host.current
        ?.closest(".study-stage")
        ?.scrollIntoView({ block: "nearest" });
  };
  const flowTarget =
    layer === "airflow" && state.level !== "room"
      ? roomAirflowTarget(selectedId, state.deviceId)
      : null;
  const foldPowerScale =
    powerViewActive || (pduInspection?.outlet != null && !!supply);
  const deviceAlarm =
    state.level === "device" && layer === "alarms"
      ? readings.get(state.deviceId)
      : undefined;
  const deviceSeverity =
    deviceAlarm?.quality === "valid" &&
    deviceAlarm.lifecycle !== "stopped" &&
    deviceAlarm.temperature !== null &&
    deviceAlarm.alarm
      ? signalStyles[deviceAlarm.alarm === 2 ? "critical" : "warning"]
      : null;
  const powerScale = layer === "power" && (
    <>
      <span>
        {state.level === "device"
          ? "部件推导功耗 / 模型预算"
          : state.level === "rack"
            ? "整机输入 / 配置预算"
            : "机柜有效输入 / 对应设备预算"}
      </span>
      <i className="review-scale power" />
      <div className="power-scale-limits">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
      <small>
        <span style={{ color: signalStyles.warning.color }}>▲</span> 近预算　
        <span style={{ color: signalStyles.critical.color }}>◆</span>{" "}
        持续超限　灰色未知
      </small>
      {onInspectBudget && (
        <button
          className="power-budget-entry"
          onClick={() => {
            engine.current?.preservePanelView();
            onInspectBudget();
          }}
        >
          核对功耗预算 ↗
        </button>
      )}
    </>
  );
  return (
    <div
      className="review-scene"
      aria-label="三维场景"
      data-slice-height={slice?.height}
      data-slice-orientation={slice?.orientation}
      data-slice-row={slice?.rowId}
      data-slice-position={slice ? (slice.height ?? slice.distance) : undefined}
      data-airflow-view={flowView ?? ""}
      data-airflow-stage={airflowStage(flowView)?.kinds.join(" ") ?? ""}
      data-slice-visible={sliceVisible && !!slice}
      data-airflow-inspection={airflowVisit?.deviceId ?? ""}
      data-airflow-targets={visibleAirflow?.routes
        .map((route) => route.deviceId)
        .join(",")}
      data-airflow-grilles={visibleAirflow?.routes
        .map((route) => route.floorGrille.id)
        .join(",")}
      data-model-status={modelStatus}
      data-airflow-input={visibleAirflow?.coolingCapacity}
      data-maintenance-rack={maintenance.length ? selectedId : undefined}
      data-maintenance-aisle={comparison?.id}
      data-inlet-view={!!inletView}
      data-environment-view={!!environmentView}
      data-power-rack={supply?.rackId}
      data-power-device={supply?.deviceId}
      data-power-trace={supply?.traceId ?? undefined}
      data-environment-probe={ambient?.id}
      data-network-patch={patch ? networkLinkId : undefined}
      data-network-link={network.length ? networkLinkId : undefined}
    >
      <div className="review-viewport">
        <div
          className="review-canvas"
          ref={host}
          onPointerDownCapture={() => {
            setOrbit(false);
            onTakeover();
          }}
          onWheelCapture={() => {
            setOrbit(false);
            onTakeover();
          }}
        />
        <div className="review-scene-caption">
          <span>
            {state.level === "room"
              ? sliceRow
                ? `${sliceRow.name} / ${sliceRow.rackIds.length} 机柜 · ${devices.filter((device) => sliceRow.rackIds.includes(device.rackId)).length} 设备`
                : "01 号机房 / 8 机柜 · 84 设备"
              : state.level === "rack"
                ? `${rackForDevice(state.deviceId).name} / 42U`
                : `${model.name} / ${representation}`}
          </span>
          <strong>
            {ambientSelected
              ? "环境点位 · 温湿度模拟"
              : slice
                ? slice.orientation === "horizontal"
                  ? "进风温度水平切片 · 局部插值"
                  : `进风温度垂直切片 · ${sliceRow!.name}`
                : layer === "overview" && state.level === "rack"
                  ? "机柜总览"
                  : presentation.title}
          </strong>
          {state.level !== "device" &&
            !visibleAirflow &&
            !ambientSelected &&
            layer !== "alarms" && (
              <div className="review-scene-readings" aria-label="场景运行读数">
                <span>
                  <b>{scope.lifecycleCounts.running}</b>
                  <small>运行设备</small>
                </span>
                <span>
                  <b>
                    {scope.power === null
                      ? "—"
                      : (scope.power / 1000).toFixed(2)}
                    <i>kW</i>
                  </b>
                  <small>已知输入功耗</small>
                </span>
                <span>
                  <b>
                    {scope.temperature?.toFixed(1) ?? "—"}
                    <i>°C</i>
                  </b>
                  <small>
                    最高进风 · {scope.coverageTemperature}/{scope.count}
                  </small>
                </span>
              </div>
            )}
          {visibleAirflow && (
            <div className="review-airflow-caption" aria-label="气流路径示意">
              <p>
                气流示意 · 冷却输入 <b>{visibleAirflow.coolingCapacity}%</b>
              </p>
              <small>{visibleAirflow.label}</small>
            </div>
          )}
          <details className="review-view-explanation">
            <summary>读图说明</summary>
            <p>
              {inletView
                ? "柜前实线与虚线分别标出所查和基准设备的安装跨度。标签沿用当前共享时刻的整机进风模拟，无效状态不显示旧值；两台设备之间没有新增供风关系或温度插值。"
                : ambientSelected
                  ? "固定探头的环境温湿度，只代表安装位置；与设备进风分开，不生成整间机房温湿度场。选择返回设备进风可继续核对温度切片。"
                  : slice
                    ? `${slice.orientation === "horizontal" ? "水平切片估计当前高度的进风温度。" : `垂直切片显示${sliceRow!.name}正面 ${sliceSettings.height.min.toFixed(2)}–${sliceSettings.height.max.toFixed(2)} 米高度的进风差异，滑杆调整离柜距离；标签取切面纵向最高估计。俯视时切面呈侧边，可切到前视观察。`}色条仍对应逐台设备。输入为同一时间的有效模拟读数；代表位置按U位中心假设，非独立环境测点。最近位置离线、过期或超出插值范围时留空；不推断机柜排风或整间机房温度。`
                    : presentation.description}
              {visibleAirflow &&
                " 气流只示意已登记冷却关系的代表路径，当前同向布置不构成封闭冷热通道。端点为制冷单元逻辑代表位置，穿柜方向为配置假设；线条明暗对照冷却输入，不代表风量、风速或排风温度。选中对象可查看对应路径，停机或数据无效对象仅保留静态方向。"}
            </p>
          </details>
        </div>
        <div className="review-anchors" ref={anchors}>
          {inletView?.devices.map((device, index) => {
            const reading = index
              ? inletSnapshot!.second
              : inletSnapshot!.first;
            return (
              <button
                key={device.id}
                hidden
                data-anchor={`inlet-pair-${device.id}`}
                data-hotspot="bounds"
                data-inlet-device={device.id}
                data-anchor-kind="position"
                data-anchor-position={device.point.toArray().join(",")}
                className={`review-flow-anchor review-inlet-pair-anchor ${index ? "pair-reference" : "pair-primary"}`}
                onClick={() => onSelect(device.id)}
                aria-label={`预览同框设备 ${device.name}`}
                aria-describedby={`inlet-scene-reading-${device.id}`}
                aria-pressed={selectedId === device.id}
              >
                <b>
                  {index ? "② 基准" : "① 所查"} · {device.name}
                </b>
                <small
                  id={`inlet-scene-reading-${device.id}`}
                  style={{
                    color: metricAttentionColor(
                      readings.get(device.id),
                      "temperature",
                    ),
                  }}
                >
                  {inletView.crossRack && <span>{device.location}</span>}
                  {reading.value === null
                    ? reading.reason
                    : `${reading.value.toFixed(1)} °C`}
                </small>
              </button>
            );
          })}
          {environmentMarkers.map((marker) => (
            <button
              key={marker.id}
              hidden
              data-anchor={`pair-${marker.id}`}
              data-anchor-kind="position"
              data-anchor-position={marker.position.join(",")}
              className="review-flow-anchor review-environment-pair-anchor"
              onClick={() => onSelect(marker.id)}
              aria-label={`预览对照测点 ${marker.name}`}
              aria-pressed={selectedId === marker.id}
            >
              <b>{marker.title}</b>
              <small>{marker.value}</small>
            </button>
          ))}
          {entranceView?.markers.map((marker) => (
            <div
              key={marker.id}
              hidden
              aria-hidden="true"
              data-anchor={marker.id}
              data-hotspot={entranceView.jamb ? "center" : undefined}
              data-anchor-kind="position"
              data-anchor-position={marker.point.toArray().join(",")}
              className="review-flow-anchor review-crossing-anchor"
            >
              <b>{marker.title}</b>
            </div>
          ))}
          {leakView?.markers.map((marker) => (
            <div
              key={marker.id}
              hidden
              aria-hidden="true"
              data-anchor={marker.id}
              data-hotspot={leakView.floor ? "center" : undefined}
              data-anchor-kind="position"
              data-anchor-position={marker.point.toArray().join(",")}
              className="review-flow-anchor review-crossing-anchor"
            >
              <b>{marker.title}</b>
            </div>
          ))}
          {crossing?.markers.map((marker) => (
            <div
              key={marker.id}
              hidden
              aria-hidden="true"
              data-anchor={marker.id}
              data-hotspot={
                crossing.kind === "lighting-round" ? "center" : undefined
              }
              data-anchor-kind="position"
              data-anchor-position={marker.point.toArray().join(",")}
              className="review-flow-anchor review-crossing-anchor"
            >
              <b>{marker.title}</b>
            </div>
          ))}
          {network.map((marker) => (
            <div
              key={marker.id}
              hidden
              aria-hidden="true"
              data-anchor={marker.id}
              data-hotspot={patch ? "bounds" : undefined}
              data-patch-device={patch ? marker.deviceId : undefined}
              data-anchor-part={marker.partId}
              data-anchor-kind={marker.partId ? "part-position" : "position"}
              data-anchor-level={state.level}
              data-anchor-position={marker.point?.join(",")}
              className="review-flow-anchor review-network-anchor"
            >
              <b>
                {marker.title}
                {patch && ` · ${unitLabel(marker.deviceId)}`}
              </b>
            </div>
          ))}
          {supplyLabels?.map((label) => (
            <div
              key={label.id}
              hidden
              aria-hidden="true"
              data-anchor={label.id}
              data-anchor-part={label.partId}
              data-anchor-kind={label.partId ? "power-part" : "position"}
              data-anchor-level={state.level}
              data-anchor-position={label.point?.join(",")}
              className="review-flow-anchor review-power-anchor"
            >
              <b>{label.title}</b>
            </div>
          ))}
          {areaLabels.map((area) => (
            <div
              key={area.id}
              hidden
              aria-hidden="true"
              data-anchor={area.id}
              data-anchor-kind="position"
              data-anchor-position={area.position.join(",")}
              className="review-flow-anchor review-maintenance-anchor"
            >
              <b>{area.text}</b>
            </div>
          ))}
          {visibleAirflow?.routes.flatMap((route) =>
            route.endpoints
              .filter((endpoint) =>
                showAirflowEndpoint(flowView, endpoint.kind),
              )
              .map((endpoint) => (
                <div
                  key={`${route.id}-${endpoint.kind}`}
                  hidden
                  aria-hidden="true"
                  data-anchor={`${route.id}-${endpoint.kind}`}
                  data-anchor-kind="position"
                  data-anchor-position={endpoint.point.join(",")}
                  className={`review-flow-anchor review-airflow-endpoint flow-${endpoint.kind} ${route.animated ? "" : "is-static"}`}
                >
                  <b>
                    {flowView === "terminals" && endpoint.kind === "supply"
                      ? "柜端送风"
                      : endpoint.label}
                  </b>
                </div>
              )),
          )}
          {selectedFixture &&
            !entranceView &&
            !leakView &&
            !crossing &&
            !environmentMarkers.length && (
              <button
                hidden
                data-anchor={selectedFixture.id}
                data-anchor-kind="position"
                data-anchor-position={selectedFixture.position.join(",")}
                data-anchor-object={selectedFixture.id}
                className="review-anchor review-fixture-anchor selected"
                onClick={() => onSelect(selectedFixture.id)}
                onDoubleClick={() => onSelect(selectedFixture.id, true)}
              >
                <b>{selectedFixture.name}</b>
                {ambient && (
                  <small>
                    {environmentValue(ambient.temperature.value, "°C")}
                    {ambient.temperature.quality !== "valid" &&
                      `（${environmentQuality[ambient.temperature.quality]}）`}{" "}
                    · {environmentValue(ambient.humidity.value, "%RH")}
                    {ambient.humidity.quality !== "valid" &&
                      `（${environmentQuality[ambient.humidity.quality]}）`}{" "}
                    · 模拟
                  </small>
                )}
              </button>
            )}
          {labels.map((item) => {
            const reading = readings.get(item.id)!;
            const alarm =
              layer === "alarms" && reading.alarm
                ? signalStyles[reading.alarm === 2 ? "critical" : "warning"]
                : null;
            const deviceInlet =
              layer === "environment" && roomLabelDevice?.id === item.id;
            const rackSlice = !deviceInlet && slice;
            const temperature = rackSlice
              ? rackSlice.rackEstimates.get(item.id)
              : reading.temperature;
            const ratio = budgetRatio(reading.power, reading.budget);
            const ownBudget =
              layer === "power"
                ? budgetStateText(reading.budgetState, ratio)
                : undefined;
            const memberLevel =
              layer === "power" ? reading.memberBudgetLevel : undefined;
            const memberHint = memberLevel
              ? `柜内 ${reading.memberBudgetCount} 台设备需关注预算`
              : undefined;
            let accent: string | undefined = alarm?.color;
            if (
              reading.quality !== "valid" &&
              (layer === "power" || layer === "environment")
            ) {
              accent = signalStyles[reading.quality].color;
            } else if (reading.quality === "valid") {
              if (layer === "environment" && temperature != null)
                accent =
                  "#" +
                  temperatureColor(
                    temperature,
                    undefined,
                    state.level === "device" ? 80 : 45,
                  ).getHexString();
              if (layer === "power" && ratio !== null)
                accent =
                  "#" +
                  powerColor(
                    ratio,
                    undefined,
                    reading.budgetState,
                  ).getHexString();
            }
            return (
              <button
                hidden
                key={item.id}
                title={
                  slicePlaneActive
                    ? "柜旁读数为该柜切面最高估计，不是整柜输入最高值"
                    : [
                        partMeasures ? item.name : undefined,
                        ownBudget,
                        memberHint,
                      ]
                        .filter(Boolean)
                        .join(" · ") || undefined
                }
                data-anchor={item.id}
                data-hotspot={
                  partMeasures
                    ? model.category === "server"
                      ? "center"
                      : "bounds"
                    : state.level === "rack" &&
                        (alarm ||
                          ownBudget ||
                          (layer === "environment" &&
                            metricAttentionColor(reading, "temperature"))) &&
                        item.id === state.selected
                      ? "bounds"
                      : undefined
                }
                data-anchor-kind={
                  alarmDevice || item.id === roomLabelDevice?.id
                    ? "device"
                    : state.level === "room"
                      ? "rack"
                      : state.level === "rack"
                        ? "device"
                        : "part"
                }
                style={
                  accent
                    ? { borderInlineStart: `3px solid ${accent}` }
                    : undefined
                }
                className={`review-anchor ${item.id === state.selected ? "selected" : ""}`}
                onClick={() => onSelect(item.id)}
                onDoubleClick={() => onSelect(item.id, true)}
              >
                <b>
                  {state.level === "device"
                    ? partMeasures
                      ? (componentById(item.id)?.slot ?? item.name)
                      : item.name
                    : item.name.split(" ")[0]}
                  {memberLevel && (
                    <small
                      aria-label={memberHint}
                      style={{
                        color:
                          signalStyles[
                            memberLevel === "over" ? "critical" : "warning"
                          ].color,
                      }}
                    >
                      {memberLevel === "over" ? " ◆" : " ▲"}
                    </small>
                  )}
                </b>
                {alarm && (
                  <small style={{ color: alarm.color }}>
                    {alarm.icon} {alarm.label}
                    {reading.count > 1 && reading.alarmCount > 1
                      ? ` · ${reading.alarmCount} 台异常`
                      : ""}
                  </small>
                )}
                {roomDevice && item.id === roomDevice.id && (
                  <span>
                    {rackForDevice(item.id).name} · {unitLabel(item.id)}
                  </span>
                )}
                {layer !== "overview" &&
                  layer !== "alarms" &&
                  layer !== "airflow" && (
                    <span>
                      {reading.quality !== "valid"
                        ? `${signalStyles[reading.quality].icon} ${qualityNames[reading.quality]}`
                        : layer === "environment"
                          ? rackSlice
                            ? temperature == null
                              ? rackSlice.orientation === "horizontal"
                                ? "本层无估计"
                                : "切面无估计"
                              : `${slicePlaneActive ? "约" : rackSlice.orientation === "horizontal" ? "本层约" : "切面最高约"} ${temperature.toFixed(1)} °C`
                            : reading.temperature === null
                              ? "—"
                              : `${deviceInlet ? "进风 " : reading.count > 1 ? "最高 " : ""}${reading.temperature.toFixed(1)} °C`
                          : reading.power === null
                            ? "—"
                            : reading.power >= 1000
                              ? `${(reading.power / 1000).toFixed(2)} kW`
                              : `${reading.power.toFixed(0)} W`}
                    </span>
                  )}
                {layer === "power" &&
                  reading.quality === "valid" &&
                  ratio !== null && (
                    <em
                      className="power-label-load"
                      title={
                        ownBudget ??
                        (reading.count > 1 ? "占有效设备预算" : "占配置预算")
                      }
                    >
                      {reading.budgetState?.level === "over"
                        ? "◆ "
                        : reading.budgetState
                          ? "▲ "
                          : ""}
                      {budgetPercent(ratio)}
                      <i aria-hidden="true">
                        <i
                          style={{
                            width: `${Math.min(ratio, 1) * 100}%`,
                            backgroundColor: accent,
                          }}
                        />
                      </i>
                    </em>
                  )}
              </button>
            );
          })}
        </div>
        {!error && (
          <ModelLoadNotice
            state={assets}
            onInteract={onTakeover}
            onRetry={() => engine.current?.retryModels()}
          />
        )}
        {(inletView ||
          entranceView ||
          leakView ||
          crossing ||
          selectedFixture ||
          airflow ||
          maintenance.length > 0 ||
          supply ||
          network.length > 0 ||
          labels.some((item) => partMeasures || item.id === selectedId)) && (
          <svg className="review-flow-lines" aria-hidden="true" ref={flowLines}>
            {inletView?.devices.map((device, index) => (
              <line
                className={index ? "pair-reference" : "pair-primary"}
                key={device.id}
                data-flow-line={`inlet-pair-${device.id}`}
              />
            ))}
            {environmentMarkers.map((marker) => (
              <line key={marker.id} data-flow-line={`pair-${marker.id}`} />
            ))}
            {entranceView?.markers.map((marker) => (
              <line key={marker.id} data-flow-line={marker.id} />
            ))}
            {leakView?.markers.map((marker) => (
              <line key={marker.id} data-flow-line={marker.id} />
            ))}
            {crossing?.markers.map((marker) => (
              <line key={marker.id} data-flow-line={marker.id} />
            ))}
            {selectedFixture &&
              !entranceView &&
              !leakView &&
              !crossing &&
              !environmentMarkers.length && (
                <line data-flow-line={selectedFixture.id} />
              )}
            {labels
              .filter((item) => partMeasures || item.id === selectedId)
              .map((item) => (
                <line key={item.id} data-flow-line={item.id} />
              ))}
            {areaLabels.map((area) => (
              <line key={area.id} data-flow-line={area.id} />
            ))}
            {supplyLabels?.map((label) => (
              <line key={label.id} data-flow-line={label.id} />
            ))}
            {network.map((marker) => (
              <line key={marker.id} data-flow-line={marker.id} />
            ))}
            {visibleAirflow?.routes.flatMap((route) =>
              route.endpoints
                .filter((endpoint) =>
                  showAirflowEndpoint(flowView, endpoint.kind),
                )
                .map((endpoint) => (
                  <line
                    key={`${route.id}-${endpoint.kind}`}
                    data-flow-line={`${route.id}-${endpoint.kind}`}
                  />
                )),
            )}
          </svg>
        )}
        <div
          className={`review-legend ${slice || layer === "airflow" ? "review-slice-legend" : ""}`}
          aria-label="当前图层图例"
          data-closeup-airflow={!!flowTarget || undefined}
          data-slice-orientation={slice?.orientation}
          data-flow-observation={!!flowView}
          data-slice-visible={sliceVisible}
        >
          {entranceView && (
            <FixtureObservationControls
              title="入口布置"
              subject="入口"
              views={entranceViews}
              value={entranceView.view}
              ready={sceneSettled}
              onView={onEntranceView}
            />
          )}
          {leakView && (
            <FixtureObservationControls
              title="检漏路径"
              note={
                leakView.floor
                  ? `制冷单元 · ${assets["cooling-01"] === "ready" ? "贡献模型外观" : assets["cooling-01"] === "failed" ? "加载失败 · 简化柜体" : "简化柜体"}`
                  : undefined
              }
              subject="检漏"
              views={leakViews}
              value={leakView.view}
              ready={sceneSettled}
              onView={onLeakView}
            />
          )}
          {crossing && (
            <div
              className="crossing-scene-key"
              onKeyDown={(event) => {
                if (event.key === "Escape" && sceneSettled) {
                  event.preventDefault();
                  event.stopPropagation();
                  onReturnCrossing();
                }
              }}
            >
              <strong>{crossing.title}</strong>
              <span>
                {crossing.kind === "smoke-tray"
                  ? `水平间距 ${crossing.horizontal.toFixed(2)}`
                  : crossing.kind === "lighting-round"
                    ? `沿桥架 X 向间距 ${Math.abs(crossing.alongX).toFixed(2)}`
                    : `表面高差 ${Math.abs(crossing.difference).toFixed(2)}`}{" "}
                m · 配置
              </span>
              <button disabled={!sceneSettled} onClick={onReturnCrossing}>
                ← 返回核对前视角
              </button>
            </div>
          )}
          {network.length > 0 && networkLink && (
            <div className="network-scene-key">
              <strong>网络接入 {switchRole(networkLink.target)}</strong>
              <small>
                {state.level === "device"
                  ? "所属部件示意"
                  : patch
                    ? "布线示意 · 柜前看右侧"
                    : "设备位置示意"}
              </small>
              {patch && <small>后门及右侧板剖示 · 虚线为遮挡段</small>}
              <div className="network-view-actions">
                {network.length === 2 &&
                  network.every((marker) => marker.point) && (
                    <button
                      aria-disabled={!sceneSettled}
                      onClick={() => {
                        if (sceneSettled)
                          onNetworkView(
                            networkViewActive ? "return" : "observe",
                          );
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Escape" || !networkViewActive)
                          return;
                        event.preventDefault();
                        event.stopPropagation();
                        if (sceneSettled) onNetworkView("return");
                      }}
                    >
                      {networkViewActive ? "返回原视角" : "同框观察两端"}
                    </button>
                  )}
                {!networkViewActive && (
                  <button onClick={onClearNetwork}>结束标记</button>
                )}
              </div>
            </div>
          )}
          {layer === "overview" ? (
            rackAreas.length > 0 && (inspecting || !aisleRosterVisible) ? (
              <div
                className="review-status-key aisle-legend"
                ref={maintenanceControls}
                onKeyDown={(event) => {
                  if (event.key !== "Escape" || !inspecting) return;
                  event.preventDefault();
                  event.stopPropagation();
                  if (onReturnToAisles) onReturnToAisles();
                  else leaveMaintenanceStep();
                }}
              >
                {inspecting ? (
                  <>
                    <strong>{rackAreas[0].rackName} · 维护预留</strong>
                    <div className="aisle-actions">
                      <select
                        aria-label="维护范围观察方式"
                        data-maintenance-mode
                        disabled={!sceneSettled}
                        value={
                          maintenanceView?.view ??
                          (comparison ? "pair" : "rack")
                        }
                        onChange={(event) => {
                          const next = event.target.value;
                          const view = maintenanceViews.find(
                            (item) => item.id === next,
                          );
                          if (view) observeMaintenance(view.id);
                          else {
                            if (maintenanceView) restoreMaintenance();
                            setMaintenanceScope({
                              rackId: selectedId,
                              paired: next === "pair",
                            });
                          }
                        }}
                      >
                        <option value="rack">本柜前后</option>
                        {availableAisle && (
                          <option value="pair">两柜对照</option>
                        )}
                        {maintenanceViews
                          .filter(
                            (item) => item.id !== "aisle" || availableAisle,
                          )
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                      </select>
                      {!onReturnToAisles && (
                        <button
                          disabled={!sceneSettled}
                          onClick={leaveMaintenanceStep}
                        >
                          {maintenanceView ? "返回原视角" : "结束核对"}
                        </button>
                      )}
                    </div>
                    {aisleSequence && comparison && (
                      <div
                        className="aisle-sequence"
                        role="group"
                        aria-label="沿排核对"
                      >
                        <button
                          data-aisle-step="previous"
                          aria-label="上一组"
                          disabled={!sceneSettled || !aisleSequence.previous}
                          onClick={() =>
                            moveAlongAisle(aisleSequence.previous, "previous")
                          }
                        >
                          ←
                        </button>
                        <span aria-live="polite">
                          {aisleSequence.index + 1} / {aisleSequence.count}
                        </span>
                        <button
                          data-aisle-step="next"
                          aria-label="下一组"
                          disabled={!sceneSettled || !aisleSequence.next}
                          onClick={() =>
                            moveAlongAisle(aisleSequence.next, "next")
                          }
                        >
                          →
                        </button>
                        {!onReturnToAisles && (
                          <button
                            data-aisle-step="origin"
                            disabled={
                              !sceneSettled ||
                              !aisleOrigin.current ||
                              selectedId === aisleOrigin.current
                            }
                            onClick={() =>
                              moveAlongAisle(
                                aisleOrigin.current ?? undefined,
                                "origin",
                              )
                            }
                          >
                            回到起点
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    data-maintenance-entry
                    disabled={!sceneSettled}
                    onClick={() => {
                      onTakeover();
                      maintenanceFocus.current = "view";
                      setMaintenanceScope({
                        rackId: selectedId,
                        paired: false,
                      });
                    }}
                  >
                    核对维护范围
                  </button>
                )}
              </div>
            ) : state.level === "device" && model.category !== "server" ? (
              <div className="review-status-key">
                <small>{representation}</small>
              </div>
            ) : null
          ) : layer === "alarms" ? (
            <div className="review-status-key">
              {state.level === "device" ? (
                <div
                  className="device-alarm-summary"
                  title="部件列表显示模型评估"
                >
                  <strong style={{ color: deviceSeverity?.color }}>
                    {deviceSeverity?.icon} {deviceAlarm?.name} ·{" "}
                    {alarmCurrentStatus(deviceAlarm)}
                  </strong>
                </div>
              ) : (
                <>
                  <span className="legend-warning">▲ 预警</span>
                  <span className="legend-critical">◆ 严重</span>
                </>
              )}
            </div>
          ) : inletView ? null : ambientSelected ? (
            <div className="environment-scene-key">
              <strong>
                {environmentPair
                  ? `双测点${trendMetricNames[environmentPairMetric]} · 模拟`
                  : "环境测点 · 模拟"}
              </strong>
              {environmentPair ? (
                <button
                  className="environment-camera-action"
                  aria-disabled={!sceneSettled}
                  onClick={() => {
                    if (sceneSettled)
                      onEnvironmentView(environmentView ? "return" : "observe");
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape" || !environmentView) return;
                    event.preventDefault();
                    event.stopPropagation();
                    if (sceneSettled) onEnvironmentView("return");
                  }}
                >
                  {environmentView ? "返回原视角" : "同框观察两测点"}
                </button>
              ) : (
                <>
                  <EnvironmentProbeList
                    time={state.time}
                    selected={selectedId}
                    onSelect={(id, enter) => {
                      if (!enter) engine.current?.preservePanelView();
                      onSelect(id, enter);
                    }}
                  />
                  <button onClick={() => onSelect("room-01", true)}>
                    ← 返回设备进风
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {layer === "airflow" && (
                <AirflowPanel
                  snapshot={airflow}
                  coolingModel={assets["cooling-01"]}
                  view={flowView}
                  visit={airflowVisit}
                  ready={sceneSettled}
                  panelRef={airflowWorkspace.panel}
                  sliceEnabled={airflowWorkspace.sliceEnabled}
                  onSlice={(value) => {
                    onTakeover();
                    airflowWorkspace.setSliceEnabled(value);
                  }}
                  onObserve={(view) => {
                    if (airflow?.routes[0])
                      airflowWorkspace.observe(airflow.routes[0], view);
                  }}
                  onReturn={airflowWorkspace.restore}
                  onReturnEndpoint={() => {
                    engine.current?.preservePanelView();
                    onReturnAirflowEndpoint();
                  }}
                  onExplain={() => {
                    engine.current?.preservePanelView();
                    onExplainAirflow();
                  }}
                  targetName={
                    flowTarget
                      ? (deviceById(flowTarget.id)?.name ??
                        entityById(flowTarget.id)?.name ??
                        flowTarget.id)
                      : null
                  }
                  onRoom={onShowRoomAirflow}
                  onOpenInstallation={onOpenAirflowInstallation}
                  analysisControl={airflowResponseControl}
                />
              )}
              {sliceVisible && (layer === "environment" || !!slice) && (
                <>
                  <span className={slice ? "review-slice-heading" : undefined}>
                    {slice ? (
                      <>
                        {layer !== "airflow" && <span>进风温度</span>}
                        <select
                          aria-label="温度切片方向"
                          value={sliceControls.orientation}
                          onChange={(event) => {
                            onTakeover();
                            setSliceControls((current) => ({
                              ...current,
                              orientation: event.target
                                .value as SliceOrientation,
                            }));
                          }}
                        >
                          <option value="horizontal">水平切片</option>
                          <option value="vertical">垂直切片</option>
                        </select>
                        {layer === "environment" &&
                          slice.orientation === "horizontal" && (
                            <output
                              className="slice-heading-height"
                              htmlFor="temperature-slice-position"
                            >
                              {slice.height.toFixed(2)} m
                            </output>
                          )}
                        {layer === "airflow" && (
                          <span
                            className="airflow-slice-scale"
                            role="img"
                            title="局部进风插值，空白处无估计"
                            aria-label="进风温度局部估计色标，20 至 45 摄氏度，空白无估计"
                          >
                            估计 20 <i className="review-scale environment" />{" "}
                            45 °C
                          </span>
                        )}
                        {slice.orientation === "vertical" &&
                          layer === "environment" && (
                            <select
                              aria-label="温度切片机柜排"
                              value={sliceControls.rowId}
                              onChange={(event) => {
                                onTakeover();
                                setSliceControls((current) => ({
                                  ...current,
                                  rowId: event.target.value,
                                }));
                              }}
                            >
                              {sliceRackRows.map((row) => (
                                <option key={row.id} value={row.id}>
                                  {row.name}
                                </option>
                              ))}
                            </select>
                          )}
                      </>
                    ) : state.level === "device" ? (
                      "表面温度 · °C · 模型推导"
                    ) : (
                      "U 位色条 · 设备进风温度"
                    )}
                  </span>
                  {layer === "environment" && (
                    <>
                      <i className="review-scale environment" />
                      <div>
                        <span>20 °C</span>
                        <span>
                          {state.level === "device" ? "50 °C" : "32.5 °C"}
                        </span>
                        <span>
                          {state.level === "device" ? "80 °C" : "45 °C"}
                        </span>
                      </div>
                      {slice && (
                        <small>
                          {slice.orientation === "horizontal"
                            ? "局部插值示意 · 空白无估计"
                            : `高 ${sliceSettings.height.min.toFixed(2)}–${sliceSettings.height.max.toFixed(2)} m · 插值示意 · 空白无估计`}
                        </small>
                      )}
                    </>
                  )}
                </>
              )}
              {slice && (
                <div
                  className="review-slice-controls"
                  aria-label="温度切片控制"
                >
                  {sliceVisible && (
                    <>
                      <label htmlFor="temperature-slice-position">
                        {slice.orientation === "horizontal"
                          ? "切片高度"
                          : "距机柜正面"}{" "}
                        {layer === "airflow" &&
                          slice.orientation === "vertical" &&
                          ` · ${sliceRow?.name ?? ""}`}
                        <output htmlFor="temperature-slice-position">
                          {(slice.height ?? slice.distance).toFixed(2)} m
                        </output>
                      </label>
                      <input
                        id="temperature-slice-position"
                        type="range"
                        aria-label={
                          slice.orientation === "horizontal"
                            ? "温度切片高度"
                            : "垂直切片离柜距离"
                        }
                        aria-valuetext={`${(slice.height ?? slice.distance).toFixed(2)} 米`}
                        min={positionSettings.min}
                        max={positionSettings.max}
                        step={positionSettings.step}
                        value={slice.height ?? slice.distance}
                        onChange={(event) => {
                          onTakeover();
                          const value = Number(event.target.value);
                          setSliceControls((current) =>
                            slice.orientation === "horizontal"
                              ? { ...current, height: value }
                              : { ...current, distance: value },
                          );
                        }}
                      />
                      {slice.orientation === "vertical" &&
                        layer === "environment" && (
                          <div
                            className="slice-plane-actions"
                            onKeyDown={(event) => {
                              if (
                                event.key === "Escape" &&
                                slicePlaneActive &&
                                sceneSettled
                              ) {
                                event.preventDefault();
                                event.stopPropagation();
                                restoreSliceView();
                              }
                            }}
                          >
                            <button
                              ref={planeEntry}
                              disabled={!sceneSettled || !!sliceInspection}
                              onClick={() => {
                                onTakeover();
                                if (slicePlaneActive) {
                                  restoreSliceView();
                                } else {
                                  setOrbit(false);
                                  if (temperatureTools.current)
                                    temperatureTools.current.open = false;
                                  engine.current?.observeSlicePlane(slice);
                                }
                              }}
                            >
                              {slicePlaneActive
                                ? "← 返回整排观察前视角"
                                : "观察整排切片"}
                            </button>
                            {slicePlaneActive && (
                              <small>柜旁约值为切面最高估计 · 气流暂收</small>
                            )}
                          </div>
                        )}
                      <SliceInputPreview
                        key={`${shotRevision}:${slice.orientation}:${slice.rowId}:${slice.height ?? slice.distance}`}
                        slice={slice}
                        readings={readings}
                        onTakeover={onTakeover}
                        selectedId={selectedId}
                        onPreview={(id) => {
                          engine.current?.preservePanelView();
                          const restore = onPreviewInput(id);
                          return () => {
                            engine.current?.preservePanelView();
                            restore();
                          };
                        }}
                      />
                    </>
                  )}
                  {layer === "environment" && (
                    <TemperatureDisclosure
                      key={shotRevision}
                      detailsRef={temperatureTools}
                      className="temperature-tools"
                      name="temperature-tools"
                      summary="观察与核对 · 设备 / 环境"
                      reveal={!!sliceInspection}
                      onInteract={onTakeover}
                    >
                      {sliceVisible && (
                        <>
                          <SliceDeviceContext
                            inspecting={!!sliceInspection}
                            key={`${shotRevision}:${sliceInspection?.deviceId ?? selectedId}`}
                            selectedId={sliceInspection?.deviceId ?? selectedId}
                            onInspect={() => {
                              engine.current?.preservePanelView();
                              onInspectSlice(
                                sliceInspection?.deviceId ?? selectedId,
                              );
                            }}
                            onInteract={onTakeover}
                            controls={sliceControls}
                            slice={slice}
                            readings={readings}
                            onChange={(next) => {
                              onTakeover();
                              setSliceControls(next);
                            }}
                          />
                          <TemperatureDisclosure
                            className="environment-disclosure"
                            summary="环境测点 · 2 处"
                            onInteract={onTakeover}
                          >
                            <EnvironmentProbeList
                              time={state.time}
                              selected={selectedId}
                              onSelect={(id, enter) => {
                                if (!enter) engine.current?.preservePanelView();
                                onSelect(id, enter);
                              }}
                            />
                          </TemperatureDisclosure>
                        </>
                      )}
                    </TemperatureDisclosure>
                  )}
                </div>
              )}
              {!foldPowerScale && powerScale}
              {optionalInputs && (
                <button
                  className="power-input-disclosure"
                  aria-expanded={showPowerInputs}
                  onClick={() => setShowPowerInputs(!showPowerInputs)}
                >
                  供电接入 {showPowerInputs ? "▴" : "▾"}
                </button>
              )}
              {layer === "power" && supply && showSupply && (
                <div className="power-scene-key" aria-label="供电路径示意">
                  <strong>{supply.caption}</strong>
                  {selectedId === powerSettings.sourceId &&
                    supply.traceId &&
                    !powerViewActive && (
                      <small>
                        配电柜 ·{" "}
                        {assets["power-01"] === "ready"
                          ? "贡献模型外观"
                          : assets["power-01"] === "failed"
                            ? "加载失败 · 简化柜体"
                            : "简化柜体"}
                      </small>
                    )}
                  {powerViewPoints(state, selectedId, supply.traceId).length ===
                    2 && (
                    <PowerViewActions
                      active={powerViewActive}
                      paired={powerViewPaired}
                      ready={sceneSettled}
                      onObserve={() => onPowerView("observe")}
                      onObservePair={() => onPowerView("observe-pair")}
                      onReturn={() => onPowerView("return")}
                    />
                  )}
                  {!powerViewActive &&
                    (supply.traceId || supply.unconnectedOutlet) && (
                      <button onClick={onClearPower}>
                        {supply.traceId ? "结束追踪" : "清除插座标记"}
                      </button>
                    )}
                  {supply.paths.length > 0 && (
                    <div className="power-line-key" aria-label="已显示配置支路">
                      {[...new Set(supply.paths.map((path) => path.feed))].map(
                        (feed) => (
                          <span key={feed}>
                            <i
                              aria-hidden="true"
                              style={{
                                borderColor: powerSettings.routing.colors[feed],
                                borderTopStyle:
                                  feed === "A" ? "solid" : "dashed",
                              }}
                            />
                            {feed} 路
                          </span>
                        ),
                      )}
                    </div>
                  )}
                  {state.level === "device" && (
                    <span>
                      {model.category === "server"
                        ? "电源输入配置端点"
                        : "电源输入 · 内部配置示意"}
                    </span>
                  )}
                  {(state.level === "rack" ||
                    (powerViewActive && state.level === "room")) && (
                    <span>
                      {state.level === "room"
                        ? "所查柜后侧观察剖切"
                        : state.rearDoorOpen
                          ? "后立柱观察剖切"
                          : "后侧观察剖切"}
                    </span>
                  )}
                  <small>
                    {supply.unconnectedOutlet
                      ? "配置空位 · 可用容量未定义"
                      : "线型区分配置支路 · 支路功耗未计量"}
                  </small>
                </div>
              )}
              {foldPowerScale && powerScale && (
                <details className="power-scale-details">
                  <summary>功耗标尺</summary>
                  {powerScale}
                </details>
              )}
            </>
          )}
          {(inletPair || canStartInletPair) &&
            state.level === "room" &&
            layer === "environment" && (
              <div className="inlet-scene-key">
                <strong>
                  {inletView ? "进风对照 · 安装跨度" : "双设备进风"}
                </strong>
                <button
                  aria-disabled={!sceneSettled}
                  onClick={() => {
                    if (sceneSettled)
                      onInletView(inletView ? "return" : "observe");
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape" || !inletView) return;
                    event.preventDefault();
                    event.stopPropagation();
                    if (sceneSettled) onInletView("return");
                  }}
                >
                  {inletView ? "返回原视角" : "同框观察两台设备"}
                </button>
              </div>
            )}
        </div>
        {error && (
          <div className="review-error" role="alert">
            <h2>场景暂不可用</h2>
            <p>{error}</p>
            <button
              ref={reloadButton}
              onClick={() => {
                if (
                  engine.current &&
                  recoveryPose.current?.key === presentationKey(state)
                )
                  recoveryPose.current = engine.current.captureRecoveryPose();
                initial.current = state;
                setRetry((r) => r + 1);
              }}
            >
              重新加载场景
            </button>
          </div>
        )}
      </div>
      <div className="review-scene-toolbar">
        {controls}
        <div
          className={
            compactTools
              ? "review-view-controls is-compact"
              : "review-view-controls"
          }
          style={compactTools ? undefined : { display: "contents" }}
        >
          <div className="review-camera" aria-label="标准视角">
            {compactTools ? (
              <select
                aria-label="选择视角"
                value={view}
                onChange={(event) => camera(event.target.value as View)}
              >
                {state.level === "room" && (
                  <option value="interior">全景</option>
                )}
                <option value="iso">等轴</option>
                <option value="top">俯视</option>
                <option value="front">前视</option>
                <option value="rear">后视</option>
              </select>
            ) : (
              (
                [
                  ["interior", "全景"],
                  ["iso", "等轴"],
                  ["top", "俯视"],
                  ["front", "前视"],
                ] as const
              )
                .filter(([id]) => state.level === "room" || id !== "interior")
                .map(([id, text]) => (
                  <button
                    key={id}
                    aria-pressed={view === id}
                    onClick={() => camera(id)}
                  >
                    {text}
                  </button>
                ))
            )}
          </div>
          <div
            className="review-scene-tools"
            onPointerDownCapture={onTakeover}
            onKeyDownCapture={onTakeover}
          >
            <button
              onClick={onFocus}
              aria-label="聚焦选择"
              title="聚焦所选对象（F）"
            >
              {compactTools ? "聚焦" : "聚焦选择"} <kbd>F</kbd>
            </button>
            <details ref={displayMenu}>
              <summary>{compactTools ? "显示" : "画面"}</summary>
              <div>
                {state.level === "room" && (
                  <div className="room-view-memory" aria-label="临时机房视角">
                    <button
                      disabled={!sceneSettled}
                      onClick={() => {
                        onTakeover();
                        setOrbit(false);
                        engine.current?.rememberRoomView();
                      }}
                    >
                      {roomViewSaved ? "替换保存视角" : "保存当前视角"}
                    </button>
                    {roomViewSaved && (
                      <>
                        <button
                          disabled={!sceneSettled}
                          onClick={() => {
                            onTakeover();
                            setOrbit(false);
                            if (engine.current?.restoreRoomViewMemory())
                              setView(engine.current.currentView);
                          }}
                        >
                          返回保存视角
                        </button>
                        <button
                          disabled={!sceneSettled}
                          onClick={() => engine.current?.clearRoomViewMemory()}
                        >
                          清除保存视角
                        </button>
                      </>
                    )}
                    <small>
                      仅恢复镜头。离开机房、载入演示画面或视口尺寸改变后清除。
                    </small>
                  </div>
                )}
                <label title="按视线剖切挡住机柜的墙体与顶架；取消可恢复完整建筑">
                  <input
                    type="checkbox"
                    checked={shellCutaway}
                    disabled={state.level !== "room"}
                    onChange={(e) =>
                      localCutaway
                        ? setStageCutaway(e.target.checked)
                        : setCutaway(e.target.checked)
                    }
                  />
                  {localCutaway ? "观察段建筑剖切" : "自动建筑剖切"}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={moreLabels}
                    onChange={(e) => {
                      onTakeover();
                      setMoreLabels(e.target.checked);
                    }}
                  />
                  更多对象标签
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={orbit}
                    onChange={(e) => setOrbit(e.target.checked)}
                  />
                  镜头环绕
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={quality && supported}
                    disabled={!supported}
                    onChange={(e) => setQuality(e.target.checked)}
                  />
                  细节阴影
                </label>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
