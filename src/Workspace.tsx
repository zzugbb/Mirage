import { useDismissibleMenu } from "./use-dismissible-menu";
import {
  StructureTools,
  type StructureTool,
} from "./components/StructureTools";
import { FanInspection } from "./components/FanInspection";
import {
  fanAssembly,
  fanInspectionContext,
  activeFanInspection,
  type FanInspection as FanVisit,
} from "./fan-inspection";
import { StructureNavigation } from "./components/StructureNavigation";
import { StorageSlots } from "./components/StorageSlots";
import {
  activeStorageSlots,
  storageSlots,
  storageSlotContext,
  storageDriveGroup,
  type StorageSlotInspection,
} from "./storage-slots";
import { canInspectPart } from "./part-inspection";
import type {
  NetworkOverviewScope,
  NetworkOverviewRole,
} from "./network-overview";
import { inletAirflowIncludes } from "./inlet-airflow";
import {
  SmokeInspectionControls,
  SmokeInspectionDetails,
} from "./components/SmokeInspection";
import { isSmokeFixture } from "./smoke-inspection";
import { PowerFeeders } from "./components/PowerFeeders";
import { initialFeeders, type FeederSelection } from "./power-feeders";
import { PowerOverview } from "./components/PowerOverview";
import {
  powerOverviewIncludes,
  type PowerOverviewFilter,
  type PowerOverviewScope,
  type PowerOverviewOrder,
} from "./power-overview";
import {
  switchPortRows,
  switchPortIncludes,
  type SwitchPortCheck,
} from "./switch-ports";
import { AlarmQueue } from "./components/AlarmQueue";
import {
  alarmVisitIncludes,
  alarmVisitLabel,
  alarmCurrentStatus,
  type AlarmSeverity,
  type AlarmVisit,
} from "./alarm-queue";
import { RoomLayout } from "./components/RoomLayout";
import { roomLayoutCrossings, type RoomLayoutScope } from "./room-layout";
import type { AirflowView } from "./airflow-view";
import {
  airflowSnapshot,
  representativeAirflowDevice,
  type AirflowRoute,
  type FlowEndpoint,
} from "./airflow";
import { AirflowDetails } from "./components/AirflowDetails";
import { SlicePlaneDetails } from "./components/SlicePlaneDetails";
import { rangeSegments } from "./range-segments";
import { RangeSegments } from "./components/RangeSegments";
import type { RangeView, RangeViewCommand } from "./range-view";
import { RangeViewActions } from "./components/RangeViewActions";
import { emptyBudgetReview } from "./budget-process";
import {
  beginSpaceInspection,
  spaceInspectionIncludes,
  spaceRangeLabel,
  type SpaceInspection,
} from "./space-inspection";
import { emptyInletDifferenceReview } from "./inlet-difference";
import type { InletInspection, InletViewCommand } from "./inlet-view";
import { AirflowResponseAnalysis } from "./components/AirflowResponseAnalysis";
import {
  airflowResponseContext,
  airflowResponseTarget,
  type AirflowResponseTarget,
} from "./airflow-response";
import { PartSequence } from "./components/PartSequence";
import { emptyComparabilityReview } from "./environment-comparability";
import type {
  EnvironmentInspection,
  EnvironmentViewCommand,
} from "./environment-view";
import {
  beginSourceInspection,
  sourceInspectionIncludes,
  sourceInspectionRow,
  type SourceInspection,
} from "./source-inspection";
import {
  type EntranceInspection,
  type EntranceView,
  type EntranceViewCommand,
} from "./entrance-view";
import {
  beginPeakInspection,
  peakInspectionIncludes,
  peakInspectionStatus,
  type PeakInspection,
} from "./peak-inspection";
import {
  type LeakInspection,
  type LeakView,
  type LeakViewCommand,
} from "./leak-view";
import { LeakInspectionDetails } from "./components/LeakInspectionDetails";
import { GrilleBranches } from "./components/GrilleBranches";
import {
  grilleInspectionIncludes,
  type GrilleInspection,
  type GrilleBranch,
} from "./grille-inspection";
import { CoolingRange } from "./components/CoolingRange";
import {
  coolingRangeIncludes,
  initialCoolingRange,
  type CoolingRangeAction,
  type CoolingRangePosition,
  type CoolingRangeState,
} from "./cooling-range";
import type { MaintenanceInspection } from "./maintenance-view";
import {
  environmentPair,
  environmentPairIncludes,
  type EnvironmentPair,
} from "./environment-pair";
import type { EnvironmentMetric } from "./environment-monitoring";
import { EnvironmentPairAnalysis } from "./components/EnvironmentPairAnalysis";
import {
  fixtureCrossing,
  type FixtureCrossing,
  type CrossingViewCommand,
} from "./fixture-crossing";
import type { PowerViewCommand } from "./power-view";
import {
  emptyPeakProcess,
  peakScopeIds,
  type PeakProcessState,
} from "./peak-provenance";
import type { NetworkViewCommand } from "./network-view";
import type { SliceViewCommand } from "./slice-view";
import { inspectSliceDevice, type SliceCheck } from "./slice-device";
import { SliceEvidenceDetails } from "./components/SliceEvidenceDetails";
import { emptyInletProcess, type InletProcessState } from "./inlet-process";
import { InletPairAnalysis } from "./components/InletPairAnalysis";
import type {
  InletOverviewScope,
  InletOverviewOrder,
  InletOverviewFilter,
} from "./inlet-overview";
import { InletOverview } from "./components/InletOverview";
import { NetworkOverview } from "./components/NetworkOverview";
import { environmentProbe } from "./environment-monitoring";
import { EnvironmentDetails } from "./components/EnvironmentDetails";
import {
  RackSpaceInspector,
  type SpaceFormSnapshot,
} from "./components/RackSpaceInspector";
import type { RackUnitRange } from "./rack-space";
import { RoomSpaceComparison } from "./components/RoomSpaceComparison";
import { isolatedPart, partInspectionSequence } from "./part-inspection";
import { grilleRowById, rackGrilleRelations } from "./floor-grilles";
import {
  activeAirflowInspection,
  airflowInspectionContext,
  beginAirflowInspection,
  type AirflowInspection,
} from "./airflow-inspection";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { ReadingSources } from "./components/ReadingSources";
import {
  currentMetricValue,
  readingSources,
  sourceValue,
  sourceMetrics,
  type SourceCheck,
  type SourceMetric,
} from "./reading-sources";
import { RackInstallation } from "./components/RackInstallation";
import { rackBlankingUnits, unitRanges } from "./rack-blanking";
import { fixtureById } from "./fixtures";
import { powerContextIncludes, powerLinkById } from "./power-trace";
import { rackTrayRelations } from "./cable-trays";
import { leakRelations } from "./leak-detection";
import { FixtureDetails, FixtureRelations } from "./components/FixtureDetails";
import { entityById, getPath, presentationKey } from "./domain";
import type { Action } from "./domain";
import {
  createWorkspace,
  reviewTransition,
  reviewLayers,
  reviewHistories,
  reviewCoolingHistories,
  reviewEvents,
} from "./review-model";
import type { ReviewAction, ResourceAction, ReviewState } from "./review-model";
import { spatialSnapshot, selectedReading } from "./spatial";
import {
  budgetAttentionStyle,
  metricAttentionColor,
  qualityNames,
  signalFor,
  signalStyles,
  signalText,
} from "./status";
import {
  findResources,
  rackUnitQuery,
  resourceCatalog,
  resourceOpenLabel,
  canSelectInScene,
  componentGroups,
} from "./review-resources";
import type { ResourceFilter } from "./review-resources";
import {
  devices,
  deviceById,
  racks,
  rackById,
  rackForDevice,
} from "./installation";
import {
  maintenanceAreas,
  maintenanceAisle,
  reserveGapText,
} from "./maintenance";
import {
  isPowerFacility,
  pduById,
  pduName,
  powerDeviceIds,
  powerLinks,
  powerSettings,
} from "./power-config";
import {
  pduOutlet,
  pduInspectionIncludes,
  type PduInspection,
} from "./pdu-outlets";
import { PowerConnections } from "./components/PowerConnections";
import { canShowNetworkPatch } from "./network-patch";
import { NetworkTrace } from "./components/NetworkTrace";
import { NetworkConnections } from "./components/NetworkConnections";
import {
  networkContextIncludes,
  networkDeviceId,
  networkLinkById,
  supportsNetworkPatch,
  type NetworkLink,
  networkMarkers,
  switchRole,
} from "./network";
import { CoolingConnections } from "./components/CoolingConnections";
import {
  coolingSource,
  isCoolingSource,
  coolingDeviceIds,
  coolingSummary,
  roomAirflowTarget,
} from "./cooling";
import {
  alignAirflowSlice,
  initialSliceControls,
  type SliceControls,
} from "./temperature-slice";
import { coolingCapacityAt } from "./simulation";
import { inletAssessment } from "./inlet-assessment";
import { ResourceActions } from "./components/ResourceActions";
import type { TaskViewMemory } from "./scene/engine";
import { ReviewScene } from "./components/ReviewScene";
import { ReviewTrend } from "./components/ReviewTrend";
import { InletAssessment } from "./components/InletAssessment";
import { ReviewAnalysis } from "./components/ReviewAnalysis";
import type { PresentationPhase, SceneFeedback } from "./mechanics";
import {
  navigationViews,
  resourceViews,
  type ResourceView,
  workspacePreset,
  workspaceShots,
  visibleResourceRows,
  resourceRowText,
} from "./workspace-presets";
import type { WorkspaceShot } from "./workspace-presets";
import { tourSteps } from "./tour";
import "./scene-ui.css";
import { observationColor } from "./scene/metric-color";
import { budgetPercent, budgetRatio, budgetStateText } from "./power-budget";
import { workspaceColors } from "./workspace-colors";
import "./workspace-ui.css";

