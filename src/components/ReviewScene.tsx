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
import { placeFlowLabel } from "../airflow-label-layout";
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
  onPreviewAirflowEndpoint,
  onReturnAirflowEndpoint,
  onLocateAirflowEndpoint,
  aisle,
  networkLinkId = null,
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
  const initial = useRef(state);
  const dataGeometry = useRef<ReviewDataGeometry | null>(null);
  const sliceEvidenceGeometry = useRef<SliceEvidenceGeometry | null>(null);
  const sliceGeometry = useRef<TemperatureSliceGeometry | null>(null);
  const airflowGeometry = useRef<AirflowGeometry | null>(null);
  const maintenanceGeometry = useRef<MaintenanceGeometry | null>(null);
  const powerGeometry = useRef<PowerGeometry | null>(null);
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
    onNetworkViewChange,
  });
  callbacks.current = {
    onSelect,
    onPhase,
    onFeedback,
    onSliceViewChange,
    onNetworkViewChange,
  };
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [assets, setAssets] = useState(initialModelLoads);
  const [sceneSettled, setSceneSettled] = useState(false);
  const [roomViewSaved, setRoomViewSaved] = useState(false);
  const [flowView, setFlowView] = useState<AirflowView | null>(null);
  const [flowSlice, setFlowSlice] = useState(false);
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
  const supply = useMemo(
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
  const comparison =
    availableAisle?.id === comparedId ? availableAisle : undefined;
  const maintenance = useMemo(
    () =>
      layer === "overview" && state.level === "room" && !networkLinkId
        ? comparison
          ? [comparison.front, comparison.rear]
          : maintenanceAreas(selectedId)
        : [],
    [layer, state.level, selectedId, networkLinkId, comparison],
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
      if (active) active.paused = document.hidden;
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
    if (anchors.current) engine.current?.bindAnchors(anchors.current);
    // 投影先由引擎完成；按选择和异常优先级移除碰撞标签。
    let frame = 0;
    const declutter = () => {
      const sceneRect = host.current?.parentElement?.getBoundingClientRect();
      const accepted = [
        ...(host.current
          ?.closest(".review-workspace, .study-workspace")
          ?.querySelectorAll<HTMLElement>(
            ".review-scene-caption, .review-camera, .review-legend, .review-scene-tools, .review-scene-tools details[open] > div, .review-loading, .review-inspector:not([hidden]), .review-object-actions, .study-layer-control, .study-room-summary, .study-alert-caption, .study-show-detail",
          ) ?? []),
      ]
        .filter((element) => element.getClientRects().length)
        .map((element) => element.getBoundingClientRect());
      for (const label of anchors.current?.querySelectorAll<HTMLElement>(
        "[data-anchor]",
      ) ?? []) {
        label.style.visibility = "";
        const line = flowLines.current?.querySelector<SVGLineElement>(
          `[data-flow-line="${label.dataset.anchor}"]`,
        );
        if (line) line.style.visibility = "hidden";
        if (label.hidden) continue;
        if (
          (["position", "power-part", "part-position"].includes(
            label.dataset.anchorKind ?? "",
          ) ||
            label.classList.contains("selected")) &&
          sceneRect
        ) {
          const x = Number(label.dataset.screenX),
            y = Number(label.dataset.screenY);
          const rect = placeFlowLabel(
            x +
              sceneRect.left +
              (label.classList.contains("review-fixture-anchor") ? 56 : 0),
            y + sceneRect.top,
            label.offsetWidth,
            label.offsetHeight,
            sceneRect,
            accepted,
          );
          label.style.visibility = rect ? "" : "hidden";
          if (rect) {
            label.style.transform = `translate(${rect.left - sceneRect.left}px,${rect.top - sceneRect.top}px)`;
            accepted.push(
              new DOMRect(
                rect.left,
                rect.top,
                rect.right - rect.left,
                rect.bottom - rect.top,
              ),
            );
            if (line) {
              line.style.visibility = "";
              line.setAttribute("x1", String(x));
              line.setAttribute("y1", String(y));
              line.setAttribute(
                "x2",
                String(
                  Math.max(
                    rect.left,
                    Math.min(rect.right, x + sceneRect.left),
                  ) - sceneRect.left,
                ),
              );
              line.setAttribute(
                "y2",
                String(
                  Math.max(rect.top, Math.min(rect.bottom, y + sceneRect.top)) -
                    sceneRect.top,
                ),
              );
            }
          }
          continue;
        }
        const rect = label.getBoundingClientRect();
        if (
          (sceneRect &&
            (rect.left < sceneRect.left + 8 ||
              rect.right > sceneRect.right - 8 ||
              rect.top < sceneRect.top + 8 ||
              rect.bottom > sceneRect.bottom - 8)) ||
          accepted.some(
            (r) =>
              rect.left < r.right + 8 &&
              rect.right > r.left - 8 &&
              rect.top < r.bottom + 8 &&
              rect.bottom > r.top - 8,
          )
        )
          label.style.visibility = "hidden";
        else accepted.push(rect);
      }
      frame = requestAnimationFrame(declutter);
    };
    frame = requestAnimationFrame(declutter);
    return () => cancelAnimationFrame(frame);
  }, [labelKey, retry]);
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
          {selectedFixture && (
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
        {(selectedFixture ||
          airflow ||
          maintenance.length > 0 ||
          supply ||
          network.length > 0 ||
          labels.some((item) => item.id === selectedId)) && (
          <svg className="review-flow-lines" aria-hidden="true" ref={flowLines}>
            {selectedFixture && <line data-flow-line={selectedFixture.id} />}
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
                <div className="aisle-actions">
                  {availableAisle && (
                    <button
                      aria-pressed={!!comparison}
                      onClick={() => {
                        onTakeover();
                        setComparedId(comparison ? null : availableAisle.id);
                      }}
                    >
                      {comparison ? "退出通道对照" : "对照排间通道"}
                    </button>
                  )}
                  {comparison && (
                    <button onClick={() => camera("top")}>俯看两柜</button>
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
              <strong>环境测点 · 模拟</strong>
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
                      actions={
                        airflowVisit && (
                          <div className="airflow-inspection-return">
                            <span>
                              核对 ·{" "}
                              {entityById(airflowVisit.deviceId)?.name}{" "}
                            </span>
                            <button
                              onClick={(event) => {
                                event.currentTarget
                                  .closest("details")
                                  ?.querySelector("summary")
                                  ?.focus({ preventScroll: true });
                                engine.current?.preservePanelView();
                                onReturnAirflowEndpoint();
                              }}
                            >
                              ← 返回原对象
                            </button>
                            <small>
                              原对象：{entityById(airflowVisit.originId)?.name}
                            </small>
                          </div>
                        )
                      }
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
                        <p>
                          分段观察强调当前段并暂收切片，其他段保留淡线；手动旋转或定位结束观察。
                        </p>
                      )}
                      {airflowVisit && (
                        <p>预览保留本支路；定位结束核对，转为对象观察。</p>
                      )}
                      {visibleAirflow.routes[0] && (
                        <div
                          className="airflow-view-actions"
                          aria-label="气流观察视角"
                        >
                          {airflowViews.map((item) => (
                            <button
                              key={item.id}
                              aria-pressed={flowView === item.id}
                              onClick={() => {
                                onTakeover();
                                setOrbit(false);
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
                              onClick={(event) => {
                                onTakeover();
                                event.currentTarget.parentElement
                                  ?.querySelector("button")
                                  ?.focus();
                                engine.current?.restoreAirflowView();
                              }}
                            >
                              返回原视角
                            </button>
                          )}
                        </div>
                      )}
                      {flowView && (
                        <div
                          className="airflow-stage-reading"
                          aria-label="当前气流观察段"
                        >
                          <strong aria-live="polite">
                            {stage?.title ?? "全路径 · 送风到回风"}
                          </strong>
                          <span>
                            {stage?.direction ??
                              "送风 → 格栅 → 设备 → 回风假设"}
                          </span>
                          <small>
                            {
                              entityById(visibleAirflow.routes[0].deviceId)
                                ?.name
                            }{" "}
                            · {visibleAirflow.routes[0].status} · t+{state.time}
                            s
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
                      <p>
                        当前机柜同向，假设前进后出。柜面细框按设备安装 U
                        位标出前后代表范围，柜外箭头表示方向；被柜体遮挡的路径不透视显示，可切换前/后视或旋转观察。细框不是实际风口。送风沿低位侧通道至柜前格栅，再穿柜并从上方回到制冷单元；未建立架空地板风腔或封闭冷热通道。端点均为代表位置，线宽和脉冲速度不表示风量或风速。暂停可读方向；停机、维护或观测无效时仅保留灰色静态路径。
                      </p>
                    </TemperatureDisclosure>
                  )}
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
                    {state.level === "rack"
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
