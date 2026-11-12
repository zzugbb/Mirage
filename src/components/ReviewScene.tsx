import type {
  EnvironmentInspection,
  EnvironmentViewCommand,
} from "../environment-view";
import { EnvironmentViewGeometry } from "../scene/environment-view";
import { EnvironmentViewActions } from "./EnvironmentViewActions";
import {
  entranceViewIncludes,
  type EntranceInspection,
  type EntranceView,
  type EntranceViewCommand,
} from "../entrance-view";
import { EntranceViewGeometry } from "../scene/entrance-view";
import { EntranceViewActions } from "./EntranceViewActions";
import {
  leakViewIncludes,
  type LeakInspection,
  type LeakView,
  type LeakViewCommand,
} from "../leak-view";
import { LeakViewGeometry } from "../scene/leak-view";
import { LeakViewActions } from "./LeakViewActions";
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
import type { FixtureCrossing, CrossingViewCommand } from "../fixture-crossing";
import { CrossingGeometry } from "../scene/fixture-crossing";
import {
  focusedPowerScene,
  powerViewPoints,
  type PowerViewCommand,
} from "../power-view";
import { PowerViewActions } from "./PowerViewActions";
import type { NetworkViewCommand } from "../network-view";
import { NetworkViewActions } from "./NetworkViewActions";
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
import {
  airflowEndpointObject,
  type AirflowInspection,
} from "../airflow-inspection";
import { pduInspectionScene, type PduInspection } from "../pdu-outlets";
import { airflowStage } from "../airflow-stage";
import { airflowViews, type AirflowView } from "../airflow-view";
import { ModelLoadNotice } from "./ModelLoadNotice";
import { initialModelLoads, type ModelAssetId } from "../model-loading";
import { TemperatureDisclosure } from "./TemperatureDisclosure";
import { SliceDeviceContext } from "./SliceDeviceContext";
import { SliceInputPreview } from "./SliceInputPreview";
import { fixtureById, roomFacilityById } from "../fixtures";
import type { Dispatch, SetStateAction, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { entityById, type AppState } from "../domain";
import type { PresentationPhase, SceneFeedback } from "../mechanics";
import { SceneEngine } from "../scene/engine";
import type { View } from "../scene/engine";
import { devices, racks, rackForDevice } from "../installation";
import type { SpatialReading } from "../spatial";
import type { ReviewLayer } from "../review-model";
import { reviewPresentation } from "../review-model";
import { partsForDevice, subpartsForDevice, modelForDevice } from "../catalog";
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
  airflowSnapshot,
  airflowVisualTime,
  type AirflowRoute,
} from "../airflow";
import { AirflowGeometry } from "../scene/airflow";
import { observeLabelLayout } from "../scene/label-layout";
import {
  maintenanceAreas,
  reserveGapText,
  type MaintenanceAisle,
} from "../maintenance";
import { MaintenanceGeometry } from "../scene/maintenance";
import { powerScene } from "../power-paths";
import { PowerGeometry } from "../scene/power";
import { pduById } from "../power-config";
import { networkMarkers, networkLinkById } from "../network";
import { NetworkGeometry } from "../scene/network";