const airflowRacks = racks.map((rack) => ({
  rack,
  device: representativeAirflowDevice(rack.id),
}));
const clock = (time: number) =>
  `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;
const temperature = (value: number | null | undefined) =>
  value == null ? "—" : value.toFixed(1);
const power = (value: number | null | undefined) =>
  value == null
    ? "—"
    : value >= 1000
      ? (value / 1000).toFixed(2)
      : value.toFixed(1);
type AirflowOriginPose = Pick<
  ReviewState["scene"],
  | "level"
  | "deviceId"
  | "selected"
  | "doorOpen"
  | "rearDoorOpen"
  | "trayExtended"
  | "coverOpen"
  | "explosion"
>;
function reducer(
  state: ReviewState,
  action:
    | ReviewAction
    | ResourceAction
    | { type: "workspace-shot"; shot: WorkspaceShot }
    | {
        type: "return-airflow-origin";
        pose: AirflowOriginPose;
        layer: ReviewState["layer"];
        selected: string;
        analysis: boolean;
      },
) {
  if (action.type === "return-airflow-origin")
    return {
      ...state,
      scene: { ...state.scene, ...action.pose },
      layer: action.layer,
      selectedId: action.selected,
      analysis: action.analysis,
    };
  return action.type === "workspace-shot"
    ? workspacePreset(state, action.shot)
    : reviewTransition(state, action);
}

export function Workspace() {
  const [review, control] = useReducer(reducer, undefined, createWorkspace);
  const { scene: state, layer, tour } = review;
  const selected = review.selectedId ?? state.selected;
  const [environmentComparisonOpen, setEnvironmentComparisonOpen] =
    useState(false);
  const [environmentPairVisit, setEnvironmentPairVisit] = useState<{
    camera: TaskViewMemory | null;
    pair: EnvironmentPair;
    layer: typeof layer;
    analysis: boolean;
    nav: boolean;
  } | null>(null);
  const [inletView, setInletView] = useState<InletInspection | null>(null);
  const [inletViewCommand, setInletViewCommand] =
    useState<InletViewCommand | null>(null);
  const [environmentView, setEnvironmentView] =
    useState<EnvironmentInspection | null>(null);
  const [environmentViewCommand, setEnvironmentViewCommand] =
    useState<EnvironmentViewCommand | null>(null);
  const requestEnvironmentView = (action: EnvironmentViewCommand["action"]) => {
    control({ type: "takeover" });
    setEnvironmentViewCommand((current) => ({
      action,
      revision: (current?.revision ?? 0) + 1,
    }));
  };
  const [comparability, setComparability] = useState(emptyComparabilityReview);
  const [environmentReturn, setEnvironmentReturn] =
    useState<typeof environmentPairVisit>(null);
  const [environmentPairMetric, setEnvironmentPairMetric] =
    useState<EnvironmentMetric>("ambientTemperature");
  useEffect(() => {
    setComparability(emptyComparabilityReview);
  }, [environmentPairVisit, environmentPairMetric, state.replayCycle]);
  const partSequenceFocus = useRef<string | null>(null);
  const [inspectionDevice, setInspectionDevice] = useState<string | null>(null);
  const [storageVisit, setStorageVisit] =
    useState<StorageSlotInspection | null>(null);
  const [storageViewRevision, setStorageViewRevision] = useState(0);
  const [storageFocusRevision, setStorageFocusRevision] = useState(0);
  const activeStorageVisit = activeStorageSlots(storageVisit, state, selected);
  const [fanVisit, setFanVisit] = useState<FanVisit | null>(null);
  const [fanViewRevision, setFanViewRevision] = useState(0);
  const [fanFocusRevision, setFanFocusRevision] = useState(0);
  const activeFanVisit = activeFanInspection(fanVisit, state, selected);
  const [structureReturn, setStructureReturn] = useState<{
    deviceId: string;
    tool: StructureTool;
  } | null>(null);
  useEffect(() => {
    if (
      structureReturn &&
      (state.level !== "device" ||
        state.deviceId !== structureReturn.deviceId ||
        selected !== structureReturn.deviceId)
    )
      setStructureReturn(null);
  }, [structureReturn, state.level, state.deviceId, selected]);
  const isolatedPartId =
    activeFanVisit && !activeFanVisit.pending
      ? activeFanVisit.mode === "group"
        ? fanAssembly(state.deviceId)!.group.id
        : activeFanVisit.fanId
      : activeStorageVisit && !activeStorageVisit.pending
        ? activeStorageVisit.mode === "group"
          ? storageDriveGroup
          : activeStorageVisit.diskId
        : isolatedPart(state, selected, inspectionDevice);
  useEffect(() => {
    if (inspectionDevice && !isolatedPartId) setInspectionDevice(null);
  }, [inspectionDevice, isolatedPartId]);
  const [sliceControls, setSliceControls] = useState(initialSliceControls);
  const [sliceCheck, setSliceCheck] = useState<SliceCheck | null>(null);
  const [rangeView, setRangeView] = useState<RangeView | null>(null);
  const [rangeViewCommand, setRangeViewCommand] =
    useState<RangeViewCommand | null>(null);
  const [rangeSegmentId, setRangeSegmentId] = useState<string | null>(null);
  const rangeEntry = useRef<HTMLElement | null>(null);
  const rangeReturning = useRef(false);
  const requestRangeView = (
    action: RangeViewCommand["action"],
    segmentId = rangeSegmentId,
  ) => {
    if (action === "return") rangeReturning.current = true;
    if (action !== "return" && !rangeView)
      rangeEntry.current = document.activeElement as HTMLElement;
    if (action !== "return") control({ type: "layer", layer: "overview" });
    setRangeViewCommand((current) => ({
      segmentId,
      action,
      revision: (current?.revision ?? 0) + 1,
    }));
  };
  const [slicePlaneActive, setSlicePlaneActive] = useState(false);
  const [sliceViewActive, setSliceViewActive] = useState(false);
  const [sliceViewCommand, setSliceViewCommand] =
    useState<SliceViewCommand | null>(null);
  const requestSliceView = (action: SliceViewCommand["action"]) =>
    setSliceViewCommand((current) => ({
      action,
      revision: (current?.revision ?? 0) + 1,
    }));
  const [shot, setShot] = useState<WorkspaceShot>("overview");
  const [revision, setRevision] = useState(0);
  const [phase, setPhase] = useState<PresentationPhase>("closed");
  const [feedback, setFeedback] = useState<SceneFeedback | null>(null);
  const latestFeedback = useRef(feedback);
  latestFeedback.current = feedback;
  const [hidden, setHidden] = useState(() => document.hidden);
  const tourMenu = useDismissibleMenu();
  useEffect(() => {
    if (tour.mode === "manual" && !review.pendingTour && tourMenu.current)
      tourMenu.current.open = false;
  }, [tour.mode, review.pendingTour]);
  const tourShot = useMemo(
    () =>
      tour.mode === "manual"
        ? null
        : {
            revision: tour.revision,
            view: tourSteps[tour.step].view,
            focus: !!tourSteps[tour.step].focus,
          },
    [tour.mode, tour.revision, tour.step],
  );
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (tour.mode !== "playing" || hidden) return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (!document.hidden)
        control({
          type: "tour-tick",
          delta: (now - previous) / 1000,
          feedback: latestFeedback.current,
        });
      previous = now;
    }, 250);
    return () => clearInterval(timer);
  }, [tour.mode, hidden]);
  const [nav, setNav] = useState(
    () => matchMedia("(min-width: 1100px)").matches,
  );
  const navigationRef = useRef<HTMLElement>(null);
  const navigationOpenerRef = useRef<HTMLButtonElement>(null);
  const previousNav = useRef(nav);
  const skipNavigationSearch = useRef(false);
  useEffect(() => {
    if (previousNav.current === nav) return;
    previousNav.current = nav;
    if (nav) {
      if (!skipNavigationSearch.current)
        navigationRef.current?.querySelector("input")?.focus();
      skipNavigationSearch.current = false;
    } else if (navigationRef.current?.contains(document.activeElement))
      navigationOpenerRef.current?.focus();
  }, [nav]);
  const [inspector, setInspector] = useState(false);
  const [airflowOrigin, setAirflowOrigin] = useState<{
    pose: AirflowOriginPose;
    selected: string;
    target: string;
    layer: ReviewState["layer"];
    metric: "temperature" | "power";
    entry: "scene" | "details";
    detailScroll: number;
    camera: TaskViewMemory | null;
    nav: boolean;
    inspector: boolean;
    analysis: boolean;
    rackView: ResourceView;
    query: string;
    filter: ResourceFilter;
    onlyAlarms: boolean;
  } | null>(null);
  const [returningFromAirflow, setReturningFromAirflow] = useState(false);
  const [airflowVisit, setAirflowVisit] = useState<AirflowInspection | null>(
    null,
  );
  const airflowContext = airflowInspectionContext(state, layer, revision);
  const activeAirflowVisit = activeAirflowInspection(
    airflowVisit,
    selected,
    airflowContext,
  );
  useEffect(() => {
    if (airflowVisit && !activeAirflowVisit) setAirflowVisit(null);
  }, [airflowVisit, activeAirflowVisit]);
  const responseContext = airflowResponseContext(airflowContext, selected);
  const [airflowResponse, setAirflowResponse] = useState<{
    target: AirflowResponseTarget;
    context: string;
    analysis: boolean;
    inspector: boolean;
    nav: boolean;
    scroll: number;
  } | null>(null);
  const responsePreserveView = useRef<(() => void) | null>(null);
  const responseReturnScroll = useRef<number | null>(null);
  const activeAirflowResponse =
    airflowResponse?.context === responseContext && review.analysis && inspector
      ? airflowResponse
      : null;
  useEffect(() => {
    if (airflowResponse && !activeAirflowResponse) setAirflowResponse(null);
  }, [airflowResponse, activeAirflowResponse]);
  useEffect(() => {
    if (!activeAirflowResponse) return;
    const medium = matchMedia("(max-width: 1099px)");
    const adapt = () => {
      if (medium.matches) setNav(false);
    };
    adapt();
    medium.addEventListener("change", adapt);
    return () => medium.removeEventListener("change", adapt);
  }, [activeAirflowResponse]);
  useEffect(() => {
    if (!activeStorageVisit && !activeFanVisit) return;
    const medium = matchMedia("(max-width: 1099px)");
    const adapt = () => {
      if (medium.matches) setNav(false);
    };
    adapt();
    medium.addEventListener("change", adapt);
    return () => medium.removeEventListener("change", adapt);
  }, [activeStorageVisit?.deviceId, activeFanVisit?.deviceId]);
  const [powerViewActive, setPowerViewActive] = useState(false);
  const [powerViewCommand, setPowerViewCommand] =
    useState<PowerViewCommand | null>(null);
  const powerViewPaired =
    powerViewActive && powerViewCommand?.action === "observe-pair";
  const requestPowerView = (action: PowerViewCommand["action"]) => {
    takeover();
    setPowerViewCommand((current) => ({
      action,
      revision: (current?.revision ?? 0) + 1,
    }));
  };
  const [grilleVisit, setGrilleVisit] = useState<
    | (GrilleInspection & {
        camera: TaskViewMemory | null;
        metric: "temperature" | "power";
        layer: ReviewState["layer"];
        slice: SliceControls;
        nav: boolean;
        query: string;
        filter: ResourceFilter;
        onlyAlarms: boolean;
        scroll: number;
      })
    | null
  >(null);
  const [grilleReturning, setGrilleReturning] = useState(false);
  const [grilleRack, setGrilleRack] = useState<Record<string, string>>({});
  useEffect(() => {
    if (
      grilleVisit &&
      !grilleReturning &&
      !grilleInspectionIncludes(grilleVisit, selected, state.deviceId)
    )
      setGrilleVisit(null);
  }, [grilleVisit, grilleReturning, selected, state.deviceId]);
  const [coolingRangeState, setCoolingRangeState] =
    useState(initialCoolingRange);
  const [coolingRangeOpen, setCoolingRangeOpen] = useState(false);
  const coolingRangeRestore = useRef<CoolingRangePosition | null>(null);
  const coolingSearchFocus = useRef(false);
  const captureTaskView = useRef<
    ((level: TaskViewMemory["level"]) => TaskViewMemory | null) | null
  >(null);
  const [coolingVisit, setCoolingVisit] = useState<{
    camera: TaskViewMemory | null;
    metric: typeof metric;
    rackId: string;
    deviceId: string | null;
    locatedEndpoint?: { id: string; deviceId: string };
    range: CoolingRangeState;
    position: CoolingRangePosition;
    rackView: ResourceView;
    layer: ReviewState["layer"];
    slice: SliceControls;
    nav: boolean;
    query: string;
    filter: ResourceFilter;
    onlyAlarms: boolean;
  } | null>(null);
  const [coolingReturning, setCoolingReturning] = useState(false);
  const locatedCoolingDevice =
    layer === "airflow" && coolingVisit?.locatedEndpoint?.id === selected
      ? coolingVisit.locatedEndpoint.deviceId
      : null;
  useEffect(() => {
    if (
      coolingVisit &&
      !locatedCoolingDevice &&
      !coolingReturning &&
      !(
        activeAirflowVisit &&
        coolingRangeIncludes(
          coolingVisit.rackId,
          activeAirflowVisit.deviceId,
          state.deviceId,
        )
      ) &&
      (selected === coolingSource.id ||
        !coolingRangeIncludes(coolingVisit.rackId, selected, state.deviceId))
    )
      setCoolingVisit(null);
  }, [
    coolingVisit,
    coolingReturning,
    selected,
    state.deviceId,
    activeAirflowVisit,
    locatedCoolingDevice,
  ]);
  const [maintenanceView, setMaintenanceView] =
    useState<MaintenanceInspection | null>(null);
  const [entranceView, setEntranceView] = useState<EntranceInspection | null>(
    null,
  );
  const [entranceViewCommand, setEntranceViewCommand] =
    useState<EntranceViewCommand | null>(null);
  const requestEntranceView = (view: EntranceView | null) => {
    takeover();
    setEntranceViewCommand((current) => ({
      view,
      revision: (current?.revision ?? 0) + 1,
    }));
  };
  const [leakView, setLeakView] = useState<LeakInspection | null>(null);
  const [leakViewCommand, setLeakViewCommand] =
    useState<LeakViewCommand | null>(null);
  const requestLeakView = (view: LeakView | null) => {
    takeover();
    setLeakViewCommand((current) => ({
      view,
      revision: (current?.revision ?? 0) + 1,
    }));
  };
  const [crossing, setCrossing] = useState<FixtureCrossing | null>(null);
  const [crossingCommand, setCrossingCommand] =
    useState<CrossingViewCommand | null>(null);
  const crossingEntry = useRef<{ element: HTMLElement; scroll: number } | null>(
    null,
  );
  const crossingReturning = useRef(false);
  const crossingInspectPending = useRef(false);
  const requestCrossing = (pair: FixtureCrossing | null) => {
    if (pair && !crossing) {
      const element = document.activeElement as HTMLElement;
      crossingEntry.current = {
        element,
        scroll:
          element.closest<HTMLElement>(".study-inspector")?.scrollTop ?? 0,
      };
    }
    if (!pair) crossingReturning.current = true;
    crossingInspectPending.current = !!pair;
    takeover();
    setCrossingCommand((current) => ({
      pair,
      revision: (current?.revision ?? 0) + 1,
    }));
  };
  const [networkViewActive, setNetworkViewActive] = useState(false);
  const [networkViewCommand, setNetworkViewCommand] =
    useState<NetworkViewCommand | null>(null);
  const requestNetworkView = (action: NetworkViewCommand["action"]) => {
    takeover();
    setNetworkViewCommand((current) => ({
      action,
      revision: (current?.revision ?? 0) + 1,
    }));
  };
  const [networkLinkId, setNetworkLinkId] = useState<string | null>(null);
  const [portCheck, setPortCheck] = useState<SwitchPortCheck | null>(null);
  const [portVisit, setPortVisit] = useState<{
    check: SwitchPortCheck;
    portOffset: number;
    patch?: {
      source: string;
      doorOpen: boolean;
      rearDoorOpen: boolean;
      entry: { doorOpen: boolean } | null;
    };
    camera: TaskViewMemory | null;
    localActionsOpen: boolean;
    level: "room" | "rack";
    query: string;
    filter: ResourceFilter;
    rackView: ResourceView;
    nav: boolean;
    onlyAlarms: boolean;
    metric: "temperature" | "power";
  } | null>(null);
  const [portReturning, setPortReturning] = useState(false);
  const portReturnFocus = useRef<{
    check: SwitchPortCheck;
    offset: number;
    localActionsOpen: boolean;
  } | null>(null);

  const [pduInspection, setPduInspection] = useState<PduInspection | null>(
    null,
  );
  const [pduReturning, setPduReturning] = useState(false);
  useEffect(() => {
    if (
      !pduInspection ||
      !pduInspectionIncludes(pduInspection, selected, state.deviceId)
    ) {
      setPduReturning(false);
      if (pduInspection) setPduInspection(null);
    }
  }, [pduInspection, selected, state.deviceId]);
  const [powerLinkId, setPowerLinkId] = useState<string | null>(null);
  const activePowerLink = powerContextIncludes(
    selected,
    state.deviceId,
    powerLinkId,
  )
    ? powerLinkId
    : null;
  const activeNetworkLink =
    layer === "overview" &&
    networkContextIncludes(selected, state.deviceId, networkLinkId)
      ? networkLinkId
      : null;
  const [query, setQuery] = useState("");
  const [rackView, setRackView] = useState<ResourceView>("installation");
  const views = navigationViews(state.level, layer);
  const [alarmQuery, setAlarmQuery] = useState("");
  const [alarmSeverity, setAlarmSeverity] = useState<AlarmSeverity>("all");
  const [alarmVisit, setAlarmVisit] = useState<
    | (AlarmVisit & {
        camera: TaskViewMemory | null;
        query: string;
        filter: AlarmSeverity;
        scroll: number;
        inspector: boolean;
      })
    | null
  >(null);
  const [alarmReturned, setAlarmReturned] = useState<AlarmVisit | null>(null);
  const [alarmReturning, setAlarmReturning] = useState(false);
  const [alarmRestore, setAlarmRestore] = useState(0);
  const alarmScroll = useRef(0);
  const [layoutViewRevision, setLayoutViewRevision] = useState(0);
  const [layoutBoundary, setLayoutBoundary] = useState(false);
  const [layoutScope, setLayoutScope] = useState<RoomLayoutScope>("equipment");
  const [layoutQuery, setLayoutQuery] = useState("");
  const [layoutCrossing, setLayoutCrossing] = useState<string | null>(null);
  const layoutScroll = useRef(0);
  const [layoutRestore, setLayoutRestore] = useState(0);
  const [layoutVisit, setLayoutVisit] = useState<{
    id: string;
    crossing?: (typeof roomLayoutCrossings)[number];
    grille?: { name: string; slice: SliceControls };
    power?: { linkId: string | null; inspection: PduInspection | null };
    query: string;
    origin: {
      camera: TaskViewMemory | null;
      inspector: boolean;
      scroll: number;
    };
    layer: ReviewState["layer"];
    metric: "temperature" | "power";
  } | null>(null);
  const [layoutReturning, setLayoutReturning] = useState(false);
  const [smokeVisit, setSmokeVisit] = useState<{
    camera: TaskViewMemory | null;
    id: string;
    layer: ReviewState["layer"];
    analysis: boolean;
    nav: boolean;
    query: string;
    filter: ResourceFilter;
    onlyAlarms: boolean;
  } | null>(null);
  const [smokeReturning, setSmokeReturning] = useState(false);
  const [smokeRestore, setSmokeRestore] = useState(false);
  const [feeders, setFeeders] = useState(initialFeeders);
  const feederScroll = useRef(0);
  const [feederRestore, setFeederRestore] = useState<string | null>(null);
  const [powerRack, setPowerRack] = useState("rack-a01");
  const selectedRackId = rackById(selected)?.id ?? deviceById(selected)?.rackId;
  useEffect(() => {
    if (state.level === "room" && rackView === "power" && selectedRackId)
      setPowerRack(selectedRackId);
  }, [state.level, rackView, selectedRackId]);
  const [powerQuery, setPowerQuery] = useState("");
  const [powerFilter, setPowerFilter] = useState<PowerOverviewFilter>("all");
  const [powerScope, setPowerScope] = useState<PowerOverviewScope>("rack");
  const [powerOrder, setPowerOrder] = useState<PowerOverviewOrder>("budget");
  const powerScroll = useRef(0);
  const [powerRestore, setPowerRestore] = useState(0);
  const [powerOverviewVisit, setPowerOverviewVisit] = useState<{
    camera: TaskViewMemory | null;
    listQuery: string;
    feeder?: { selection: FeederSelection; linkId: string; scroll: number };
    listFilter: PowerOverviewFilter;
    scope: PowerOverviewScope;
    order: PowerOverviewOrder;
    scroll: number;
    id: string;
    inspector: boolean;
    query: string;
    filter: ResourceFilter;
    onlyAlarms: boolean;
  } | null>(null);
  const [powerOverviewReturning, setPowerOverviewReturning] = useState(false);
  const [inletRack, setInletRack] = useState("rack-a01");
  const [inletQuery, setInletQuery] = useState("");
  const [inletScope, setInletScope] = useState<InletOverviewScope>("rack");
  const [inletOrder, setInletOrder] =
    useState<InletOverviewOrder>("temperature");
  const [inletFilter, setInletFilter] = useState<InletOverviewFilter>("all");
  const [inletSelection, setInletSelection] = useState("rack-a01");
  const inletScroll = useRef(0);
  const inletSlice = useRef(initialSliceControls());
  const [inletRestoreRevision, setInletRestoreRevision] = useState(0);
  const [inletReference, setInletReference] = useState<string | null>(null);
  const [inletPair, setInletPair] = useState<{
    firstId: string;
    secondId: string;
    slice: SliceControls;
  } | null>(null);
  const [inletDifferenceReview, setInletDifferenceReview] = useState(
    emptyInletDifferenceReview,
  );
  useEffect(() => {
    setInletDifferenceReview(emptyInletDifferenceReview);
  }, [inletPair, state.replayCycle]);
  const [inletAirflowVisit, setInletAirflowVisit] = useState<{
    camera: TaskViewMemory | null;
    id: string;
    inspector: boolean;
    rack: string;
    query: string;
    scope: InletOverviewScope;
    order: InletOverviewOrder;
    filter: InletOverviewFilter;
    slice: SliceControls;
    scroll: number;
    resourceQuery: string;
    resourceFilter: ResourceFilter;
    onlyAlarms: boolean;
  } | null>(null);
  const [inletAirflowReturning, setInletAirflowReturning] = useState(false);
  const [inletReturning, setInletReturning] = useState(false);
  const [inletInspection, setInletInspection] = useState<{
    camera: TaskViewMemory | null;
    query: string;
    scope: InletOverviewScope;
    order: InletOverviewOrder;
    filter: InletOverviewFilter;
    scroll: number;
    id: string;
    inspector: boolean;
  } | null>(null);
  const beginInletInspection = (id: string) => {
    if (inletInspection?.id === id) return;
    setInletInspection({
      id,
      inspector,
      camera: captureTaskView.current?.("room") ?? null,
      query: inletQuery,
      scope: inletScope,
      order: inletOrder,
      filter: inletFilter,
      scroll: inletScroll.current,
    });
  };
  const [inletSession, setInletSession] = useState(false);
  useEffect(() => {
    if (state.level !== "room") return;
    setInletSession(rackView === "inlet");
    if (rackView === "inlet") inletSlice.current = sliceControls;
  }, [state.level, rackView, sliceControls]);
  const [networkMapScope, setNetworkMapScope] =
    useState<NetworkOverviewScope>("rack");
  const [networkMapRole, setNetworkMapRole] =
    useState<NetworkOverviewRole>("all");
  const networkMapFocus = useRef<string | null>(null);
  const [networkMapRestore, setNetworkMapRestore] = useState(0);
  const [networkMapRack, setNetworkMapRack] = useState("rack-a01");
  const [networkMapQuery, setNetworkMapQuery] = useState("");
  const [pendingPatch, setPendingPatch] = useState<string | null>(null);
  const [networkMapVisit, setNetworkMapVisit] = useState<{
    camera: TaskViewMemory | null;
    linkId: string | null;
    selection: string;
    scope: NetworkOverviewScope;
    role: NetworkOverviewRole;
    rack: string;
    query: string;
    scroll: number;
    inspector: boolean;
  } | null>(null);
  const originalNetworkLink = networkLinkById(networkMapVisit?.linkId ?? null);
  const networkTrace = networkLinkById(activeNetworkLink);
  const [patchEntry, setPatchEntry] = useState<{ doorOpen: boolean } | null>(
    null,
  );
  const patchAvailable = canShowNetworkPatch(state, networkTrace);
  useEffect(() => {
    if (!patchAvailable || !state.doorOpen) setPatchEntry(null);
  }, [patchAvailable, state.doorOpen]);
  const patchActive = !!patchEntry && patchAvailable && state.doorOpen;
  const portOwnsTrace =
    !!networkTrace &&
    portCheck?.switchId === networkTrace.target &&
    portCheck.port === networkTrace.targetPort &&
    networkDeviceId(selected, state.deviceId) === portCheck.switchId;

  const networkControlFocus = useRef<"endpoint" | "branch" | "port" | null>(
    null,
  );
  const [networkMapSelection, setNetworkMapSelection] = useState("room-01");
  const networkMapScroll = useRef(0);
  const [networkMapReturning, setNetworkMapReturning] = useState(false);
  const [blankingVisit, setBlankingVisit] = useState<{
    rackId: string;
    first: number;
    last: number;
    scroll: number;
    camera: TaskViewMemory | null;
    selected: string;
    query: string;
    filter: ResourceFilter;
    onlyAlarms: boolean;
    layer: typeof layer;
    analysis: boolean;
    inspector: boolean;
  } | null>(null);
  const [blankingRestore, setBlankingRestore] =
    useState<typeof blankingVisit>(null);
  const [spaceSize, setSpaceSize] = useState(2);
  const [spaceVisit, setSpaceVisit] = useState<
    | (SpaceInspection & {
        camera: TaskViewMemory | null;
        query: string;
        filter: ResourceFilter;
        onlyAlarms: boolean;
        size: number;
        form: SpaceFormSnapshot | null;
        selected: string;
        doorOpen: boolean;
        rearDoorOpen: boolean;
        nav: boolean;
        rackView: typeof rackView;
        source: "list" | "segment" | "details";
        detailScroll: number;
        layer: ReviewState["layer"];
        inspector: boolean;
        analysis: boolean;
        metric: "temperature" | "power";
        slice: SliceControls;
      })
    | null
  >(null);
  const [spaceReturning, setSpaceReturning] = useState(false);
  const [spaceRestore, setSpaceRestore] = useState<typeof spaceVisit>(null);
  const captureSpaceForm = useRef<(() => SpaceFormSnapshot) | null>(null);
  useEffect(() => {
    if (
      spaceVisit &&
      !spaceReturning &&
      !spaceInspectionIncludes(spaceVisit, selected, state.deviceId)
    )
      setSpaceVisit(null);
  }, [spaceVisit, spaceReturning, selected, state.deviceId]);
  const [comparisonSize, setComparisonSize] = useState(2);
  const [comparisonRow, setComparisonRow] = useState("all");
  const [comparisonRack, setComparisonRack] = useState<string | null>(null);
  const comparisonScroll = useRef(0);
  const [comparisonStart, setComparisonStart] = useState<number | null>(null);
  const [comparisonVisit, setComparisonVisit] = useState<{
    camera: TaskViewMemory | null;
    range: RackUnitRange;
    scroll: number;
    query: string;
    filter: ResourceFilter;
    onlyAlarms: boolean;
    layer: typeof layer;
    inspector: boolean;
    metric: "temperature" | "power";
  } | null>(null);
  const [comparisonReturning, setComparisonReturning] = useState(false);
  const [comparisonFocus, setComparisonFocus] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [resourceFilter, setFilter] = useState<ResourceFilter>("all");
  const filter = state.level === "device" ? "all" : resourceFilter;
  const [onlyAlarms, setOnlyAlarms] = useState(false);
  const roomAlarms = state.level === "room" && layer === "alarms";
  const navigationView = roomAlarms
    ? onlyAlarms
      ? "alarms"
      : "list"
    : views.includes(rackView)
      ? rackView
      : views[0];
  const [metric, setMetric] = useState<"temperature" | "power">("temperature");
  const [sourceCheck, setSourceCheck] = useState<SourceCheck | null>(null);
  const [sourceVisit, setSourceVisit] = useState<
    | (SourceInspection & {
        key: string;
        anchor: string;
        level: "room" | "rack";
        camera: TaskViewMemory | null;
        nav: boolean;
        analysis: boolean;
        layer: ReviewState["layer"];
        metric: SourceMetric;
        slice: SliceControls;
        query: string;
        filter: ResourceFilter;
        onlyAlarms: boolean;
        rackView: typeof rackView;
        powerLinkId: string | null;
        networkLinkId: string | null;
        scroll: number;
        listScroll: number;
      })
    | null
  >(null);
  const [sourceReturning, setSourceReturning] = useState(false);
  const sourceReturnFocus = useRef<{
    scopeId: string;
    deviceId: string;
    scroll: number;
    listScroll: number;
  } | null>(null);
  const sourceAnchor = `${state.level}:${state.deviceId}:${state.focusRevision}`;
  const peakKey = `${state.replayCycle}:${revision}`;
  const [peakReview, setPeakReview] = useState<{
    scopeId: string;
    key: string;
    value: PeakProcessState;
  } | null>(null);
  const [peakVisit, setPeakVisit] = useState<
    | (PeakInspection & {
        anchor: string;
        level: "room" | "rack";
        camera: TaskViewMemory | null;
        nav: boolean;
        rackView: typeof rackView;
        layer: ReviewState["layer"];
        metric: "temperature" | "power";
        slice: SliceControls;
        query: string;
        filter: ResourceFilter;
        onlyAlarms: boolean;
        scroll: number;
      })
    | null
  >(null);
  const [peakReturning, setPeakReturning] = useState(false);
  const inspectorRef = useRef<HTMLElement>(null);
  const inspectorOpener = useRef<HTMLButtonElement>(null);
  const panelFocus = useRef<"heading" | "opener" | null>(null);
  const returnToDetails = useCallback(() => {
    panelFocus.current = "heading";
    control({ type: "analysis", value: false });
  }, [control]);
  const collapseInspector = useCallback(() => {
    panelFocus.current = "opener";
    setInspector(false);
    control({ type: "analysis", value: false });
  }, [control]);
  useLayoutEffect(() => {
    const destination = panelFocus.current;
    panelFocus.current = null;
    if (destination === "heading")
      inspectorRef.current
        ?.querySelector<HTMLElement>(".study-panel-heading h2")
        ?.focus({ preventScroll: true });
    else if (destination === "opener")
      inspectorOpener.current?.focus({ preventScroll: true });
  }, [inspector, review.analysis]);

  const peakReturnFocus = useRef<{
    scopeId: string;
    deviceId: string;
    scroll: number;
  } | null>(null);
  useEffect(() => {
    if (
      peakReview &&
      (peakReview.key !== peakKey ||
        (!peakReturning &&
          (peakVisit
            ? !peakInspectionIncludes(peakVisit, selected, state.deviceId)
            : !review.analysis || selected !== peakReview.scopeId)))
    ) {
      setPeakReview(null);
      setPeakVisit(null);
      setPeakReturning(false);
      peakReturnFocus.current = null;
    }
  }, [
    peakReview,
    peakVisit,
    peakReturning,
    review.analysis,
    peakKey,
    selected,
    state.deviceId,
  ]);

  useEffect(() => {
    if (!sourceCheck) return;
    if (
      (sourceVisit && sourceVisit.key !== peakKey) ||
      (!sourceReturning &&
        (sourceVisit
          ? !sourceInspectionIncludes(sourceVisit, selected, state.deviceId)
          : selected !== sourceCheck.sourceId))
    ) {
      setSourceCheck(null);
      setSourceVisit(null);
      setSourceReturning(false);
      sourceReturnFocus.current = null;
    }
  }, [
    selected,
    sourceCheck,
    sourceVisit,
    sourceReturning,
    state.deviceId,
    peakKey,
  ]);
  const spatial = useMemo(
    () => spatialSnapshot(state.time, state.replayCycle, state.deviceId),
    [state.time, state.replayCycle, state.deviceId],
  );
  const serviceRack =
    selected === coolingSource.id &&
    inspector &&
    coolingRangeOpen &&
    !review.analysis
      ? coolingRangeState.rackId
      : null;
  const airflowSelection =
    activeAirflowVisit?.deviceId ??
    locatedCoolingDevice ??
    serviceRack ??
    selected;
  const airflow = useMemo(
    () =>
      layer === "airflow" && state.level === "room"
        ? airflowSnapshot(
            state.time,
            spatial.readings,
            airflowSelection,
            state.deviceId,
          )
        : null,
    [
      layer,
      state.level,
      state.time,
      state.deviceId,
      spatial.readings,
      airflowSelection,
    ],
  );
  const [airflowStageView, setAirflowStageView] = useState<AirflowView | null>(
    null,
  );
  const [airflowExplanation, setAirflowExplanation] = useState<
    "summary" | "endpoint" | null
  >(null);
  const [airflowEndpoint, setAirflowEndpoint] = useState<
    FlowEndpoint["kind"] | null
  >(null);
  const airflowDevice = airflow?.routes[0]?.deviceId;
  useEffect(
    () => setAirflowEndpoint(null),
    [airflowDevice, airflowStageView, revision],
  );
  const reading = selectedReading({ ...state, selected }, spatial.readings);
  const currentTemperature = currentMetricValue(reading, "temperature");
  const currentPower = currentMetricValue(reading, "power");
  const powerAttention =
    layer === "power" ? budgetAttentionStyle(reading) : undefined;
  const attentionRatio =
    powerAttention && reading
      ? budgetRatio(currentPower, reading.budget)
      : null;
  const room = spatial.readings.get("room-01")!;
  const resource = resourceCatalog(state.deviceId).find(
    (r) => r.id === selected,
  )!;
  const entity = entityById(selected)!;
  const fixture = fixtureById(selected);
  const environment = environmentProbe(selected);
  const pairedEnvironment =
    environmentPairVisit &&
    layer === "environment" &&
    environmentPairIncludes(environmentPairVisit.pair, selected)
      ? environmentPairVisit.pair
      : null;
  useEffect(() => {
    if (environmentPairVisit && !pairedEnvironment)
      setEnvironmentPairVisit(null);
  }, [environmentPairVisit, pairedEnvironment]);

  useEffect(() => {
    if (environmentReturn && !pairedEnvironment) {
      setEnvironmentReturn(null);
      const button = document.querySelector<HTMLButtonElement>(
        ".environment-comparison-toggle",
      );
      button?.focus({ preventScroll: true });
      button?.scrollIntoView({ block: "nearest" });
    }
  }, [pairedEnvironment, environmentReturn]);
  const maintenance = useMemo(() => maintenanceAreas(selected), [selected]);
  const aisle =
    layer === "overview" && state.level === "room"
      ? maintenanceAisle(selected)
      : undefined;
  const opposite =
    aisle && (aisle.front.rackId === selected ? aisle.rear : aisle.front);
  const component = entity.kind === "part";
  const deviceTemperatureView =
    state.level === "device" && layer === "environment";
  const inspectingInletPair =
    deviceTemperatureView &&
    (inletPair?.firstId === state.deviceId ||
      inletPair?.secondId === state.deviceId);
  const inletComparison =
    component &&
    deviceTemperatureView &&
    (inspectingInletPair || inletInspection?.id === state.deviceId)
      ? spatial.readings.get(state.deviceId)
      : undefined;
  const parentInlet = currentMetricValue(inletComparison, "temperature");
  const inletId = component
    ? state.deviceId
    : entity.kind === "device"
      ? selected
      : null;
  const sliceEvidence = useMemo(
    () =>
      sliceCheck
        ? inspectSliceDevice(
            sliceCheck.deviceId,
            sliceControls,
            spatial.readings,
          )
        : null,
    [sliceCheck?.deviceId, sliceControls, spatial.readings],
  );
  useEffect(() => {
    if (
      sliceCheck &&
      (state.level !== "room" ||
        layer !== "environment" ||
        !inspector ||
        ![sliceCheck.deviceId, sliceCheck.previewId].includes(selected))
    )
      setSliceCheck(null);
  }, [sliceCheck, state.level, layer, inspector, selected]);
  const inletProcessKey = `${inletId}:${state.replayCycle}:${revision}`;
  const [inletProcessReview, setInletProcessReview] = useState<{
    key: string;
    value: InletProcessState;
  } | null>(null);
  useEffect(() => {
    if (
      !review.analysis ||
      !inletId ||
      (inletProcessReview && inletProcessReview.key !== inletProcessKey)
    )
      setInletProcessReview(null);
  }, [review.analysis, inletId, inletProcessKey, inletProcessReview]);
  const pairedInlet =
    inletPair &&
    inletId &&
    [inletPair.firstId, inletPair.secondId].includes(inletId)
      ? inletPair
      : null;
  const canStartInletPair =
    state.level === "room" &&
    navigationView === "inlet" &&
    layer === "environment" &&
    !!inletReference &&
    !!inletId &&
    inletId !== inletReference;
  const startInletPair = () => {
    if (pairedInlet || !canStartInletPair) return;
    beginInletInspection(inletId);
    setInletPair({
      firstId: inletId,
      secondId: inletReference,
      slice: sliceControls,
    });
    setInletSelection(inletId);
    inletSlice.current = sliceControls;
  };
  const requestInletView = (action: InletViewCommand["action"]) => {
    if (action === "observe") startInletPair();
    control({ type: "takeover" });
    setInletViewCommand((current) => ({
      action,
      revision: (current?.revision ?? 0) + 1,
    }));
  };
  useEffect(() => {
    if (inletPair && !pairedInlet) setInletPair(null);
  }, [inletPair, pairedInlet]);
  const powerFacility = isPowerFacility(selected);
  const coolingFacility = isCoolingSource(selected);
  const associatedDevices = useMemo(
    () =>
      new Set(
        coolingFacility ? coolingDeviceIds(selected) : powerDeviceIds(selected),
      ),
    [selected],
  );
  const ready =
    !review.pendingId &&
    !review.pendingEndpoint &&
    !!feedback?.settled &&
    feedback.key === presentationKey(state);
  useEffect(() => {
    if (!pendingPatch) return;
    if (networkTrace?.id === pendingPatch) {
      // 展开设备时先让原有归位流程完成，再在已就位的机柜打开走线。
      if (review.pendingId === networkTrace.target) return;
      if (patchAvailable) {
        if (!patchActive) {
          setPatchEntry({ doorOpen: state.doorOpen });
          control({ type: "scene", action: { type: "door", open: true } });
          return;
        }
        if (!ready) return;
        setNetworkViewCommand((current) => ({
          action: "observe",
          revision: (current?.revision ?? 0) + 1,
        }));
      }
    }
    setPendingPatch(null);
  }, [
    pendingPatch,
    ready,
    patchAvailable,
    patchActive,
    networkTrace,
    state.doorOpen,
    review.pendingId,
  ]);
  useEffect(() => {
    if (!fanVisit) return;
    if (!activeFanVisit) {
      setFanVisit(null);
      return;
    }
    if (fanVisit.pending && ready && canInspectPart(state)) {
      setFanVisit({ ...fanVisit, pending: false });
      setFanViewRevision((n) => n + 1);
      setFanFocusRevision((n) => n + 1);
    } else if (
      fanAssembly(state.deviceId)!.fans.some((fan) => fan.id === selected) &&
      fanVisit.fanId !== selected
    ) {
      setFanVisit({ ...fanVisit, fanId: selected });
    } else if (
      fanVisit.mode === "single" &&
      (selected === state.deviceId ||
        selected === fanAssembly(state.deviceId)!.group.id)
    ) {
      setFanVisit({ ...fanVisit, mode: "group" });
      setFanViewRevision((n) => n + 1);
    }
  }, [fanVisit, activeFanVisit, ready, state, selected]);
  useEffect(() => {
    if (!storageVisit) return;
    if (!activeStorageVisit) {
      setStorageVisit(null);
      return;
    }
    if (storageVisit.pending && ready && canInspectPart(state)) {
      setStorageVisit({ ...storageVisit, pending: false });
      setStorageViewRevision((n) => n + 1);
      setStorageFocusRevision((n) => n + 1);
    } else if (
      storageVisit.mode === "contact" &&
      (selected === state.deviceId || selected === storageDriveGroup)
    ) {
      setStorageVisit({ ...storageVisit, mode: "group" });
      setStorageViewRevision((n) => n + 1);
    } else if (
      storageSlots(state.deviceId).some((slot) => slot.id === selected) &&
      storageVisit.diskId !== selected
    ) {
      setStorageVisit({ ...storageVisit, diskId: selected });
    }
  }, [storageVisit, activeStorageVisit, ready, state, selected]);
  useEffect(() => {
    if (
      portVisit &&
      !portReturning &&
      ready &&
      !(portVisit.patch && networkTrace?.source === portVisit.patch.source) &&
      !switchPortIncludes(portVisit.check, selected, state.deviceId)
    )
      setPortVisit(null);
  }, [portVisit, portReturning, ready, selected, state.deviceId, networkTrace]);
  useEffect(() => {
    if (
      !portReturning ||
      !portVisit ||
      !ready ||
      state.level !== portVisit.level
    )
      return;
    if (
      state.level === "rack" &&
      portVisit.patch &&
      (state.doorOpen !== portVisit.patch.doorOpen ||
        state.rearDoorOpen !== portVisit.patch.rearDoorOpen)
    ) {
      control({
        type: "scene",
        action: { type: "door", open: portVisit.patch.doorOpen },
      });
      control({
        type: "scene",
        action: { type: "rear-door", open: portVisit.patch.rearDoorOpen },
      });
      return;
    }
    control({ type: "pick", id: portVisit.check.switchId });
    control({ type: "layer", layer: "overview" });
    control({ type: "analysis", value: false });
    setNetworkLinkId(
      switchPortRows(portVisit.check.switchId).find(
        (row) => row.port === portVisit.check.port,
      )?.link?.id ?? null,
    );
    setPortCheck(portVisit.check);
    if (portVisit.patch) setPatchEntry(portVisit.patch.entry);
    setQuery(portVisit.query);
    setFilter(portVisit.filter);
    setOnlyAlarms(portVisit.onlyAlarms);
    setMetric(portVisit.metric);
    setRackView(portVisit.rackView);
    setInspector(true);
    skipNavigationSearch.current = true;
    setNav(matchMedia("(max-width: 1099px)").matches ? false : portVisit.nav);
    portReturnFocus.current = {
      check: portVisit.check,
      offset: portVisit.portOffset,
      localActionsOpen: portVisit.localActionsOpen,
    };
    setPortReturning(false);
    setPortVisit(null);
  }, [
    portReturning,
    portVisit,
    ready,
    state.level,
    state.doorOpen,
    state.rearDoorOpen,
  ]);
  useEffect(() => {
    const target = portReturnFocus.current;
    if (
      !target ||
      !ready ||
      selected !== target.check.switchId ||
      review.analysis
    )
      return;
    const frame = requestAnimationFrame(() => {
      const panel = inspectorRef.current;
      const button = panel?.querySelector<HTMLButtonElement>(
        `.switch-ports [data-port="${target.check.port}"]`,
      );
      if (!panel || !button) return;
      const section = button.closest("details");
      if (section) section.open = true;
      const localActions = panel.querySelector<HTMLDetailsElement>(
        ".switch-local-actions",
      );
      if (localActions) localActions.open = target.localActionsOpen;
      button.focus({ preventScroll: true });
      const offset = Math.min(
        target.offset,
        panel.clientHeight - button.offsetHeight,
      );
      panel.scrollTop +=
        button.getBoundingClientRect().top -
        panel.getBoundingClientRect().top -
        offset;
      portReturnFocus.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [portVisit, portCheck, ready, selected, review.analysis]);

  useEffect(() => {
    if (
      powerOverviewVisit &&
      !powerOverviewReturning &&
      ready &&
      !powerOverviewIncludes(powerOverviewVisit.id, selected, state.deviceId)
    )
      setPowerOverviewVisit(null);
  }, [
    powerOverviewVisit,
    powerOverviewReturning,
    ready,
    selected,
    state.deviceId,
  ]);
  useEffect(() => {
    if (
      !powerOverviewReturning ||
      !powerOverviewVisit ||
      !ready ||
      state.level !== "room"
    )
      return;
    control({ type: "pick", id: powerOverviewVisit.id });
    control({ type: "layer", layer: "power" });
    control({ type: "analysis", value: false });
    setMetric("power");
    const origin = powerOverviewVisit.feeder;
    setRackView(origin ? "feeders" : "power");
    if (origin) {
      setFeeders(origin.selection);
      feederScroll.current = origin.scroll;
      setFeederRestore(origin.linkId);
      setPowerLinkId(origin.linkId);
    }
    setPowerQuery(powerOverviewVisit.listQuery);
    setPowerFilter(powerOverviewVisit.listFilter);
    setPowerScope(powerOverviewVisit.scope);
    setPowerOrder(powerOverviewVisit.order);
    powerScroll.current = powerOverviewVisit.scroll;
    setQuery(powerOverviewVisit.query);
    setFilter(powerOverviewVisit.filter);
    setOnlyAlarms(powerOverviewVisit.onlyAlarms);
    skipNavigationSearch.current = true;
    setNav(true);
    setInspector(
      powerOverviewVisit.inspector &&
        !matchMedia("(max-width: 1099px)").matches,
    );
    setPowerRestore((value) => value + 1);
    setPowerOverviewReturning(false);
    setPowerOverviewVisit(null);
  }, [powerOverviewReturning, powerOverviewVisit, ready, state.level]);
  useEffect(() => {
    if (
      smokeVisit &&
      !smokeReturning &&
      ready &&
      (!isSmokeFixture(selected) || layer !== "overview")
    )
      setSmokeVisit(null);
  }, [smokeVisit, smokeReturning, ready, selected, layer]);
  useEffect(() => {
    if (
      !smokeVisit ||
      !smokeReturning ||
      !ready ||
      state.level !== "room" ||
      selected !== smokeVisit.id
    )
      return;
    control({ type: "layer", layer: smokeVisit.layer });
    control({ type: "analysis", value: smokeVisit.analysis });
    setQuery(smokeVisit.query);
    setFilter(smokeVisit.filter);
    setOnlyAlarms(smokeVisit.onlyAlarms);
    skipNavigationSearch.current = true;
    setNav(matchMedia("(max-width: 1099px)").matches ? false : smokeVisit.nav);
    setInspector(true);
    setSmokeVisit(null);
    setSmokeReturning(false);
    setSmokeRestore(true);
  }, [smokeVisit, smokeReturning, ready, state.level, selected]);
  useEffect(() => {
    if (!smokeRestore || !ready) return;
    const frame = requestAnimationFrame(() => {
      const entry =
        document.querySelector<HTMLButtonElement>("[data-smoke-start]");
      const target = entry?.getClientRects().length
        ? entry
        : stageRef.current?.querySelector<HTMLElement>(".review-camera select");
      target?.focus({ preventScroll: true });
      setSmokeRestore(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [smokeRestore, ready, review.analysis, inspector]);
  useEffect(() => {
    if (
      inletInspection &&
      !inletReturning &&
      !pairedInlet &&
      ready &&
      state.level === "room" &&
      (rackView !== "inlet" || inletInspection.id !== selected)
    )
      setInletInspection(null);
  }, [
    inletInspection,
    inletReturning,
    pairedInlet,
    ready,
    state.level,
    rackView,
    selected,
  ]);
  useEffect(() => {
    if (
      inletAirflowVisit &&
      !inletAirflowReturning &&
      ready &&
      !inletAirflowIncludes(inletAirflowVisit.id, selected, state.deviceId)
    )
      setInletAirflowVisit(null);
  }, [
    inletAirflowVisit,
    inletAirflowReturning,
    ready,
    selected,
    state.deviceId,
  ]);
  useEffect(() => {
    if (
      !inletAirflowVisit ||
      !inletAirflowReturning ||
      !ready ||
      state.level !== "room" ||
      selected !== inletAirflowVisit.id
    )
      return;
    setRackView("inlet");
    setInletSelection(inletAirflowVisit.id);
    setInletRack(inletAirflowVisit.rack);
    setInletQuery(inletAirflowVisit.query);
    setInletScope(inletAirflowVisit.scope);
    setInletOrder(inletAirflowVisit.order);
    setInletFilter(inletAirflowVisit.filter);
    setSliceControls(inletAirflowVisit.slice);
    inletScroll.current = inletAirflowVisit.scroll;
    setQuery(inletAirflowVisit.resourceQuery);
    setFilter(inletAirflowVisit.resourceFilter);
    setOnlyAlarms(inletAirflowVisit.onlyAlarms);
    skipNavigationSearch.current = true;
    control({ type: "analysis", value: false });
    setMetric("temperature");
    setNav(true);
    setInspector(
      inletAirflowVisit.inspector && !matchMedia("(max-width: 1099px)").matches,
    );
    setInletRestoreRevision((value) => value + 1);
    setInletAirflowVisit(null);
    setInletAirflowReturning(false);
  }, [inletAirflowVisit, inletAirflowReturning, ready, state.level, selected]);
  const alarmQueueVisible = navigationView === "alarms";
  const inspectedAlarm =
    alarmQueueVisible && alarmVisit?.id === selected ? alarmVisit : null;
  const alarmSample =
    alarmQueueVisible && entity.kind === "device"
      ? spatial.samples.get(selected)
      : undefined;
  useEffect(() => {
    if (
      alarmVisit &&
      !alarmReturning &&
      ready &&
      !alarmVisitIncludes(alarmVisit, selected, state.deviceId)
    )
      setAlarmVisit(null);
  }, [alarmVisit, alarmReturning, ready, selected, state.deviceId]);
  useEffect(() => {
    if (
      !alarmReturning ||
      !alarmVisit ||
      state.level !== "room" ||
      !ready ||
      review.pendingId
    )
      return;
    control({ type: "pick", id: alarmVisit.id });
    control({ type: "layer", layer: "alarms" });
    control({ type: "analysis", value: false });
    setMetric("temperature");
    setRackView("list");
    setOnlyAlarms(true);
    skipNavigationSearch.current = true;
    setNav(true);
    if (matchMedia("(max-width: 1099px)").matches) setInspector(false);
    else setInspector(alarmVisit.inspector);
    setAlarmQuery(alarmVisit.query);
    setAlarmSeverity(alarmVisit.filter);
    alarmScroll.current = alarmVisit.scroll;
    setAlarmReturned(alarmVisit);
    setAlarmRestore((value) => value + 1);
    setAlarmReturning(false);
    setAlarmVisit(null);
  }, [alarmReturning, alarmVisit, state.level, ready, review.pendingId]);
  useEffect(() => {
    if (
      !layoutReturning ||
      !layoutVisit ||
      state.level !== "room" ||
      !ready ||
      review.pendingId
    )
      return;
    control({ type: "pick", id: layoutVisit.id });
    layoutScroll.current = layoutVisit.origin.scroll;
    setLayoutCrossing(layoutVisit.crossing?.id ?? null);
    if (layoutVisit.grille) setSliceControls(layoutVisit.grille.slice);
    if (layoutVisit.power) {
      setPowerLinkId(layoutVisit.power.linkId);
      setPduInspection(layoutVisit.power.inspection);
    }
    setLayoutQuery(layoutVisit.query);
    control({ type: "layer", layer: layoutVisit.layer });
    control({ type: "analysis", value: false });
    setMetric(layoutVisit.metric);
    setRackView("layout");
    skipNavigationSearch.current = true;
    setNav(true);
    if (matchMedia("(max-width: 1099px)").matches) setInspector(false);
    else setInspector(layoutVisit.origin.inspector);
    setLayoutRestore((value) => value + 1);
    setLayoutReturning(false);
    setLayoutVisit(null);
  }, [layoutReturning, layoutVisit, state.level, ready, review.pendingId]);
  useEffect(() => {
    // 镜头回位可能在操作条换回后才开始。保留焦点请求，直到用户再次操作。
    const release = () => {
      partSequenceFocus.current = null;
    };
    document.addEventListener("pointerdown", release, true);
    document.addEventListener("keydown", release, true);
    return () => {
      release();
      document.removeEventListener("pointerdown", release, true);
      document.removeEventListener("keydown", release, true);
    };
  }, [state.level, state.deviceId]);
  useEffect(() => {
    if (!ready || !partSequenceFocus.current) return;
    const frame = requestAnimationFrame(() => {
      const target = partSequenceFocus.current;
      if (!target) return;
      const actions = stageRef.current?.querySelector(".review-object-actions");
      const button = actions?.querySelector<HTMLElement>(
        `[data-part-action="${target}"]`,
      );
      const fallback =
        actions?.querySelector<HTMLElement>('[data-part-action="heading"]') ??
        actions?.querySelector<HTMLElement>("button:enabled");
      (button && !(button instanceof HTMLButtonElement && button.disabled)
        ? button
        : fallback
      )?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, selected, isolatedPartId]);

  useEffect(() => {
    if (!pduReturning) return;
    const cancel = () => setPduReturning(false);
    document.addEventListener("pointerdown", cancel, true);
    document.addEventListener("keydown", cancel, true);
    return () => {
      document.removeEventListener("pointerdown", cancel, true);
      document.removeEventListener("keydown", cancel, true);
    };
  }, [pduReturning]);
  useEffect(() => {
    if (
      !pduReturning ||
      powerViewPaired ||
      !ready ||
      review.analysis ||
      selected !== pduInspection?.pduId ||
      state.selected !== selected ||
      state.level !== "rack"
    )
      return;
    const row = inspectorRef.current?.querySelector<HTMLButtonElement>(
      '.pdu-outlet-map button[aria-pressed="true"]',
    );
    if (row) {
      const section = row.closest("details");
      if (section) section.open = true;
      row.closest(".pdu-outlets")?.scrollIntoView({ block: "start" });
      row.focus({ preventScroll: true });
      row.scrollIntoView({ block: "nearest" });
    }
    setPduReturning(false);
  }, [
    pduReturning,
    powerViewPaired,
    ready,
    selected,
    review.analysis,
    pduInspection?.pduId,
    state.selected,
    state.level,
  ]);

  useEffect(() => {
    if (!comparisonVisit || state.level !== "room" || !ready) return;
    if (!comparisonReturning) {
      setComparisonVisit(null);
      return;
    }
    const { range } = comparisonVisit;
    if (selected !== range.rackId || layer !== comparisonVisit.layer) {
      control({ type: "pick", id: range.rackId });
      control({ type: "layer", layer: comparisonVisit.layer });
      return;
    }
    setRackView("space");
    setComparisonRack(range.rackId);
    setComparisonStart(range.first);
    comparisonScroll.current = comparisonVisit.scroll;
    setQuery(comparisonVisit.query);
    setFilter(comparisonVisit.filter);
    setOnlyAlarms(comparisonVisit.onlyAlarms);
    setMetric(comparisonVisit.metric);
    setInspector(
      comparisonVisit.inspector && !matchMedia("(max-width: 1099px)").matches,
    );
    skipNavigationSearch.current = !nav;
    setNav(true);
    setComparisonFocus(true);
    setComparisonVisit(null);
    setComparisonReturning(false);
  }, [
    comparisonVisit,
    comparisonReturning,
    state.level,
    ready,
    selected,
    layer,
    nav,
  ]);
  useEffect(() => {
    if (
      !networkMapReturning ||
      state.level !== "room" ||
      !ready ||
      review.pendingId
    )
      return;
    const destination = networkMapVisit?.selection ?? networkMapSelection;
    if (selected !== destination || layer !== "overview") {
      control({ type: "pick", id: destination });
      control({ type: "layer", layer: "overview" });
      return;
    }
    setRackView("network");
    if (networkMapVisit) {
      setNetworkMapScope(networkMapVisit.scope);
      setNetworkMapRole(networkMapVisit.role);
      setNetworkMapRack(networkMapVisit.rack);
      setNetworkMapQuery(networkMapVisit.query);
      networkMapScroll.current = networkMapVisit.scroll;
      networkMapFocus.current =
        networkMapVisit.linkId ?? networkMapVisit.selection;
    }
    setNetworkLinkId(networkMapVisit?.linkId ?? null);
    setInspector(
      !!networkMapVisit?.inspector &&
        !matchMedia("(max-width: 1099px)").matches,
    );
    skipNavigationSearch.current = !nav;
    setNav(true);
    setNetworkMapRestore((n) => n + 1);
    setNetworkMapReturning(false);
    setNetworkMapVisit(null);
  }, [
    networkMapReturning,
    state.level,
    ready,
    review.pendingId,
    networkMapVisit,
    networkMapSelection,
    selected,
    layer,
    nav,
  ]);
  useEffect(() => {
    if (
      !networkMapReturning &&
      networkMapVisit &&
      state.level === "room" &&
      ready &&
      rackView !== "network"
    )
      setNetworkMapVisit(null);
  }, [networkMapReturning, networkMapVisit, state.level, ready, rackView]);
  useEffect(() => {
    const target = networkControlFocus.current;
    if (!target) return;
    if (target !== "endpoint" && !ready) return;
    networkControlFocus.current = null;
    inspectorRef.current
      ?.querySelector<HTMLElement>(
        target === "branch"
          ? ".network-trace select"
          : target === "port"
            ? ".network-check-port"
            : '.network-endpoint-picker button[aria-pressed="true"]',
      )
      ?.focus({ preventScroll: target !== "port" });
  }, [selected, activeNetworkLink, ready, portCheck]);
  useEffect(() => {
    if (!crossingInspectPending.current || !crossing || !ready) return;
    const details = document.querySelector<HTMLElement>(".crossing-details");
    if (!details) return;
    const panel = details.closest<HTMLElement>(".study-inspector");
    if (panel) {
      const heading = panel.querySelector<HTMLElement>(".study-panel-heading");
      panel.scrollTop +=
        details.getBoundingClientRect().top -
        panel.getBoundingClientRect().top -
        (heading?.getBoundingClientRect().height ?? 0) -
        12;
    }
    details.focus({ preventScroll: true });
    crossingInspectPending.current = false;
  }, [crossing, ready]);
  useEffect(() => {
    if (!crossingReturning.current || crossing || !ready) return;
    crossingReturning.current = false;
    const entry = crossingEntry.current?.element;
    if (entry?.isConnected && entry.getClientRects().length) {
      entry.focus({ preventScroll: true });
      const panel = entry.closest<HTMLElement>(".study-inspector");
      if (panel) panel.scrollTop = crossingEntry.current!.scroll;
    } else
      document
        .querySelector<HTMLElement>(
          ".review-camera select, .review-camera button",
        )
        ?.focus();
  }, [crossing, ready]);
  const unitQuery = useMemo(
    () =>
      rackUnitQuery({ level: state.level, deviceId: state.deviceId }, query),
    [state.level, state.deviceId, query],
  );
  const spaceRange =
    state.level === "rack" &&
    unitQuery &&
    !unitQuery.error &&
    !unitQuery.terms.length &&
    unitQuery.rack?.id === rackForDevice(state.deviceId).id
      ? {
          rackId: unitQuery.rack.id,
          first: unitQuery.first,
          last: unitQuery.last,
        }
      : null;
  useEffect(() => {
    if (!rangeReturning.current || rangeView || !ready) return;
    rangeReturning.current = false;
    const entry = rangeEntry.current;
    if (entry?.isConnected && entry.getClientRects().length)
      entry.focus({ preventScroll: true });
    else {
      const side = entry?.dataset.rangeView;
      const panel = nav ? navigationRef.current : inspectorRef.current;
      const action = panel?.querySelector<HTMLElement>(
        side ? `[data-range-view="${side}"]` : '[aria-label="观察范围分段"]',
      );
      (action ?? navigationOpenerRef.current)?.focus({ preventScroll: true });
    }
  }, [rangeView, ready]);
  useEffect(() => {
    if (!blankingVisit) return;
    if (
      state.level !== "rack" ||
      rackView !== "space" ||
      spaceRange?.rackId !== blankingVisit.rackId ||
      spaceRange.first !== blankingVisit.first ||
      spaceRange.last !== blankingVisit.last
    ) {
      setBlankingVisit(null);
    }
  }, [
    blankingVisit,
    rackView,
    state.level,
    spaceRange?.rackId,
    spaceRange?.first,
    spaceRange?.last,
  ]);
  const returnBlanking = () => {
    if (!blankingVisit || !ready) return;
    const origin = blankingVisit;
    control({ type: "pick", id: origin.selected });
    control({ type: "layer", layer: origin.layer });
    control({ type: "analysis", value: origin.analysis });
    setQuery(origin.query);
    setOnlyAlarms(origin.onlyAlarms);
    setFilter(origin.filter);
    skipNavigationSearch.current = true;
    setInspector(
      !matchMedia("(max-width: 1099px)").matches && origin.inspector,
    );
    setNav(true);
    setRackView("installation");
    setBlankingRestore(origin);
    setBlankingVisit(null);
  };
  const finishBlankingFocus = useCallback(() => setBlankingRestore(null), []);
  const segments = useMemo(
    () => rangeSegments(spaceRange),
    [spaceRange?.rackId, spaceRange?.first, spaceRange?.last],
  );
  const activeSegmentId =
    rangeView && segments.some((segment) => segment.id === rangeSegmentId)
      ? rangeSegmentId
      : null;
  const requestRangeSegment = (id: string | null) =>
    requestRangeView(rangeView ?? "front", id);
  const inspectRangeDevice = (
    id: string,
    source: "list" | "segment" | "details" = "details",
  ) => {
    const visit = spaceRange && beginSpaceInspection(spaceRange, id);
    if (!visit || !ready) return;
    setSpaceRestore(null);
    setSpaceVisit({
      ...visit,
      camera: captureTaskView.current?.("rack") ?? null,
      query,
      filter,
      onlyAlarms,
      size: spaceSize,
      form: captureSpaceForm.current?.() ?? null,
      selected,
      doorOpen: state.doorOpen,
      rearDoorOpen: state.rearDoorOpen,
      nav,
      rackView,
      source,
      detailScroll: inspectorRef.current?.scrollTop ?? 0,
      layer,
      inspector,
      analysis: review.analysis,
      metric,
      slice: sliceControls,
    });
    setRackView("installation");
    setQuery(id);
    setFilter("all");
    setOnlyAlarms(false);
    pick(id);
    control({ type: "layer", layer: "overview" });
    control({ type: "analysis", value: false });
  };
  const blanking =
    filter === "all" && !(onlyAlarms && state.level !== "device")
      ? unitQuery?.blanking
      : undefined;
  const rows = useMemo(
    () =>
      visibleResourceRows(
        findResources(state, query, filter, unitQuery),
        spatial.readings,
        onlyAlarms && state.level !== "device",
      ),
    [state, query, filter, onlyAlarms, spatial, unitQuery],
  );
  const browsingRoom =
    state.level === "room" && layer === "overview" && !activeNetworkLink;
  const roomResourceList =
    browsingRoom && (rackView === "list" || rackView === "installation");
  const roomLayoutDevices =
    browsingRoom && rackView === "layout" && layoutScope === "equipment";
  const roomDevice =
    roomResourceList || roomLayoutDevices ? deviceById(selected) : undefined;
  const roomSearchOrigin = useRef<{
    id: string;
    query: string;
    filter: ResourceFilter;
  } | null>(null);
  const roomSearchFocus = useRef<string | null>(null);
  useEffect(() => {
    const origin = roomSearchOrigin.current;
    if (!origin) return;
    if (
      layer !== "overview" ||
      tour.mode !== "manual" ||
      activeNetworkLink ||
      (rackView !== "list" && rackView !== "installation") ||
      rackForDevice(origin.id).id !== rackForDevice(state.deviceId).id
    ) {
      roomSearchOrigin.current = null;
      return;
    }
    if (state.level !== "room" || review.pendingId) return;
    roomSearchOrigin.current = null;
    if (selected !== "room-01") return;
    setQuery(origin.query);
    setFilter(origin.filter);
    control({ type: "pick", id: origin.id });
    roomSearchFocus.current = origin.id;
  }, [
    state.level,
    state.deviceId,
    layer,
    rackView,
    tour.mode,
    activeNetworkLink,
    review.pendingId,
    selected,
  ]);
  useEffect(() => {
    if (!roomSearchFocus.current || selected !== roomSearchFocus.current)
      return;
    roomSearchFocus.current = null;
    const row = navigationRef.current?.querySelector<HTMLButtonElement>(
      ".study-resource.selected .study-resource-text",
    );
    if (nav && row?.getClientRects().length) {
      row.focus({ preventScroll: true });
      row.scrollIntoView({ block: "nearest" });
    }
  }, [selected, nav]);
  const browsingParts =
    state.level === "device" && !query.trim() && filter === "all";
  const visibleRows = browsingParts
    ? rows
        .filter((row) => !row.parent)
        .flatMap((row) => [
          row,
          ...(expanded.includes(row.id)
            ? rows.filter((child) => child.parent === row.id)
            : []),
        ])
    : rows;
  const coolingHistories = useMemo(
    () => (coolingFacility ? reviewCoolingHistories() : null),
    [coolingFacility],
  );
  const coolingRange = coolingFacility
    ? coolingSummary([...associatedDevices], spatial.readings)
    : null;
  const histories = useMemo(
    () =>
      fixture
        ? { temperature: [], power: [] }
        : coolingHistories
          ? { temperature: coolingHistories.temperature, power: [] }
          : reviewHistories(selected, state.deviceId),
    [selected, state.deviceId, coolingHistories, fixture],
  );
  const scope = devices.filter(
    (d) =>
      (powerFacility || coolingFacility
        ? associatedDevices.has(d.id)
        : entity.kind === "room") ||
      (entity.kind === "rack" && d.rackId === selected) ||
      d.id === (component ? state.deviceId : selected),
  );
  const events = useMemo(
    () =>
      reviewEvents(
        scope.map((d) => d.id),
        state.time,
        state.replayCycle,
      ),
    [selected, state.deviceId, state.time, state.replayCycle],
  );
  const signal = signalStyles[signalFor(reading)];
  const returnAirflowResponse = () => {
    if (!activeAirflowResponse || !ready) return;
    const origin = activeAirflowResponse;
    responsePreserveView.current?.();
    responsePreserveView.current = null;
    responseReturnScroll.current = origin.scroll;
    setAirflowResponse(null);
    control({ type: "analysis", value: origin.analysis });
    setInspector(origin.inspector);
    setNav(origin.nav);
  };
  useEffect(() => {
    if (!ready || responseReturnScroll.current === null) return;
    const timer = window.setTimeout(() => {
      if (inspectorRef.current)
        inspectorRef.current.scrollTop = responseReturnScroll.current ?? 0;
      const entry = document.querySelector<HTMLElement>(
        "[data-airflow-response-entry]",
      );
      if (entry) {
        let parent = entry.parentElement;
        while (parent) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
          parent = parent.parentElement;
        }
        entry.focus({ preventScroll: true });
      }
      responseReturnScroll.current = null;
    }, 120);
    return () => clearTimeout(timer);
  }, [ready, activeAirflowResponse, inspector, nav]);
  const dispatch = useCallback(
    (action: Action) => control({ type: "scene", action }),
    [],
  );
  const takeover = useCallback(() => control({ type: "takeover" }), []);
  const rememberRoomSearch = useCallback(
    (id: string) => {
      if (
        roomResourceList &&
        (query.trim() || filter !== "all") &&
        deviceById(id) &&
        rows.some((row) => row.id === id)
      ) {
        roomSearchOrigin.current = { id, query, filter };
        setRackView("installation");
      }
    },
    [roomResourceList, query, filter, rows],
  );
  const selectObject = useCallback(
    (id: string, enter = false) => {
      setAirflowVisit(null);
      setPowerLinkId((current) =>
        powerContextIncludes(id, state.deviceId, current) ? current : null,
      );
      setNetworkLinkId((current) =>
        networkContextIncludes(id, state.deviceId, current) ? current : null,
      );
      if (state.level === "room" && rackView === "inlet") {
        const rack = rackById(id)?.id ?? deviceById(id)?.rackId;
        if (rack) {
          setInletRack(rack);
          setInletSelection(id);
          if (
            !inletView ||
            ![inletView.pair.firstId, inletView.pair.secondId].includes(id)
          ) {
            const target = roomAirflowTarget(id, state.deviceId);
            setSliceControls((current) =>
              alignAirflowSlice(current, target?.rowId ?? null),
            );
          }
        }
      }
      if (enter) rememberRoomSearch(id);
      control({ type: enter ? "open-resource" : "pick", id });
      if (
        inspectingInletPair &&
        review.analysis &&
        entityById(id)?.kind === "part"
      )
        control({ type: "analysis", value: false });
      if (enter && !fixtureById(id)) {
        setQuery("");
        setFilter("all");
      }
    },
    [
      state.level,
      state.deviceId,
      rackView,
      inletView,
      inspectingInletPair,
      review.analysis,
      rememberRoomSearch,
    ],
  );
  const pick = useCallback(
    (id: string, enter = false, keepNavigation = false) => {
      selectObject(id, enter);
      setInspector(true);
      if (!keepNavigation && matchMedia("(max-width: 1099px)").matches)
        setNav(false);
    },
    [selectObject],
  );
  const stageRef = useRef<HTMLElement>(null);
  const focus = (
    id: string,
    {
      revealStage = matchMedia("(max-width: 600px)").matches,
      installation = false,
      showDetails = true,
    } = {},
  ) => {
    setAirflowVisit(null);
    setNetworkLinkId((current) =>
      networkContextIncludes(id, state.deviceId, current) ? current : null,
    );
    setPowerLinkId((current) =>
      powerContextIncludes(id, state.deviceId, current) ? current : null,
    );
    if (installation) rememberRoomSearch(id);
    control({
      type: installation ? "locate-installation" : "focus-resource",
      id,
    });
    if (showDetails) {
      setInspector(true);
      if (matchMedia("(max-width: 1099px)").matches) setNav(false);
    }
    if (revealStage) {
      stageRef.current?.focus({ preventScroll: true });
      stageRef.current?.scrollIntoView({ block: "nearest" });
    }
  };
  const captureLayoutOrigin = () => ({
    camera: captureTaskView.current?.("room") ?? null,
    inspector,
    scroll: layoutScroll.current,
  });
  const rememberLayoutSelection = (id: string) => {
    const powerCabinet = id === powerSettings.sourceId;
    if (layoutVisit?.id === id) return;
    setLayoutVisit({
      id,
      layer,
      metric,
      query: layoutQuery,
      origin: captureLayoutOrigin(),
      power: powerCabinet
        ? { linkId: powerLinkId, inspection: pduInspection }
        : undefined,
    });
    setLayoutReturning(false);
    setLayoutRestore(0);
  };
  const openLayoutInstallation = (id: string) => {
    // 从服务范围继续查看关联设备时，布置图的起点仍是制冷单元。
    if (
      !coolingVisit ||
      layoutVisit?.id !== coolingSource.id ||
      !coolingRangeIncludes(coolingVisit.rackId, id, state.deviceId)
    )
      rememberLayoutSelection(id);
    setRackView("installation");
    setQuery("");
    setFilter("all");
    setOnlyAlarms(false);
    if (rackById(id)) selectObject(id, true);
    else {
      control({ type: "analysis", value: false });
      focus(id, { installation: true, showDetails: false });
    }
  };
  const analyzeEnvironmentPair = (otherId: string) => {
    if (!pairedEnvironment) {
      const pair = environmentPair(selected, otherId);
      if (!pair) return;
      setEnvironmentPairVisit({
        camera: captureTaskView.current?.("room") ?? null,
        pair,
        layer,
        analysis: review.analysis,
        nav,
      });
      setEnvironmentPairMetric("ambientTemperature");
      control({ type: "layer", layer: "environment" });
    }
    analyze();
  };
  const returnEnvironmentPair = () => {
    if (!environmentPairVisit) return;
    const origin = environmentPairVisit;
    if (environmentView && !origin.camera) requestEnvironmentView("return");
    setEnvironmentReturn(origin);
    setEnvironmentPairVisit(null);
    pick(origin.pair.firstId);
    control({ type: "layer", layer: origin.layer });
    control({ type: "analysis", value: origin.analysis });
    setEnvironmentComparisonOpen(true);
    setNav(origin.nav && !matchMedia("(max-width: 1099px)").matches);
  };
  const locateEventDevice = (id: string) => {
    setQuery("");
    setFilter("all");
    if (state.playing) dispatch({ type: "seek", time: state.time });
    focus(id, { revealStage: true, installation: true });
  };
  const eventHeading = useRef<HTMLHeadingElement>(null);
  const inletHeading = useRef<HTMLElement>(null);
  const jumpToEvents = useRef(false);
  useEffect(() => {
    if (review.analysis && jumpToEvents.current) {
      (inletHeading.current ?? eventHeading.current)?.focus();
      jumpToEvents.current = false;
    }
  }, [review.analysis]);
  const analyze = () => {
    control({ type: "analysis", value: true });
    setInspector(true);
    if (matchMedia("(max-width: 1099px)").matches) setNav(false);
  };
  const beginAlarmInspection = (
    id: string,
    action: "preview" | "installation" | "internal" | "analysis",
    previous?: AlarmVisit,
  ) => {
    const reading = spatial.readings.get(id);
    if (action !== "preview" && !ready) return;
    if (alarmVisit?.id !== id) {
      const origin =
        previous ??
        (reading?.alarm && reading.quality === "valid"
          ? {
              id,
              time: state.time,
              severity: reading.alarm,
              temperature: reading.temperature,
            }
          : null);
      if (!origin) return;
      setAlarmVisit({
        ...origin,
        camera: captureTaskView.current?.("room") ?? null,
        query: alarmQuery,
        filter: alarmSeverity,
        scroll: alarmScroll.current,
        inspector,
      });
    }
    setAlarmReturned(null);
    setAlarmRestore(0);
    setLayoutVisit(null);
    control({ type: "analysis", value: false });
    if (action === "preview") {
      pick(id);
      requestAnimationFrame(() =>
        inspectorRef.current
          ?.querySelector<HTMLElement>(".study-identity h1")
          ?.focus(),
      );
    } else if (action === "analysis") {
      pick(id);
      jumpToEvents.current = true;
      analyze();
      if (review.analysis) {
        jumpToEvents.current = false;
        requestAnimationFrame(() => eventHeading.current?.focus());
      }
    } else {
      setQuery("");
      setFilter("all");
      setRackView("installation");
      if (!reading?.alarm) setOnlyAlarms(false);
      if (action === "installation") focus(id, { installation: true });
      else {
        dispatch({ type: "navigate", level: "device", id });
        setInspector(true);
        if (matchMedia("(max-width: 1099px)").matches) setNav(false);
      }
    }
  };
  const openFeeders = (pduId = feeders.first) => {
    control({ type: "layer", layer: "power" });
    if (pduId !== feeders.first)
      setFeeders({ ...initialFeeders(), first: pduId });
    setRackView("feeders");
    setFeederRestore(null);
    selectObject(pduId);
    setPowerLinkId(null);
    setNav(true);
    if (matchMedia("(max-width: 1099px)").matches) setInspector(false);
  };
  const inspectPowerOverview = (
    id: string,
    action: "installation" | "internal" | "analysis" | "details",
    feederLinkId?: string,
  ) => {
    if (!ready) return;
    setPowerOverviewVisit(
      !feederLinkId && powerOverviewVisit?.id === id
        ? powerOverviewVisit
        : {
            camera: captureTaskView.current?.("room") ?? null,
            feeder: feederLinkId
              ? {
                  selection: feeders,
                  linkId: feederLinkId,
                  scroll: feederScroll.current,
                }
              : undefined,
            listQuery: powerQuery,
            listFilter: powerFilter,
            scope: powerScope,
            order: powerOrder,
            scroll: powerScroll.current,
            id,
            query,
            filter,
            onlyAlarms,
            inspector,
          },
    );
    setPowerRestore(0);
    control({ type: "analysis", value: false });
    setMetric("power");
    if (action === "details" || action === "analysis") {
      pick(id);
      if (action === "analysis") analyze();
    } else {
      setRackView("installation");
      setQuery("");
      setFilter("all");
      setOnlyAlarms(false);
      if (action === "installation") {
        if (rackById(id)) pick(id, true);
        else focus(id, { installation: true });
      } else {
        dispatch({ type: "navigate", level: "device", id });
        setInspector(true);
        if (matchMedia("(max-width: 1099px)").matches) setNav(false);
      }
    }
  };
  const startStructureTool = (tool: StructureTool) => {
    if (!ready || state.level !== "device") return;
    setStructureReturn(null);
    if (tool === "fans") {
      takeover();
      const assembly = fanAssembly(state.deviceId)!;
      const fanId =
        assembly.fans.find((fan) => fan.id === selected)?.id ??
        assembly.fans[0].id;
      setInspectionDevice(null);
      setStorageVisit(null);
      setFanVisit({
        deviceId: state.deviceId,
        mode: "group",
        fanId,
        side: "front",
        pending: true,
      });
      control({ type: "pick", id: fanId });
      control({ type: "analysis", value: false });
      if (!canInspectPart(state)) dispatch({ type: "explode", amount: 1 });
      setInspector(true);
      if (matchMedia("(max-width: 1099px)").matches) setNav(false);
    } else {
      takeover();
      setInspectionDevice(null);
      setFanVisit(null);
      setStorageVisit({
        deviceId: state.deviceId,
        mode: "group",
        diskId: storageSlots(state.deviceId).some(
          (slot) => slot.id === selected,
        )
          ? selected
          : null,
        pending: true,
      });
      control({ type: "pick", id: storageDriveGroup });
      control({ type: "analysis", value: false });
      if (!canInspectPart(state)) dispatch({ type: "explode", amount: 1 });
      setInspector(true);
      if (matchMedia("(max-width: 1099px)").matches) setNav(false);
    }
  };
  const returnFanGroup = () => {
    if (!activeFanVisit || !ready) return;
    setInspector(true);
    if (matchMedia("(max-width: 1099px)").matches) setNav(false);
    setFanVisit({ ...activeFanVisit, mode: "group" });
    control({ type: "pick", id: activeFanVisit.fanId });
    control({ type: "analysis", value: false });
    setFanViewRevision((n) => n + 1);
    setFanFocusRevision((n) => n + 1);
  };
  const returnStorageGroup = () => {
    if (!activeStorageVisit || !ready) return;
    setInspector(true);
    if (matchMedia("(max-width: 1099px)").matches) setNav(false);
    setStorageVisit({ ...activeStorageVisit, mode: "group" });
    if (selected === "sto-midplane" && activeStorageVisit.diskId)
      control({ type: "pick", id: activeStorageVisit.diskId });
    control({ type: "analysis", value: false });
    setStorageViewRevision((n) => n + 1);
    setStorageFocusRevision((n) => n + 1);
  };
  const structureVisit = activeFanVisit ?? activeStorageVisit;
  const finishStructureCheck = () => {
    if (!ready || !structureVisit) return;
    if (inspector)
      setStructureReturn({
        deviceId: state.deviceId,
        tool: activeFanVisit ? "fans" : "storage",
      });
    else partSequenceFocus.current = "heading";
    control({ type: "analysis", value: false });
    setStorageVisit(null);
    setFanVisit(null);
    setInspectionDevice(null);
    control({ type: "finish-part-inspection" });
  };
  const rememberNetworkMap = (selection: string, linkId: string | null) => {
    setNetworkMapVisit({
      camera: captureTaskView.current?.("room") ?? null,
      selection,
      linkId,
      scope: networkMapScope,
      role: networkMapRole,
      rack: networkMapRack,
      query: networkMapQuery,
      scroll: networkMapScroll.current,
      inspector,
    });
  };
  const openNetworkPatch = (link: NetworkLink) => {
    takeover();
    control({ type: "analysis", value: false });
    focus(link.target, { installation: true });
    setNetworkLinkId(link.id);
    setPortCheck(null);
    setPendingPatch(link.id);
  };
  const rememberMarkedConnection = () => {
    if (
      !networkMapVisit &&
      networkTrace &&
      rackView === "network" &&
      state.level === "room"
    )
      rememberNetworkMap(networkTrace.source, networkTrace.id);
  };
  const changeNetworkTrace = (id: string | null) => {
    const link = networkLinkById(id);
    if (link && !networkContextIncludes(selected, state.deviceId, id))
      pick(
        patchActive && selected === networkTrace?.target
          ? link.target
          : link.source,
      );
    setNetworkLinkId(id);
    if (!id) setNetworkMapVisit(null);
  };
  const returnNetworkMap = () => {
    setNetworkMapReturning(true);
    setPortVisit(null);
    control({ type: "analysis", value: false });
    if (state.level !== "room")
      control({ type: "open-resource", id: "room-01" });
  };
  const returnInletAirflow = () => {
    if (!inletAirflowVisit || !ready || inletAirflowReturning) return;
    setInletAirflowReturning(true);
    setAirflowVisit(null);
    setAirflowResponse(null);
    control({ type: "room-inlet", id: inletAirflowVisit.id });
  };
  useEffect(() => {
    if (!airflowOrigin) return;
    if (returningFromAirflow) {
      if (
        state.level === airflowOrigin.pose.level &&
        layer === airflowOrigin.layer &&
        selected === airflowOrigin.selected
      ) {
        if (!ready) return;
        const panel = inspectorRef.current;
        const button =
          airflowOrigin.entry === "details"
            ? panel?.querySelector<HTMLButtonElement>(
                "[data-cooling-airflow-entry]",
              )
            : stageRef.current?.querySelector<HTMLButtonElement>(
                ".airflow-room-entry",
              );
        const section = button?.closest("details");
        if (section) section.open = true;
        if (panel) panel.scrollTop = airflowOrigin.detailScroll;
        button?.focus({ preventScroll: true });
      }
      setReturningFromAirflow(false);
      setAirflowOrigin(null);
    } else if (
      layer !== "airflow" ||
      (ready &&
        (state.level !== "room" ||
          (selected !== airflowOrigin.target && !activeAirflowVisit)))
    ) {
      setAirflowOrigin(null);
    }
  }, [
    airflowOrigin,
    returningFromAirflow,
    ready,
    state.level,
    layer,
    selected,
    activeAirflowVisit,
  ]);
  const returnFromRoomAirflow = () => {
    if (!ready || !airflowOrigin) return;
    setReturningFromAirflow(true);
    setAirflowVisit(null);
    setAirflowResponse(null);
    setQuery(airflowOrigin.query);
    setMetric(airflowOrigin.metric);
    setFilter(airflowOrigin.filter);
    setRackView(airflowOrigin.rackView);
    setOnlyAlarms(airflowOrigin.onlyAlarms);
    setInspector(airflowOrigin.inspector);
    setNav(airflowOrigin.nav);
    control({
      type: "return-airflow-origin",
      pose: airflowOrigin.pose,
      layer: airflowOrigin.layer,
      selected: airflowOrigin.selected,
      analysis: airflowOrigin.analysis,
    });
  };
  const showAirflow = (id: string, entry?: "scene" | "details") => {
    const rememberCloseUp = entry && state.level !== "room";
    const target = roomAirflowTarget(id, state.deviceId);
    if (!target || !ready) return;
    if (rememberCloseUp) {
      const {
        level,
        deviceId,
        doorOpen,
        rearDoorOpen,
        trayExtended,
        coverOpen,
        explosion,
      } = state;
      setAirflowOrigin({
        pose: {
          level,
          deviceId,
          selected: state.selected,
          doorOpen,
          rearDoorOpen,
          trayExtended,
          coverOpen,
          explosion,
        },
        selected,
        target: target.id,
        layer,
        metric,
        entry,
        detailScroll: inspectorRef.current?.scrollTop ?? 0,
        camera: captureTaskView.current?.(level) ?? null,
        nav,
        inspector,
        analysis: review.analysis,
        rackView,
        query,
        filter: resourceFilter,
        onlyAlarms,
      });
    }
    setAirflowVisit(null);
    if (review.analysis && state.playing)
      dispatch({ type: "seek", time: state.time });
    control({ type: "room-airflow", id: target.id });
    if (state.level !== "room") {
      setQuery("");
      setFilter("all");
    }
    setMetric("temperature");
    setOnlyAlarms(false);
    setInspector(!rememberCloseUp);
    if (!rememberCloseUp && matchMedia("(max-width: 1099px)").matches)
      setNav(false);
  };
  const visitSource = (id: string) => {
    if (!sourceCheck) return;
    const target = beginSourceInspection(
      sourceCheck,
      id,
      state.time,
      spatial.readings,
    );
    if (!target) return;
    sourceReturnFocus.current = null;
    setPeakReview(null);
    setPeakVisit(null);
    setPeakReturning(false);
    peakReturnFocus.current = null;
    const level =
      state.level === "rack" && (rackById(selected) || pduById(selected))
        ? "rack"
        : "room";
    setSourceVisit({
      ...target,
      key: peakKey,
      anchor: sourceAnchor,
      level,
      camera: captureTaskView.current?.(level) ?? null,
      nav,
      analysis: review.analysis,
      layer,
      metric,
      slice: sliceControls,
      query,
      filter,
      onlyAlarms,
      rackView,
      powerLinkId,
      networkLinkId,
      scroll: inspectorRef.current?.scrollTop ?? 0,
      listScroll:
        inspectorRef.current?.querySelector(".reading-source-list")
          ?.scrollTop ?? 0,
    });
    pick(id);
  };
  const returnSource = () => {
    if (!sourceVisit || !ready) return;
    const origin = sourceVisit;
    setSourceReturning(true);
    sourceReturnFocus.current = {
      scopeId: origin.check.sourceId,
      deviceId: origin.deviceId,
      scroll: origin.scroll,
      listScroll: origin.listScroll,
    };
    setAirflowVisit(null);
    if (sourceAnchor === origin.anchor) pick(origin.check.sourceId);
    else
      control({
        type: "return-input-scope",
        id: origin.check.sourceId,
        level: origin.level,
      });
    control({ type: "layer", layer: origin.layer });
    control({ type: "analysis", value: origin.analysis });
    setInspector(true);
    setSourceCheck(origin.check);
    setMetric(origin.metric);
    setSliceControls(origin.slice);
    setQuery(origin.query);
    setFilter(origin.filter);
    setOnlyAlarms(origin.onlyAlarms);
    setRackView(origin.rackView);
    setPowerLinkId(origin.powerLinkId);
    setNetworkLinkId(origin.networkLinkId);
    skipNavigationSearch.current = origin.nav && origin.nav !== nav;
    setNav(origin.nav);
  };
  useEffect(() => {
    if (!sourceReturning || !sourceVisit) return;
    if (!review.pendingId && selected !== sourceVisit.check.sourceId) {
      setSourceReturning(false);
      setSourceVisit(null);
      setSourceCheck(null);
      sourceReturnFocus.current = null;
    } else if (ready && selected === sourceVisit.check.sourceId) {
      setSourceReturning(false);
      setSourceVisit(null);
    }
  }, [sourceReturning, sourceVisit, ready, selected, review.pendingId]);
  useEffect(() => {
    const target = sourceReturnFocus.current;
    if (
      !target ||
      sourceReturning ||
      sourceVisit ||
      !ready ||
      selected !== target.scopeId
    )
      return;
    const frame = requestAnimationFrame(() => {
      const panel = inspectorRef.current,
        section = panel?.querySelector<HTMLElement>(".reading-sources");
      if (!panel || !section) return;
      const row = section.querySelector<HTMLElement>(
        `[data-source-device="${target.deviceId}"]`,
      );
      const list = section.querySelector<HTMLElement>(".reading-source-list");
      (row ?? section).focus({ preventScroll: true });
      panel.scrollTop = target.scroll;
      if (list) list.scrollTop = target.listScroll;
      if (!row) section.scrollIntoView({ block: "nearest" });
      sourceReturnFocus.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [sourceReturning, sourceVisit, ready, selected, review.analysis]);
  const visitPeakSource = (id: string) => {
    const target = beginPeakInspection(
      selected,
      id,
      state.time,
      spatial.readings,
    );
    if (!target) return;
    peakReturnFocus.current = null;
    setSourceVisit(null);
    setSourceCheck(null);
    setSourceReturning(false);
    sourceReturnFocus.current = null;
    setPeakReview((current) => ({
      scopeId: selected,
      key: peakKey,
      value:
        current?.scopeId === selected && current.key === peakKey
          ? current.value
          : { ...emptyPeakProcess, open: true },
    }));
    const level =
      state.level === "rack" && rackById(selected) ? "rack" : "room";
    setPeakVisit({
      ...(peakVisit?.scopeId === selected
        ? peakVisit
        : {
            anchor: sourceAnchor,
            level,
            camera: captureTaskView.current?.(level) ?? null,
            nav,
            rackView,
            layer,
            metric,
            slice: sliceControls,
            query,
            filter,
            onlyAlarms,
            scroll: inspectorRef.current?.scrollTop ?? 0,
          }),
      ...target,
    });
    pick(id);
  };
  const returnPeakSource = () => {
    if (!peakVisit || !ready) return;
    const origin = peakVisit;
    setPeakReturning(true);
    peakReturnFocus.current = {
      scopeId: origin.scopeId,
      deviceId: origin.deviceId,
      scroll: origin.scroll,
    };
    setAirflowVisit(null);
    if (sourceAnchor === origin.anchor) pick(origin.scopeId);
    else
      control({
        type: "return-analysis-scope",
        id: origin.scopeId,
        level: origin.level,
      });
    control({ type: "layer", layer: origin.layer });
    control({ type: "analysis", value: true });
    setInspector(true);
    setSliceControls(origin.slice);
    setRackView(origin.rackView);
    setMetric(origin.metric);
    setQuery(origin.query);
    setFilter(origin.filter);
    setOnlyAlarms(origin.onlyAlarms);
    skipNavigationSearch.current = origin.nav && origin.nav !== nav;
    setNav(origin.nav);
  };
  useEffect(() => {
    if (!peakReturning || !peakVisit) return;
    if (!review.pendingId && selected !== peakVisit.scopeId) {
      setPeakReturning(false);
      setPeakVisit(null);
      setPeakReview(null);
      peakReturnFocus.current = null;
    } else if (ready && selected === peakVisit.scopeId) {
      setPeakReturning(false);
      setPeakVisit(null);
    }
  }, [peakReturning, peakVisit, ready, selected, review.pendingId]);
  useEffect(() => {
    const target = peakReturnFocus.current;
    if (
      !target ||
      peakReturning ||
      peakVisit ||
      !ready ||
      selected !== target.scopeId ||
      !review.analysis
    )
      return;
    const frame = requestAnimationFrame(() => {
      const panel = inspectorRef.current;
      const process = panel?.querySelector<HTMLDetailsElement>(
        ".peak-source-process",
      );
      if (!panel || !process) return;
      const sourceButton = process.querySelector<HTMLElement>(
        `[data-peak-source="${target.deviceId}"]`,
      );
      const button =
        sourceButton ?? process.querySelector<HTMLElement>("summary");
      button?.focus({ preventScroll: true });
      panel.scrollTop = target.scroll;
      // 原设备已不是当前最高来源时，列表不再有它的按钮，回到可见的过程标题。
      if (!sourceButton) button?.scrollIntoView({ block: "nearest" });
      peakReturnFocus.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [peakReturning, peakVisit, ready, selected, review.analysis]);
  const visitGrilleBranch = (branch: GrilleBranch, scroll: number) => {
    if (!ready) return;
    setGrilleRack((current) => ({
      ...current,
      [branch.row.id]: branch.rack.id,
    }));
    setGrilleVisit({
      camera: captureTaskView.current?.("room") ?? null,
      layer,
      metric,
      slice: sliceControls,
      nav,
      query,
      filter,
      onlyAlarms,
      scroll,
      rowId: branch.row.id,
      rackId: branch.rack.id,
      deviceId: branch.device.id,
    });
    showAirflow(branch.device.id);
  };
  const returnGrille = () => {
    if (!grilleVisit || !ready) return;
    const origin = grilleVisit;
    setGrilleReturning(true);
    if (origin.camera) pick(origin.rowId, state.level !== "room");
    else focus(origin.rowId);
    control({ type: "layer", layer: origin.layer });
    control({ type: "analysis", value: false });
    setSliceControls(origin.slice);
    setMetric(origin.metric);
    setQuery(origin.query);
    setFilter(origin.filter);
    setOnlyAlarms(origin.onlyAlarms);
    const restoreNav = origin.nav && !matchMedia("(max-width: 1099px)").matches;
    if (restoreNav && !nav) skipNavigationSearch.current = true;
    setNav(restoreNav);
  };
  useEffect(() => {
    if (!grilleReturning || !grilleVisit) return;
    if (!review.pendingId && selected !== grilleVisit.rowId) {
      setGrilleReturning(false);
      setGrilleVisit(null);
    } else if (
      ready &&
      state.level === "room" &&
      selected === grilleVisit.rowId
    ) {
      setGrilleReturning(false);
      setGrilleVisit(null);
    }
  }, [
    grilleReturning,
    grilleVisit,
    ready,
    selected,
    state.level,
    review.pendingId,
  ]);
  const returnCoolingRange = () => {
    if (!coolingVisit || !ready) return;
    const origin = coolingVisit;
    coolingRangeRestore.current = origin.position;
    setCoolingRangeState(origin.range);
    setRackView(origin.rackView);
    setCoolingReturning(true);
    pick(coolingSource.id, state.level !== "room");
    control({ type: "layer", layer: origin.layer });
    control({ type: "analysis", value: false });
    setSliceControls(origin.slice);
    setQuery(origin.query);
    setFilter(origin.filter);
    setOnlyAlarms(origin.onlyAlarms);
    const restoreNav = !matchMedia("(max-width: 1099px)").matches && origin.nav;
    if (restoreNav && !nav) skipNavigationSearch.current = true;
    setNav(restoreNav);
    setMetric(origin.metric);
    setCoolingRangeOpen(true);
  };
  useEffect(() => {
    if (
      coolingReturning &&
      !review.pendingId &&
      selected !== coolingSource.id
    ) {
      setCoolingReturning(false);
      setCoolingVisit(null);
      return;
    }
    if (
      !coolingReturning ||
      !ready ||
      selected !== coolingSource.id ||
      state.level !== "room"
    )
      return;
    setCoolingReturning(false);
    setCoolingVisit(null);
  }, [coolingReturning, ready, selected, state.level, review.pendingId]);
  const visitCoolingRange = (
    id: string,
    rackId: string,
    action: CoolingRangeAction,
    position: CoolingRangePosition,
  ) => {
    setCoolingVisit({
      camera: captureTaskView.current?.("room") ?? null,
      metric,
      rackId,
      deviceId: deviceById(id)?.id ?? null,
      position,
      range: coolingRangeState,
      rackView,
      layer,
      slice: sliceControls,
      nav,
      query,
      filter,
      onlyAlarms,
    });
    if (action === "airflow") showAirflow(id);
    else if (action === "installation") focus(id, { installation: true });
    else pick(id, action === "enter");
  };
  const coolingRangeBrowser = (
    <CoolingRange
      value={coolingRangeState}
      readings={spatial.readings}
      ready={ready}
      open={coolingRangeOpen}
      restore={coolingRangeRestore}
      searchFocus={coolingSearchFocus}
      onChange={setCoolingRangeState}
      onVisit={visitCoolingRange}
    />
  );
  const returnSpaceInspection = () => {
    if (!spaceVisit || !ready) return;
    const origin = spaceVisit;
    setSpaceReturning(true);
    setAirflowVisit(null);
    setPowerLinkId(null);
    setNetworkLinkId(null);
    control({ type: "open-resource", id: origin.range.rackId });
    control({ type: "layer", layer: origin.layer });
    control({ type: "analysis", value: origin.analysis });
    setRackView(origin.rackView);
    setSpaceSize(origin.size);
    setQuery(origin.query);
    setFilter(origin.filter);
    setOnlyAlarms(origin.onlyAlarms);
    setMetric(origin.metric);
    setSliceControls(origin.slice);
    const medium = matchMedia("(max-width: 1099px)").matches;
    const restoreNav = origin.nav && !(medium && origin.source === "details");
    if (restoreNav && !nav) skipNavigationSearch.current = true;
    setNav(restoreNav);
    setInspector(origin.inspector && !(medium && restoreNav));
  };
  useEffect(() => {
    if (!spaceReturning) return;
    if (
      !spaceVisit ||
      (!review.pendingId &&
        selected !== spaceVisit.range.rackId &&
        selected !== spaceVisit.selected)
    ) {
      setSpaceReturning(false);
      setSpaceVisit(null);
    } else if (ready && state.level === "rack") {
      if (state.doorOpen !== spaceVisit.doorOpen) {
        dispatch({ type: "door", open: spaceVisit.doorOpen });
        return;
      }
      if (state.rearDoorOpen !== spaceVisit.rearDoorOpen) {
        dispatch({ type: "rear-door", open: spaceVisit.rearDoorOpen });
        return;
      }
      if (spaceVisit.selected !== selected) {
        control({ type: "pick", id: spaceVisit.selected });
        return;
      }
      setSpaceRestore(spaceVisit);
      setSpaceReturning(false);
      setSpaceVisit(null);
    }
  }, [
    spaceReturning,
    spaceVisit,
    ready,
    state.level,
    state.doorOpen,
    state.rearDoorOpen,
    selected,
    review.pendingId,
  ]);
  useLayoutEffect(() => {
    if (!spaceRestore) return;
    // 等两栏恢复原内容与高度，再把键盘和滚动交还给发起检视的入口。
    const frame = requestAnimationFrame(() => {
      if (spaceRestore.source === "details") {
        const panel = inspectorRef.current;
        const entry = panel?.querySelector<HTMLButtonElement>(
          "[data-segment-device]",
        );
        if (entry && panel) {
          const disclosure = entry.closest("details");
          if (disclosure) disclosure.open = true;
          entry.focus({ preventScroll: true });
          panel.scrollTop = spaceRestore.detailScroll;
        }
      }
      setSpaceRestore(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [spaceRestore]);
  const returnInletOverview = () => {
    skipNavigationSearch.current = !nav;
    if (inletInspection) {
      setInletReturning(true);
      setInletQuery(inletInspection.query);
      setInletScope(inletInspection.scope);
      setInletOrder(inletInspection.order);
      setInletFilter(inletInspection.filter);
      inletScroll.current = inletInspection.scroll;
    }
    setInletRestoreRevision((value) => value + 1);
    setRackView("inlet");
    setSliceControls(inletPair?.slice ?? inletSlice.current);
    const id = inletPair?.firstId ?? inletInspection?.id ?? inletSelection;
    control({ type: "room-inlet", id });
    setInletSelection(id);
    setInletRack(deviceById(id)?.rackId ?? id);
    setInletPair(null);
    control({ type: "analysis", value: false });
    setInspector(
      !!inletInspection?.inspector &&
        !matchMedia("(max-width: 1099px)").matches,
    );
    setNav(true);
  };
  useEffect(() => {
    if (
      inletReturning &&
      ready &&
      state.level === "room" &&
      !review.pendingId
    ) {
      setInletInspection(null);
      setInletReturning(false);
    }
  }, [inletReturning, ready, state.level, review.pendingId]);
  useEffect(() => {
    if (
      (review.pendingId || review.pendingEndpoint) &&
      feedback?.settled &&
      feedback.key === presentationKey(state)
    )
      control({ type: "navigation-ready", key: feedback.key });
  }, [review.pendingId, review.pendingEndpoint, feedback, state]);
  useEffect(() => {
    if (!state.playing) return;
    const timer = setInterval(() => {
      if (!document.hidden) dispatch({ type: "tick" });
    }, 1000);
    return () => clearInterval(timer);
  }, [state.playing, dispatch]);
  useEffect(() => {
    document.title = "Mirage · 浮城 — 三维工作区";
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const target = event.target instanceof Element ? event.target : null;
        const popup =
          target?.closest<HTMLDetailsElement>("details[open]") ??
          document.querySelector<HTMLDetailsElement>(
            ".workspace-shots[open], .review-scene-tools details[open]",
          );
        if (popup) {
          event.preventDefault();
          popup.open = false;
          popup.querySelector("summary")?.focus();
        } else if (
          nav &&
          query &&
          navigationRef.current?.contains(target) &&
          navigationRef.current.querySelector(".study-search")
        ) {
          setQuery("");
          navigationRef.current.querySelector("input")?.focus();
        } else if (
          nav &&
          (navigationRef.current?.contains(target) ||
            matchMedia("(max-width: 1099px)").matches)
        )
          setNav(false);
        else if (review.analysis) returnToDetails();
        else if (inspector) collapseInspector();
        else dispatch({ type: "back" });
      }
      if ((event.target as HTMLElement).closest("input,select,textarea"))
        return;
      if (event.key.toLowerCase() === "f") {
        control({ type: "focus-resource", id: selected });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [
    selected,
    review.analysis,
    nav,
    inspector,
    query,
    dispatch,
    returnToDetails,
    collapseInspector,
  ]);
  const load = (next: WorkspaceShot) => {
    setAirflowOrigin(null);
    setReturningFromAirflow(false);
    roomSearchOrigin.current = null;
    roomSearchFocus.current = null;
    setSmokeVisit(null);
    setSmokeReturning(false);
    setSmokeRestore(false);
    setPowerScope("rack");
    setPowerOrder("budget");
    setPowerRack("rack-a01");
    setFeeders(initialFeeders());
    setFeederRestore(null);
    feederScroll.current = 0;
    setPowerQuery("");
    setPowerFilter("all");
    powerScroll.current = 0;
    setPowerRestore(0);
    setPowerOverviewVisit(null);
    setPowerOverviewReturning(false);
    setPortCheck(null);
    setPortVisit(null);
    setPortReturning(false);
    portReturnFocus.current = null;
    setAlarmQuery("");
    setAlarmSeverity("all");
    setAlarmVisit(null);
    setAlarmReturned(null);
    setAlarmReturning(false);
    setAlarmRestore(0);
    alarmScroll.current = 0;
    setLayoutBoundary(false);
    setLayoutQuery("");
    setLayoutScope("equipment");
    setLayoutCrossing(null);
    layoutScroll.current = 0;
    setLayoutRestore(0);
    setLayoutVisit(null);
    setLayoutReturning(false);
    setSliceCheck(null);
    setPduInspection(null);
    setPduReturning(false);
    setInspectionDevice(null);
    setEnvironmentComparisonOpen(false);
    setEnvironmentPairVisit(null);
    setGrilleVisit(null);
    setGrilleReturning(false);
    setGrilleRack({});
    setCoolingRangeState(initialCoolingRange());
    setCoolingRangeOpen(false);
    setCoolingVisit(null);
    setCoolingReturning(false);
    coolingRangeRestore.current = null;
    coolingSearchFocus.current = false;
    setAirflowVisit(null);
    setPowerLinkId(null);
    setNetworkLinkId(null);
    setSourceCheck(null);
    setSourceVisit(null);
    setSourceReturning(false);
    sourceReturnFocus.current = null;
    setPeakReview(null);
    setPeakVisit(null);
    setPeakReturning(false);
    peakReturnFocus.current = null;
    setExpanded([]);
    setRackView("installation");
    setBlankingVisit(null);
    setBlankingRestore(null);
    setSpaceSize(2);
    setSpaceVisit(null);
    setSpaceReturning(false);
    setSpaceRestore(null);
    setComparisonSize(2);
    setInletAirflowVisit(null);
    setInletAirflowReturning(false);
    setInletReference(null);
    setInletPair(null);
    setInletSession(false);
    setInletReturning(false);
    setInletInspection(null);
    setInletRack("rack-a01");
    setInletQuery("");
    setInletScope("rack");
    setInletOrder("temperature");
    setInletFilter("all");
    setInletSelection("rack-a01");
    inletScroll.current = 0;
    setStorageVisit(null);
    setFanVisit(null);
    setStructureReturn(null);
    setFanViewRevision(0);
    setFanFocusRevision(0);
    setStorageViewRevision(0);
    setStorageFocusRevision(0);
    setNetworkMapScope("rack");
    setNetworkMapRole("all");
    networkMapFocus.current = null;
    setNetworkMapRestore(0);
    setNetworkMapRack("rack-a01");
    setNetworkMapQuery("");
    setNetworkMapVisit(null);
    setNetworkMapReturning(false);
    setNetworkMapSelection("room-01");
    networkMapScroll.current = 0;
    setComparisonRow("all");
    setComparisonRack(null);
    setComparisonStart(null);
    setComparisonVisit(null);
    setComparisonReturning(false);
    setComparisonFocus(false);
    comparisonScroll.current = 0;
    setShot(next);
    setRevision((n) => n + 1);
    setQuery("");
    setFilter("all");
    setOnlyAlarms(next === "alarms");
    setInspector(next !== "overview" && next !== "alarms");
    if (next === "alarms") setNav(true);
    if (next === "time" && matchMedia("(max-width: 1099px)").matches)
      setNav(false);
    control({ type: "workspace-shot", shot: next });
  };
  const groupOf = (row: (typeof rows)[number]) =>
    browsingParts
      ? (row.group ?? "其他部件")
      : state.level === "room" && !query.trim() && filter === "all"
        ? row.kind === "rack"
          ? `${row.name[0]} 排机柜`
          : (row.group ?? "机房设施")
        : state.level === "rack" && !query.trim() && filter === "all"
          ? pduById(row.id)
            ? "供电附件 · 后置 0U"
            : `${rackForDevice(state.deviceId).name} · 设备`
          : "搜索结果";
  const groups = [...new Set(rows.map(groupOf))].sort((a, b) =>
    state.level === "device"
      ? componentGroups.indexOf(a) - componentGroups.indexOf(b)
      : 0,
  );
  const mainMetric = powerFacility ? "power" : metric;
  const availableSourceMetrics = sourceMetrics(selected);
  const activeSourceCheck =
    sourceCheck?.sourceId === selected ? sourceCheck : null;
  const sourceMetric =
    activeSourceCheck?.metric ??
    (availableSourceMetrics.includes(mainMetric)
      ? mainMetric
      : availableSourceMetrics[0]);
  const sources = useMemo(
    () =>
      sourceMetric
        ? readingSources(selected, sourceMetric, spatial.readings)
        : null,
    [selected, sourceMetric, spatial.readings],
  );
  const [budgetReview, setBudgetReview] = useState(emptyBudgetReview);
  useEffect(() => {
    setBudgetReview(emptyBudgetReview);
  }, [selected, sourceMetric, state.replayCycle, revision]);
  const openSourceCheck = (nextMetric: SourceMetric) => {
    const next = readingSources(selected, nextMetric, spatial.readings);
    if (!next) return;
    takeover();
    setSourceVisit(null);
    setSourceReturning(false);
    sourceReturnFocus.current = null;
    setSourceCheck({
      sourceId: selected,
      metric: nextMetric,
      group: next.excluded ? "excluded" : "included",
      query: "",
    });
  };
  const previewAirflowEndpoint = (route: AirflowRoute, id: string) => {
    const visit = beginAirflowInspection(activeAirflowVisit, route, id, {
      originId: selected,
      context: airflowContext,
      nav,
      inspector,
      analysis: review.analysis,
    });
    if (!visit) return;
    pick(id);
    setAirflowVisit(visit);
    setAirflowExplanation("endpoint");
  };
  const locateAirflowEndpoint = (id: string) => {
    const route = airflow?.routes[0];
    if (
      coolingVisit &&
      route?.rackId === coolingVisit.rackId &&
      !deviceById(id)
    )
      setCoolingVisit({
        ...coolingVisit,
        locatedEndpoint: { id, deviceId: route.deviceId },
      });
    focus(id, { installation: entityById(id)?.kind === "device" });
  };
  const airflowInspector = airflow && (
    <AirflowDetails
      view={airflowStageView}
      snapshot={airflow}
      selected={selected}
      ready={ready}
      endpointKind={airflowEndpoint}
      onRead={setAirflowEndpoint}
      onExplained={() => setAirflowExplanation(null)}
      revealRequested={airflowExplanation}
      onPreview={previewAirflowEndpoint}
      onLocate={locateAirflowEndpoint}
    />
  );
  const slicePlaneInspector = slicePlaneActive &&
    sliceControls.orientation === "vertical" && (
      <SlicePlaneDetails
        controls={sliceControls}
        readings={spatial.readings}
        time={state.time}
        selected={selected}
        ready={ready}
        onPreview={(id) => pick(id)}
        onReturn={() => {
          takeover();
          requestSliceView("return");
        }}
      />
    );
  const sliceInspector = sliceCheck && sliceEvidence && (
    <SliceEvidenceDetails
      observing={sliceViewActive}
      ready={ready}
      onObserve={() => {
        takeover();
        requestSliceView("observe");
      }}
      onRestoreView={() => {
        takeover();
        requestSliceView("return");
      }}
      context={sliceEvidence}
      check={sliceCheck}
      readings={spatial.readings}
      time={state.time}
      onMark={(id) => {
        takeover();
        setSliceCheck({ ...sliceCheck, sourceId: id });
      }}
      onPreview={(id) => {
        setSliceCheck({ ...sliceCheck, sourceId: id, previewId: id });
        pick(id);
      }}
      onReturn={() => {
        requestSliceView("return");
        pick(sliceCheck.deviceId);
        setSliceCheck(null);
      }}
      onClose={() => {
        takeover();
        setSliceCheck(null);
      }}
    />
  );
  const currentSourceRow = sourceVisit
    ? sourceInspectionRow(sourceVisit, spatial.readings)
    : null;
  const sourceInspector = sources && (!sourceVisit || sourceReturning) && (
    <ReadingSources
      budgetReview={budgetReview}
      onBudgetReview={setBudgetReview}
      onSeek={(time) => dispatch({ type: "seek", time })}
      sources={sources}
      sourceName={resource?.name ?? entity.name}
      metrics={availableSourceMetrics}
      check={activeSourceCheck}
      time={state.time}
      onChange={setSourceCheck}
      onClose={() => {
        setBudgetReview(emptyBudgetReview);
        setSourceCheck(null);
        setSourceVisit(null);
      }}
      onInteract={takeover}
      onPreview={visitSource}
    />
  );

  const analysisScopeId = peakVisit?.scopeId ?? sourceVisit?.check.sourceId;
  const analysisTask = peakVisit ? "最高来源" : "输入";
  const rackRangeName =
    spaceVisit &&
    `${rackById(spaceVisit.range.rackId)!.name.split(" ")[0]} · ${spaceRangeLabel(spaceVisit.range)}`;
  const roomRangeName =
    comparisonVisit &&
    `返回机房核查（${rackById(comparisonVisit.range.rackId)!.name.split(" ")[0]} · ${spaceRangeLabel(comparisonVisit.range)}）`;

  const layoutReturnName = layoutVisit
    ? (layoutVisit.grille?.name ??
      layoutVisit.crossing?.name ??
      deviceById(layoutVisit.id)?.name ??
      rackById(layoutVisit.id)?.name ??
      entityById(layoutVisit.id)?.name)
    : undefined;
  return (
    <div
      className="mirage-workspace workspace-ui"
      style={workspaceColors}
      data-analysis={review.analysis}
      data-layer={layer}
      data-scene-level={state.level}
      data-selection={selected}
      data-time={state.time}
      data-playing={state.playing}
      data-tour={tour.mode}
      data-tour-step={tour.step}
      data-tour-pending={review.pendingTour}
      data-scene-device={state.deviceId}
      data-focus-revision={state.focusRevision}
      data-cover-open={state.coverOpen}
      data-rear-door-open={state.rearDoorOpen}
      data-explosion={state.explosion}
    >
      <header className="study-header">
        <a className="study-brand" href="./" aria-label="Mirage 浮城首页">
          Mirage <span>浮城</span>
        </a>
        {airflowOrigin && state.level === "room" && layer === "airflow" && (
          <div className="study-task-return">
            <button
              disabled={!ready || returningFromAirflow}
              onClick={returnFromRoomAirflow}
            >
              ← 返回{" "}
              {airflowOrigin.pose.level === "rack"
                ? rackForDevice(airflowOrigin.pose.deviceId).name
                : deviceById(airflowOrigin.pose.deviceId)?.name}
            </button>
          </div>
        )}
        {(layoutVisit || blankingVisit) && (
          <div
            className="study-task-return"
            role="group"
            aria-label={blankingVisit ? "安装图封板段往返" : "布置导览往返"}
          >
            {blankingVisit && (
              <button
                className="blanking-return"
                disabled={!ready}
                onClick={returnBlanking}
              >
                ← 返回 {rackById(blankingVisit.rackId)?.name.split(" ")[0]}{" "}
                安装图 · {spaceRangeLabel(blankingVisit)} 封板段
              </button>
            )}
            {layoutVisit && (
              <>
                <button
                  disabled={!ready || layoutReturning}
                  onClick={() => {
                    setLayoutReturning(true);
                    // 先退出当前设施核对，再恢复布置图选择。
                    if (
                      state.level !== "room" ||
                      layoutScope === "fixtures" ||
                      entranceView
                    )
                      control({ type: "open-resource", id: "room-01" });
                  }}
                >
                  ← 返回布置图 · {layoutReturnName}
                </button>
                <button
                  aria-label="结束布置导览往返"
                  disabled={layoutReturning}
                  onClick={() => {
                    setLayoutVisit(null);
                    setLayoutReturning(false);
                  }}
                >
                  ×
                </button>
              </>
            )}
          </div>
        )}
        {pduInspection?.outlet != null &&
          (selected !== pduInspection.pduId ||
            review.analysis ||
            pduReturning ||
            powerViewPaired) && (
            <div
              className="study-task-return"
              role="group"
              aria-label="插座核对往返"
            >
              <button
                disabled={!ready || pduReturning}
                onClick={() => {
                  setPduReturning(true);
                  focus(pduInspection.pduId);
                  setPowerLinkId(
                    pduOutlet(pduInspection.pduId, pduInspection.outlet)?.link
                      ?.id ?? null,
                  );
                  control({ type: "layer", layer: "power" });
                  control({ type: "analysis", value: false });
                }}
              >
                ← 返回 {pduName(pduInspection.pduId)} · 插座{" "}
                {String(pduInspection.outlet).padStart(2, "0")}
              </button>
              <button
                aria-label="结束插座核对往返"
                title="结束核对，留在当前位置"
                disabled={pduReturning}
                onClick={() => setPduInspection(null)}
              >
                ×
              </button>
            </div>
          )}
        {analysisScopeId && (
          <div
            className="study-task-return"
            role="group"
            aria-label={`${analysisTask}核对往返`}
          >
            <button
              disabled={!ready || peakReturning || sourceReturning}
              onClick={peakVisit ? returnPeakSource : returnSource}
            >
              ← 返回{entityById(analysisScopeId)?.name} ·{" "}
              {sourceVisit &&
                (sourceVisit.check.metric === "temperature" ? "进风" : "功耗")}
              {analysisTask}核对
            </button>
            <button
              aria-label={`结束${analysisTask}检视往返`}
              title="结束核对，留在当前位置"
              disabled={peakReturning || sourceReturning}
              onClick={() => {
                if (peakVisit) {
                  setPeakReview(null);
                  setPeakVisit(null);
                } else {
                  setSourceVisit(null);
                  setSourceCheck(null);
                  sourceReturnFocus.current = null;
                }
              }}
            >
              ×
            </button>
          </div>
        )}
        {grilleVisit && (
          <div
            className="study-task-return"
            role="group"
            aria-label="格栅气流检视往返"
          >
            <button disabled={!ready || grilleReturning} onClick={returnGrille}>
              ← 返回格栅布置 · {rackById(grilleVisit.rackId)?.name}
            </button>
            <button
              aria-label="结束格栅气流检视往返"
              title="结束核对，留在当前位置"
              disabled={grilleReturning}
              onClick={() => setGrilleVisit(null)}
            >
              ×
            </button>
          </div>
        )}
        {coolingVisit && (
          <div
            className="study-task-return"
            role="group"
            aria-label="服务范围检视往返"
          >
            <button
              disabled={!ready || coolingReturning}
              onClick={returnCoolingRange}
            >
              ← 返回服务范围 · {rackById(coolingVisit.rackId)?.name}
              {coolingVisit.deviceId &&
                " / " + deviceById(coolingVisit.deviceId)?.name}
            </button>
            <button
              aria-label="结束服务范围检视往返"
              title="结束核对，留在当前位置"
              disabled={coolingReturning}
              onClick={() => setCoolingVisit(null)}
            >
              ×
            </button>
          </div>
        )}
        {portVisit && (
          <div
            className="study-task-return"
            role="group"
            aria-label="端口核对往返"
          >
            <button
              disabled={!ready || portReturning}
              onClick={() => {
                setPatchEntry(null);
                setPortReturning(true);
                control(
                  portVisit.level === "room"
                    ? { type: "open-resource", id: "room-01" }
                    : {
                        type: "locate-installation",
                        id: portVisit.check.switchId,
                      },
                );
              }}
            >
              ← 返回 {deviceById(portVisit.check.switchId)!.name} · 端口{" "}
              {String(portVisit.check.port).padStart(2, "0")}
            </button>
            <button
              aria-label="结束端口核对"
              disabled={portReturning}
              onClick={() => setPortVisit(null)}
            >
              ×
            </button>
          </div>
        )}
        {alarmVisit && (
          <div
            className="study-task-return"
            role="group"
            aria-label="告警排查往返"
          >
            <button
              disabled={!ready || alarmReturning}
              onClick={() => {
                setAlarmReturning(true);
                if (state.level !== "room")
                  control({ type: "open-resource", id: "room-01" });
              }}
            >
              ← 返回告警列表 · {deviceById(alarmVisit.id)?.name}
            </button>
            <button
              aria-label="结束告警排查"
              title="结束排查，留在当前位置"
              disabled={alarmReturning}
              onClick={() => setAlarmVisit(null)}
            >
              ×
            </button>
          </div>
        )}
        {powerOverviewVisit && (
          <div
            className="study-task-return"
            role="group"
            aria-label="功耗对照往返"
          >
            <button
              disabled={!ready || powerOverviewReturning}
              onClick={() => {
                setPowerOverviewReturning(true);
                if (state.level !== "room")
                  control({ type: "open-resource", id: "room-01" });
              }}
            >
              {powerOverviewVisit.feeder
                ? "← 返回配电出线 " +
                  pduById(
                    powerLinkById(powerOverviewVisit.feeder.linkId)!.pduId,
                  )!.sourcePort
                : "← 返回机房功耗对照"}
            </button>
            <button
              aria-label="结束功耗对照往返"
              disabled={powerOverviewReturning}
              onClick={() => setPowerOverviewVisit(null)}
            >
              ×
            </button>
          </div>
        )}
        {(inletAirflowVisit ||
          inletInspection ||
          inletPair ||
          (inletSession && state.level !== "room")) && (
          <div
            className="study-task-return"
            role="group"
            aria-label="进风对照往返"
            onKeyDown={(event) => {
              if (
                event.key === "Escape" &&
                ready &&
                !inletReturning &&
                !inletAirflowReturning
              ) {
                event.preventDefault();
                event.stopPropagation();
                if (inletAirflowVisit) returnInletAirflow();
                else returnInletOverview();
              }
            }}
          >
            <button
              disabled={!ready || inletReturning || inletAirflowReturning}
              onClick={
                inletAirflowVisit ? returnInletAirflow : returnInletOverview
              }
            >
              ← 返回机房进风对照
            </button>
            {inletAirflowVisit && (
              <button
                aria-label="结束气流往返"
                disabled={inletAirflowReturning}
                onClick={() => setInletAirflowVisit(null)}
              >
                ×
              </button>
            )}
          </div>
        )}
        {(spaceVisit || comparisonVisit) && (
          <div
            className="study-task-return"
            role="group"
            aria-label="空间核查往返"
          >
            {spaceVisit && (
              <>
                <button
                  disabled={!ready || spaceReturning}
                  aria-label={`返回${rackRangeName} 核查`}
                  onClick={returnSpaceInspection}
                >
                  ← {rackRangeName} 核查
                </button>
                <button
                  aria-label="结束范围占用检视"
                  title="结束检视，留在当前位置"
                  disabled={spaceReturning}
                  onClick={() => setSpaceVisit(null)}
                >
                  ×
                </button>
              </>
            )}
            {comparisonVisit && (
              <button
                aria-label={roomRangeName ?? undefined}
                title={roomRangeName ?? undefined}
                disabled={!ready || comparisonReturning || spaceReturning}
                onClick={() => {
                  setComparisonReturning(true);
                  setSpaceVisit(null);
                  setSpaceRestore(null);
                  setBlankingVisit(null);
                  control({ type: "analysis", value: false });
                  control({ type: "open-resource", id: "room-01" });
                }}
              >
                ←{" "}
                {spaceVisit
                  ? `机房 · ${spaceRangeLabel(comparisonVisit.range)}`
                  : roomRangeName}
              </button>
            )}
          </div>
        )}
        {(networkMapVisit ||
          (state.level !== "room" && rackView === "network")) && (
          <div
            className="study-task-return"
            role="group"
            aria-label="网络接入往返"
          >
            <button
              disabled={!ready || networkMapReturning}
              onClick={returnNetworkMap}
            >
              ← 返回
              {originalNetworkLink
                ? ` ${deviceById(originalNetworkLink.source)!.name} · 接入 ${switchRole(originalNetworkLink.target)}`
                : "机房接入图"}
            </button>
          </div>
        )}
        {pairedEnvironment && (
          <div
            className="study-task-return"
            role="group"
            aria-label="环境测点对照往返"
          >
            <button disabled={!ready} onClick={returnEnvironmentPair}>
              ← 返回起点 ·{" "}
              {environmentProbe(pairedEnvironment.firstId)!.fixture.name}
            </button>
          </div>
        )}
        <nav className="study-path" aria-label="空间路径">
          <div>
            {getPath(state).map((item, i) => (
              <span key={item}>
                {i > 0 && <i>/</i>}
                <button onClick={() => selectObject(item, true)}>
                  {entityById(item)?.name ?? item}
                </button>
              </span>
            ))}
          </div>
        </nav>
        <div className="study-clock">
          <button
            aria-label={state.playing ? "暂停模拟" : "播放模拟"}
            title={state.playing ? "暂停模拟" : "播放模拟"}
            onClick={() => dispatch({ type: "play" })}
          >
            {state.playing ? "Ⅱ" : "▷"}
          </button>
          <button
            onClick={analyze}
            aria-label="打开时间分析"
            aria-pressed={review.analysis}
            title="查看所选对象的曲线与事件，回看同步更新场景"
          >
            <span>模拟</span>
            <time>{clock(state.time)}</time>
            <span className="study-clock-action">分析</span>
          </button>
        </div>
        <details className="workspace-shots" ref={tourMenu}>
          <summary>
            演示{" "}
            <span>
              {tour.mode === "playing"
                ? "巡游中"
                : tour.mode === "paused"
                  ? "巡游暂停"
                  : "自由浏览"}
            </span>
          </summary>
          <nav aria-label="演示画面与巡游">
            <button
              className="study-tour-control"
              disabled={
                review.pendingTour || (tour.mode === "manual" && !ready)
              }
              onClick={() => {
                setOnlyAlarms(false);
                control({
                  type: tour.mode === "playing" ? "tour-pause" : "tour-resume",
                });
              }}
              title={
                tour.mode === "manual"
                  ? "从机房开始巡游，保留当前模拟时间"
                  : tourSteps[tour.step].title
              }
            >
              {review.pendingTour
                ? "正在准备巡游"
                : tour.mode === "playing"
                  ? "暂停巡游"
                  : tour.mode === "paused"
                    ? "继续巡游"
                    : "开始巡游"}
              {tour.mode !== "manual" && (
                <small>
                  {tour.step + 1}/{tourSteps.length}
                </small>
              )}
            </button>
            {workspaceShots.map((s, i) => (
              <button
                key={s.id}
                aria-pressed={shot === s.id}
                onClick={(e) => {
                  load(s.id);
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                <small>0{i + 1}</small>
                {s.name}
              </button>
            ))}
            <p>载入固定画面将重置对象与时间。</p>
            <details className="study-about">
              <summary>场景与数据说明</summary>
              <div>
                <p>
                  原创演示空间，运行数据来自统一的 120
                  秒确定性模拟。设备读数为模拟，部件读数为模型推导，无真实管理接口或
                  CFD。
                </p>
                <p>
                  温度切片由设备进风局部插值，箭头表示配置的代表气流方向。两处环境探头各有温湿度模拟序列，露点由同次有效采样推导。
                </p>
                <p>
                  门禁、烟感和检漏仅展示布置。交换机与存储的内部结构按配置示意。
                </p>
              </div>
            </details>
          </nav>
        </details>
      </header>
      <main
        className={`study-workspace ${nav ? "has-nav" : ""} ${inspector ? "has-inspector" : ""} ${review.analysis ? "has-analysis" : ""}`}
      >
        <aside
          ref={navigationRef}
          className="study-navigation"
          hidden={!nav}
          aria-label="资源导航"
          onPointerDownCapture={takeover}
          onKeyDownCapture={takeover}
        >
          <div className="study-panel-heading">
            <h2>
              {alarmQueueVisible
                ? "机房告警"
                : state.level === "device"
                  ? "设备部件"
                  : state.level === "rack"
                    ? "机柜资源"
                    : "机房资源"}
            </h2>
            <button aria-label="收起资源导航" onClick={() => setNav(false)}>
              ×
            </button>
          </div>
          {views.length > 1 && (
            <div
              className={`rack-navigation-view ${state.level === "room" ? "is-room" : ""}`}
              role="group"
              aria-label="资源呈现"
            >
              {views.map((view) => (
                <button
                  key={view}
                  aria-pressed={navigationView === view}
                  onClick={() => {
                    takeover();
                    setRackView(view);
                    if (view === "feeders") {
                      openFeeders();
                    }
                    if (roomAlarms) {
                      setOnlyAlarms(view === "alarms");
                      setAlarmVisit(null);
                    }
                    if (view === "layout") {
                      setLayoutVisit(null);
                      setLayoutReturning(false);
                    } else if (view === "space") {
                      setSpaceVisit(null);
                      setSpaceRestore(null);
                    } else if (view === "inlet") {
                      if (selectedRackId) {
                        setInletSelection(selected);
                        setInletRack(selectedRackId);
                      }
                      const target = roomAirflowTarget(
                        selected,
                        state.deviceId,
                      );
                      setSliceControls((current) =>
                        alignAirflowSlice(current, target?.rowId ?? null),
                      );
                    }
                  }}
                >
                  {resourceViews[view]}
                </button>
              ))}
            </div>
          )}
          {!alarmQueueVisible &&
            (navigationView === "list" ||
              navigationView === "installation") && (
              <>
                <label className="study-search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    aria-label="查找资源"
                    placeholder={
                      state.level === "device"
                        ? "部件名称或资源编号"
                        : "名称、编号或 U 位"
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button aria-label="清除搜索" onClick={() => setQuery("")}>
                      ×
                    </button>
                  )}
                </label>
                {state.level !== "device" && (
                  <div className="study-filters">
                    <select
                      aria-label="资源类型"
                      value={filter}
                      onChange={(e) =>
                        setFilter(e.target.value as ResourceFilter)
                      }
                    >
                      <option value="all">全部类型</option>
                      {state.level === "room" && (
                        <option value="rack">机柜</option>
                      )}
                      <option value="server">服务器</option>
                      <option value="switch">交换机</option>
                      <option value="storage">存储</option>
                      <option value="facility">设施</option>
                    </select>
                    {layer === "alarms" && state.level === "rack" && (
                      <button
                        aria-label="仅看告警"
                        aria-pressed={onlyAlarms}
                        onClick={() => setOnlyAlarms((v) => !v)}
                      >
                        <span aria-hidden="true">{onlyAlarms ? "✓ " : ""}</span>
                        仅看告警
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

          {alarmQueueVisible ? (
            <AlarmQueue
              readings={spatial.readings}
              query={alarmQuery}
              onQuery={setAlarmQuery}
              severity={alarmSeverity}
              onSeverity={setAlarmSeverity}
              selected={selected}
              ready={ready}
              visible={nav}
              scroll={alarmScroll}
              restoreRevision={alarmRestore}
              returned={alarmReturned}
              onSelect={(id) => {
                selectObject(id);
                control({ type: "analysis", value: false });
              }}
              onPreview={(id, previous) =>
                beginAlarmInspection(id, "preview", previous)
              }
            />
          ) : navigationView === "airflow" ? (
            <section
              className="airflow-rack-list"
              aria-label="按机柜选择代表气流路径"
            >
              <button
                className="cooling-range-entry"
                disabled={!ready}
                onClick={() => {
                  coolingSearchFocus.current = true;
                  setCoolingVisit(null);
                  pick(coolingSource.id);
                  control({ type: "analysis", value: false });
                  setCoolingRangeOpen(true);
                }}
              >
                <strong>{coolingSource.name}</strong>
                <span>查服务范围 ↗</span>
              </button>
              <h3>各柜代表路径</h3>
              {airflowRacks.map(
                ({ rack, device }) =>
                  device && (
                    <button
                      key={rack.id}
                      aria-pressed={airflowDevice === device.id}
                      onClick={() => selectObject(device.id)}
                    >
                      <strong>{rack.name}</strong>
                      <span>{device.name}</span>
                    </button>
                  ),
              )}
            </section>
          ) : state.level === "room" && navigationView === "feeders" ? (
            <PowerFeeders
              selection={feeders}
              visible={nav}
              ready={ready}
              scroll={feederScroll}
              restoreLink={feederRestore}
              onChange={(next) => {
                if (
                  next.first !== feeders.first ||
                  next.second !== feeders.second
                ) {
                  selectObject(
                    next.second !== feeders.second && next.second
                      ? next.second
                      : next.first,
                  );
                  setPowerLinkId(null);
                }
                setFeederRestore(null);
                setFeeders(next);
              }}
              onTrace={(link) => {
                inspectPowerOverview(link.deviceId, "installation", link.id);
                setPowerLinkId(link.id);
              }}
            />
          ) : state.level === "room" && navigationView === "power" ? (
            <PowerOverview
              readings={spatial.readings}
              query={powerQuery}
              onQuery={setPowerQuery}
              filter={powerFilter}
              onFilter={setPowerFilter}
              rackId={selectedRackId ?? powerRack}
              scope={powerScope}
              order={powerOrder}
              onScope={setPowerScope}
              onOrder={setPowerOrder}
              selected={selected}
              visible={nav}
              ready={ready}
              scroll={powerScroll}
              restoreRevision={powerRestore}
              onRack={(id) => {
                setPowerScope("rack");
                selectObject(id);
              }}
              onPreview={selectObject}
              onInspect={(id, internal) =>
                inspectPowerOverview(id, internal ? "internal" : "installation")
              }
              onDetails={(id) => inspectPowerOverview(id, "details")}
              onAnalyze={(id) => inspectPowerOverview(id, "analysis")}
            />
          ) : state.level === "room" && navigationView === "layout" ? (
            <RoomLayout
              selected={selected}
              deviceId={state.deviceId}
              query={layoutQuery}
              scope={layoutScope}
              crossingId={layoutCrossing}
              onEnter={openLayoutInstallation}
              onInspectBranch={(branch) => {
                if (!layoutVisit?.grille || layoutVisit.id !== branch.rack.id)
                  setLayoutVisit({
                    id: branch.rack.id,
                    grille: {
                      name: `${branch.rack.name.split(" ")[0]} 柜前格栅 ${branch.grille.id.split("-").at(-1)}`,
                      slice: sliceControls,
                    },
                    layer,
                    metric,
                    query: layoutQuery,
                    origin: captureLayoutOrigin(),
                  });
                setLayoutRestore(0);
                setLayoutReturning(false);
                showAirflow(branch.device.id);
              }}
              onPreviewCrossing={(id) => {
                const pair = roomLayoutCrossings.find((p) => p.id === id);
                if (!pair) return;
                // 同一盏灯换排时，对象 ID 不变；旧表面标记仍须结束。
                if (crossing && crossing.id !== id) {
                  crossingInspectPending.current = false;
                  setCrossingCommand((current) => ({
                    pair: null,
                    dismiss: true,
                    revision: (current?.revision ?? 0) + 1,
                  }));
                }
                setLayoutCrossing(id);
                selectObject(pair.lightId);
              }}
              onInspectCrossing={(id) => {
                const point = roomLayoutCrossings.find((p) => p.id === id);
                if (!point || !ready) return;
                const pair = fixtureCrossing(point.lightId, point.trayId);
                if (!pair) return;
                if (crossing?.id !== id || layoutVisit?.crossing?.id !== id)
                  setLayoutVisit({
                    id: point.lightId,
                    crossing: point,
                    query: layoutQuery,
                    origin: captureLayoutOrigin(),
                    layer,
                    metric,
                  });
                setLayoutReturning(false);
                setLayoutRestore(0);
                control({ type: "layer", layer: "overview" });
                control({ type: "analysis", value: false });
                setInspector(true);
                if (matchMedia("(max-width: 1099px)").matches) setNav(false);
                requestCrossing(pair);
              }}
              onScope={(scope) => {
                takeover();
                setLayoutScope(scope);
                setLayoutCrossing(null);
                setLayoutVisit(null);
                setLayoutReturning(false);
                setLayoutRestore(0);
                layoutScroll.current = 0;
              }}
              boundaryOpen={layoutBoundary}
              onBoundaryOpen={setLayoutBoundary}
              onQuery={setLayoutQuery}
              ready={ready}
              visible={nav}
              onPlan={() => {
                takeover();
                setLayoutViewRevision((value) => value + 1);
              }}
              restoreRevision={layoutRestore}
              scroll={layoutScroll}
              onPreview={(id) => {
                selectObject(id);
              }}
              onLocate={(id) => {
                rememberLayoutSelection(id);
                focus(id, { showDetails: false });
              }}
              onDetails={(id) => {
                rememberLayoutSelection(id);
                selectObject(id);
                setInspector(true);
                control({ type: "analysis", value: false });
                if (matchMedia("(max-width: 1099px)").matches) setNav(false);
              }}
            />
          ) : state.level === "room" && navigationView === "inlet" ? (
            <InletOverview
              visible={nav}
              restoreRevision={inletRestoreRevision}
              referenceId={inletReference}
              onReference={(id) => {
                setInletReference(id);
                setInletPair(null);
              }}
              canCompare={!!pairedInlet || canStartInletPair}
              onCompare={() => {
                startInletPair();
                analyze();
              }}
              readings={spatial.readings}
              onAirflow={(id) => {
                if (!ready) return;
                setInletAirflowVisit({
                  camera: captureTaskView.current?.("room") ?? null,
                  id,
                  inspector,
                  rack: selectedRackId ?? inletRack,
                  query: inletQuery,
                  scope: inletScope,
                  order: inletOrder,
                  filter: inletFilter,
                  slice: sliceControls,
                  scroll: inletScroll.current,
                  resourceQuery: query,
                  resourceFilter: filter,
                  onlyAlarms,
                });
                setInletInspection(null);
                setInletAirflowReturning(false);
                setInletSelection(id);
                setInletPair(null);
                setRackView("installation");
                control({ type: "analysis", value: false });
                showAirflow(id);
              }}
              scope={inletScope}
              order={inletOrder}
              filter={inletFilter}
              onScope={setInletScope}
              onOrder={setInletOrder}
              onFilter={setInletFilter}
              rackId={selectedRackId ?? inletRack}
              query={inletQuery}
              selected={selected}
              scroll={inletScroll}
              ready={ready}
              onRack={(id) => {
                setInletScope("rack");
                selectObject(id);
                control({ type: "layer", layer: "environment" });
              }}
              onQuery={setInletQuery}
              onPreview={(id) => {
                selectObject(id);
                control({ type: "layer", layer: "environment" });
              }}
              onInspect={(id, internal) => {
                beginInletInspection(id);
                setInletSelection(id);
                inletSlice.current = sliceControls;
                if (internal) {
                  dispatch({ type: "navigate", level: "device", id });
                  setInspector(true);
                  if (matchMedia("(max-width: 1099px)").matches) setNav(false);
                } else if (rackById(id)) pick(id, true);
                else focus(id, { installation: true });
              }}
              onAnalyze={() => {
                beginInletInspection(selected);
                setInletPair(null);
                analyze();
              }}
              onDetails={() => {
                beginInletInspection(selected);
                setInspector(true);
                if (matchMedia("(max-width: 1099px)").matches) setNav(false);
                control({ type: "analysis", value: false });
              }}
            />
          ) : state.level === "room" && navigationView === "network" ? (
            <NetworkOverview
              scope={networkMapScope}
              role={networkMapRole}
              visible={nav && !networkMapReturning}
              restoreRevision={networkMapRestore}
              onOpenPatch={(link) => {
                rememberNetworkMap(link.source, link.id);
                setNetworkMapSelection(link.source);
                openNetworkPatch(link);
              }}
              focusKey={networkMapFocus}
              onScope={(scope) => {
                setNetworkMapScope(scope);
                networkMapScroll.current = 0;
              }}
              onRole={setNetworkMapRole}
              rackId={networkMapRack}
              query={networkMapQuery}
              activeLink={activeNetworkLink}
              selected={selected}
              scroll={networkMapScroll}
              ready={ready}
              onRack={(id) => {
                setNetworkMapRack(id);
                networkMapScroll.current = 0;
              }}
              onQuery={setNetworkMapQuery}
              onPreview={(id) => {
                setNetworkMapSelection(id);
                setNetworkMapVisit(null);
                setNetworkLinkId(null);
                selectObject(id);
                control({ type: "analysis", value: false });
              }}
              onLocate={(id) => {
                setNetworkMapSelection(id);
                rememberNetworkMap(id, null);
                selectObject(id, true);
              }}
              onTrace={(id) => {
                const link = networkLinkById(id);
                if (!link) return;
                pick(link.source);
                setNetworkMapSelection(link.source);
                rememberNetworkMap(link.source, id);
                setNetworkLinkId(id);
                setPowerLinkId(null);
                control({ type: "layer", layer: "overview" });
                control({ type: "analysis", value: false });
              }}
            />
          ) : state.level === "room" && navigationView === "space" ? (
            <RoomSpaceComparison
              size={comparisonSize}
              rowId={comparisonRow}
              expandedId={comparisonRack}
              selected={selected}
              scroll={comparisonScroll}
              start={comparisonStart}
              onStart={setComparisonStart}
              restoreFocus={comparisonFocus && nav}
              onRestored={() => setComparisonFocus(false)}
              onSize={(size) => {
                setComparisonSize(size);
                setComparisonStart(null);
              }}
              onRow={(row) => {
                setComparisonRow(row);
                setComparisonRack(null);
                setComparisonStart(null);
              }}
              onExpand={(id) => {
                setComparisonRack(id);
                setComparisonStart(null);
              }}
              onPreview={selectObject}
              ready={ready}
              onInspect={(range) => {
                setComparisonVisit({
                  camera: captureTaskView.current?.("room") ?? null,
                  range,
                  scroll: comparisonScroll.current,
                  query,
                  filter,
                  onlyAlarms,
                  layer,
                  metric,
                  inspector,
                });
                selectObject(range.rackId, true);
                control({ type: "layer", layer: "overview" });
                control({ type: "analysis", value: false });
                setSpaceSize(comparisonSize);
                setQuery(spaceRangeLabel(range));
                setOnlyAlarms(false);
              }}
            />
          ) : state.level === "rack" && navigationView === "space" ? (
            <RackSpaceInspector
              segments={segments}
              segmentId={activeSegmentId}
              onSegment={requestRangeSegment}
              view={rangeView}
              onView={requestRangeView}
              key={rackForDevice(state.deviceId).id}
              rackId={rackForDevice(state.deviceId).id}
              size={spaceSize}
              onSize={setSpaceSize}
              onCompare={
                comparisonVisit
                  ? undefined
                  : () => selectObject("room-01", true)
              }
              capture={captureSpaceForm}
              restore={spaceRestore}
              ready={ready}
              range={spaceRange}
              onRange={(range) => {
                setSpaceVisit(null);
                setSpaceRestore(null);
                selectObject(range.rackId);
                setQuery(spaceRangeLabel(range));
                setFilter("all");
                setOnlyAlarms(false);
              }}
              onDevice={inspectRangeDevice}
              queryMessage={
                unitQuery?.error ||
                (unitQuery?.rack &&
                unitQuery.rack.id !== rackForDevice(state.deviceId).id
                  ? `当前核查${rackForDevice(state.deviceId).name}；搜索范围属于${unitQuery.rack.name}，可切换列表定位该柜。`
                  : undefined)
              }
              onClear={() => {
                setSpaceVisit(null);
                setSpaceRestore(null);
                setQuery("");
              }}
            />
          ) : state.level === "rack" && navigationView === "installation" ? (
            <RackInstallation
              restoreBlanking={blankingRestore}
              onBlankingFocus={finishBlankingFocus}
              onBlanking={(first, last, scroll) => {
                const rackId = rackForDevice(state.deviceId).id;
                setBlankingVisit({
                  camera: captureTaskView.current?.("rack") ?? null,
                  rackId,
                  first,
                  last,
                  scroll,
                  selected,
                  query,
                  filter,
                  onlyAlarms,
                  layer,
                  analysis: review.analysis,
                  inspector,
                });
                setSpaceVisit(null);
                setSpaceRestore(null);
                setRackView("space");
                setFilter("all");
                setOnlyAlarms(false);
                setQuery(`U${first}–${last}`);
                pick(rackId);
                control({ type: "analysis", value: false });
                requestRangeView("front", null);
              }}
              state={state}
              selected={selected}
              layer={layer}
              readings={spatial.readings}
              rows={rows}
              units={unitQuery}
              filtered={!!query.trim() || filter !== "all" || onlyAlarms}
              ready={ready}
              visible={nav}
              onPick={selectObject}
              onDetails={(id) => pick(id)}
              onFocus={(id) =>
                focus(id, { installation: !pduById(id), showDetails: false })
              }
              onList={() => setRackView("list")}
              onClear={() => {
                setQuery("");
                setFilter("all");
                setOnlyAlarms(false);
              }}
            />
          ) : (
            <div
              className={`study-resource-list ${roomResourceList && rows.length > 1 ? "is-room-browser" : ""} ${query.trim() || filter !== "all" ? "is-search" : ""}`}
              key={`${state.level}:${state.deviceId}`}
            >
              {unitQuery && (
                <section className="study-unit-query" aria-label="U 位安装核对">
                  {unitQuery.error ? (
                    <p>{unitQuery.error}</p>
                  ) : (
                    <>
                      <strong>
                        {unitQuery.rack?.name ?? "全机房"} · U{unitQuery.first}
                        {unitQuery.first === unitQuery.last
                          ? ""
                          : `–${unitQuery.last}`}
                      </strong>
                      {blanking ? (
                        <>
                          <span>
                            设备占用{" "}
                            {unitQuery.last -
                              unitQuery.first +
                              1 -
                              blanking.length}{" "}
                            U · 前置盲板 {blanking.length} U
                          </span>
                          {blanking.length > 0 && (
                            <>
                              <small>
                                封板位置：{unitRanges(blanking)}
                                。封板不表示可分配容量。
                              </small>
                              <button
                                disabled={!ready}
                                onClick={() =>
                                  focus(unitQuery.rack!.id, {
                                    showDetails: false,
                                  })
                                }
                              >
                                定位 {unitQuery.rack!.name}
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <small>
                          {unitQuery.rack
                            ? "在此柜的安装范围内查找"
                            : "在全部机柜的安装范围内查找"}
                        </small>
                      )}
                    </>
                  )}
                </section>
              )}
              {groups.map((group) => (
                <section key={group}>
                  <h3>
                    {group}
                    <span>
                      {
                        rows.filter(
                          (r) =>
                            groupOf(r) === group &&
                            (!browsingParts || !r.parent),
                        ).length
                      }
                    </span>
                  </h3>
                  {visibleRows
                    .filter((r) => groupOf(r) === group)
                    .map((row) => {
                      const text = resourceRowText(
                          row,
                          !unitQuery?.rack &&
                            (!!query.trim() || filter !== "all"),
                        ),
                        data = spatial.readings.get(row.id),
                        signal = signalFor(data),
                        style = signalStyles[signal];
                      const metricLayer =
                        layer === "environment"
                          ? "temperature"
                          : layer === "power"
                            ? "power"
                            : null;
                      const modelEvaluation =
                        row.kind === "part" &&
                        data?.quality === "valid" &&
                        data.lifecycle === "running" &&
                        data.evaluation > 0;
                      const showStatus =
                        !metricLayer ||
                        (signal !== "normal" &&
                          !(metricLayer === "power" && modelEvaluation));
                      const rowRatio = data
                        ? budgetRatio(data.power, data.budget)
                        : null;
                      const budgetHint =
                        metricLayer === "power"
                          ? budgetStateText(data?.budgetState, rowRatio)
                          : undefined;
                      const hasMetric =
                        data?.quality === "valid" &&
                        (metricLayer === "temperature"
                          ? data.temperature != null
                          : metricLayer === "power" && rowRatio !== null);
                      const metricColor =
                        hasMetric && metricLayer
                          ? "#" +
                            observationColor(
                              data,
                              metricLayer,
                              state.level === "device" ? 80 : 45,
                            ).getHexString()
                          : undefined;
                      const rowStatus = data
                        ? signalText(data)
                        : isCoolingSource(row.id)
                          ? "模拟输入"
                          : environmentProbe(row.id)
                            ? "环境测点 · 模拟"
                            : fixtureById(row.id)?.dataStatus ===
                                "not-applicable"
                              ? "结构布置"
                              : "未接入数据";
                      const roomDeviceRow =
                        roomResourceList && !!deviceById(row.id);
                      const roomUnitDevice = roomDeviceRow && !!unitQuery;
                      const locateOnly =
                        roomUnitDevice ||
                        row.kind === "part" ||
                        row.kind === "facility" ||
                        (state.level === "device" && row.id === state.deviceId);
                      return (
                        <div
                          className={`study-resource ${row.parent ? "is-child" : ""} ${selected === row.id ? "selected" : ""}`}
                          key={row.id}
                        >
                          <button
                            className="study-resource-text"
                            aria-pressed={selected === row.id}
                            title={[
                              row.name,
                              row.location,
                              rowStatus,
                              budgetHint,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                            aria-label={[row.name, rowStatus, budgetHint]
                              .filter(Boolean)
                              .join("，")}
                            onClick={() => selectObject(row.id)}
                          >
                            <span className="study-resource-title">
                              <strong>{text.title}</strong>
                              {showStatus && (
                                <span
                                  className="study-row-status"
                                  style={{ color: style.color }}
                                  title={rowStatus}
                                >
                                  {data
                                    ? style.icon
                                    : isCoolingSource(row.id) ||
                                        environmentProbe(row.id)
                                      ? "◇"
                                      : "—"}
                                </span>
                              )}
                            </span>
                            <small
                              className={
                                metricLayer && data
                                  ? "has-resource-measure"
                                  : undefined
                              }
                            >
                              <span>{text.detail}</span>
                              {metricLayer && data && (
                                <span
                                  className="resource-measure"
                                  data-budget-level={
                                    metricLayer === "power"
                                      ? data.budgetState?.level
                                      : undefined
                                  }
                                >
                                  {metricColor && (
                                    <i
                                      aria-hidden="true"
                                      style={{ backgroundColor: metricColor }}
                                    />
                                  )}
                                  {data.quality !== "valid"
                                    ? qualityNames[data.quality]
                                    : metricLayer === "temperature"
                                      ? data.temperature === null
                                        ? "—"
                                        : `${temperature(data.temperature)} °C`
                                      : data.power === null
                                        ? "—"
                                        : `${power(data.power)} ${data.power >= 1000 ? "kW" : "W"}${rowRatio == null ? "" : ` · ${budgetPercent(rowRatio)}`}`}
                                </span>
                              )}
                            </small>
                          </button>
                          <div
                            className="study-row-actions"
                            data-installation-only={roomUnitDevice || undefined}
                            aria-label={`${row.name}操作`}
                          >
                            <button
                              disabled={
                                !ready ||
                                (!unitQuery &&
                                  !locateOnly &&
                                  !canSelectInScene(state, row.id))
                              }
                              aria-label={`${unitQuery ? "定位安装位置" : "定位"} ${row.name}`}
                              onClick={() =>
                                unitQuery
                                  ? focus(row.id, {
                                      installation: true,
                                      showDetails: false,
                                    })
                                  : locateOnly
                                    ? selectObject(row.id, true)
                                    : focus(row.id, { showDetails: false })
                              }
                            >
                              {roomUnitDevice ? "定位安装位" : "定位"}
                            </button>
                            {row.kind === "part" &&
                              rows.some((child) => child.parent === row.id) && (
                                <button
                                  aria-label={`${expanded.includes(row.id) ? "收起" : "展开"}${row.name}子件`}
                                  aria-expanded={expanded.includes(row.id)}
                                  onClick={() =>
                                    setExpanded((current) =>
                                      current.includes(row.id)
                                        ? current.filter((id) => id !== row.id)
                                        : [...current, row.id],
                                    )
                                  }
                                >
                                  子件
                                </button>
                              )}
                            {!locateOnly && (
                              <button
                                disabled={!ready}
                                aria-label={`${resourceOpenLabel(state, row.id)} · ${row.name}`}
                                onClick={() => selectObject(row.id, true)}
                              >
                                {roomDeviceRow ? "进机柜" : "进入"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </section>
              ))}
              {!rows.length && !unitQuery?.error && !blanking?.length && (
                <p className="study-empty">
                  {onlyAlarms
                    ? query.trim() || filter !== "all"
                      ? "没有匹配的告警资源"
                      : "当前范围没有活动告警"
                    : "没有匹配的资源"}
                  <button
                    onClick={() => {
                      setOnlyAlarms(false);
                      setQuery("");
                      setFilter("all");
                    }}
                  >
                    查看全部资源
                  </button>
                </p>
              )}
            </div>
          )}
          {!alarmQueueVisible &&
            navigationView === "list" &&
            state.level === "device" && (
              <footer className="study-nav-caption">
                部件状态为模型评估，非独立告警
              </footer>
            )}
        </aside>
        <section
          ref={stageRef}
          tabIndex={-1}
          className="study-stage"
          aria-label="三维工作区"
        >
          <div className="study-layer-control">
            {!nav && (
              <button
                ref={navigationOpenerRef}
                aria-label="展开资源导航"
                onClick={() => {
                  takeover();
                  setNav(true);
                }}
              >
                资源
              </button>
            )}
            <nav aria-label="观察视图">
              {reviewLayers.map((l) => (
                <button
                  key={l.id}
                  aria-pressed={layer === l.id}
                  onClick={() => {
                    if (l.id === layer) return;
                    control({ type: "layer", layer: l.id });
                    if (state.level !== "device")
                      setRackView(navigationViews(state.level, l.id)[0]);
                    if (
                      l.id === "alarms" &&
                      selected === "room-01" &&
                      state.level === "room" &&
                      !review.analysis
                    ) {
                      setRackView("list");
                      setNav(true);
                    }
                    setOnlyAlarms(l.id === "alarms");
                    setMetric(l.id === "power" ? "power" : "temperature");
                  }}
                >
                  {l.name}
                </button>
              ))}
            </nav>
          </div>
          <ReviewScene
            captureTaskView={captureTaskView}
            taskReturn={
              (returningFromAirflow && airflowOrigin) ||
              (layoutReturning && layoutVisit?.origin) ||
              (alarmReturning && alarmVisit) ||
              (portReturning && portVisit) ||
              (networkMapReturning && networkMapVisit) ||
              (comparisonReturning && comparisonVisit) ||
              (smokeReturning && smokeVisit) ||
              environmentReturn ||
              (powerOverviewReturning && powerOverviewVisit) ||
              (inletReturning && inletInspection) ||
              (inletAirflowReturning && inletAirflowVisit) ||
              blankingRestore ||
              (peakReturning && peakVisit) ||
              (sourceReturning && sourceVisit) ||
              spaceRestore ||
              (spaceReturning && spaceVisit) ||
              (grilleReturning && grilleVisit) ||
              (coolingReturning && coolingVisit) ||
              null
            }
            rangeViewCommand={rangeViewCommand}
            onRangeViewChange={(side, segmentId) => {
              setRangeView(side);
              setRangeSegmentId(segmentId);
            }}
            fanViewRevision={fanViewRevision}
            fanViewSide={activeFanVisit?.side ?? "front"}
            storageViewRevision={storageViewRevision}
            storageContact={activeStorageVisit?.mode === "contact"}
            isolatedPartId={isolatedPartId}
            state={state}
            unitRange={
              layer === "overview" && state.level === "rack"
                ? spaceVisit &&
                  !spaceReturning &&
                  rackForDevice(state.deviceId).id === spaceVisit.range.rackId
                  ? spaceVisit.range
                  : spaceRange
                : null
            }
            sliceControls={sliceControls}
            setSliceControls={setSliceControls}
            layer={layer}
            layoutViewRevision={layoutViewRevision}
            readings={spatial.readings}
            selectedId={selected}
            roomDevice={roomDevice}
            alarmOriginId={
              alarmQueueVisible ? (alarmVisit ?? alarmReturned)?.id : undefined
            }
            airflow={airflow}
            onAirflowViewChange={setAirflowStageView}
            onExplainAirflow={() => {
              takeover();
              control({ type: "analysis", value: false });
              setInspector(true);
              if (matchMedia("(max-width: 1099px)").matches) setNav(false);
              setAirflowEndpoint(null);
              setAirflowExplanation("summary");
            }}
            airflowVisit={activeAirflowVisit}
            airflowResponseActive={!!activeAirflowResponse}
            onCompareAirflow={(route, preserveView) => {
              const target = airflowResponseTarget(route);
              if (!target || !ready) return;
              responsePreserveView.current = preserveView;
              setAirflowResponse({
                target,
                context: responseContext,
                analysis: review.analysis,
                inspector,
                nav,
                scroll: inspectorRef.current?.scrollTop ?? 0,
              });
              control({ type: "analysis", value: true });
              setInspector(true);
              if (matchMedia("(max-width: 1099px)").matches) setNav(false);
            }}
            onReturnAirflowEndpoint={() => {
              if (!activeAirflowVisit) return;
              if (activeAirflowVisit.inspector)
                setAirflowExplanation("endpoint");
              pick(activeAirflowVisit.originId);
              setNav(activeAirflowVisit.nav);
              setInspector(activeAirflowVisit.inspector);
              control({ type: "analysis", value: activeAirflowVisit.analysis });
            }}
            aisle={aisle}
            networkLinkId={activeNetworkLink}
            showNetworkPatch={patchActive}
            powerViewCommand={powerViewCommand}
            powerViewActive={powerViewActive}
            powerViewPaired={powerViewPaired}
            canStartInletPair={canStartInletPair}
            inletPair={pairedInlet}
            inletView={inletView}
            inletViewCommand={inletViewCommand}
            onInletViewChange={setInletView}
            onInletView={requestInletView}
            environmentPair={pairedEnvironment}
            environmentPairMetric={environmentPairMetric}
            environmentView={environmentView}
            environmentViewCommand={environmentViewCommand}
            onEnvironmentViewChange={setEnvironmentView}
            onEnvironmentView={requestEnvironmentView}
            smokeInspectionActive={!!smokeVisit}
            maintenanceView={maintenanceView}
            onMaintenanceViewChange={setMaintenanceView}
            entranceView={entranceView}
            entranceViewCommand={entranceViewCommand}
            onEntranceViewChange={setEntranceView}
            onEntranceView={requestEntranceView}
            leakView={leakView}
            leakViewCommand={leakViewCommand}
            onLeakViewChange={setLeakView}
            onLeakView={requestLeakView}
            crossing={crossing}
            crossingCommand={crossingCommand}
            onCrossingChange={setCrossing}
            onReturnCrossing={() => requestCrossing(null)}
            onPowerViewChange={setPowerViewActive}
            onPowerView={requestPowerView}
            networkViewCommand={networkViewCommand}
            networkViewActive={networkViewActive}
            onNetworkViewChange={setNetworkViewActive}
            onNetworkView={requestNetworkView}
            powerLinkId={activePowerLink}
            pduInspection={pduInspection}
            sliceViewCommand={sliceViewCommand}
            slicePlaneActive={slicePlaneActive}
            onSlicePlaneChange={(active) => {
              setSlicePlaneActive(active);
              if (active) {
                setInspector(true);
                if (matchMedia("(max-width: 1099px)").matches) setNav(false);
              }
            }}
            onSliceViewChange={setSliceViewActive}
            sliceInspection={
              sliceCheck
                ? {
                    context: sliceEvidence,
                    sourceId: sliceCheck.sourceId,
                    deviceId: sliceCheck.deviceId,
                  }
                : null
            }
            onOpenAirflowInstallation={
              grilleVisit &&
              airflow?.routes[0]?.deviceId === grilleVisit.deviceId
                ? () => selectObject(grilleVisit.deviceId, true)
                : coolingVisit &&
                    airflow?.routes[0]?.rackId === coolingVisit.rackId
                  ? () =>
                      focus(airflow.routes[0].deviceId, { installation: true })
                  : undefined
            }
            coolingRangeObservation={!!coolingVisit && !coolingReturning}
            frameRoomAirflow={
              !!airflowOrigin &&
              !returningFromAirflow &&
              ready &&
              state.level === "room" &&
              selected === airflowOrigin.target
            }
            onShowRoomAirflow={() => showAirflow(selected, "scene")}
            onInspectBudget={
              availableSourceMetrics.includes("power")
                ? () => {
                    openSourceCheck("power");
                    setInspector(true);
                    if (matchMedia("(max-width: 1099px)").matches)
                      setNav(false);
                  }
                : null
            }
            onInspectSlice={(deviceId) => {
              takeover();
              setSliceCheck({ deviceId, sourceId: null, previewId: null });
              setInspector(true);
              if (matchMedia("(max-width: 1099px)").matches) setNav(false);
            }}
            onClearPower={() => {
              takeover();
              setPduInspection((current) =>
                current?.pduId === selected
                  ? { ...current, outlet: null }
                  : current,
              );
              setPowerLinkId(null);
            }}
            onClearNetwork={() => {
              takeover();
              changeNetworkTrace(null);
            }}
            onSelect={(id, enter) => {
              if (
                enter &&
                roomLayoutDevices &&
                (rackById(id) || deviceById(id))
              )
                openLayoutInstallation(id);
              else selectObject(id, enter);
            }}
            onPreviewInput={(id) => {
              pick(id);
              return () => {
                pick(selected);
                setNav(nav);
                setInspector(inspector);
                control({ type: "analysis", value: review.analysis });
              };
            }}
            onFocus={() => focus(selected, { showDetails: false })}
            onPhase={setPhase}
            onFeedback={setFeedback}
            shotRevision={revision}
            tourShot={tourShot}
            onTakeover={takeover}
            compactTools
            controls={
              smokeVisit &&
              isSmokeFixture(selected) &&
              state.level === "room" &&
              layer === "overview" ? (
                <SmokeInspectionControls
                  origin={smokeVisit.id}
                  selected={selected}
                  ready={ready && !smokeReturning}
                  onPreview={selectObject}
                  onLocate={() => focus(selected, { showDetails: false })}
                  onReturn={() => {
                    setSmokeReturning(true);
                    if (smokeVisit.camera) pick(smokeVisit.id);
                    else focus(smokeVisit.id);
                  }}
                  onEnd={() => {
                    setSmokeVisit(null);
                    setSmokeRestore(true);
                  }}
                />
              ) : structureVisit ? (
                <StructureNavigation
                  visit={structureVisit}
                  state={state}
                  analysis={review.analysis}
                  ready={ready}
                  dispatch={dispatch}
                  onFront={() => {
                    takeover();
                    setStorageViewRevision((n) => n + 1);
                  }}
                  onGroup={activeFanVisit ? returnFanGroup : returnStorageGroup}
                  onFinish={finishStructureCheck}
                  onSide={(side) => {
                    if (!activeFanVisit || !ready) return;
                    takeover();
                    setFanVisit({ ...activeFanVisit, side });
                    setFanViewRevision((n) => n + 1);
                  }}
                />
              ) : isolatedPartId ? (
                <PartSequence
                  sequence={partInspectionSequence(
                    state.deviceId,
                    isolatedPartId,
                  )!}
                  state={state}
                  dispatch={dispatch}
                  ready={ready}
                  onSelect={(id, action) => {
                    partSequenceFocus.current = action;
                    control({ type: "inspect-adjacent-part", id });
                  }}
                  onFinish={() => {
                    partSequenceFocus.current = "finish";
                    setInspectionDevice(null);
                    control({ type: "finish-part-inspection" });
                  }}
                  onRestore={() => {
                    partSequenceFocus.current = "isolate";
                    setInspectionDevice(null);
                  }}
                />
              ) : roomDevice &&
                (!nav ||
                  (roomResourceList &&
                    !rows.some((row) => row.id === selected))) ? (
                <div
                  className="review-object-actions"
                  role="group"
                  aria-label="所选设备"
                >
                  <button
                    disabled={!ready}
                    onClick={() =>
                      roomLayoutDevices
                        ? openLayoutInstallation(roomDevice.id)
                        : selectObject(roomDevice.id, true)
                    }
                  >
                    {roomDevice.name} · 查看{rackForDevice(roomDevice.id).name}{" "}
                    ↗
                  </button>
                </div>
              ) : state.level !== "room" ? (
                <ResourceActions
                  onIsolation={() => {
                    takeover();
                    partSequenceFocus.current = "heading";
                    setInspectionDevice(state.deviceId);
                  }}
                  state={state}
                  selected={selected}
                  ready={ready}
                  phase={phase}
                  pendingId={review.pendingId}
                  dispatch={dispatch}
                  onOpen={(id) => {
                    if (entity.kind === "part" && state.level === "device") {
                      partSequenceFocus.current = "isolate";
                      focus(id, { showDetails: false });
                    } else selectObject(id, true);
                  }}
                  onExtract={(id) => control({ type: "extract-resource", id })}
                />
              ) : null
            }
          />
          {state.level === "room" &&
            layer === "overview" &&
            (!nav || navigationView === "list") &&
            !roomDevice &&
            maintenance.length === 0 &&
            !fixture &&
            !coolingFacility &&
            !powerFacility &&
            !activeNetworkLink && (
              <div
                className="study-room-summary"
                role="group"
                aria-label="机房运行概览"
              >
                <div>
                  <p>
                    <strong>
                      {room.lifecycleCounts.running}
                      <small>台</small>
                    </strong>
                    <span>运行设备</span>
                  </p>
                  <p>
                    <strong>
                      {power(room.power)}
                      <small>kW</small>
                    </strong>
                    <span>已知输入功耗</span>
                  </p>
                </div>
                {selected !== "room-01" && (
                  <button onClick={() => pick("room-01")}>查看机房详情</button>
                )}
              </div>
            )}
          {layer === "alarms" &&
            state.level === "room" &&
            !(alarmQueueVisible && (nav || alarmVisit)) && (
              <div className="study-alert-caption">
                <span>当前异常</span>
                <strong>
                  {room.alarmCount}
                  <small>台设备</small>
                </strong>
                <button
                  onClick={() => {
                    takeover();
                    setRackView("list");
                    setOnlyAlarms(true);
                    setNav(true);
                    if (matchMedia("(max-width: 1099px)").matches)
                      setInspector(false);
                  }}
                >
                  逐台查看告警
                </button>
              </div>
            )}
          {(!inspector || nav) && (
            <button
              ref={inspectorOpener}
              className="study-show-detail"
              onClick={() => {
                takeover();
                setInspector(true);
                if (matchMedia("(max-width: 1099px)").matches) setNav(false);
              }}
            >
              {review.analysis ? "时间分析" : "对象详情"}
            </button>
          )}
        </section>
        {inspector && (
          <aside
            ref={inspectorRef}
            className={`study-inspector ${review.analysis ? "is-analysis" : ""}`}
            key={
              (entranceView || leakView) && !review.analysis
                ? "fixture-inspection"
                : review.analysis && pairedInlet
                  ? `inlet:${pairedInlet.firstId}:${pairedInlet.secondId}`
                  : review.analysis && pairedEnvironment
                    ? `environment:${pairedEnvironment.firstId}:${pairedEnvironment.secondId}`
                    : `${selected}:${review.analysis}`
            }
            aria-label={review.analysis ? "时间分析面板" : "对象详情"}
          >
            <div className="study-panel-heading">
              <h2 tabIndex={-1}>{review.analysis ? "时间分析" : "对象详情"}</h2>
              {review.analysis && (
                <button
                  className="study-return-detail"
                  aria-label="返回对象详情"
                  onClick={returnToDetails}
                >
                  详情
                </button>
              )}
              <button aria-label="收起详情面板" onClick={collapseInspector}>
                ×
              </button>
            </div>
            {activeAirflowResponse ? (
              <div className="study-identity">
                <small>气流代表支路 · 模拟对照</small>
                <h1>冷却输入与设备进风</h1>
              </div>
            ) : (
              <div
                className="study-identity"
                data-alarmed={
                  (!!reading?.alarm &&
                    !fixture &&
                    !powerFacility &&
                    !coolingFacility) ||
                  undefined
                }
              >
                <small>{resource?.location}</small>
                <h1 tabIndex={-1}>{resource?.name ?? entity.name}</h1>
                <span
                  style={{
                    color:
                      powerFacility || coolingFacility || fixture
                        ? "#9caebc"
                        : signal.color,
                  }}
                >
                  {environment ? (
                    "◇ 环境测点 · 模拟，未接入真实数据"
                  ) : fixture ? (
                    fixture.dataStatus === "not-applicable" ? (
                      "— 结构布置 · 无运行数据"
                    ) : (
                      "— 布置示意 · 未接入数据"
                    )
                  ) : coolingFacility ? (
                    "◇ 冷却输入 · 模拟"
                  ) : powerFacility ? (
                    "◇ 连接示意 · 未计量"
                  ) : (
                    <>
                      {signal.icon} {component ? "模型评估 · " : ""}
                      {component ? signal.label : signalText(reading)}
                    </>
                  )}
                </span>
              </div>
            )}
            {networkTrace && !portOwnsTrace && !review.analysis && (
              <NetworkTrace
                link={networkTrace}
                onOpenPatch={
                  state.level === "room" &&
                  rackView === "network" &&
                  supportsNetworkPatch(networkTrace)
                    ? () => {
                        rememberMarkedConnection();
                        openNetworkPatch(networkTrace);
                      }
                    : undefined
                }
                onCheckPort={() => {
                  const check = {
                    switchId: networkTrace.target,
                    port: networkTrace.targetPort,
                    query:
                      portVisit?.check.switchId === networkTrace.target
                        ? portVisit.check.query
                        : "",
                  };
                  portReturnFocus.current = {
                    check,
                    offset:
                      (inspectorRef.current?.querySelector<HTMLElement>(
                        ".study-panel-heading",
                      )?.offsetHeight ?? 0) + 12,
                    localActionsOpen: false,
                  };
                  pick(check.switchId);
                  setPortCheck(check);
                }}
                patchAvailable={patchAvailable}
                patchActive={patchActive}
                onTogglePatch={() => {
                  setPendingPatch(null);
                  if (patchEntry) {
                    if (!patchEntry.doorOpen)
                      dispatch({ type: "door", open: false });
                    setPatchEntry(null);
                  } else {
                    setPatchEntry({ doorOpen: state.doorOpen });
                    if (!state.doorOpen) dispatch({ type: "door", open: true });
                  }
                }}
                deviceId={networkDeviceId(selected, state.deviceId)}
                inside={state.level === "device" ? state.deviceId : null}
                ready={ready}
                showEndMark={
                  !!isolatedPartId ||
                  networkMarkers(state, selected, networkTrace.id).length === 0
                }
                onPreview={(id) => {
                  if (id !== selected) networkControlFocus.current = "endpoint";
                  pick(id);
                }}
                onLocate={(id) => {
                  rememberMarkedConnection();
                  focus(id, { installation: true });
                }}
                onInspect={(id) => {
                  rememberMarkedConnection();
                  control({
                    type: "inspect-network-endpoint",
                    linkId: networkTrace.id,
                    deviceId: id,
                  });
                  setQuery("");
                  setFilter("all");
                  setPowerLinkId(null);
                  if (matchMedia("(max-width: 1099px)").matches) setNav(false);
                }}
                onTrace={(id) => {
                  if (id) networkControlFocus.current = "branch";
                  changeNetworkTrace(id);
                }}
              />
            )}
            {activeFanVisit && !review.analysis && (
              <FanInspection
                deviceId={state.deviceId}
                visit={activeFanVisit}
                ready={ready}
                focusRevision={fanFocusRevision}
                onSelect={(id) => {
                  setFanFocusRevision((n) => n + 1);
                  pick(id);
                }}
                onInspect={() => {
                  if (!activeFanVisit || !ready) return;
                  setFanFocusRevision((n) => n + 1);
                  setFanVisit({ ...activeFanVisit, mode: "single" });
                  pick(activeFanVisit.fanId);
                }}
                onGroup={returnFanGroup}
                onFinish={finishStructureCheck}
              />
            )}
            {activeStorageVisit && !review.analysis && (
              <StorageSlots
                deviceId={state.deviceId}
                selected={selected}
                visit={activeStorageVisit}
                ready={ready}
                focusRevision={storageFocusRevision}
                onSelect={(id) => {
                  setStorageFocusRevision((n) => n + 1);
                  pick(id);
                }}
                onInspect={(id) => {
                  if (!activeStorageVisit || !ready) return;
                  setStorageFocusRevision((n) => n + 1);
                  setStorageVisit({
                    ...activeStorageVisit,
                    mode: "disk",
                    diskId: id,
                  });
                  pick(id);
                }}
                onContact={(id) => {
                  if (!activeStorageVisit || !ready) return;
                  takeover();
                  setStorageFocusRevision((n) => n + 1);
                  setStorageVisit({
                    ...activeStorageVisit,
                    mode: "contact",
                    diskId: id,
                  });
                  pick(id);
                  setStorageViewRevision((n) => n + 1);
                }}
                onGroup={returnStorageGroup}
                onFinish={finishStructureCheck}
              />
            )}
            {spaceVisit && !spaceReturning && !review.analysis && (
              <section className="space-inspection-context">
                <details>
                  <summary>
                    范围占用 · 相交 {spaceRangeLabel(spaceVisit.overlap)}（
                    {spaceVisit.overlap.units} U）
                  </summary>
                  <p>
                    {spaceVisit.device.name} 完整安装{" "}
                    {spaceRangeLabel(spaceVisit.device)}。原核查范围{" "}
                    {spaceRangeLabel(spaceVisit.range)}，其中设备占用{" "}
                    {spaceVisit.occupied} U、未安装 {spaceVisit.blanked} U。
                  </p>
                  <small>抽出设备仍占原安装位。未安装位置仅供几何核对。</small>
                </details>
                <button
                  disabled={!ready}
                  onClick={() =>
                    focus(spaceVisit.deviceId, { installation: true })
                  }
                >
                  定位安装位
                </button>
              </section>
            )}
            {peakVisit && peakReview && !peakReturning && (
              <section
                className="peak-inspection-return"
                aria-label="最高来源检视往返"
              >
                <small>
                  t+{peakVisit.time}s 最高来源
                  {peakVisit.sources.length > 1 ? "之一" : ""}
                </small>
                <small>
                  {deviceById(peakVisit.deviceId)?.name} ·{" "}
                  {peakVisit.temperature.toFixed(1)} °C · 当时覆盖{" "}
                  {peakVisit.coverage}/{peakVisit.count}
                </small>
                <small>
                  {peakInspectionStatus(peakVisit, spatial.readings)}
                  ；不表示故障根因。
                </small>
                <div>
                  <button
                    disabled={!ready}
                    onClick={() => showAirflow(peakVisit.deviceId)}
                  >
                    机房气流 ↗
                  </button>
                  <button
                    disabled={!ready}
                    onClick={() => {
                      control({ type: "analysis", value: false });
                      pick(peakVisit.deviceId, true);
                    }}
                  >
                    {resourceOpenLabel(state, peakVisit.deviceId)} ↗
                  </button>
                </div>
              </section>
            )}
            {sourceVisit &&
              sourceCheck &&
              currentSourceRow &&
              !sourceReturning && (
                <section
                  className="source-inspection-return"
                  aria-label="输入检视往返"
                >
                  <small>
                    t+{sourceVisit.time}s · {sourceVisit.row.name} ·{" "}
                    {sourceVisit.row.reason}
                    {sourceVisit.row.included
                      ? ` · ${sourceValue(sourceVisit.row.value, sourceVisit.check.metric)}`
                      : ""}
                  </small>
                  <small>
                    当时覆盖 {sourceVisit.coverage}/{sourceVisit.count} · 当前
                    {currentSourceRow.included ? "已计入" : "未计入"}：
                    {currentSourceRow.reason}
                    {currentSourceRow.included
                      ? ` · ${sourceValue(currentSourceRow.value, sourceVisit.check.metric)}`
                      : ""}
                  </small>
                  {!currentSourceRow.included && (
                    <small>{currentSourceRow.detail}</small>
                  )}
                  <div>
                    {sourceVisit.check.metric === "temperature" ? (
                      <button
                        disabled={!ready}
                        onClick={() => showAirflow(sourceVisit.deviceId)}
                      >
                        机房气流 ↗
                      </button>
                    ) : (
                      powerLinks
                        .filter(
                          (link) => link.deviceId === sourceVisit.deviceId,
                        )
                        .map((link) => (
                          <button
                            key={link.id}
                            disabled={!ready}
                            onClick={() => {
                              control({ type: "layer", layer: "power" });
                              control({ type: "analysis", value: false });
                              focus(sourceVisit.deviceId, {
                                installation: true,
                              });
                              setPowerLinkId(link.id);
                            }}
                          >
                            追踪输入 {link.inlet} ↗
                          </button>
                        ))
                    )}
                    <button
                      disabled={!ready}
                      onClick={() => {
                        control({ type: "analysis", value: false });
                        pick(sourceVisit.deviceId, true);
                      }}
                    >
                      {resourceOpenLabel(state, sourceVisit.deviceId)} ↗
                    </button>
                  </div>
                  <small>
                    {sourceVisit.check.metric === "temperature"
                      ? "整机进风口径；部件推导不加入汇总。"
                      : "整机输入按设备去重；A/B 未拆分计量，预算不是剩余容量。"}
                  </small>
                </section>
              )}
            {rangeView && spaceRange && (
              <section
                className={`range-view-details ${review.analysis ? "is-compact" : ""}`}
                aria-label="安装范围近景"
              >
                <strong>
                  {rackById(spaceRange.rackId)?.name} · U{spaceRange.first}
                  {spaceRange.last !== spaceRange.first
                    ? `–${spaceRange.last}`
                    : ""}
                </strong>
                <p>
                  {blankingVisit ? (
                    `连续 ${spaceRange.last - spaceRange.first + 1} U 前置盲板。括线标出整段安装位置，${rangeView === "front" ? "可打开前门查看封板。" : "从柜后对照同一高度，不表示有后置盲板。"}`
                  ) : (
                    <>
                      当前从{rangeView === "front" ? "前" : "后"}
                      侧观察。括线指向
                      {activeSegmentId ? "当前分段" : "核查范围"}
                      ，不随设备抽出移动；占用设备仍按完整跨度选择。
                    </>
                  )}
                </p>
                <RangeViewActions
                  active={rangeView}
                  ready={ready}
                  onView={requestRangeView}
                />
                {!blankingVisit && (
                  <RangeSegments
                    segments={segments}
                    currentId={activeSegmentId}
                    observing={!!rangeView}
                    onReturn={() => requestRangeView("return")}
                    compact={review.analysis}
                    ready={ready}
                    onSegment={requestRangeSegment}
                    onDevice={inspectRangeDevice}
                  />
                )}
                <small>
                  门扇可用场景操作打开。未安装位置有前置盲板，不代表可分配容量。
                </small>
              </section>
            )}
            {maintenanceView && !review.analysis && (
              <section
                className="maintenance-view-details"
                aria-label="维护范围核对"
              >
                <strong>维护范围 · 配置预留</strong>
                {maintenanceView.areas.map((area) => (
                  <div key={area.id}>
                    <button
                      aria-pressed={selected === area.rackId}
                      onClick={() => pick(area.rackId)}
                    >
                      {area.rackName} ·{" "}
                      {area.kind === "front" ? "柜前操作" : "柜后检修"}
                    </button>
                    <span>
                      进深 {area.depth.toFixed(2)} m × 宽{" "}
                      {area.width.toFixed(2)} m
                    </span>
                  </div>
                ))}
                {maintenanceView.aisle && (
                  <p>
                    柜面间距 {maintenanceView.aisle.faceDistance.toFixed(2)} m ·{" "}
                    {reserveGapText(maintenanceView.aisle.gap)}
                  </p>
                )}
                <p>
                  地面轮廓仅表示配置预留，不是实测净距、人员作业条件或通行结论。未包含全部建筑障碍物。
                </p>
              </section>
            )}
            {isSmokeFixture(selected) && !smokeVisit && (
              <div className="smoke-inspection-entry">
                <button
                  data-smoke-start
                  disabled={!ready}
                  onClick={() => {
                    setSmokeVisit({
                      camera: captureTaskView.current?.("room") ?? null,
                      id: selected,
                      layer,
                      analysis: review.analysis,
                      nav,
                      query,
                      filter,
                      onlyAlarms,
                    });
                    setSmokeRestore(false);
                    control({ type: "layer", layer: "overview" });
                    control({ type: "analysis", value: false });
                    focus(selected);
                  }}
                >
                  逐点核对烟感布置 ↗
                </button>
              </div>
            )}
            {crossing && (
              <section
                className="crossing-details"
                aria-label={crossing.title}
                tabIndex={-1}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && ready) {
                    event.preventDefault();
                    event.stopPropagation();
                    requestCrossing(null);
                  }
                }}
              >
                <strong>{crossing.title} · 配置</strong>
                <div>
                  <button onClick={() => pick(crossing.upper.id)}>
                    ① {crossing.upper.name}
                  </button>
                  <span>
                    {crossing.upper.surface} {crossing.points[0].y.toFixed(3)} m
                  </span>
                </div>
                <div>
                  <button onClick={() => pick(crossing.lower.id)}>
                    ② {crossing.lower.name}
                  </button>
                  <span>
                    {crossing.lower.surface} {crossing.points[1].y.toFixed(3)} m
                  </span>
                </div>
                <p>
                  {crossing.upper.surface}比{crossing.lower.surface}
                  {crossing.difference >= 0 ? "高" : "低"}{" "}
                  <b>{Math.abs(crossing.difference).toFixed(2)} m</b>。
                  {crossing.boundary}
                </p>
                {layoutVisit?.crossing?.id !== crossing.id && (
                  <button
                    disabled={!ready}
                    onClick={() => requestCrossing(null)}
                  >
                    ← 返回核对前视角
                  </button>
                )}
              </section>
            )}
            {review.analysis ? (
              <>
                <div className="study-time-control">
                  <label htmlFor="study-review-time">回看时刻</label>
                  <span>00:00 – 02:00</span>
                  <input
                    id="study-review-time"
                    aria-label="共享模拟时间"
                    aria-valuetext={clock(state.time)}
                    type="range"
                    min="0"
                    max="120"
                    value={state.time}
                    onChange={(e) =>
                      dispatch({ type: "seek", time: Number(e.target.value) })
                    }
                  />
                </div>
                {slicePlaneInspector}
                {sliceInspector}
                {(fixture || pairedInlet) && sourceInspector}
                {activeAirflowResponse ? (
                  <AirflowResponseAnalysis
                    target={activeAirflowResponse.target}
                    time={state.time}
                    cycle={state.replayCycle}
                    reading={spatial.readings.get(
                      activeAirflowResponse.target.deviceId,
                    )!}
                    ready={ready}
                    playbackRate={state.playbackRate}
                    onSeek={(time) => dispatch({ type: "seek", time })}
                    onReplay={() => dispatch({ type: "replay" })}
                    onRate={(rate) => dispatch({ type: "rate", rate })}
                    onReturn={returnAirflowResponse}
                  />
                ) : pairedEnvironment ? (
                  <EnvironmentPairAnalysis
                    pair={pairedEnvironment}
                    metric={environmentPairMetric}
                    comparability={comparability}
                    onComparability={setComparability}
                    inspection={environmentView}
                    inRoom={state.level === "room"}
                    time={state.time}
                    selected={selected}
                    ready={ready}
                    onMetric={setEnvironmentPairMetric}
                    onSeek={(time) => dispatch({ type: "seek", time })}
                    onPreview={pick}
                    onLocate={focus}
                    onClose={() => setEnvironmentPairVisit(null)}
                  />
                ) : environment && fixture ? (
                  <EnvironmentDetails
                    onAnalyzePair={analyzeEnvironmentPair}
                    comparisonOpen={environmentComparisonOpen}
                    onComparisonToggle={setEnvironmentComparisonOpen}
                    fixture={fixture}
                    time={state.time}
                    analysis
                    onSeek={(time) => dispatch({ type: "seek", time })}
                    onAnalyze={analyze}
                    onPreview={pick}
                    onLocate={focus}
                  />
                ) : smokeVisit && isSmokeFixture(selected) ? (
                  <p className="fixture-analysis-note">
                    烟感信号未接入，没有历史曲线或事件。
                  </p>
                ) : fixture && leakView ? (
                  <p className="fixture-analysis-note">
                    此设施未接入漏水信号，没有历史曲线或事件。
                  </p>
                ) : fixture ? (
                  <p className="fixture-analysis-note">
                    {fixture.dataStatus === "not-applicable"
                      ? "静态布置对象，没有运行曲线或事件。"
                      : "此设施尚未接入遥测，没有历史曲线或事件。"}
                  </p>
                ) : pairedInlet ? (
                  <InletPairAnalysis
                    key={`${pairedInlet.firstId}:${pairedInlet.secondId}`}
                    differenceReview={inletDifferenceReview}
                    onDifferenceReview={setInletDifferenceReview}
                    firstId={pairedInlet.firstId}
                    secondId={pairedInlet.secondId}
                    time={state.time}
                    cycle={state.replayCycle}
                    selectedId={inletId}
                    ready={ready}
                    eventHeading={eventHeading}
                    onSeek={(time) => dispatch({ type: "seek", time })}
                    onPreview={(id) => {
                      pick(id);
                      if (inletView) return;
                      const target = roomAirflowTarget(id, state.deviceId);
                      setSliceControls((current) =>
                        alignAirflowSlice(current, target?.rowId ?? null),
                      );
                    }}
                    onLocate={locateEventDevice}
                    onAirflow={showAirflow}
                    onClose={() => setInletPair(null)}
                  />
                ) : (
                  <ReviewAnalysis
                    key={`${state.replayCycle}:${revision}`}
                    evidence={
                      <>
                        {inletId && !pairedInlet && (
                          <InletAssessment
                            key={`${inletId}:${state.replayCycle}:${revision}`}
                            headingRef={inletHeading}
                            processState={
                              inletProcessReview?.key === inletProcessKey
                                ? inletProcessReview.value
                                : emptyInletProcess
                            }
                            onProcessChange={(value) =>
                              setInletProcessReview({
                                key: inletProcessKey,
                                value,
                              })
                            }
                            reading={spatial.readings.get(inletId)!}
                            sample={spatial.samples.get(inletId)!}
                            component={component}
                            ready={ready}
                            time={state.time}
                            onSeek={(time) => dispatch({ type: "seek", time })}
                            onAirflow={() => showAirflow(inletId)}
                            onLocate={() => locateEventDevice(inletId)}
                          />
                        )}
                        {sourceInspector}
                      </>
                    }
                    peakProcess={
                      peakScopeIds(selected) && (!peakVisit || peakReturning)
                        ? {
                            state:
                              peakReview?.scopeId === selected &&
                              peakReview.key === peakKey
                                ? peakReview.value
                                : emptyPeakProcess,
                            onChange: (value) =>
                              setPeakReview({
                                scopeId: selected,
                                key: peakKey,
                                value,
                              }),
                            onPreview: visitPeakSource,
                          }
                        : undefined
                    }
                    title={resource?.name ?? entity.name}
                    labels={{
                      temperature: reading?.temperatureLabel ?? "温度",
                      power: reading?.powerLabel ?? "功耗",
                    }}
                    histories={histories}
                    eventHeading={eventHeading}
                    events={events}
                    time={state.time}
                    playbackRate={state.playbackRate}
                    component={component}
                    powerOnly={powerFacility}
                    cooling={coolingHistories?.cooling}
                    onViewDeviceAirflow={showAirflow}
                    ready={ready}
                    onLocateDevice={
                      entity.kind === "room" ||
                      entity.kind === "rack" ||
                      powerFacility ||
                      coolingFacility
                        ? locateEventDevice
                        : undefined
                    }
                    onSeek={(time) => dispatch({ type: "seek", time })}
                    onReplay={() => dispatch({ type: "replay" })}
                    onRate={(rate) => dispatch({ type: "rate", rate })}
                    onClose={returnToDetails}
                  />
                )}
                {airflowInspector}
              </>
            ) : (
              <>
                {airflowInspector}
                {slicePlaneInspector}
                {sliceInspector}
                {(!!reading?.alarm || inspectedAlarm) && !component && (
                  <section
                    className="study-alarm-detail"
                    data-severity={reading?.alarm ?? 0}
                    data-active={!!reading?.alarm}
                  >
                    <h2>
                      {reading?.alarm
                        ? reading.count > 1
                          ? `${reading.alarmCount} 台设备进风温度异常`
                          : "设备进风温度持续超限"
                        : alarmCurrentStatus(reading)}
                    </h2>
                    {((alarmSample && reading) ||
                      (inspectedAlarm &&
                        reading?.alarm !== inspectedAlarm.severity)) && (
                      <p>
                        {inspectedAlarm &&
                          reading?.alarm !== inspectedAlarm.severity &&
                          `${alarmVisitLabel(inspectedAlarm)}。`}
                        {alarmSample &&
                          reading &&
                          inletAssessment(reading, alarmSample).detail}
                      </p>
                    )}
                    <div className="study-alarm-actions">
                      <button
                        disabled={(!!alarmSample || !!inspectedAlarm) && !ready}
                        onClick={() => {
                          if (alarmSample || inspectedAlarm)
                            beginAlarmInspection(selected, "analysis");
                          else {
                            jumpToEvents.current = true;
                            analyze();
                          }
                        }}
                      >
                        回看告警过程
                      </button>
                      {(alarmSample || inspectedAlarm) && (
                        <>
                          <button
                            disabled={!ready}
                            onClick={() =>
                              beginAlarmInspection(selected, "installation")
                            }
                          >
                            定位安装位
                          </button>
                          <button
                            disabled={!ready}
                            onClick={() =>
                              beginAlarmInspection(selected, "internal")
                            }
                          >
                            查看内部
                          </button>
                        </>
                      )}
                    </div>
                  </section>
                )}
                {smokeVisit && isSmokeFixture(selected) ? (
                  <SmokeInspectionDetails
                    origin={smokeVisit.id}
                    selected={selected}
                  />
                ) : leakView ? (
                  <LeakInspectionDetails
                    inspection={leakView}
                    selectedId={selected}
                    onPreview={pick}
                    onLocate={focus}
                    ready={ready}
                  />
                ) : environment && fixture ? (
                  <EnvironmentDetails
                    onAnalyzePair={analyzeEnvironmentPair}
                    comparisonOpen={environmentComparisonOpen}
                    onComparisonToggle={setEnvironmentComparisonOpen}
                    fixture={fixture}
                    time={state.time}
                    onSeek={(time) => dispatch({ type: "seek", time })}
                    onAnalyze={analyze}
                    onPreview={pick}
                    onLocate={focus}
                  />
                ) : fixture ? (
                  <FixtureDetails
                    fixture={fixture}
                    onInspectEntrance={
                      layer === "overview" && state.level === "room"
                        ? () => requestEntranceView("all")
                        : undefined
                    }
                    entranceInspection={entranceView}
                    onInspectLeak={
                      layer === "overview" && state.level === "room"
                        ? () => requestLeakView("all")
                        : undefined
                    }
                    onPreview={pick}
                    onLocate={focus}
                    grilleRelations={
                      grilleRowById(fixture.id) && (
                        <GrilleBranches
                          key={fixture.id}
                          rowId={fixture.id}
                          ready={ready}
                          activeRack={grilleRack[fixture.id]}
                          restore={grilleReturning ? grilleVisit : null}
                          onPreview={pick}
                          onLocate={focus}
                          onAirflow={visitGrilleBranch}
                        />
                      )
                    }
                    comparisonReady={ready}
                    onCompareRack={
                      layer === "overview" && state.level === "room"
                        ? (peer) =>
                            requestCrossing(fixtureCrossing(fixture.id, peer))
                        : undefined
                    }
                    onCompare={
                      layer === "overview" && state.level === "room"
                        ? (peer) =>
                            requestCrossing(fixtureCrossing(fixture.id, peer))
                        : undefined
                    }
                  />
                ) : coolingRange && coolingHistories ? (
                  <>
                    <div className="study-metrics cooling-metrics">
                      <div>
                        <span>演示冷却输入</span>
                        <strong>
                          {Math.round(coolingCapacityAt(state.time))}
                          <small>%</small>
                        </strong>
                        <small>模拟驱动 · 非风量或制冷量</small>
                      </div>
                      <div>
                        <span>关联设备最高进风</span>
                        <strong>
                          {temperature(coolingRange.maximum)}
                          <small>°C</small>
                        </strong>
                        <button
                          className="reading-coverage-link"
                          aria-label="核对进风温度输入"
                          onClick={() => openSourceCheck("temperature")}
                        >
                          有效覆盖 {coolingRange.coverage}/{coolingRange.count}{" "}
                          ↗
                        </button>
                      </div>
                    </div>
                    <div className="cooling-response-summary">
                      {coolingRange.hottestId && (
                        <button onClick={() => pick(coolingRange.hottestId!)}>
                          预览最高进风设备{" "}
                          {coolingRange.hottestId.toUpperCase()} ↗
                        </button>
                      )}
                      <p>
                        关联设备 {coolingRange.alarmIds.length} 台当前告警 ·
                        制冷单元未定义独立告警
                      </p>
                      <p>
                        过期 {coolingRange.quality.stale} · 离线{" "}
                        {coolingRange.quality.offline} · 缺失{" "}
                        {coolingRange.quality.missing} · 停机{" "}
                        {coolingRange.lifecycle.stopped}（无当前进风）
                      </p>
                    </div>
                    <section className="study-trend">
                      <div>
                        <h2>关联进风趋势</h2>
                      </div>
                      <ReviewTrend
                        series={coolingHistories.temperature}
                        metric="temperature"
                        time={state.time}
                        compact
                      />
                      <button onClick={analyze}>
                        对照冷却输入与温度响应 <span>↗</span>
                      </button>
                    </section>
                    {sourceInspector}
                    <CoolingConnections
                      range={coolingRangeBrowser}
                      rangeOpen={coolingRangeOpen}
                      onRangeOpen={setCoolingRangeOpen}
                      active={!!coolingVisit}
                      onInteract={takeover}
                      state={state}
                      selectedId={selected}
                      readings={spatial.readings}
                      ready={ready}
                      airflowVisible={
                        layer === "airflow" && state.level === "room"
                      }
                      onSelect={pick}
                      onLocateSource={() => pick(coolingSource.id, true)}
                      onViewAirflow={() => showAirflow(selected, "details")}
                    />
                    <FixtureRelations
                      title="邻近检漏设施"
                      relations={leakRelations(selected)}
                      onPreview={pick}
                      onLocate={focus}
                    />
                  </>
                ) : reading ? (
                  <>
                    <div
                      className={`study-metrics ${powerFacility ? "is-associated-power" : ""}`}
                    >
                      {!powerFacility && (
                        <div>
                          <span>{reading.temperatureLabel}</span>
                          <strong
                            style={{
                              color: metricAttentionColor(
                                reading,
                                "temperature",
                              ),
                            }}
                          >
                            {temperature(currentTemperature)}
                            {currentTemperature !== null && <small>°C</small>}
                          </strong>
                          {(reading.count > 1 ||
                            (sources && reading.coverageTemperature !== 1)) &&
                            (sources ? (
                              <button
                                className="reading-coverage-link"
                                aria-label="核对进风温度输入"
                                onClick={() => openSourceCheck("temperature")}
                              >
                                有效覆盖 {reading.coverageTemperature}/
                                {reading.count} ↗
                              </button>
                            ) : (
                              <small>
                                有效覆盖 {reading.coverageTemperature}/
                                {reading.count}
                              </small>
                            ))}
                        </div>
                      )}
                      {inletComparison ? (
                        <div>
                          <span>{inletComparison.temperatureLabel}</span>
                          <strong
                            style={{
                              color: metricAttentionColor(
                                inletComparison,
                                "temperature",
                              ),
                            }}
                          >
                            {temperature(parentInlet)}
                            {parentInlet !== null && <small>°C</small>}
                          </strong>
                        </div>
                      ) : (
                        <div>
                          <span
                            title={
                              powerAttention
                                ? budgetStateText(
                                    reading.budgetState,
                                    attentionRatio,
                                  )
                                : undefined
                            }
                          >
                            {reading.powerLabel}
                            {powerAttention && attentionRatio !== null && (
                              <>
                                <br />
                                {`${powerAttention.icon} ${budgetPercent(attentionRatio)}`}
                              </>
                            )}
                          </span>
                          <strong
                            style={{
                              color: metricAttentionColor(reading, "power"),
                            }}
                          >
                            {power(currentPower)}
                            {currentPower !== null && (
                              <small>{currentPower >= 1000 ? "kW" : "W"}</small>
                            )}
                          </strong>
                          {sources &&
                          availableSourceMetrics.includes("power") ? (
                            <button
                              className="reading-coverage-link"
                              aria-label="核对功耗输入与预算"
                              onClick={() => openSourceCheck("power")}
                            >
                              {reading.count > 1 || reading.coveragePower !== 1
                                ? `有效覆盖 ${reading.coveragePower}/${reading.count}`
                                : "核对输入与预算"}{" "}
                              ↗
                            </button>
                          ) : (
                            reading.count > 1 && (
                              <small>
                                有效覆盖 {reading.coveragePower}/{reading.count}
                              </small>
                            )
                          )}
                          {powerFacility && (
                            <small>关联设备汇总 · 非设施或支路计量</small>
                          )}
                        </div>
                      )}
                    </div>
                    <section className="study-trend">
                      <div>
                        <h2>{powerFacility ? "关联输入趋势" : "变化趋势"}</h2>
                        {!powerFacility && (
                          <button
                            aria-pressed={mainMetric === "temperature"}
                            onClick={() => setMetric("temperature")}
                          >
                            温度
                          </button>
                        )}
                        {!powerFacility && (
                          <button
                            aria-pressed={mainMetric === "power"}
                            onClick={() => setMetric("power")}
                          >
                            功耗
                          </button>
                        )}
                      </div>
                      <ReviewTrend
                        series={histories[mainMetric]}
                        metric={mainMetric}
                        time={state.time}
                        compact
                      />
                      <button onClick={analyze}>
                        分析曲线与事件 <span>↗</span>
                      </button>
                    </section>
                    {state.level === "device" &&
                      !activeFanVisit &&
                      !activeStorageVisit &&
                      (fanInspectionContext(state.deviceId, selected) ||
                        storageSlotContext(state.deviceId, selected)) && (
                        <StructureTools
                          key={`${revision}:${state.deviceId}:${selected}`}
                          fans={
                            fanInspectionContext(state.deviceId, selected)
                              ? fanAssembly(state.deviceId)!.fans.length
                              : 0
                          }
                          slots={
                            storageSlotContext(state.deviceId, selected)
                              ? storageSlots(state.deviceId).length
                              : 0
                          }
                          ready={ready}
                          restore={
                            structureReturn?.deviceId === state.deviceId
                              ? structureReturn.tool
                              : null
                          }
                          onRestored={() => setStructureReturn(null)}
                          onStart={startStructureTool}
                        />
                      )}
                    {sourceInspector}
                    {(layer === "power" || powerFacility) && (
                      <PowerConnections
                        paired={powerViewPaired}
                        onOpenFeeders={
                          state.level === "room" &&
                          !(nav && navigationView === "feeders")
                            ? openFeeders
                            : undefined
                        }
                        pduInspection={pduInspection}
                        onPduChange={(visit) => {
                          takeover();
                          setPduInspection(visit);
                          if (visit.outlet === null) setPowerLinkId(null);
                        }}
                        onPduSelect={(pduId, outlet) => {
                          const row = pduOutlet(pduId, outlet);
                          if (!row) return;
                          setPduInspection((current) => ({
                            pduId,
                            outlet,
                            query:
                              current?.pduId === pduId ? current.query : "",
                            scroll:
                              current?.pduId === pduId ? current.scroll : 0,
                          }));
                          setPowerLinkId(row.link?.id ?? null);
                          control({ type: "layer", layer: "power" });
                        }}
                        activeLinkId={
                          layer === "power" ? activePowerLink : null
                        }
                        onTrace={(id) => {
                          const link = powerLinkById(id);
                          if (
                            link &&
                            !powerContextIncludes(selected, state.deviceId, id)
                          )
                            pick(link.deviceId);
                          setPowerLinkId(id);
                          if (!id)
                            setPduInspection((current) =>
                              current?.pduId === selected
                                ? { ...current, outlet: null }
                                : current,
                            );
                          if (id) control({ type: "layer", layer: "power" });
                          else takeover();
                        }}
                        onInspect={(linkId) => {
                          control({ type: "inspect-power-input", linkId });
                          setQuery("");
                          setFilter("all");
                          setNetworkLinkId(null);
                          if (matchMedia("(max-width: 1099px)").matches)
                            setNav(false);
                        }}
                        onInteract={takeover}
                        state={state}
                        selectedId={selected}
                        readings={spatial.readings}
                        ready={ready}
                        onSelect={(id) => pick(id)}
                        onLocate={(id) =>
                          focus(id, {
                            installation: entityById(id)?.kind === "device",
                          })
                        }
                        onViewPower={
                          layer === "power"
                            ? undefined
                            : () => control({ type: "layer", layer: "power" })
                        }
                      />
                    )}
                    {layer === "overview" && (
                      <NetworkConnections
                        portCheck={portCheck}
                        portOwnsTrace={portOwnsTrace}
                        patchActive={patchActive}
                        isolated={!!isolatedPartId}
                        onPortChange={(check) => {
                          setPortCheck(check);
                          portReturnFocus.current = null;
                        }}
                        onPortLeave={(check, id, action, linkId) => {
                          if (!ready) return;
                          const link = networkLinkById(linkId);
                          if (!link) return;
                          if (action === "patch" && patchActive) {
                            setPortCheck(null);
                            networkControlFocus.current = "port";
                            return;
                          }
                          setPortCheck(check);
                          portReturnFocus.current = null;
                          const panel = inspectorRef.current!;
                          const button = panel.querySelector<HTMLButtonElement>(
                            `.switch-ports [data-port="${check.port}"]`,
                          )!;
                          const level =
                            state.level === "room" ? "room" : "rack";
                          if (
                            !portVisit?.patch ||
                            portVisit.patch.source !== link.source
                          )
                            setPortVisit({
                              check,
                              patch:
                                action === "patch" || patchActive
                                  ? {
                                      source: link.source,
                                      doorOpen:
                                        state.level === "rack" &&
                                        state.doorOpen,
                                      rearDoorOpen:
                                        state.level === "rack" &&
                                        state.rearDoorOpen,
                                      entry: patchActive ? patchEntry : null,
                                    }
                                  : undefined,
                              level,
                              camera: captureTaskView.current?.(level) ?? null,
                              localActionsOpen: !!panel.querySelector(
                                ".switch-local-actions[open]",
                              ),
                              portOffset:
                                button.getBoundingClientRect().top -
                                panel.getBoundingClientRect().top,
                              query,
                              filter,
                              rackView,
                              nav,
                              onlyAlarms,
                              metric,
                            });
                          setNetworkLinkId(linkId);
                          if (action === "patch") {
                            networkControlFocus.current = "port";
                            openNetworkPatch(link);
                          } else if (action === "preview") pick(id);
                          else if (action === "locate")
                            focus(id, { installation: true });
                          else {
                            control({
                              type: "inspect-network-endpoint",
                              linkId,
                              deviceId: id,
                            });
                            setQuery("");
                            setFilter("all");
                            setPowerLinkId(null);
                            if (matchMedia("(max-width: 1099px)").matches)
                              setNav(false);
                          }
                        }}
                        key={selected}
                        state={state}
                        selectedId={selected}
                        activeLinkId={activeNetworkLink}
                        ready={ready}
                        onSelect={pick}
                        onLocate={(id) => focus(id, { installation: true })}
                        onTrace={changeNetworkTrace}
                        onInteract={takeover}
                      />
                    )}
                    {aisle && opposite && (
                      <FixtureRelations
                        title="排间对柜"
                        relations={[
                          {
                            id: opposite.rackId,
                            name: opposite.rackName,
                            relation: `${opposite.title} ${opposite.depth.toFixed(2)} m · 柜面间距 ${aisle.faceDistance.toFixed(2)} m · ${reserveGapText(aisle.gap)}`,
                          },
                        ]}
                        onPreview={pick}
                        onLocate={focus}
                      />
                    )}
                    {layer === "overview" && entity.kind === "rack" && (
                      <FixtureRelations
                        title="上方桥架"
                        relations={rackTrayRelations(selected)}
                        onCompare={
                          state.level === "room"
                            ? (peer) =>
                                requestCrossing(fixtureCrossing(selected, peer))
                            : undefined
                        }
                        compareLabel="核对柜顶高差"
                        comparisonReady={ready}
                        onPreview={pick}
                        onLocate={focus}
                      />
                    )}
                    {(layer === "overview" ||
                      layer === "environment" ||
                      layer === "airflow") &&
                      entity.kind === "rack" && (
                        <FixtureRelations
                          title="柜前送风格栅"
                          relations={rackGrilleRelations(selected)}
                          onPreview={pick}
                          onLocate={focus}
                        />
                      )}
                    {(layer === "environment" || layer === "airflow") && (
                      <CoolingConnections
                        range={coolingRangeBrowser}
                        rangeOpen={coolingRangeOpen}
                        onRangeOpen={setCoolingRangeOpen}
                        active={!!coolingVisit}
                        onInteract={takeover}
                        state={state}
                        selectedId={selected}
                        readings={spatial.readings}
                        ready={ready}
                        airflowVisible={
                          layer === "airflow" && state.level === "room"
                        }
                        onSelect={pick}
                        onLocateSource={() => pick(coolingSource.id, true)}
                        onViewAirflow={() => showAirflow(selected, "details")}
                      />
                    )}
                  </>
                ) : (
                  <p className="study-empty">设施布置示意，尚未接入遥测。</p>
                )}
                {!fixture && (
                  <details className="study-configuration">
                    <summary>配置与数据说明</summary>
                    {reading?.quality === "stale" &&
                      reading.observedAt !== null && (
                        <p>
                          最后有效{component ? "推导" : "观测"} ·{" "}
                          {reading.observedAt} 秒 ·{" "}
                          {sourceValue(reading.temperature, "temperature")} ·{" "}
                          {sourceValue(reading.power, "power")}
                        </p>
                      )}
                    <p>{entity.description}</p>
                    {entity.kind === "rack" && (
                      <>
                        <p className="study-blanking-config">
                          前置 1U 盲板 {rackBlankingUnits(selected).length} 块：
                          {unitRanges(rackBlankingUnits(selected))}。
                          按本柜安装配置封闭未安装位置，不代表可分配容量或实测气密性。
                        </p>
                        <p>
                          双扇冲孔后门、顶部刷条进线口与 PDU
                          侧壁支架为结构示意。
                          后门可对开展示，独立于前门；姿态不代表真实门状态或远程控制。供电观察保留手动打开的门板，后立柱仍按观察剖切。进线口未配置施工线缆，不据此推断散热或布线能力。
                        </p>
                        <p>
                          安装简模的后侧电源、接口区与通风格栅用于辨认配置；只选择整台设备，不对应真实物理端口、开孔率或风量。进入设备后按需加载详细模型，交换机与存储展开后仍为内部配置示意。
                        </p>
                      </>
                    )}

                    {maintenance.length > 0 && (
                      <>
                        <dl className="study-maintenance-config">
                          {maintenance.map((area) => (
                            <div key={area.id}>
                              <dt>{area.title}</dt>
                              <dd>
                                {area.depth.toFixed(2)} ×{" "}
                                {area.width.toFixed(2)} m
                              </dd>
                            </div>
                          ))}
                        </dl>
                        <p>
                          尺寸为进深 ×
                          宽度的预留示意，不是实测净距或工程校核。机房总览中可从“核对维护范围”查看地面轮廓。
                        </p>
                      </>
                    )}
                    <p>{reading?.source}</p>
                    {coolingFacility && (
                      <p>
                        冷却输入来自确定性演示；关联进风是设备模拟读数，不是制冷单元送/回风温度，也不提供设施功率、风量、制冷量或控制能力。
                      </p>
                    )}
                    <p>
                      当前数据为确定性模拟。空缺不按零值计算；部件读数为模型推导。
                    </p>
                  </details>
                )}
              </>
            )}
          </aside>
        )}
      </main>
    </div>
  );
}
