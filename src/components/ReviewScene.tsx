import { TemperatureDisclosure } from "./TemperatureDisclosure";
import { SliceDeviceContext } from "./SliceDeviceContext";
import { SliceInputPreview } from "./SliceInputPreview";
import { fixtureById, roomFacilityById } from "../fixtures";
import type { Dispatch, SetStateAction, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppState } from "../domain";
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
import { airflowSnapshot, airflowVisualTime } from "../airflow";
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
  sliceControls,
  setSliceControls,
  layer,
  readings,
  selectedId,
  aisle,
  networkLinkId = null,
  powerLinkId = null,
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
  state: AppState;
  sliceControls: SliceControls;
  setSliceControls: Dispatch<SetStateAction<SliceControls>>;
  layer: ReviewLayer;
  readings: Map<string, SpatialReading>;
  selectedId: string;
  aisle?: MaintenanceAisle;
  networkLinkId?: string | null;
  powerLinkId?: string | null;
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
  const sliceGeometry = useRef<TemperatureSliceGeometry | null>(null);
  const airflowGeometry = useRef<AirflowGeometry | null>(null);
  const maintenanceGeometry = useRef<MaintenanceGeometry | null>(null);
  const powerGeometry = useRef<PowerGeometry | null>(null);
  const networkGeometry = useRef<NetworkGeometry | null>(null);
  const clockEpoch = useRef(performance.now());
  const previousScene = useRef(state);
  const currentState = useRef(state);
  currentState.current = state;
  const callbacks = useRef({ onSelect, onPhase, onFeedback });
  callbacks.current = { onSelect, onPhase, onFeedback };
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [assets, setAssets] = useState("loading");
  const [view, setView] = useState<View>("interior");
  const [quality, setQuality] = useState(true);
  const [supported, setSupported] = useState(false);
  const [orbit, setOrbit] = useState(false);
  const [cutaway, setCutaway] = useState(true);
  const [moreLabels, setMoreLabels] = useState(false);
  const slice = useMemo(
    () =>
      layer === "environment" && state.level === "room"
        ? sliceControls.orientation === "horizontal"
          ? temperatureSlice(readings, sliceControls.height)
          : verticalTemperatureSlice(
              readings,
              sliceControls.rowId,
              sliceControls.distance,
            )
        : null,
    [readings, sliceControls, layer, state.level],
  );
  const sliceRow = sliceRackRows.find((row) => row.id === slice?.rowId);
  const supply = useMemo(
    () =>
      layer === "power" ? powerScene(state, selectedId, powerLinkId) : null,
    [
      layer,
      state.level,
      state.deviceId,
      state.trayExtended,
      selectedId,
      powerLinkId,
    ],
  );
  const network = useMemo(
    () => networkMarkers(state, selectedId, networkLinkId),
    [
      state.level,
      state.deviceId,
      state.trayExtended,
      selectedId,
      networkLinkId,
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
      layer === "environment" && state.level === "room"
        ? airflowSnapshot(
            state.time,
            readings,
            selectedId,
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
      slice?.rowId,
    ],
  );
  useEffect(() => {
    clockEpoch.current = performance.now();
  }, [state.time, state.playing, state.playbackRate]);
  const positionSettings =
    slice?.orientation === "vertical"
      ? sliceSettings.vertical.distance
      : sliceSettings.height;
  const presentation = reviewPresentation(layer, state.level);
  const model = modelForDevice(state.deviceId);
  const representation =
    model.category === "server"
      ? state.explosion > 0
        ? "部件展开"
        : state.coverOpen
          ? "内部装配 · 上盖已移开"
          : "完整装配 · 可单独开盖"
      : assets !== "ready"
        ? "内部配置示意 · 外观模型尚未就绪"
        : state.explosion === 0
          ? "外观模型 · 展开可看配置示意"
          : "内部配置示意";
  useEffect(() => {
    let active: SceneEngine | null = null;
    setAssets("loading");
    try {
      active = new SceneEngine(
        host.current!,
        initial.current,
        (id, enter) => callbacks.current.onSelect(id, enter),
        setError,
        (phase) => callbacks.current.onPhase(phase),
        (feedback) => callbacks.current.onFeedback(feedback),
      );
      active.autoOrbit = false;
      active.retainMaterials = true;
      const overlay = new ReviewDataGeometry();
      active.models.root.add(overlay.root);
      dataGeometry.current = overlay;
      const thermal = new TemperatureSliceGeometry();
      active.models.root.add(thermal.root);
      sliceGeometry.current = thermal;
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
      active.onAssets = setAssets;
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
    if (engine.current) engine.current.autoOrbit = orbit;
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
    dataGeometry.current?.update(reviewSpatialMarks(state, layer, readings));
  }, [state, layer, readings, retry]);
  useEffect(() => {
    sliceGeometry.current?.update(slice);
  }, [slice, retry]);
  useEffect(() => {
    airflowGeometry.current?.update(airflow);
  }, [airflow, retry]);
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
  const labels = sceneLabels(candidates, readings, {
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
  });
  const selectedFixture =
    state.level === "room" && selectedId === state.selected
      ? layer === "overview"
        ? roomFacilityById(selectedId)
        : fixtureById(selectedId)
      : undefined;
  const labelKey =
    (selectedFixture?.id ?? "") +
    labels.map((r) => r.id).join(":") +
    (airflow?.routes.map((route) => route.id).join(":") ?? "") +
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
      data-airflow-targets={airflow?.routes
        .map((route) => route.deviceId)
        .join(",")}
      data-airflow-grilles={airflow?.routes
        .map((route) => route.floorGrille.id)
        .join(",")}
      data-airflow-input={airflow?.coolingCapacity}
      data-maintenance-rack={maintenance.length ? selectedId : undefined}
      data-maintenance-aisle={comparison?.id}
      data-power-rack={supply?.rackId}
      data-power-device={supply?.deviceId}
      data-power-trace={supply?.traceId ?? undefined}
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
            {slice
              ? slice.orientation === "horizontal"
                ? "进风温度水平切片 · 局部插值"
                : `进风温度垂直切片 · ${sliceRow!.name}`
              : layer === "overview" && state.level === "rack"
                ? "机柜总览"
                : presentation.title}
          </strong>
          {state.level !== "device" && !airflow && layer !== "alarms" && (
            <div className="review-scene-readings" aria-label="场景运行读数">
              <span>
                <b>{scope.lifecycleCounts.running}</b>
                <small>运行设备</small>
              </span>
              <span>
                <b>
                  {scope.power === null ? "—" : (scope.power / 1000).toFixed(2)}
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
          {airflow && (
            <div className="review-airflow-caption" aria-label="气流路径示意">
              <p>
                气流示意 · 冷却输入 <b>{airflow.coolingCapacity}%</b>
              </p>
              <div>
                <span className="flow-supply">→ 送风</span>
                <span className="flow-through">⇢ 穿柜</span>
                <span className="flow-return">⇢ 回风假设</span>
              </div>
              <small>{airflow.label}</small>
            </div>
          )}
          <details className="review-view-explanation">
            <summary>读图说明</summary>
            <p>
              {slice
                ? `${slice.orientation === "horizontal" ? "水平切片估计当前高度的进风温度。" : `垂直切片显示${sliceRow!.name}正面 ${sliceSettings.height.min.toFixed(2)}–${sliceSettings.height.max.toFixed(2)} 米高度的进风差异，滑杆调整离柜距离；标签取切面纵向最高估计。俯视时切面呈侧边，可切到前视观察。`}色条仍对应逐台设备。输入为同一时间的有效模拟读数；代表位置按U位中心假设，非独立环境测点。最近位置离线、过期或超出插值范围时留空；不推断机柜排风或整间机房温度。`
                : presentation.description}
              {airflow &&
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
              {!supply?.traceId && <small>{label.detail}</small>}
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
          {airflow?.routes.flatMap((route) =>
            route.endpoints.map((endpoint) => (
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
                      预算
                    </em>
                  )}
              </button>
            );
          })}
        </div>
        {assets !== "ready" && !error && (
          <div className="review-loading" role="status">
            {assets === "loading"
              ? "详细模型加载中 · 可继续浏览"
              : "部分模型不可用 · 已使用简化结构"}
          </div>
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
            {airflow?.routes.flatMap((route) =>
              route.endpoints.map((endpoint) => (
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
        >
          {network.length > 0 && networkLink && (
            <div className="network-scene-key">
              <strong>网络接入 · {networkLink.speedGbps} Gb/s 配置</strong>
              <small>
                {state.level === "device"
                  ? "所属部件示意 · 非物理端口定位"
                  : "设备代表位置 · 非物理端口定位"}
              </small>
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
          ) : (
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
                          orientation: event.target.value as SliceOrientation,
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
                        : "机柜标尺 · 功耗 / 预算占比"}
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
              {slice && (
                <div
                  className="review-slice-controls"
                  aria-label="温度切片控制"
                >
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
                    key={`${shotRevision}:${selectedId}`}
                    selectedId={selectedId}
                    onInteract={onTakeover}
                    controls={sliceControls}
                    slice={slice}
                    readings={readings}
                    onChange={(next) => {
                      onTakeover();
                      setSliceControls(next);
                    }}
                  />
                  {airflow && (
                    <TemperatureDisclosure
                      className="review-flow-explanation"
                      onInteract={onTakeover}
                      summary={
                        <>
                          气流路径 ·{" "}
                          {airflow.routes[0]?.animated
                            ? "代表支路"
                            : "静态示意"}
                        </>
                      }
                    >
                      <p>{airflow.label}</p>
                      <ol aria-label="气流端点与读数">
                        {airflow.routes.flatMap((route) =>
                          route.endpoints.map((endpoint) => (
                            <li key={`${route.id}-${endpoint.kind}`}>
                              <b>{endpoint.title}</b>
                              <span>{endpoint.detail}</span>
                            </li>
                          )),
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
              {layer === "power" && <small>灰色：数据或预算未定义</small>}
              {layer === "power" && supply && (
                <div className="power-scene-key" aria-label="供电路径示意">
                  <strong>{supply.caption}</strong>
                  {supply.traceId && (
                    <button onClick={onClearPower}>结束追踪</button>
                  )}
                  {!supply.traceId && (
                    <span>
                      {state.level === "device"
                        ? "A/B 配置端点"
                        : "A 实线 · B 分段"}{" "}
                      · 静态示意
                    </span>
                  )}
                  <small>
                    {state.level === "rack" ? "后侧观察剖切 · " : ""}
                    {supply.traceId
                      ? "配置支路 · 未计量"
                      : "支路未计量 · 不推断独立上游"}
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