export function ReviewScene({
  state,
  unitRange = null,
  isolatedPartId = null,
  sliceViewCommand,
  onSliceViewChange,
  sliceInspection,
  onInspectSlice,
  onInspectBudget,
  sliceControls,
  setSliceControls,
  layer,
  readings,
  selectedId,
  airflowVisit,
  airflowResponseActive,
  onCompareAirflow,
  onPreviewAirflowEndpoint,
  onReturnAirflowEndpoint,
  onLocateAirflowEndpoint,
  aisle,
  networkLinkId = null,
  environmentPair,
  environmentPairMetric,
  environmentView,
  environmentViewCommand,
  onEnvironmentViewChange,
  onEnvironmentView,
  onReturnEnvironmentPair,
  maintenanceView,
  maintenanceReturnRevision,
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
  environmentPair: EnvironmentPair | null;
  environmentPairMetric: EnvironmentMetric;
  environmentView: EnvironmentInspection | null;
  environmentViewCommand: EnvironmentViewCommand | null;
  onEnvironmentViewChange: (inspection: EnvironmentInspection | null) => void;
  onEnvironmentView: (action: EnvironmentViewCommand["action"]) => void;
  onReturnEnvironmentPair: () => void;
  maintenanceView: MaintenanceInspection | null;
  maintenanceReturnRevision: number;
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
  onPowerViewChange: (active: boolean) => void;
  onPowerView: (action: PowerViewCommand["action"]) => void;
  networkViewCommand: NetworkViewCommand | null;
  networkViewActive: boolean;
  onNetworkViewChange: (active: boolean) => void;
  onNetworkView: (action: NetworkViewCommand["action"]) => void;
  sliceViewCommand: SliceViewCommand | null;
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
  isolatedPartId?: string | null;
  sliceControls: SliceControls;
  setSliceControls: Dispatch<SetStateAction<SliceControls>>;
  layer: ReviewLayer;
  readings: Map<string, SpatialReading>;
  selectedId: string;
  airflowVisit: AirflowInspection | null;
  airflowResponseActive: boolean;
  onCompareAirflow: (route: AirflowRoute, preserveView: () => void) => void;
  onPreviewAirflowEndpoint: (route: AirflowRoute, id: string) => void;
  onReturnAirflowEndpoint: () => void;
  onLocateAirflowEndpoint: (id: string) => void;
  aisle?: MaintenanceAisle;
  networkLinkId?: string | null;
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
  const dataGeometry = useRef<ReviewDataGeometry | null>(null);
  const sliceEvidenceGeometry = useRef<SliceEvidenceGeometry | null>(null);
  const sliceGeometry = useRef<TemperatureSliceGeometry | null>(null);
  const airflowGeometry = useRef<AirflowGeometry | null>(null);
  const maintenanceGeometry = useRef<MaintenanceGeometry | null>(null);
  const powerGeometry = useRef<PowerGeometry | null>(null);
  const environmentGeometry = useRef<EnvironmentViewGeometry | null>(null);
  const environmentEntry = useRef<HTMLElement | null>(null);
  const environmentEntryArea = useRef(".environment-pair-analysis");
  const environmentReturning = useRef(false);
  const entranceGeometry = useRef<EntranceViewGeometry | null>(null);
  const entranceEntry = useRef<HTMLElement | null>(null);
  const entranceReturning = useRef(false);
  const entranceFocusTarget = useRef<string | null>(null);
  const leakGeometry = useRef<LeakViewGeometry | null>(null);
  const leakEntry = useRef<HTMLElement | null>(null);
  const leakReturning = useRef(false);
  const leakFocusTarget = useRef<string | null>(null);
  const crossingGeometry = useRef<CrossingGeometry | null>(null);
  const networkGeometry = useRef<NetworkGeometry | null>(null);
  const clockEpoch = useRef(performance.now());
  const previousScene = useRef(state);
  const currentState = useRef(state);
  currentState.current = state;
  const callbacks = useRef({
    onSelect,
    onPhase,
    onFeedback,
    onSliceViewChange,
    onPowerViewChange,
    onMaintenanceViewChange,
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
    onSliceViewChange,
    onPowerViewChange,
    onMaintenanceViewChange,
    onEnvironmentViewChange,
    onEntranceViewChange,
    onLeakViewChange,
    onCrossingChange,
    onNetworkViewChange,
  };
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [assets, setAssets] = useState(initialModelLoads);
  const [sceneSettled, setSceneSettled] = useState(false);
  const [roomViewSaved, setRoomViewSaved] = useState(false);
  const [flowView, setFlowView] = useState<AirflowView | null>(null);
  const latestFlowView = useRef(flowView);
  latestFlowView.current = flowView;
  const [flowSlice, setFlowSlice] = useState(false);
  const temperatureTools = useRef<HTMLDetailsElement>(null);
  const flowControlsRef = useRef<HTMLDivElement>(null);
  const flowFocus = useRef<"observation" | "entry" | null>(null);
  useEffect(() => {
    if (flowFocus.current === "observation" && flowView) {
      flowControlsRef.current
        ?.querySelector<HTMLButtonElement>("[aria-pressed='true']")
        ?.focus({ preventScroll: true });
    } else if (flowFocus.current === "entry" && !flowView) {
      temperatureTools.current
        ?.querySelector<HTMLElement>(".review-flow-explanation > summary")
        ?.focus({ preventScroll: true });
    }
    flowFocus.current = null;
  }, [flowView]);

  const stage = airflowStage(flowView);
  const sliceVisible = !flowView || flowSlice;
  const [view, setView] = useState<View>("interior");
  const [quality, setQuality] = useState(true);
  const [supported, setSupported] = useState(false);
  const [orbit, setOrbit] = useState(false);
  const [cutaway, setCutaway] = useState(true);
  const [moreLabels, setMoreLabels] = useState(false);
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
      layer === "environment" && state.level === "room" && !ambientSelected
        ? sliceControls.orientation === "horizontal"
          ? temperatureSlice(readings, sliceControls.height)
          : verticalTemperatureSlice(
              readings,
              sliceControls.rowId,
              sliceControls.distance,
            )
        : null,
    [readings, sliceControls, layer, state.level, ambientSelected],
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
    () => focusedPowerScene(supplyBase, powerViewActive),
    [supplyBase, powerViewActive],
  );
  const network = useMemo(
    () =>
      isolatedPartId ? [] : networkMarkers(state, selectedId, networkLinkId),
    [
      state.level,
      state.deviceId,
      state.trayExtended,
      selectedId,
      networkLinkId,
      isolatedPartId,
    ],
  );
  const networkLink = networkLinkById(networkLinkId);
  const availableAisle = networkLinkId ? undefined : aisle;
  const [comparedId, setComparedId] = useState<string | null>(null);
  useEffect(() => setComparedId(null), [availableAisle?.id, shotRevision]);
  const comparison = maintenanceView
    ? maintenanceView.aisle
    : availableAisle?.id === comparedId
      ? availableAisle
      : undefined;
  const maintenance = useMemo(
    () =>
      layer === "overview" && state.level === "room" && !networkLinkId
        ? maintenanceView
          ? maintenanceView.areas
          : comparison
            ? [comparison.front, comparison.rear]
            : maintenanceAreas(selectedId)
        : [],
    [
      layer,
      state.level,
      selectedId,
      networkLinkId,
      comparison,
      maintenanceView,
    ],
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
  const airflow = useMemo(
    () =>
      layer === "environment" && state.level === "room" && !ambientSelected
        ? airflowSnapshot(
            state.time,
            readings,
            airflowVisit?.deviceId ?? selectedId,
            state.deviceId,
            slice?.rowId,
          )
        : null,
    [
      layer,
      state.level,
      state.time,
      state.deviceId,
      readings,
      selectedId,
      airflowVisit?.deviceId,
      ambientSelected,
      slice?.rowId,
    ],
  );
  const visibleAirflow = sliceInspection ? null : airflow;
  const airflowResponseControl = visibleAirflow?.routes[0] && (
    <button
      data-airflow-response-entry
      disabled={!sceneSettled || airflowResponseActive}
      onClick={() => {
        const toolsOpen = temperatureTools.current?.open ?? false;
        const preserve = () => {
          // 近景由分段观察适配新画幅；普通浏览只保留当前镜头。
          if (!latestFlowView.current) engine.current?.preservePanelView();
        };
        preserve();
        if (temperatureTools.current) temperatureTools.current.open = false;
        onCompareAirflow(visibleAirflow.routes[0], () => {
          preserve();
          if (temperatureTools.current)
            temperatureTools.current.open = toolsOpen;
        });
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
        setError,
        (phase) => callbacks.current.onPhase(phase),
        (feedback) => {
          setSceneSettled(feedback.settled);
          callbacks.current.onFeedback(feedback);
        },
      );
      active.autoOrbit = false;
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
        callbacks.current.onMaintenanceViewChange(inspection);
        if (inspection) setView(active!.currentView);
      };
      callbacks.current.onMaintenanceViewChange(null);
      active.onEnvironmentView = (inspection) => {
        callbacks.current.onEnvironmentViewChange(inspection);
        environmentLines.update(inspection);
        setView(active!.currentView);
      };
      callbacks.current.onEnvironmentViewChange(null);
      active.onEntranceView = (inspection) => {
        callbacks.current.onEntranceViewChange(inspection);
        entranceLines.update(inspection);
        setView(active!.currentView);
      };
      callbacks.current.onEntranceViewChange(null);
      active.onLeakView = (inspection) => {
        callbacks.current.onLeakViewChange(inspection);
        leakLines.update(inspection);
        setView(active!.currentView);
      };
      callbacks.current.onLeakViewChange(null);
      active.onCrossingView = (pair) => {
        callbacks.current.onCrossingChange(pair);
        crossingLines.update(pair);
        setView(active!.currentView);
      };
      callbacks.current.onCrossingChange(null);
      active.onPowerView = (observing) => {
        callbacks.current.onPowerViewChange(observing);
        setView(active!.currentView);
      };
      callbacks.current.onPowerViewChange(false);
      active.onNetworkView = (observing) => {
        callbacks.current.onNetworkViewChange(observing);
        setView(active!.currentView);
      };
      callbacks.current.onNetworkViewChange(false);
      active.onSliceView = (observing) => {
        callbacks.current.onSliceViewChange(observing);
        setView(active!.currentView);
      };
      callbacks.current.onSliceViewChange(false);
      active.onAirflowView = (next) => {
        setFlowView(next);
        if (!next) setFlowSlice(false);
        setView(active!.currentView);
      };
      setFlowView(null);
      setFlowSlice(false);
      active.onRoomViewMemory = setRoomViewSaved;
      setRoomViewSaved(false);
      active.onAssets = setAssets;
      setAssets({ ...active.assetLoader.state });
      engine.current = active;
      setSupported(active.pipeline.available);
    } catch {
      active?.dispose();
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
    if (engine.current) engine.current.unitRange = unitRange;
  }, [unitRange, retry]);
  useEffect(() => {
    const active = engine.current;
    if (!active) return;
    active.isolatedPartId = isolatedPartId;
    if (
      !isolatedPartId &&
      state.level === "device" &&
      active.partInspection?.deviceId === state.deviceId
    )
      setView(active.partInspection.previous.view);
  }, [isolatedPartId, state.level, state.deviceId, retry]);
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
    const next = currentState.current.level === "room" ? "interior" : "iso";
    setSliceControls(initialSliceControls());
    engine.current?.view(next);
    setView(next);
  }, [shotRevision, retry, setSliceControls]);
  useEffect(() => {
    if (engine.current) {
      engine.current.telemetry.mode = presentation.mode;
      // 旧遥测关系线与新的布置路径分开，避免重复叠加。
      engine.current.telemetry.enabled = false;
      engine.current.telemetry.root.visible = false;
      engine.current.showLabels = true;
    }
  }, [presentation.mode, retry]);
  useEffect(() => {
    if (engine.current) engine.current.pipeline.enabled = quality;
  }, [quality, retry]);
  useEffect(() => {
    if (engine.current) {
      if (orbit) {
        engine.current.clearAirflowView();
        engine.current.clearSliceView();
        engine.current.clearNetworkView();
        engine.current.clearPowerView();
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
      ambientSelected ? [] : reviewSpatialMarks(state, layer, readings),
    );
  }, [state, layer, readings, retry, ambientSelected]);
  const maintenanceControls = useRef<HTMLDivElement>(null);
  const maintenanceFocus = useRef<"entry" | "view" | null>(null);
  const restoreMaintenance = () => {
    maintenanceFocus.current = "entry";
    engine.current?.restoreMaintenanceView();
    if (engine.current) setView(engine.current.currentView);
  };
  const observeMaintenance = (next: MaintenanceView) => {
    onTakeover();
    setOrbit(false);
    maintenanceFocus.current = "view";
    engine.current?.observeMaintenance(selectedId, next);
  };
  useEffect(() => {
    if (maintenanceReturnRevision) restoreMaintenance();
  }, [maintenanceReturnRevision]);
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
          : "[aria-pressed='true']";
      const button =
        maintenanceControls.current?.querySelector<HTMLButtonElement>(target);
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
  }, [maintenanceView, sceneSettled]);
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
    if (!active || !environmentViewCommand) return;
    if (environmentViewCommand.action === "return") {
      environmentReturning.current = !!environmentView;
      active.restoreEnvironmentView();
    } else if (environmentPair && layer === "environment") {
      if (!environmentView) {
        environmentEntry.current = document.activeElement as HTMLElement;
        environmentEntryArea.current = document.activeElement?.closest(
          ".environment-scene-key",
        )
          ? ".environment-scene-key"
          : ".environment-pair-analysis";
      }
      environmentReturning.current = false;
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
    if (environmentView || !environmentReturning.current) return;
    let frame = 0;
    const focus = () => {
      const workspace = host.current?.closest(".workspace-ui");
      const entry = environmentEntry.current?.isConnected
        ? environmentEntry.current
        : (workspace?.querySelector<HTMLElement>(
            `${environmentEntryArea.current} .environment-view-actions button`,
          ) ??
          workspace?.querySelector<HTMLElement>(
            ".environment-comparison-toggle",
          ) ??
          workspace?.querySelector<HTMLElement>(
            ".review-camera button, .review-camera select",
          ));
      if (
        engine.current?.moving ||
        (entry instanceof HTMLButtonElement && entry.disabled)
      ) {
        frame = requestAnimationFrame(focus);
        return;
      }
      entry?.focus({ preventScroll: true });
      environmentReturning.current = false;
    };
    frame = requestAnimationFrame(focus);
    return () => cancelAnimationFrame(frame);
  }, [environmentView, sceneSettled]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !entranceViewCommand) return;
    if (!entranceViewCommand.view) {
      entranceReturning.current = !!entranceView;
      active.restoreEntranceView();
    } else if (layer === "overview") {
      if (!entranceView)
        entranceEntry.current = document.activeElement as HTMLElement;
      entranceReturning.current = false;
      entranceFocusTarget.current = document.activeElement?.closest(
        ".entrance-scene-key",
      )
        ? ".entrance-scene-key"
        : ".entrance-view-details";
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
    if (!entranceView || !entranceFocusTarget.current) return;
    let frame = 0;
    const focus = () => {
      const button = host.current
        ?.closest(".workspace-ui")
        ?.querySelector<HTMLButtonElement>(
          `${entranceFocusTarget.current} button[aria-pressed="true"]`,
        );
      if (!button) {
        entranceFocusTarget.current = null;
        return;
      }
      if (engine.current?.moving || button.disabled) {
        frame = requestAnimationFrame(focus);
        return;
      }
      button.focus();
      entranceFocusTarget.current = null;
    };
    frame = requestAnimationFrame(focus);
    return () => cancelAnimationFrame(frame);
  }, [entranceView, sceneSettled]);
  useEffect(() => {
    if (entranceView || !entranceReturning.current) return;
    let frame = 0;
    const focus = () => {
      if (engine.current?.moving) {
        frame = requestAnimationFrame(focus);
        return;
      }
      const workspace = host.current?.closest(".workspace-ui");
      const entry = entranceEntry.current?.isConnected
        ? entranceEntry.current
        : (workspace?.querySelector<HTMLElement>(
            ".entrance-view-entry button",
          ) ??
          workspace?.querySelector<HTMLElement>(
            ".review-camera button, .review-camera select",
          ));
      if (entry instanceof HTMLButtonElement && entry.disabled) {
        frame = requestAnimationFrame(focus);
        return;
      }
      entry?.focus({ preventScroll: true });
      entranceReturning.current = false;
    };
    frame = requestAnimationFrame(focus);
    return () => cancelAnimationFrame(frame);
  }, [entranceView, sceneSettled]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !leakViewCommand) return;
    if (!leakViewCommand.view) {
      leakReturning.current = !!leakView;
      active.restoreLeakView();
    } else if (layer === "overview") {
      if (!leakView) leakEntry.current = document.activeElement as HTMLElement;
      leakReturning.current = false;
      leakFocusTarget.current = document.activeElement?.closest(
        ".leak-scene-key",
      )
        ? ".leak-scene-key"
        : ".leak-view-details";
      setOrbit(false);
      active.observeLeak(leakViewCommand.view);
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
    if (!leakView || !leakFocusTarget.current) return;
    let frame = 0;
    const focus = () => {
      const button = host.current
        ?.closest(".workspace-ui")
        ?.querySelector<HTMLButtonElement>(
          `${leakFocusTarget.current} button[aria-pressed="true"]`,
        );
      if (!button) {
        leakFocusTarget.current = null;
        return;
      }
      if (engine.current?.moving || button.disabled) {
        frame = requestAnimationFrame(focus);
        return;
      }
      button.focus();
      leakFocusTarget.current = null;
    };
    frame = requestAnimationFrame(focus);
    return () => cancelAnimationFrame(frame);
  }, [leakView, sceneSettled]);
  useEffect(() => {
    if (leakView || !leakReturning.current) return;
    let frame = 0;
    const focus = () => {
      if (engine.current?.moving) {
        frame = requestAnimationFrame(focus);
        return;
      }
      const workspace = host.current?.closest(".workspace-ui");
      const entry = leakEntry.current?.isConnected
        ? leakEntry.current
        : (workspace?.querySelector<HTMLElement>(".leak-view-entry button") ??
          workspace?.querySelector<HTMLElement>(".review-camera button"));
      if (entry instanceof HTMLButtonElement && entry.disabled) {
        frame = requestAnimationFrame(focus);
        return;
      }
      entry?.focus({ preventScroll: true });
      leakReturning.current = false;
    };
    frame = requestAnimationFrame(focus);
    return () => cancelAnimationFrame(frame);
  }, [leakView, sceneSettled]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !crossingCommand) return;
    if (!crossingCommand.pair) active.restoreCrossingView();
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
        ![crossing.light.id, crossing.tray.id].includes(selectedId))
    )
      engine.current?.clearCrossingView();
  }, [crossing, layer, state.level, selectedId]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !powerViewCommand) return;
    if (powerViewCommand.action === "return") active.restorePowerView();
    else if (layer === "power") {
      setOrbit(false);
      active.observePower(selectedId, powerLinkId);
    }
    setView(active.currentView);
  }, [powerViewCommand?.revision]);
  useEffect(() => {
    engine.current?.updatePowerView(
      selectedId,
      layer === "power" && !isolatedPartId ? powerLinkId : null,
    );
  }, [supply, layer, selectedId, isolatedPartId, shotRevision, retry]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !networkViewCommand) return;
    if (networkViewCommand.action === "return") active.restoreNetworkView();
    else if (layer === "overview") {
      setOrbit(false);
      active.observeNetwork(selectedId, networkLinkId);
    }
    setView(active.currentView);
  }, [networkViewCommand?.revision]);
  useEffect(() => {
    engine.current?.updateNetworkView(
      selectedId,
      layer === "overview" && !isolatedPartId ? networkLinkId : null,
    );
  }, [network, layer, selectedId, isolatedPartId, shotRevision, retry]);
  useEffect(() => {
    const active = engine.current;
    if (!active || !sliceViewCommand) return;
    if (sliceViewCommand.action === "return") active.restoreSliceView();
    else if (sliceInspection?.context && slice && sliceVisible) {
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
    powerGeometry.current?.update(supply);
  }, [supply, retry]);
  useEffect(() => {
    networkGeometry.current?.update(network);
  }, [network, retry]);
  useEffect(() => {
    if (engine.current) engine.current.shellCutaway.enabled = cutaway;
  }, [cutaway, retry]);
  // 外部图形、画质和显示选项在本次提交的 effect 中更新；统一使下一帧失效。
  useEffect(() => {
    engine.current?.invalidate();
  });
  const scope = readings.get(
    state.level === "room" ? "room-01" : rackForDevice(state.deviceId).id,
  )!;
  const candidates: { id: string; name: string }[] =
    state.level === "room"
      ? sliceRow
        ? racks.filter((rack) => sliceRow.rackIds.includes(rack.id))
        : racks
      : state.level === "rack"
        ? devices.filter((d) => d.rackId === rackForDevice(state.deviceId).id)
        : [
            ...partsForDevice(state.deviceId).filter(
              (p) =>
                p.id === selectedId ||
                !["lid", "duct", "cable"].includes(p.node),
            ),
            ...subpartsForDevice(state.deviceId).filter(
              (p) => p.id === selectedId,
            ),
          ];
  const labels = sceneLabels(
    ambientSelected || !sliceVisible ? [] : candidates,
    readings,
    {
      level: state.level,
      layer,
      selectedId,
      more: moreLabels,
      estimates: slice?.rackEstimates,
      hasPath: !!airflow || !!supply || network.length > 0,
      annotatedIds: [
        ...network.map((marker) => marker.partId ?? marker.deviceId),
        ...(supply?.labels.flatMap((label) =>
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
  const labelKey =
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
    (supply?.labels.map((label) => label.id).join(":") ?? "") +
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
  }, [shotRevision, retry]);
  const camera = (next: View) => {
    onTakeover();
    setOrbit(false);
    setView(next);
    const framePair = next === "top" && !!comparison;
    engine.current?.view(next, framePair);
    if (framePair && matchMedia("(max-width: 600px)").matches)
      host.current
        ?.closest(".study-stage")
        ?.scrollIntoView({ block: "nearest" });
  };
  const returnFlowView = () => {
    onTakeover();
    flowFocus.current = "entry";
    if (temperatureTools.current) {
      temperatureTools.current.open = true;
      const disclosure =
        temperatureTools.current.querySelector<HTMLDetailsElement>(
          ".review-flow-explanation",
        );
      if (disclosure) disclosure.open = true;
    }
    engine.current?.restoreAirflowView();
  };
  const flowControls = (
    <>
      {visibleAirflow?.routes[0] && (
        <div
          className="airflow-view-actions"
          ref={flowControlsRef}
          aria-label="气流观察视角"
        >
          {airflowViews.map((item) => (
            <button
              key={item.id}
              aria-pressed={flowView === item.id}
              onClick={() => {
                onTakeover();
                setOrbit(false);
                if (!flowView) {
                  flowFocus.current = "observation";
                  if (temperatureTools.current)
                    temperatureTools.current.open = false;
                }
                engine.current?.observeAirflow(
                  visibleAirflow.routes[0],
                  item.id,
                );
              }}
            >
              {item.name}
            </button>
          ))}
          {flowView && (
            <button
              className="airflow-view-return"
              title="返回观察前镜头（Esc）"
              onClick={returnFlowView}
            >
              返回原视角
            </button>
          )}
        </div>
      )}
      {flowView && visibleAirflow?.routes[0] && (
        <div className="airflow-stage-reading" aria-label="当前气流观察段">
          <strong aria-live="polite">
            {stage?.title ?? "全路径 · 送风到回风"}
          </strong>
          <span>{stage?.direction ?? "送风 → 格栅 → 设备 → 回风假设"}</span>
          <small>
            {entityById(visibleAirflow.routes[0].deviceId)?.name} ·{" "}
            {visibleAirflow.routes[0].status} · t+
            {state.time}s
          </small>
          <p>
            {stage?.boundary ??
              "同一条配置代表支路；送风连续、回风分段，箭头表示假设方向。"}
          </p>
          <label>
            <input
              type="checkbox"
              checked={flowSlice}
              onChange={(event) => {
                onTakeover();
                setFlowSlice(event.target.checked);
              }}
            />
            叠加进风切片
          </label>
        </div>
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
      data-airflow-stage={stage?.kind ?? ""}
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
      data-environment-view={!!environmentView}
      data-power-rack={supply?.rackId}
      data-power-device={supply?.deviceId}
      data-power-trace={supply?.traceId ?? undefined}
      data-environment-probe={ambient?.id}
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
              <div>
                <span className="flow-supply">→ 送风</span>
                <span className="flow-through">⇢ 穿柜</span>
                <span className="flow-return">⇢ 回风假设</span>
              </div>
              <small>{visibleAirflow.label}</small>
            </div>
          )}
          <details className="review-view-explanation">
            <summary>读图说明</summary>
            <p>
              {ambientSelected
                ? "固定探头的环境温湿度，只代表安装位置；与设备进风分开，不生成整间机房温湿度场。选择返回设备进风可继续核对切片与气流。"
                : slice
                  ? `${slice.orientation === "horizontal" ? "水平切片估计当前高度的进风温度。" : `垂直切片显示${sliceRow!.name}正面 ${sliceSettings.height.min.toFixed(2)}–${sliceSettings.height.max.toFixed(2)} 米高度的进风差异，滑杆调整离柜距离；标签取切面纵向最高估计。俯视时切面呈侧边，可切到前视观察。`}色条仍对应逐台设备。输入为同一时间的有效模拟读数；代表位置按U位中心假设，非独立环境测点。最近位置离线、过期或超出插值范围时留空；不推断机柜排风或整间机房温度。`
                  : presentation.description}
              {visibleAirflow &&
                " 气流只示意已登记冷却关系的代表路径，当前同向布置不构成封闭冷热通道。端点为制冷单元逻辑代表位置，穿柜方向为配置假设；线条明暗对照冷却输入，不代表风量、风速或排风温度。选中对象可查看对应路径，停机或数据无效对象仅保留静态方向。"}
            </p>
          </details>
        </div>
        <div className="review-anchors" ref={anchors}>
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
              data-anchor-part={marker.partId}
              data-anchor-kind={marker.partId ? "part-position" : "position"}
              data-anchor-level={state.level}
              data-anchor-position={marker.point?.join(",")}
              className="review-flow-anchor review-network-anchor"
            >
              <b>{marker.title}</b>
            </div>
          ))}
          {supply?.labels.map((label) => (
            <div
              key={label.id}
              hidden
              aria-hidden="true"
              data-anchor={label.id}
              data-anchor-part={label.partId}
              data-anchor-kind={label.partId ? "power-part" : "position"}
              data-anchor-level={state.level}
              data-anchor-position={label.point?.join(",")}
              className={`review-flow-anchor review-power-anchor ${supply?.traceId ? "is-traced" : ""}`}
            >
              <b>{label.title}</b>
              {!supply?.traceId && label.kind !== "outlet" && (
                <small>{label.detail}</small>
              )}
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
              .filter(
                (endpoint) => !stage || stage.endpoints.includes(endpoint.kind),
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
                  <b>{endpoint.label}</b>
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
            return (
              <button
                hidden
                key={item.id}
                data-anchor={item.id}
                data-anchor-kind={
                  state.level === "room"
                    ? "rack"
                    : state.level === "rack"
                      ? "device"
                      : "part"
                }
                className={`review-anchor ${item.id === state.selected ? "selected" : ""}`}
                onClick={() => onSelect(item.id)}
                onDoubleClick={() => onSelect(item.id, true)}
              >
                <b>
                  {state.level === "device"
                    ? item.name
                    : item.name.split(" ")[0]}
                </b>
                {layer !== "overview" && layer !== "alarms" && (
                  <span>
                    {reading.quality !== "valid"
                      ? reading.quality === "stale"
                        ? "数据过期"
                        : "无有效数据"
                      : layer === "environment"
                        ? slice
                          ? slice.rackEstimates.get(item.id) == null
                            ? slice.orientation === "horizontal"
                              ? "本层无估计"
                              : "切面无估计"
                            : `${slice.orientation === "horizontal" ? "本层约" : "切面最高约"} ${slice.rackEstimates.get(item.id)!.toFixed(1)} °C`
                          : reading.temperature === null
                            ? "—"
                            : `${reading.count > 1 ? "最高 " : ""}${reading.temperature.toFixed(1)} °C`
                        : reading.power === null
                          ? "—"
                          : reading.power >= 1000
                            ? `${(reading.power / 1000).toFixed(2)} kW`
                            : `${reading.power.toFixed(0)} W`}
                  </span>
                )}
                {layer === "power" &&
                  reading.quality === "valid" &&
                  reading.power !== null &&
                  reading.budget !== null &&
                  reading.budget > 0 && (
                    <em>
                      {((reading.power / reading.budget) * 100).toFixed(0)}%
                      {reading.count > 1 ? "有效设备预算" : "预算"}
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
        {(entranceView ||
          leakView ||
          crossing ||
          selectedFixture ||
          airflow ||
          maintenance.length > 0 ||
          supply ||
          network.length > 0 ||
          labels.some((item) => item.id === selectedId)) && (
          <svg className="review-flow-lines" aria-hidden="true" ref={flowLines}>
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
              .filter((item) => item.id === selectedId)
              .map((item) => (
                <line key={item.id} data-flow-line={item.id} />
              ))}
            {areaLabels.map((area) => (
              <line key={area.id} data-flow-line={area.id} />
            ))}
            {supply?.labels.map((label) => (
              <line key={label.id} data-flow-line={label.id} />
            ))}
            {network.map((marker) => (
              <line key={marker.id} data-flow-line={marker.id} />
            ))}
            {visibleAirflow?.routes.flatMap((route) =>
              route.endpoints
                .filter(
                  (endpoint) =>
                    !stage || stage.endpoints.includes(endpoint.kind),
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
          className={`review-legend ${slice ? "review-slice-legend" : ""}`}
          aria-label="当前图层图例"
          data-flow-observation={!!flowView}
          data-slice-visible={sliceVisible}
        >
          {entranceView && (
            <EntranceViewActions
              inspection={entranceView}
              ready={sceneSettled}
              onView={onEntranceView}
            />
          )}
          {leakView && (
            <LeakViewActions
              inspection={leakView}
              ready={sceneSettled}
              onView={onLeakView}
            />
          )}
          {crossing && (
            <div className="crossing-scene-key">
              <strong>交叉高度核对</strong>
              <span>
                表面高差 {Math.abs(crossing.difference).toFixed(2)} m · 配置
              </span>
              <button disabled={!sceneSettled} onClick={onReturnCrossing}>
                ← 返回核对前视角
              </button>
            </div>
          )}
          {network.length > 0 && networkLink && (
            <div className="network-scene-key">
              <strong>网络接入 · {networkLink.speedGbps} Gb/s 配置</strong>
              <small>
                {state.level === "device"
                  ? "所属部件示意 · 非物理端口定位"
                  : "设备代表位置 · 非物理端口定位"}
              </small>
              {network.length === 2 &&
                network.every((marker) => marker.point) && (
                  <NetworkViewActions
                    active={networkViewActive}
                    ready={sceneSettled}
                    onObserve={() => onNetworkView("observe")}
                    onReturn={() => onNetworkView("return")}
                  />
                )}
              <button onClick={onClearNetwork} aria-label="关闭网络端点标记">
                ×
              </button>
            </div>
          )}
          {layer === "overview" ? (
            maintenance.length > 0 ? (
              <div className="review-status-key aisle-legend">
                <div
                  className="maintenance-view-controls"
                  ref={maintenanceControls}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && maintenanceView) {
                      event.preventDefault();
                      event.stopPropagation();
                      restoreMaintenance();
                    }
                  }}
                >
                  {maintenanceView ? (
                    <>
                      <strong>维护范围观察</strong>
                      <div
                        className="aisle-actions"
                        role="group"
                        aria-label="维护范围观察方式"
                      >
                        {maintenanceViews
                          .filter(
                            (item) => item.id !== "aisle" || availableAisle,
                          )
                          .map((item) => (
                            <button
                              key={item.id}
                              disabled={!sceneSettled}
                              aria-pressed={maintenanceView.view === item.id}
                              onClick={() => observeMaintenance(item.id)}
                            >
                              {item.name}
                            </button>
                          ))}
                      </div>
                      <button
                        disabled={!sceneSettled}
                        onClick={restoreMaintenance}
                      >
                        ← 返回范围观察前视角
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="aisle-actions">
                        <button
                          data-maintenance-entry
                          disabled={!sceneSettled}
                          onClick={() => observeMaintenance("front")}
                        >
                          观察柜前范围
                        </button>
                        <button
                          disabled={!sceneSettled}
                          onClick={() => observeMaintenance("rear")}
                        >
                          观察柜后范围
                        </button>
                      </div>
                      <div className="aisle-actions">
                        {availableAisle && (
                          <button
                            aria-pressed={!!comparison}
                            onClick={() => {
                              onTakeover();
                              setComparedId(
                                comparison ? null : availableAisle.id,
                              );
                            }}
                          >
                            {comparison ? "退出通道对照" : "对照排间通道"}
                          </button>
                        )}
                        {comparison && (
                          <button
                            disabled={!sceneSettled}
                            onClick={() => observeMaintenance("aisle")}
                          >
                            俯看两柜
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {comparison && (
                  <strong>
                    柜面间距 {comparison.faceDistance.toFixed(2)} m ·{" "}
                    {reserveGapText(comparison.gap)}
                  </strong>
                )}
                <small>通道预留示意 · 非实测净距</small>
              </div>
            ) : state.level === "device" && model.category !== "server" ? (
              <div className="review-status-key">
                <small>{representation}</small>
              </div>
            ) : null
          ) : layer === "alarms" ? (
            <div className="review-status-key">
              {state.level === "device" ? (
                <small>设备告警见详情 · 部件不独立告警</small>
              ) : (
                <>
                  <span className="legend-warning">▲ 预警</span>
                  <span className="legend-critical">◆ 严重</span>
                </>
              )}
            </div>
          ) : ambientSelected ? (
            <div className="environment-scene-key">
              <strong>
                {environmentPair
                  ? `双测点${trendMetricNames[environmentPairMetric]} · 模拟`
                  : "环境测点 · 模拟"}
              </strong>
              {environmentPair ? (
                <>
                  <small>① 起点 · 实线 / ② 对照 · 虚线</small>
                  <EnvironmentViewActions
                    inspection={environmentView}
                    ready={sceneSettled}
                    available={state.level === "room"}
                    onObserve={() => onEnvironmentView("observe")}
                    onReturn={() => onEnvironmentView("return")}
                  />
                  {environmentView && (
                    <small>竖线为各自高度参考，不是探测覆盖。</small>
                  )}
                  <button onClick={onReturnEnvironmentPair}>
                    ← 返回起点测点
                  </button>
                </>
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
              {!sliceVisible && (
                <div className="airflow-observation-heading">
                  <strong>气流分段观察</strong>
                  <small>进风切片已暂收 · 返回原视角时恢复</small>
                </div>
              )}
              {sliceVisible && (
                <>
                  <span className={slice ? "review-slice-heading" : undefined}>
                    {slice ? (
                      <>
                        <span>进风温度</span>
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
                        {slice.orientation === "vertical" && (
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
                    ) : (
                      <>
                        {layer === "environment"
                          ? state.level === "device"
                            ? "表面温度 · °C · 模型推导"
                            : "U 位色条 · 设备进风温度"
                          : state.level === "device"
                            ? "部件功耗 / 模型预算占比"
                            : "机柜标尺 · 有效输入 / 对应设备预算"}
                      </>
                    )}
                  </span>
                  <i className={`review-scale ${layer}`} />
                  <div>
                    <span>{layer === "environment" ? "20 °C" : "0%"}</span>
                    <span>
                      {layer === "environment"
                        ? state.level === "device"
                          ? "80 °C"
                          : "45 °C"
                        : "100%"}
                    </span>
                  </div>
                  {layer === "environment" && (
                    <small>
                      {slice
                        ? slice.orientation === "horizontal"
                          ? "局部插值示意 · 空白无估计"
                          : `高 ${sliceSettings.height.min.toFixed(2)}–${sliceSettings.height.max.toFixed(2)} m · 插值示意 · 空白无估计`
                        : "蓝色低温 → 暖色高温"}
                    </small>
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
                  {flowView && visibleAirflow && (
                    <div
                      className="airflow-observation-controls"
                      aria-label="气流观察操作"
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.preventDefault();
                          event.stopPropagation();
                          returnFlowView();
                        }
                      }}
                    >
                      {flowControls}
                      {airflowResponseControl}
                    </div>
                  )}
                  {airflowVisit && (
                    <div className="airflow-inspection-return">
                      <span>
                        核对 · {entityById(airflowVisit.deviceId)?.name}{" "}
                      </span>
                      <button
                        onClick={() => {
                          if (temperatureTools.current)
                            temperatureTools.current.open = true;
                          temperatureTools.current
                            ?.querySelector<HTMLElement>(
                              ".review-flow-explanation > summary",
                            )
                            ?.focus({ preventScroll: true });
                          engine.current?.preservePanelView();
                          onReturnAirflowEndpoint();
                        }}
                      >
                        ← 返回原对象
                      </button>
                      <small>
                        原对象：
                        {entityById(airflowVisit.originId)?.name}
                      </small>
                    </div>
                  )}
                  <TemperatureDisclosure
                    key={shotRevision}
                    detailsRef={temperatureTools}
                    className="temperature-tools"
                    name="temperature-tools"
                    summary="观察与核对 · 设备 / 环境 / 气流"
                    reveal={!!airflowVisit || !!sliceInspection}
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
                    {visibleAirflow && (
                      <TemperatureDisclosure
                        className="review-flow-explanation"
                        onInteract={onTakeover}
                        summary={
                          <>
                            气流路径 ·{" "}
                            {stage
                              ? stage.title.split(" · ")[1]
                              : airflowVisit
                                ? "端点核对"
                                : visibleAirflow.routes[0]?.animated
                                  ? "代表支路"
                                  : "静态示意"}
                          </>
                        }
                      >
                        <p>{visibleAirflow.label}</p>
                        {!flowView && (
                          <p>选择一段近看；旋转或定位会结束观察。</p>
                        )}
                        {airflowVisit && (
                          <p>预览保留本支路；定位结束核对，转为对象观察。</p>
                        )}
                        {!flowView && flowControls}
                        {!flowView && airflowResponseControl}
                        <TemperatureDisclosure
                          className="airflow-endpoints"
                          name="airflow-detail"
                          summary="端点与读数 · 4 处"
                          onInteract={onTakeover}
                        >
                          <ol aria-label="气流端点与读数">
                            {visibleAirflow.routes.flatMap((route) =>
                              route.endpoints.map((endpoint) => {
                                const object = airflowEndpointObject(
                                  route,
                                  endpoint.kind,
                                );
                                return (
                                  <li key={`${route.id}-${endpoint.kind}`}>
                                    <b>{endpoint.title}</b>
                                    <span>{endpoint.detail}</span>
                                    <div className="airflow-endpoint-actions">
                                      <button
                                        disabled={selectedId === object.id}
                                        onClick={() => {
                                          engine.current?.preservePanelView();
                                          onPreviewAirflowEndpoint(
                                            route,
                                            object.id,
                                          );
                                        }}
                                      >
                                        预览{object.name}
                                      </button>
                                      {endpoint.kind !== "return" && (
                                        <button
                                          onClick={() =>
                                            onLocateAirflowEndpoint(object.id)
                                          }
                                        >
                                          {object.locate}
                                        </button>
                                      )}
                                    </div>
                                  </li>
                                );
                              }),
                            )}
                          </ol>
                        </TemperatureDisclosure>
                        <TemperatureDisclosure
                          className="airflow-boundary"
                          name="airflow-detail"
                          summary="布置假设与数据边界"
                          onInteract={onTakeover}
                        >
                          <p>
                            当前机柜同向，假设前进后出。柜面细框按设备安装 U
                            位标出前后代表范围，柜外箭头表示方向；被柜体遮挡的路径不透视显示，可切换前/后视或旋转观察。细框不是实际风口。送风沿低位侧通道至柜前格栅，再穿柜并从上方回到制冷单元；未建立架空地板风腔或封闭冷热通道。端点均为代表位置，线宽和脉冲速度不表示风量或风速。暂停可读方向；停机、维护或观测无效时仅保留灰色静态路径。
                          </p>
                        </TemperatureDisclosure>
                      </TemperatureDisclosure>
                    )}
                  </TemperatureDisclosure>
                </div>
              )}
              {layer === "power" && (
                <>
                  <small>灰色：数据或预算未定义</small>
                  {onInspectBudget && (
                    <button
                      className="power-budget-entry"
                      onClick={() => {
                        engine.current?.preservePanelView();
                        onInspectBudget();
                      }}
                    >
                      核对所查范围功耗预算 ↗
                    </button>
                  )}
                </>
              )}
              {layer === "power" && supply && (
                <div className="power-scene-key" aria-label="供电路径示意">
                  <strong>{supply.caption}</strong>
                  {powerViewPoints(state, selectedId, supply.traceId).length ===
                    2 && (
                    <PowerViewActions
                      active={powerViewActive}
                      ready={sceneSettled}
                      onObserve={() => onPowerView("observe")}
                      onReturn={() => onPowerView("return")}
                    />
                  )}
                  {powerViewActive && (
                    <small>柜后同框 · 插座至设备输入代表位置</small>
                  )}
                  {(supply.traceId ||
                    (!supply.paths.length && state.level !== "device")) && (
                    <button onClick={onClearPower}>
                      {supply.traceId ? "结束追踪" : "清除插座标记"}
                    </button>
                  )}
                  {!supply.traceId && (
                    <span>
                      {state.level === "device"
                        ? "A/B 配置端点"
                        : supply.paths.length
                          ? "A 实线 · B 分段"
                          : "仅标记未连接位置"}{" "}
                      · 静态示意
                    </span>
                  )}
                  <small>
                    {powerViewActive && state.level === "room"
                      ? "本柜后侧观察剖切 · "
                      : state.level === "rack"
                        ? state.rearDoorOpen
                          ? "后立柱观察剖切 · "
                          : "后侧观察剖切 · "
                        : ""}
                    {supply.traceId
                      ? "配置支路 · 未计量"
                      : supply.paths.length
                        ? "支路未计量 · 不推断独立上游"
                        : "无配置对端 · 不代表可用容量"}
                  </small>
                </div>
              )}
            </>
          )}
        </div>
        {error && (
          <div className="review-error" role="alert">
            <h2>场景暂不可用</h2>
            <p>{error}</p>
            <button
              onClick={() => {
                setError("");
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
            <details>
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
                    checked={cutaway}
                    disabled={state.level !== "room"}
                    onChange={(e) => setCutaway(e.target.checked)}
                  />
                  自动建筑剖切
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
