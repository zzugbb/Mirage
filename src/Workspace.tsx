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
import { SmokeInspection } from "./components/SmokeInspection";
import { isSmokeFixture } from "./smoke-inspection";
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
  type AlarmSeverity,
  type AlarmVisit,
} from "./alarm-queue";
import { RoomLayout } from "./components/RoomLayout";
import type { AirflowView } from "./airflow-view";
import { airflowSnapshot, type AirflowRoute } from "./airflow";
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
import { EntranceViewActions } from "./components/EntranceViewActions";
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
import { LeakViewActions } from "./components/LeakViewActions";
import {
  GrilleBranches,
  type GrilleReturnFocus,
} from "./components/GrilleBranches";
import {
  grilleInspectionIncludes,
  type GrilleInspection,
  type GrilleBranch,
} from "./grille-inspection";
import { CoolingRange } from "./components/CoolingRange";
import { coolingRangeIncludes, initialCoolingRange } from "./cooling-range";
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
import { powerViewPoints, type PowerViewCommand } from "./power-view";
import {
  emptyPeakProcess,
  peakScopeIds,
  type PeakProcessState,
} from "./peak-provenance";
import { networkViewPoints, type NetworkViewCommand } from "./network-view";
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
import { RackSpaceInspector } from "./components/RackSpaceInspector";
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
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { ReadingSources } from "./components/ReadingSources";
import {
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
import { signalFor, signalStyles, signalText } from "./status";
import {
  findResources,
  rackUnitQuery,
  resourceCatalog,
  resourceOpenLabel,
  canSelectInScene,
  componentGroups,
} from "./review-resources";
import type { ResourceFilter } from "./review-resources";
import { devices, deviceById, rackById, rackForDevice } from "./installation";
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
} from "./power-config";
import {
  pduOutlet,
  pduInspectionIncludes,
  type PduInspection,
} from "./pdu-outlets";
import { PowerConnections } from "./components/PowerConnections";
import { NetworkConnections } from "./components/NetworkConnections";
import { networkContextIncludes, networkLinkById } from "./network";
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
import { ResourceActions } from "./components/ResourceActions";
import { ReviewScene } from "./components/ReviewScene";
import { ReviewTrend } from "./components/ReviewTrend";
import { InletAssessment } from "./components/InletAssessment";
import { ReviewAnalysis } from "./components/ReviewAnalysis";
import type { PresentationPhase, SceneFeedback } from "./mechanics";
import {
  workspacePreset,
  workspaceShots,
  visibleResourceRows,
  resourceRowText,
} from "./workspace-presets";
import type { WorkspaceShot } from "./workspace-presets";
import { tourSteps } from "./tour";
import "./scene-ui.css";
import "./workspace-ui.css";

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
function reducer(
  state: ReviewState,
  action:
    | ReviewAction
    | ResourceAction
    | { type: "workspace-shot"; shot: WorkspaceShot },
) {
  return action.type === "workspace-shot"
    ? workspacePreset(state, action.shot)
    : reviewTransition(state, action);
}

export function Workspace() {
  const [review, control] = useReducer(reducer, undefined, () =>
    createWorkspace(matchMedia("(prefers-reduced-motion: reduce)").matches),
  );
  const { scene: state, layer, tour } = review;
  const selected = review.selectedId ?? state.selected;
  const [environmentComparisonOpen, setEnvironmentComparisonOpen] =
    useState(false);
  const [environmentPairVisit, setEnvironmentPairVisit] = useState<{
    pair: EnvironmentPair;
    layer: typeof layer;
    analysis: boolean;
    nav: boolean;
  } | null>(null);
  const [inletView, setInletView] = useState<InletInspection | null>(null);
  const [inletViewCommand, setInletViewCommand] =
    useState<InletViewCommand | null>(null);
  const requestInletView = (action: InletViewCommand["action"]) => {
    control({ type: "takeover" });
    setInletViewCommand((current) => ({
      action,
      revision: (current?.revision ?? 0) + 1,
    }));
  };
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
  const environmentPairReturning = useRef(false);
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
    else setRangeSegmentId(segmentId);
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
        grilleId: string;
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
  const grilleReturnFocus = useRef<GrilleReturnFocus>(null);
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
  const coolingRangeScroll = useRef({ list: 0, panel: 0, restore: false });
  const [coolingVisit, setCoolingVisit] = useState<{
    rackId: string;
    layer: ReviewState["layer"];
    slice: SliceControls;
    nav: boolean;
    query: string;
    filter: ResourceFilter;
    onlyAlarms: boolean;
  } | null>(null);
  const [coolingReturning, setCoolingReturning] = useState(false);
  useEffect(() => {
    if (
      coolingVisit &&
      !coolingReturning &&
      (selected === coolingSource.id ||
        !coolingRangeIncludes(coolingVisit.rackId, selected, state.deviceId))
    )
      setCoolingVisit(null);
  }, [coolingVisit, coolingReturning, selected, state.deviceId]);
  const [maintenanceView, setMaintenanceView] =
    useState<MaintenanceInspection | null>(null);
  const [maintenanceReturnRevision, setMaintenanceReturnRevision] = useState(0);
  const returnMaintenanceView = () => {
    takeover();
    setMaintenanceReturnRevision((value) => value + 1);
  };
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
    level: "room" | "rack";
    query: string;
    filter: ResourceFilter;
    rackView:
      | "list"
      | "installation"
      | "space"
      | "network"
      | "inlet"
      | "power"
      | "layout";
    nav: boolean;
    onlyAlarms: boolean;
    metric: "temperature" | "power";
  } | null>(null);
  const [portReturning, setPortReturning] = useState(false);
  const [portRestore, setPortRestore] = useState(0);

  const [pduInspection, setPduInspection] = useState<PduInspection | null>(
    null,
  );
  const pduReturnPending = useRef(false);
  useEffect(() => {
    if (
      !pduInspection ||
      !pduInspectionIncludes(pduInspection, selected, state.deviceId)
    ) {
      pduReturnPending.current = false;
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
  const [rackView, setRackView] = useState<
    "list" | "installation" | "space" | "network" | "inlet" | "power" | "layout"
  >("installation");
  const [alarmQuery, setAlarmQuery] = useState("");
  const [alarmSeverity, setAlarmSeverity] = useState<AlarmSeverity>("all");
  const [alarmVisit, setAlarmVisit] = useState<AlarmVisit | null>(null);
  const [alarmReturned, setAlarmReturned] = useState<AlarmVisit | null>(null);
  const [alarmReturning, setAlarmReturning] = useState(false);
  const [alarmRestore, setAlarmRestore] = useState(0);
  const alarmScroll = useRef(0);
  const [layoutViewRevision, setLayoutViewRevision] = useState(0);
  const [layoutBoundary, setLayoutBoundary] = useState(false);
  const [layoutQuery, setLayoutQuery] = useState("");
  const layoutScroll = useRef(0);
  const [layoutRestore, setLayoutRestore] = useState(0);
  const [layoutVisit, setLayoutVisit] = useState<{
    id: string;
    layer: ReviewState["layer"];
    metric: "temperature" | "power";
  } | null>(null);
  const [layoutReturning, setLayoutReturning] = useState(false);
  const [smokeVisit, setSmokeVisit] = useState<{
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
  const [powerRack, setPowerRack] = useState("rack-a01");
  const [powerQuery, setPowerQuery] = useState("");
  const [powerFilter, setPowerFilter] = useState<PowerOverviewFilter>("all");
  const [powerScope, setPowerScope] = useState<PowerOverviewScope>("rack");
  const [powerOrder, setPowerOrder] =
    useState<PowerOverviewOrder>("installation");
  const powerScroll = useRef(0);
  const [powerRestore, setPowerRestore] = useState(0);
  const [powerOverviewVisit, setPowerOverviewVisit] = useState<{
    id: string;
    query: string;
    filter: ResourceFilter;
    onlyAlarms: boolean;
  } | null>(null);
  const [powerOverviewReturning, setPowerOverviewReturning] = useState(false);
  const [inletRack, setInletRack] = useState("rack-a01");
  const [inletQuery, setInletQuery] = useState("");
  const [inletScope, setInletScope] = useState<InletOverviewScope>("rack");
  const [inletOrder, setInletOrder] =
    useState<InletOverviewOrder>("installation");
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
    scroll: number;
  } | null>(null);
  const [inletDifferenceReview, setInletDifferenceReview] = useState(
    emptyInletDifferenceReview,
  );
  useEffect(() => {
    setInletDifferenceReview(emptyInletDifferenceReview);
  }, [inletPair, state.replayCycle]);
  const [inletAirflowVisit, setInletAirflowVisit] = useState<{
    id: string;
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
  const [networkMapLink, setNetworkMapLink] = useState<string | null>(null);
  const [networkMapSelection, setNetworkMapSelection] = useState("room-01");
  const networkMapScroll = useRef(0);
  const [networkMapReturning, setNetworkMapReturning] = useState(false);
  const [spaceSize, setSpaceSize] = useState(2);
  const [spaceVisit, setSpaceVisit] = useState<
    | (SpaceInspection & {
        query: string;
        filter: ResourceFilter;
        onlyAlarms: boolean;
        size: number;
        start: string;
        scroll: number;
        layer: ReviewState["layer"];
        analysis: boolean;
        metric: "temperature" | "power";
        slice: SliceControls;
      })
    | null
  >(null);
  const [spaceReturning, setSpaceReturning] = useState(false);
  const [spaceRestore, setSpaceRestore] = useState<{
    rackId: string;
    deviceId: string;
    start: string;
    scroll: number;
  } | null>(null);
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
  const [expanded, setExpanded] = useState<string[]>([]);
  const [filter, setFilter] = useState<ResourceFilter>("all");
  const [onlyAlarms, setOnlyAlarms] = useState(false);
  const [metric, setMetric] = useState<"temperature" | "power">("temperature");
  const [sourceCheck, setSourceCheck] = useState<SourceCheck | null>(null);
  const [sourceVisit, setSourceVisit] = useState<
    | (SourceInspection & {
        key: string;
        anchor: string;
        level: "room" | "rack";
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
        nav: boolean;
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
  const airflow = useMemo(
    () =>
      layer === "airflow" && state.level === "room"
        ? airflowSnapshot(
            state.time,
            spatial.readings,
            activeAirflowVisit?.deviceId ?? selected,
            state.deviceId,
          )
        : null,
    [
      layer,
      state.level,
      state.time,
      state.deviceId,
      spatial.readings,
      activeAirflowVisit?.deviceId,
      selected,
    ],
  );
  const [airflowStageView, setAirflowStageView] = useState<AirflowView | null>(
    null,
  );
  const [airflowExplanation, setAirflowExplanation] = useState(0);
  const reading = selectedReading({ ...state, selected }, spatial.readings);
  const room = spatial.readings.get("room-01")!;
  const resource = resourceCatalog(state.deviceId).find(
    (r) => r.id === selected,
  )!;
  const entity = entityById(selected)!;
  const fixture = fixtureById(selected);
  const environment = environmentProbe(selected);
  const pairedEnvironment =
    environmentPairVisit &&
    review.analysis &&
    inspector &&
    layer === "environment" &&
    environmentPairIncludes(environmentPairVisit.pair, selected)
      ? environmentPairVisit.pair
      : null;
  useEffect(() => {
    if (environmentPairVisit && !pairedEnvironment)
      setEnvironmentPairVisit(null);
  }, [environmentPairVisit, pairedEnvironment]);

  useEffect(() => {
    if (environmentPairReturning.current && !pairedEnvironment) {
      environmentPairReturning.current = false;
      const button = document.querySelector<HTMLButtonElement>(
        ".environment-comparison-toggle",
      );
      button?.focus({ preventScroll: true });
      button?.scrollIntoView({ block: "nearest" });
    }
  }, [pairedEnvironment]);
  const maintenance = useMemo(() => maintenanceAreas(selected), [selected]);
  const aisle =
    layer === "overview" && state.level === "room"
      ? maintenanceAisle(selected)
      : undefined;
  const opposite =
    aisle && (aisle.front.rackId === selected ? aisle.rear : aisle.front);
  const component = entity.kind === "part";
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
      !switchPortIncludes(portVisit.check, selected, state.deviceId)
    )
      setPortVisit(null);
  }, [portVisit, portReturning, ready, selected, state.deviceId]);
  useEffect(() => {
    if (
      !portReturning ||
      !portVisit ||
      !ready ||
      state.level !== portVisit.level
    )
      return;
    control({ type: "pick", id: portVisit.check.switchId });
    control({ type: "layer", layer: "overview" });
    control({ type: "analysis", value: false });
    setNetworkLinkId(
      switchPortRows(portVisit.check.switchId).find(
        (row) => row.port === portVisit.check.port,
      )?.link?.id ?? null,
    );
    setPortCheck(portVisit.check);
    setQuery(portVisit.query);
    setFilter(portVisit.filter);
    setOnlyAlarms(portVisit.onlyAlarms);
    setMetric(portVisit.metric);
    setRackView(portVisit.rackView);
    setInspector(true);
    skipNavigationSearch.current = true;
    setNav(matchMedia("(max-width: 1099px)").matches ? false : portVisit.nav);
    setPortRestore((value) => value + 1);
    setPortReturning(false);
    setPortVisit(null);
  }, [portReturning, portVisit, ready, state.level]);
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
    setRackView("power");
    setQuery(powerOverviewVisit.query);
    setFilter(powerOverviewVisit.filter);
    setOnlyAlarms(powerOverviewVisit.onlyAlarms);
    skipNavigationSearch.current = true;
    setNav(true);
    if (matchMedia("(max-width: 1099px)").matches) setInspector(false);
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
      document
        .querySelector<HTMLButtonElement>("[data-smoke-start]")
        ?.focus({ preventScroll: true });
      setSmokeRestore(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [smokeRestore, ready, review.analysis, inspector]);
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
    setInspector(!matchMedia("(max-width: 1099px)").matches);
    setInletRestoreRevision((value) => value + 1);
    setInletAirflowVisit(null);
    setInletAirflowReturning(false);
  }, [inletAirflowVisit, inletAirflowReturning, ready, state.level, selected]);
  const alarmQueueVisible =
    state.level === "room" &&
    layer === "alarms" &&
    onlyAlarms &&
    ["list", "installation"].includes(rackView);
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
    if (!alarmReturning || !alarmVisit || state.level !== "room" || !ready)
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
    setAlarmReturned(alarmVisit);
    setAlarmRestore((value) => value + 1);
    setAlarmReturning(false);
    setAlarmVisit(null);
  }, [alarmReturning, alarmVisit, state.level, ready]);
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
    control({ type: "layer", layer: layoutVisit.layer });
    control({ type: "analysis", value: false });
    setMetric(layoutVisit.metric);
    setRackView("layout");
    skipNavigationSearch.current = true;
    setNav(true);
    if (matchMedia("(max-width: 1099px)").matches) setInspector(false);
    setLayoutRestore((value) => value + 1);
    setLayoutReturning(false);
    setLayoutVisit(null);
  }, [layoutReturning, layoutVisit, state.level, ready, review.pendingId]);
  useEffect(() => {
    if (!ready || !partSequenceFocus.current) return;
    const frame = requestAnimationFrame(() => {
      const target = partSequenceFocus.current;
      const button = inspectorRef.current?.querySelector<HTMLElement>(
        `[data-part-action="${target}"]`,
      );
      const fallback =
        inspectorRef.current?.querySelector<HTMLElement>(
          '[data-part-action="heading"]',
        ) ??
        document.querySelector<HTMLElement>(".review-object-actions button");
      (button && !(button instanceof HTMLButtonElement && button.disabled)
        ? button
        : fallback
      )?.focus({ preventScroll: true });
      partSequenceFocus.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, selected, isolatedPartId]);

  useEffect(() => {
    if (
      !pduReturnPending.current ||
      !ready ||
      review.analysis ||
      selected !== pduInspection?.pduId
    )
      return;
    const panel = document.querySelector<HTMLElement>(".pdu-outlets");
    if (panel) {
      pduReturnPending.current = false;
      panel.scrollIntoView({ block: "start" });
      panel.focus({ preventScroll: true });
    }
  }, [ready, selected, review.analysis, pduInspection?.pduId]);

  useEffect(() => {
    if (
      !networkMapReturning ||
      state.level !== "room" ||
      !ready ||
      review.pendingId
    )
      return;
    control({ type: "pick", id: networkMapSelection });
    setNetworkLinkId(networkMapLink);
    setNetworkMapRestore((n) => n + 1);
    setNetworkMapReturning(false);
  }, [
    networkMapReturning,
    state.level,
    ready,
    review.pendingId,
    networkMapLink,
    networkMapSelection,
  ]);
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
    else
      document
        .querySelector<HTMLElement>('[aria-label="展开资源导航"]')
        ?.focus();
  }, [rangeView, ready]);
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
  const inspectRangeDevice = (id: string, start?: string, scroll?: number) => {
    const visit = spaceRange && beginSpaceInspection(spaceRange, id);
    if (!visit || !ready) return;
    const panel = navigationRef.current?.querySelector<HTMLElement>(
      ".rack-space-inspector",
    );
    setSpaceRestore(null);
    setSpaceVisit({
      ...visit,
      query,
      filter,
      onlyAlarms,
      size: spaceSize,
      start:
        start ??
        panel?.querySelector<HTMLInputElement>('[aria-label="核查起始U位"]')
          ?.value ??
        String(spaceRange!.first),
      scroll: scroll ?? panel?.scrollTop ?? 0,
      layer,
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
  const pick = useCallback(
    (id: string, enter = false, keepNavigation = false) => {
      setAirflowVisit(null);
      setPowerLinkId((current) =>
        powerContextIncludes(id, state.deviceId, current) ? current : null,
      );
      setNetworkLinkId((current) =>
        networkContextIncludes(id, state.deviceId, current) ? current : null,
      );
      control({ type: enter ? "open-resource" : "pick", id });
      setInspector(true);
      if (!keepNavigation && matchMedia("(max-width: 1099px)").matches)
        setNav(false);
      if (enter && !fixtureById(id)) {
        setQuery("");
        setFilter("all");
      }
    },
    [state.deviceId],
  );
  const stageRef = useRef<HTMLElement>(null);
  const focus = (
    id: string,
    {
      revealStage = matchMedia("(max-width: 600px)").matches,
      installation = false,
    } = {},
  ) => {
    setAirflowVisit(null);
    setNetworkLinkId((current) =>
      networkContextIncludes(id, state.deviceId, current) ? current : null,
    );
    setPowerLinkId((current) =>
      powerContextIncludes(id, state.deviceId, current) ? current : null,
    );
    control({
      type: installation ? "locate-installation" : "focus-resource",
      id,
    });
    setInspector(true);
    if (matchMedia("(max-width: 1099px)").matches) setNav(false);
    if (revealStage) {
      stageRef.current?.focus({ preventScroll: true });
      stageRef.current?.scrollIntoView({ block: "nearest" });
    }
  };
  const analyzeEnvironmentPair = (otherId: string) => {
    const pair = environmentPair(selected, otherId);
    if (!pair) return;
    setEnvironmentPairVisit({ pair, layer, analysis: review.analysis, nav });
    setEnvironmentPairMetric("ambientTemperature");
    control({ type: "layer", layer: "environment" });
    control({ type: "analysis", value: true });
    setInspector(true);
    if (matchMedia("(max-width: 1099px)").matches) setNav(false);
  };
  const returnEnvironmentPair = () => {
    if (!environmentPairVisit) return;
    const origin = environmentPairVisit;
    if (environmentView) requestEnvironmentView("return");
    environmentPairReturning.current = true;
    setEnvironmentPairVisit(null);
    pick(origin.pair.firstId);
    control({ type: "layer", layer: origin.layer });
    control({ type: "analysis", value: origin.analysis });
    setEnvironmentComparisonOpen(true);
    setNav(origin.nav);
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
    action: "installation" | "internal" | "analysis",
  ) => {
    const reading = spatial.readings.get(id);
    if (!ready || !reading?.alarm || reading.quality !== "valid") return;
    setAlarmVisit({ id, time: state.time, severity: reading.alarm });
    setAlarmReturned(null);
    setAlarmRestore(0);
    setLayoutVisit(null);
    control({ type: "analysis", value: false });
    if (action === "analysis") {
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
      if (action === "installation") focus(id, { installation: true });
      else {
        dispatch({ type: "navigate", level: "device", id });
        setInspector(true);
        if (matchMedia("(max-width: 1099px)").matches) setNav(false);
      }
    }
  };
  const inspectPowerOverview = (
    id: string,
    action: "installation" | "internal" | "analysis" | "details",
  ) => {
    if (!ready) return;
    setPowerOverviewVisit({ id, query, filter, onlyAlarms });
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
    setFanVisit({ ...activeFanVisit, mode: "group" });
    control({ type: "pick", id: activeFanVisit.fanId });
    control({ type: "analysis", value: false });
    setFanViewRevision((n) => n + 1);
    setFanFocusRevision((n) => n + 1);
  };
  const finishFanInspection = () => {
    if (!ready || !activeFanVisit) return;
    setStructureReturn({ deviceId: state.deviceId, tool: "fans" });
    control({ type: "analysis", value: false });
    setFanVisit(null);
    setInspectionDevice(null);
    control({ type: "finish-part-inspection" });
  };
  const returnStorageGroup = () => {
    if (!activeStorageVisit || !ready) return;
    setStorageVisit({ ...activeStorageVisit, mode: "group" });
    if (selected === "sto-midplane" && activeStorageVisit.diskId)
      control({ type: "pick", id: activeStorageVisit.diskId });
    control({ type: "analysis", value: false });
    setStorageViewRevision((n) => n + 1);
    setStorageFocusRevision((n) => n + 1);
  };
  const finishStorageSlots = () => {
    if (!ready || !activeStorageVisit) return;
    setStructureReturn({ deviceId: state.deviceId, tool: "storage" });
    control({ type: "analysis", value: false });
    setStorageVisit(null);
    setInspectionDevice(null);
    control({ type: "finish-part-inspection" });
  };
  const networkMapReturn = state.level !== "room" && rackView === "network" && (
    <button
      className="study-parent"
      disabled={!ready || networkMapReturning}
      onClick={() => {
        setNetworkMapReturning(true);
        control({ type: "analysis", value: false });
        control({ type: "open-resource", id: "room-01" });
        control({ type: "layer", layer: "overview" });
        setNetworkLinkId(networkMapLink);
        setNav(true);
      }}
    >
      ← 返回机房接入图
    </button>
  );
  const returnInletAirflow = () => {
    if (!inletAirflowVisit || !ready || inletAirflowReturning) return;
    setInletAirflowReturning(true);
    setAirflowVisit(null);
    setAirflowResponse(null);
    control({ type: "room-inlet", id: inletAirflowVisit.id });
  };
  const inletAirflowReturn = inletAirflowVisit && (
    <section
      className="inlet-airflow-return"
      aria-label="进风查找气流往返"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          returnInletAirflow();
        }
      }}
    >
      <strong>{deviceById(inletAirflowVisit.id)!.name} · 从进风查找进入</strong>
      <p>
        可核对本支路端点与设备。返回先安全归位，恢复原查找与切片，保留最新时间。
      </p>
      <button
        disabled={!ready || inletAirflowReturning}
        onClick={returnInletAirflow}
      >
        ← 返回进风查找
      </button>
      <button
        disabled={inletAirflowReturning}
        onClick={() => setInletAirflowVisit(null)}
      >
        结束气流往返
      </button>
    </section>
  );
  const showAirflow = (id: string) => {
    const target = roomAirflowTarget(id, state.deviceId);
    if (!target || !ready) return;
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
    setInspector(true);
    if (matchMedia("(max-width: 1099px)").matches) setNav(false);
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
    setSourceVisit({
      ...target,
      key: peakKey,
      anchor: sourceAnchor,
      level:
        state.level === "rack" && (rackById(selected) || pduById(selected))
          ? "rack"
          : "room",
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
    setPeakVisit({
      ...(peakVisit?.scopeId === selected
        ? peakVisit
        : {
            anchor: sourceAnchor,
            level:
              state.level === "rack" && rackById(selected)
                ? ("rack" as const)
                : ("room" as const),
            nav,
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
    grilleReturnFocus.current = null;
    setGrilleRack((current) => ({
      ...current,
      [branch.row.id]: branch.rack.id,
    }));
    setGrilleVisit({
      ...(grilleVisit?.rowId === branch.row.id
        ? grilleVisit
        : {
            layer,
            metric,
            slice: sliceControls,
            nav,
            query,
            filter,
            onlyAlarms,
            scroll,
          }),
      rowId: branch.row.id,
      grilleId: branch.grille.id,
      rackId: branch.rack.id,
      deviceId: branch.device.id,
    });
    showAirflow(branch.device.id);
  };
  const returnGrille = () => {
    if (!grilleVisit || !ready) return;
    const origin = grilleVisit;
    setGrilleReturning(true);
    grilleReturnFocus.current = {
      rowId: origin.rowId,
      rackId: origin.rackId,
      scroll: origin.scroll,
    };
    focus(origin.rowId);
    control({ type: "layer", layer: origin.layer });
    control({ type: "analysis", value: false });
    setSliceControls(origin.slice);
    setMetric(origin.metric);
    setQuery(origin.query);
    setFilter(origin.filter);
    setOnlyAlarms(origin.onlyAlarms);
    setNav(origin.nav);
  };
  useEffect(() => {
    if (!grilleReturning || !grilleVisit) return;
    if (!review.pendingId && selected !== grilleVisit.rowId) {
      setGrilleReturning(false);
      setGrilleVisit(null);
      grilleReturnFocus.current = null;
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
    setCoolingReturning(true);
    pick(coolingSource.id, state.level !== "room");
    control({ type: "layer", layer: origin.layer });
    control({ type: "analysis", value: false });
    setSliceControls(origin.slice);
    setQuery(origin.query);
    setFilter(origin.filter);
    setOnlyAlarms(origin.onlyAlarms);
    setNav(origin.nav);
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
  const visitCoolingRange = (id: string, rackId: string, airflow = false) => {
    setCoolingVisit({
      rackId,
      layer,
      slice: sliceControls,
      nav,
      query,
      filter,
      onlyAlarms,
    });
    if (airflow) showAirflow(id);
    else pick(id);
  };
  const coolingRangeBrowser = (
    <CoolingRange
      value={coolingRangeState}
      readings={spatial.readings}
      ready={ready}
      open={coolingRangeOpen}
      scroll={coolingRangeScroll}
      onChange={setCoolingRangeState}
      onPreview={visitCoolingRange}
      onAirflow={(id, rackId) => visitCoolingRange(id, rackId, true)}
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
    setRackView("space");
    setSpaceSize(origin.size);
    setQuery(origin.query);
    setFilter(origin.filter);
    setOnlyAlarms(origin.onlyAlarms);
    setMetric(origin.metric);
    setSliceControls(origin.slice);
    skipNavigationSearch.current = true;
    setNav(true);
    setInspector(true);
  };
  useEffect(() => {
    if (!spaceReturning) return;
    if (
      !spaceVisit ||
      (!review.pendingId && selected !== spaceVisit.range.rackId)
    ) {
      setSpaceReturning(false);
      setSpaceVisit(null);
    } else if (
      ready &&
      state.level === "rack" &&
      selected === spaceVisit.range.rackId
    ) {
      setSpaceRestore({
        rackId: spaceVisit.range.rackId,
        deviceId: spaceVisit.deviceId,
        start: spaceVisit.start,
        scroll: spaceVisit.scroll,
      });
      setSpaceReturning(false);
      setSpaceVisit(null);
    }
  }, [
    spaceReturning,
    spaceVisit,
    ready,
    state.level,
    selected,
    review.pendingId,
  ]);
  const returnInletOverview = () => {
    skipNavigationSearch.current = !nav;
    if (inletPair) inletScroll.current = inletPair.scroll;
    setInletRestoreRevision((value) => value + 1);
    setRackView("inlet");
    setSliceControls(inletPair?.slice ?? inletSlice.current);
    control({ type: "room-inlet", id: inletPair?.firstId ?? inletSelection });
    if (inletPair) {
      setInletSelection(inletPair.firstId);
      setInletPair(null);
      control({ type: "analysis", value: false });
    }
    setNav(true);
  };
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
        if (query) {
          setQuery("");
          return;
        }
        const popup = document.querySelector<HTMLDetailsElement>(
          ".workspace-ui details[open]",
        );
        if (popup) {
          popup.open = false;
          popup.querySelector("summary")?.focus();
        } else if (review.analysis) control({ type: "analysis", value: false });
        else if (inspector) setInspector(false);
        else if (nav && matchMedia("(max-width: 1099px)").matches)
          setNav(false);
        else dispatch({ type: "back" });
      }
      if ((event.target as HTMLElement).closest("input,select,textarea"))
        return;
      if (event.key.toLowerCase() === "f") {
        control({ type: "focus-resource", id: selected });
        setInspector(true);
        if (matchMedia("(max-width: 1099px)").matches) setNav(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [selected, review.analysis, nav, inspector, query, dispatch]);
  const load = (next: WorkspaceShot) => {
    setSmokeVisit(null);
    setSmokeReturning(false);
    setSmokeRestore(false);
    setPowerScope("rack");
    setPowerOrder("installation");
    setPowerRack("rack-a01");
    setPowerQuery("");
    setPowerFilter("all");
    powerScroll.current = 0;
    setPowerRestore(0);
    setPowerOverviewVisit(null);
    setPowerOverviewReturning(false);
    setPortCheck(null);
    setPortVisit(null);
    setPortReturning(false);
    setPortRestore(0);
    setAlarmQuery("");
    setAlarmSeverity("all");
    setAlarmVisit(null);
    setAlarmReturned(null);
    setAlarmReturning(false);
    setAlarmRestore(0);
    alarmScroll.current = 0;
    setLayoutBoundary(false);
    setLayoutQuery("");
    layoutScroll.current = 0;
    setLayoutRestore(0);
    setLayoutVisit(null);
    setLayoutReturning(false);
    setSliceCheck(null);
    setPduInspection(null);
    pduReturnPending.current = false;
    setInspectionDevice(null);
    setEnvironmentComparisonOpen(false);
    setEnvironmentPairVisit(null);
    setGrilleVisit(null);
    setGrilleReturning(false);
    grilleReturnFocus.current = null;
    setGrilleRack({});
    setCoolingRangeState(initialCoolingRange());
    setCoolingRangeOpen(false);
    setCoolingVisit(null);
    setCoolingReturning(false);
    coolingRangeScroll.current = { list: 0, panel: 0, restore: false };
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
    setInletRack("rack-a01");
    setInletQuery("");
    setInletScope("rack");
    setInletOrder("installation");
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
    setNetworkMapLink(null);
    setNetworkMapReturning(false);
    setNetworkMapSelection("room-01");
    networkMapScroll.current = 0;
    setComparisonRow("all");
    setComparisonRack(null);
    comparisonScroll.current = 0;
    setShot(next);
    setRevision((n) => n + 1);
    setQuery("");
    setFilter("all");
    setOnlyAlarms(next === "alarms");
    setInspector(next !== "overview");
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
  };
  const locateAirflowEndpoint = (id: string) =>
    focus(id, { installation: entityById(id)?.kind === "device" });
  const airflowInspector = airflow && (
    <AirflowDetails
      view={airflowStageView}
      snapshot={airflow}
      selected={selected}
      ready={ready}
      compact={review.analysis}
      focusRevision={airflowExplanation}
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
  return (
    <div
      className="mirage-workspace workspace-ui"
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
        <nav className="study-path" aria-label="空间路径">
          {getPath(state).map((item, i) => (
            <span key={item}>
              {i > 0 && <i>/</i>}
              <button onClick={() => pick(item, true)}>
                {entityById(item)?.name ?? item}
              </button>
            </span>
          ))}
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
        <details className="workspace-shots">
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
                  温度切片由设备进风代表位置局部插值；气流是按当前布置与风向假设绘制的路径，均非环境实测。门禁、烟感与环境探头仅作布置示意。
                </p>
                <p>
                  交换机、存储内部及环境读数仍为演示；可分配容量、完整连接与园区入口尚未实施。
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
              {layer === "alarms" && state.level !== "device"
                ? "告警资源"
                : "资源"}
            </h2>
            <span>
              {state.level === "room"
                ? "机房"
                : state.level === "rack"
                  ? "机柜"
                  : "部件"}
            </span>
            <button aria-label="收起资源导航" onClick={() => setNav(false)}>
              ×
            </button>
          </div>
          {!alarmQueueVisible &&
            !(
              state.level === "room" &&
              ["space", "network", "inlet", "power", "layout"].includes(
                rackView,
              )
            ) && (
              <>
                <label className="study-search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    aria-label="查找资源"
                    placeholder="名称、编号或 U 位"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button aria-label="清除搜索" onClick={() => setQuery("")}>
                      ×
                    </button>
                  )}
                </label>
                <div className="study-filters">
                  <select
                    aria-label="资源类型"
                    value={filter}
                    onChange={(e) =>
                      setFilter(e.target.value as ResourceFilter)
                    }
                  >
                    <option value="all">全部类型</option>
                    <option value="server">服务器</option>
                    <option value="switch">交换机</option>
                    <option value="storage">存储</option>
                    <option value="facility">设施</option>
                  </select>
                  {layer === "alarms" && state.level !== "device" && (
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
              </>
            )}
          {inletAirflowReturn}
          {state.level !== "room" && inletSession && !inletAirflowVisit && (
            <button
              className="study-parent"
              disabled={!ready}
              onClick={returnInletOverview}
            >
              ← 返回机房进风对照
            </button>
          )}
          {powerOverviewVisit && (
            <div className="room-layout-return" aria-label="功耗对照往返">
              <button
                className="study-parent"
                disabled={!ready || powerOverviewReturning}
                onClick={() => {
                  setPowerOverviewReturning(true);
                  control({ type: "open-resource", id: "room-01" });
                }}
              >
                ← 返回机房功耗对照
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
          {portVisit && (
            <div className="room-layout-return" aria-label="端口核对往返">
              <button
                className="study-parent"
                disabled={!ready || portReturning}
                onClick={() => {
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
                ← 返回交换机端口
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
            <div className="room-layout-return" aria-label="告警排查往返">
              <button
                className="study-parent"
                disabled={!ready || alarmReturning}
                onClick={() => {
                  setAlarmReturning(true);
                  control({ type: "open-resource", id: "room-01" });
                }}
              >
                ← 返回告警设备
              </button>
              <button
                aria-label="结束告警排查"
                disabled={alarmReturning}
                onClick={() => setAlarmVisit(null)}
              >
                ×
              </button>
            </div>
          )}
          {layoutVisit && (
            <div className="room-layout-return" aria-label="布置导览往返">
              <button
                className="study-parent"
                disabled={!ready || layoutReturning}
                onClick={() => {
                  setLayoutReturning(true);
                  control({ type: "open-resource", id: "room-01" });
                }}
              >
                ← 返回机房布置
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
            </div>
          )}
          {networkMapReturn}
          {state.level !== "room" && (
            <button
              className="study-parent"
              onClick={() => dispatch({ type: "back" })}
            >
              ←{" "}
              {state.level === "device"
                ? rackForDevice(state.deviceId).name
                : "01号机房"}
            </button>
          )}
          {state.level !== "device" && (
            <div
              className={`rack-navigation-view ${state.level === "room" ? "is-room" : ""}`}
              role="group"
              aria-label="资源呈现"
            >
              {state.level === "rack" && (
                <button
                  aria-pressed={rackView === "installation"}
                  onClick={() => setRackView("installation")}
                >
                  安装图
                </button>
              )}
              <button
                aria-pressed={
                  rackView === "list" ||
                  (state.level === "room" &&
                    !["space", "network", "inlet", "power", "layout"].includes(
                      rackView,
                    ))
                }
                onClick={() => setRackView("list")}
              >
                列表
              </button>
              {state.level === "room" && (
                <button
                  aria-pressed={rackView === "layout"}
                  onClick={() => {
                    takeover();
                    setRackView("layout");
                    setLayoutVisit(null);
                    setLayoutReturning(false);
                  }}
                >
                  布置图
                </button>
              )}
              <button
                aria-pressed={rackView === "space"}
                onClick={() => {
                  takeover();
                  setSpaceVisit(null);
                  setSpaceRestore(null);
                  setRackView("space");
                }}
              >
                空间核查
              </button>
              {state.level === "room" && (
                <button
                  aria-pressed={rackView === "inlet" || rackView === "power"}
                  onClick={() => {
                    takeover();
                    if (layer === "power" || rackView === "power") {
                      setRackView("power");
                      control({ type: "layer", layer: "power" });
                      setMetric("power");
                      setOnlyAlarms(false);
                      pick(powerRack, false, true);
                      return;
                    }
                    setRackView("inlet");
                    control({ type: "layer", layer: "environment" });
                    pick(inletSelection, false, true);
                    const target = roomAirflowTarget(
                      inletSelection,
                      state.deviceId,
                    );
                    setSliceControls((current) =>
                      alignAirflowSlice(current, target?.rowId ?? null),
                    );
                  }}
                >
                  {layer === "power" || rackView === "power"
                    ? "功耗对照"
                    : "进风对照"}
                </button>
              )}
              {state.level === "room" && (
                <button
                  aria-pressed={rackView === "network"}
                  onClick={() => {
                    takeover();
                    setRackView("network");
                    control({ type: "layer", layer: "overview" });
                  }}
                >
                  网络接入
                </button>
              )}
            </div>
          )}
          {alarmQueueVisible ? (
            <AlarmQueue
              readings={spatial.readings}
              query={alarmQuery}
              onQuery={setAlarmQuery}
              severity={alarmSeverity}
              onSeverity={setAlarmSeverity}
              selected={selected}
              time={state.time}
              ready={ready}
              visible={nav}
              scroll={alarmScroll}
              restoreRevision={alarmRestore}
              returned={alarmReturned}
              onPreview={(id) => {
                pick(id);
                control({ type: "analysis", value: false });
              }}
              onInspect={(id, internal) =>
                beginAlarmInspection(id, internal ? "internal" : "installation")
              }
              onAnalyze={(id) => beginAlarmInspection(id, "analysis")}
              onAll={() => {
                setOnlyAlarms(false);
                setQuery("");
                setFilter("all");
              }}
            />
          ) : state.level === "room" && rackView === "power" ? (
            <PowerOverview
              readings={spatial.readings}
              query={powerQuery}
              onQuery={setPowerQuery}
              filter={powerFilter}
              onFilter={setPowerFilter}
              rackId={powerRack}
              scope={powerScope}
              order={powerOrder}
              onScope={setPowerScope}
              onOrder={setPowerOrder}
              selected={selected}
              time={state.time}
              visible={nav}
              ready={ready}
              scroll={powerScroll}
              restoreRevision={powerRestore}
              onRack={(id) => {
                setPowerScope("rack");
                setPowerRack(id);
                pick(id, false, true);
              }}
              onPreview={(id) => {
                const device = deviceById(id);
                if (device) setPowerRack(device.rackId);
                pick(id, false, true);
              }}
              onInspect={(id, internal) =>
                inspectPowerOverview(id, internal ? "internal" : "installation")
              }
              onDetails={(id) => inspectPowerOverview(id, "details")}
              onAnalyze={(id) => inspectPowerOverview(id, "analysis")}
            />
          ) : state.level === "room" && rackView === "layout" ? (
            <RoomLayout
              selected={selected}
              deviceId={state.deviceId}
              query={layoutQuery}
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
                pick(id, false, true);
              }}
              onLocate={(id) => focus(id)}
              onDetails={() => {
                setInspector(true);
                control({ type: "analysis", value: false });
                if (matchMedia("(max-width: 1099px)").matches) setNav(false);
              }}
              onEnter={(id) => {
                setLayoutVisit({ id, layer, metric });
                setLayoutReturning(false);
                setLayoutRestore(0);
                pick(id, true, true);
                setRackView("installation");
                setOnlyAlarms(false);
              }}
            />
          ) : state.level === "room" && rackView === "inlet" ? (
            <InletOverview
              visible={nav}
              restoreRevision={inletRestoreRevision}
              referenceId={inletReference}
              onReference={(id) => {
                setInletReference(id);
                setInletPair(null);
              }}
              onCompare={(id) => {
                if (!inletReference || inletReference === id) return;
                setInletPair({
                  firstId: id,
                  secondId: inletReference,
                  slice: sliceControls,
                  scroll: inletScroll.current,
                });
                setInletSelection(id);
                inletSlice.current = sliceControls;
                analyze();
              }}
              readings={spatial.readings}
              onAirflow={(id) => {
                if (!ready) return;
                setInletAirflowVisit({
                  id,
                  rack: inletRack,
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
              rackId={inletRack}
              query={inletQuery}
              selected={selected}
              time={state.time}
              scroll={inletScroll}
              ready={ready}
              onRack={(id) => {
                setInletRack(id);
                setInletScope("rack");
                setInletSelection(id);
                pick(id, false, true);
                const target = roomAirflowTarget(id, state.deviceId);
                setSliceControls((current) =>
                  alignAirflowSlice(current, target?.rowId ?? null),
                );
                control({ type: "layer", layer: "environment" });
              }}
              onQuery={setInletQuery}
              onPreview={(id) => {
                setInletRack(rackForDevice(id).id);
                setInletSelection(id);
                pick(id, false, true);
                if (
                  inletView &&
                  [inletView.pair.firstId, inletView.pair.secondId].includes(id)
                )
                  return;
                const target = roomAirflowTarget(id, state.deviceId);
                setSliceControls((current) =>
                  alignAirflowSlice(current, target?.rowId ?? null),
                );
                control({ type: "layer", layer: "environment" });
              }}
              onInspect={(id, internal) => {
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
                const id = devices.some((d) => d.id === selected)
                  ? selected
                  : inletRack;
                pick(id);
                analyze();
              }}
              onDetails={() => {
                const id = devices.some((d) => d.id === selected)
                  ? selected
                  : inletRack;
                pick(id);
                control({ type: "analysis", value: false });
              }}
            />
          ) : state.level === "room" && rackView === "network" ? (
            <NetworkOverview
              scope={networkMapScope}
              role={networkMapRole}
              visible={nav}
              restoreRevision={networkMapRestore}
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
                setNetworkMapLink(null);
                pick(id);
                control({ type: "analysis", value: false });
              }}
              onLocate={(id) => {
                setNetworkMapSelection(id);
                setNetworkMapLink(null);
                pick(id, true);
              }}
              onTrace={(id) => {
                const link = networkLinkById(id);
                if (!link) return;
                pick(link.source);
                setNetworkMapSelection(link.source);
                setNetworkMapLink(id);
                setNetworkLinkId(id);
                setPowerLinkId(null);
                control({ type: "layer", layer: "overview" });
                control({ type: "analysis", value: false });
              }}
            />
          ) : state.level === "room" && rackView === "space" ? (
            <RoomSpaceComparison
              size={comparisonSize}
              rowId={comparisonRow}
              expandedId={comparisonRack}
              selected={selected}
              scroll={comparisonScroll}
              onSize={setComparisonSize}
              onRow={setComparisonRow}
              onExpand={setComparisonRack}
              onPreview={(id) => pick(id, false, true)}
              ready={ready}
              onInspect={(range) => {
                pick(range.rackId, true, true);
                setSpaceSize(comparisonSize);
                setQuery(
                  `${rackById(range.rackId)!.name.split(" ")[0]} U${range.first}–${range.last}`,
                );
                setOnlyAlarms(false);
              }}
            />
          ) : state.level === "rack" && rackView === "space" ? (
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
              onCompare={() => pick("room-01", true, true)}
              restore={spaceRestore}
              ready={ready}
              range={spaceRange}
              onRange={(range) => {
                setSpaceVisit(null);
                setSpaceRestore(null);
                pick(range.rackId, false, true);
                setQuery(`U${range.first}–${range.last}`);
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
          ) : state.level === "rack" && rackView === "installation" ? (
            <RackInstallation
              state={state}
              selected={selected}
              layer={layer}
              readings={spatial.readings}
              rows={rows}
              units={unitQuery}
              filtered={!!query.trim() || filter !== "all" || onlyAlarms}
              ready={ready}
              visible={nav}
              onPick={(id) => pick(id, false, true)}
              onDetails={(id) => pick(id)}
              onFocus={(id) => focus(id, { installation: !pduById(id) })}
              onOpen={(id) => pick(id, true)}
              onList={() => setRackView("list")}
              onClear={() => {
                setQuery("");
                setFilter("all");
                setOnlyAlarms(false);
              }}
            />
          ) : (
            <div
              className={`study-resource-list ${query.trim() || filter !== "all" ? "is-search" : ""}`}
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
                                onClick={() => focus(unitQuery.rack!.id)}
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
                        style = signalStyles[signalFor(data)];
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
                      const locateOnly =
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
                            title={`${row.name} · ${row.location} · ${rowStatus}`}
                            aria-label={`${row.name}，${rowStatus}`}
                            onClick={() => pick(row.id)}
                          >
                            <span className="study-resource-title">
                              <strong>{text.title}</strong>
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
                            </span>
                            <small>{text.detail}</small>
                          </button>
                          <div
                            className="study-row-actions"
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
                                  ? focus(row.id, { installation: true })
                                  : locateOnly
                                    ? pick(row.id, true)
                                    : focus(row.id)
                              }
                            >
                              定位
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
                                onClick={() => pick(row.id, true)}
                              >
                                进入
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
            !(state.level === "room" && rackView === "power") &&
            !(state.level === "room" && rackView === "layout") &&
            !(state.level !== "device" && rackView === "space") &&
            !(state.level === "rack" && rackView === "installation") && (
              <footer className="study-nav-caption">
                {state.level === "device"
                  ? "部件状态为模型评估，非独立告警"
                  : "单击选择 · 定位聚焦 · 进入下一级"}
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
                    control({ type: "layer", layer: l.id });
                    if (
                      state.level === "room" &&
                      ["inlet", "power"].includes(rackView)
                    ) {
                      if (l.id === "power") setRackView("power");
                      else if (l.id === "environment") setRackView("inlet");
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
            rangeViewCommand={rangeViewCommand}
            onRangeViewChange={(side) => {
              setRangeView(side);
              if (!side) setRangeSegmentId(null);
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
            airflow={airflow}
            onAirflowViewChange={setAirflowStageView}
            onExplainAirflow={() => {
              takeover();
              control({ type: "analysis", value: false });
              setInspector(true);
              if (matchMedia("(max-width: 1099px)").matches) setNav(false);
              setAirflowExplanation((value) => value + 1);
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
              pick(activeAirflowVisit.originId);
              setNav(activeAirflowVisit.nav);
              setInspector(activeAirflowVisit.inspector);
              control({ type: "analysis", value: activeAirflowVisit.analysis });
            }}
            aisle={aisle}
            networkLinkId={activeNetworkLink}
            powerViewCommand={powerViewCommand}
            powerViewActive={powerViewActive}
            powerViewPaired={powerViewPaired}
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
            onReturnEnvironmentPair={returnEnvironmentPair}
            maintenanceView={maintenanceView}
            maintenanceReturnRevision={maintenanceReturnRevision}
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
            onShowRoomAirflow={() => showAirflow(state.deviceId)}
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
                current ? { ...current, outlet: null } : null,
              );
              setPowerLinkId(null);
            }}
            onClearNetwork={() => {
              takeover();
              setNetworkLinkId(null);
            }}
            onSelect={pick}
            onPreviewInput={(id) => {
              pick(id);
              return () => {
                pick(selected);
                setNav(nav);
                setInspector(inspector);
                control({ type: "analysis", value: review.analysis });
              };
            }}
            onFocus={() => focus(selected)}
            onPhase={setPhase}
            onFeedback={setFeedback}
            shotRevision={revision}
            tourShot={tourShot}
            onTakeover={takeover}
            compactTools
            controls={
              state.level !== "room" ? (
                <ResourceActions
                  isolated={!!isolatedPartId}
                  isolationLabel={
                    activeFanVisit
                      ? "风扇核对 · 沿用当前机型的子件配置"
                      : activeStorageVisit?.mode === "contact"
                        ? "接点核对 · 硬盘与中板的装配对应"
                        : undefined
                  }
                  onIsolation={() => {
                    takeover();
                    if (activeFanVisit) {
                      finishFanInspection();
                      return;
                    }
                    if (activeStorageVisit) {
                      finishStorageSlots();
                      return;
                    }
                    if (!isolatedPartId) {
                      partSequenceFocus.current = "heading";
                      setInspector(true);
                      if (matchMedia("(max-width: 1099px)").matches)
                        setNav(false);
                    }
                    setInspectionDevice(isolatedPartId ? null : state.deviceId);
                  }}
                  state={state}
                  selected={selected}
                  ready={ready}
                  phase={phase}
                  dispatch={dispatch}
                  onOpen={(id) => pick(id, true)}
                  onExtract={(id) => control({ type: "extract-resource", id })}
                />
              ) : null
            }
          />
          {state.level === "room" &&
            layer === "overview" &&
            maintenance.length === 0 &&
            !fixture &&
            !coolingFacility &&
            !powerFacility &&
            !activeNetworkLink && (
              <div className="study-room-summary">
                <span>01 号机房</span>
                <h1>运行概览</h1>
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
                <button
                  onClick={() => {
                    pick("room-01");
                  }}
                >
                  查看机房详情
                </button>
              </div>
            )}
          {layer === "alarms" && state.level === "room" && (
            <div className="study-alert-caption">
              <span>当前异常</span>
              <strong>
                {room.alarmCount}
                <small>台设备</small>
              </strong>
              <p>点击空间标记查看对应对象</p>
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
          {!inspector && (
            <button
              className="study-show-detail"
              onClick={() => {
                takeover();
                setInspector(true);
                if (matchMedia("(max-width: 1099px)").matches) setNav(false);
              }}
            >
              对象详情
            </button>
          )}
        </section>
        {inspector && (
          <aside
            ref={inspectorRef}
            className={`study-inspector ${review.analysis ? "is-analysis" : ""}`}
            key={`${selected}:${review.analysis}`}
            aria-label={review.analysis ? "时间分析面板" : "对象详情"}
          >
            <div className="study-panel-heading">
              <h2>{review.analysis ? "时间分析" : "对象详情"}</h2>
              {review.analysis && (
                <button
                  className="study-return-detail"
                  aria-label="返回对象详情"
                  onClick={() => control({ type: "analysis", value: false })}
                >
                  详情
                </button>
              )}
              <button
                aria-label="收起详情面板"
                onClick={() => {
                  setInspector(false);
                  control({ type: "analysis", value: false });
                }}
              >
                ×
              </button>
            </div>
            {activeAirflowResponse ? (
              <div className="study-identity">
                <small>气流代表支路 · 模拟对照</small>
                <h1>冷却输入与设备进风</h1>
                <span>保留三维观察 · 与场景共享时间</span>
              </div>
            ) : (
              <div className="study-identity">
                <small>{resource?.location}</small>
                <h1>{resource?.name ?? entity.name}</h1>
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
            {!nav && networkMapReturn}
            {!nav && inletAirflowReturn}
            {activeFanVisit && (
              <FanInspection
                deviceId={state.deviceId}
                visit={activeFanVisit}
                ready={ready}
                analysis={review.analysis}
                focusRevision={fanFocusRevision}
                onSelect={pick}
                onInspect={() => {
                  if (!activeFanVisit || !ready) return;
                  setFanVisit({ ...activeFanVisit, mode: "single" });
                  pick(activeFanVisit.fanId);
                }}
                onSide={(side) => {
                  if (!activeFanVisit || !ready) return;
                  takeover();
                  setFanVisit({ ...activeFanVisit, side });
                  setFanViewRevision((n) => n + 1);
                }}
                onGroup={returnFanGroup}
                onFinish={finishFanInspection}
              />
            )}
            {activeStorageVisit && (
              <StorageSlots
                deviceId={state.deviceId}
                selected={selected}
                visit={activeStorageVisit}
                ready={ready}
                analysis={review.analysis}
                focusRevision={storageFocusRevision}
                onSelect={(id) => {
                  pick(id);
                }}
                onInspect={(id) => {
                  if (!activeStorageVisit || !ready) return;
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
                  setStorageVisit({
                    ...activeStorageVisit,
                    mode: "contact",
                    diskId: id,
                  });
                  pick(id);
                  setStorageViewRevision((n) => n + 1);
                }}
                onGroup={returnStorageGroup}
                onFinish={finishStorageSlots}
              />
            )}
            {isolatedPartId && !activeStorageVisit && !activeFanVisit && (
              <PartSequence
                sequence={partInspectionSequence(
                  state.deviceId,
                  isolatedPartId,
                )!}
                ready={ready}
                onSelect={(id, action) => {
                  partSequenceFocus.current = action;
                  control({ type: "inspect-adjacent-part", id });
                  if (matchMedia("(max-width: 1099px)").matches) setNav(false);
                }}
                onFinish={() => {
                  partSequenceFocus.current = "finish";
                  setInspectionDevice(null);
                  control({ type: "finish-part-inspection" });
                }}
              />
            )}
            {spaceVisit && !spaceReturning && (
              <section
                className="space-inspection-return"
                aria-label="范围占用检视往返"
              >
                <strong>
                  {rackById(spaceVisit.range.rackId)?.name} · 核查{" "}
                  {spaceRangeLabel(spaceVisit.range)}
                </strong>
                <p>
                  {spaceVisit.device.name} 完整安装{" "}
                  {spaceRangeLabel(spaceVisit.device)}；与原范围相交{" "}
                  {spaceRangeLabel(spaceVisit.overlap)}，占{" "}
                  {spaceVisit.overlap.units} U。
                </p>
                <small>
                  原范围设备占用 {spaceVisit.occupied} U · 未安装{" "}
                  {spaceVisit.blanked} U。仅核对配置，不代表可分配容量。
                </small>
                <small>
                  {state.level === "rack" && layer === "overview"
                    ? "三维括线保留原核查范围，选择轮廓对应整台设备；抽出不释放原安装位。"
                    : "范围括线仅在所属机柜的总览显示；当前检视不改变原安装配置。"}
                </small>
                <div>
                  <button
                    disabled={!ready}
                    onClick={() =>
                      focus(spaceVisit.deviceId, { installation: true })
                    }
                  >
                    查看占用设备安装位
                  </button>
                  {state.level === "rack" && (
                    <button
                      disabled={!ready}
                      onClick={() => pick(spaceVisit.deviceId, true)}
                    >
                      {resourceOpenLabel(state, spaceVisit.deviceId)} ↗
                    </button>
                  )}
                </div>
                <button disabled={!ready} onClick={returnSpaceInspection}>
                  ← 返回原范围核查
                </button>
                <button
                  className="space-inspection-end"
                  onClick={() => setSpaceVisit(null)}
                >
                  结束范围检视
                </button>
              </section>
            )}
            {grilleVisit && !grilleReturning && (
              <section
                className="cooling-range-return"
                aria-label="格栅气流检视往返"
              >
                <small>
                  来自{grilleRowById(grilleVisit.rowId)?.name} ·{" "}
                  {rackById(grilleVisit.rackId)?.name}
                </small>
                <small>
                  代表支路 · 格栅 {grilleVisit.grilleId.split("-").at(-1)} →{" "}
                  {grilleVisit.deviceId.toUpperCase()}
                </small>
                <button disabled={!ready} onClick={returnGrille}>
                  ← 返回格栅布置
                </button>
                <div>
                  <button
                    disabled={!ready}
                    onClick={() => showAirflow(grilleVisit.deviceId)}
                  >
                    机房代表气流 ↗
                  </button>
                  <button
                    disabled={!ready}
                    onClick={() => pick(grilleVisit.deviceId, true)}
                  >
                    {resourceOpenLabel(state, grilleVisit.deviceId)} ↗
                  </button>
                </div>
                <button
                  aria-label="结束格栅气流检视往返"
                  onClick={() => setGrilleVisit(null)}
                >
                  结束核对
                </button>
              </section>
            )}
            {coolingVisit && selected !== coolingSource.id && (
              <section
                className="cooling-range-return"
                aria-label="服务范围检视往返"
              >
                <small>
                  来自制冷服务范围 · {rackById(coolingVisit.rackId)?.name}
                </small>
                <button disabled={!ready} onClick={returnCoolingRange}>
                  ← 返回制冷服务范围
                </button>
                {inletId && (
                  <div>
                    <button
                      disabled={!ready}
                      onClick={() => showAirflow(inletId)}
                    >
                      机房气流 ↗
                    </button>
                    <button
                      disabled={!ready}
                      onClick={() => pick(inletId, true)}
                    >
                      {resourceOpenLabel(state, inletId)} ↗
                    </button>
                  </div>
                )}
                <button
                  aria-label="结束服务范围检视往返"
                  onClick={() => setCoolingVisit(null)}
                >
                  结束核对
                </button>
              </section>
            )}
            {pduInspection?.outlet !== null &&
              pduInspection &&
              (selected !== pduInspection.pduId || review.analysis) && (
                <div className="pdu-inspection-return">
                  <small>
                    插座核对 · {pduName(pduInspection.pduId)} /{" "}
                    {String(pduInspection.outlet).padStart(2, "0")}
                  </small>
                  <button
                    disabled={!ready}
                    onClick={() => {
                      pduReturnPending.current = true;
                      focus(pduInspection.pduId);
                      setPowerLinkId(
                        pduOutlet(pduInspection.pduId, pduInspection.outlet)
                          ?.link?.id ?? null,
                      );
                      control({ type: "layer", layer: "power" });
                      control({ type: "analysis", value: false });
                    }}
                  >
                    ← 返回原插座核对
                  </button>
                  <button
                    aria-label="结束插座核对往返"
                    onClick={() => setPduInspection(null)}
                  >
                    ×
                  </button>
                </div>
              )}
            {peakVisit && peakReview && !peakReturning && (
              <section
                className="peak-inspection-return"
                aria-label="最高来源检视往返"
              >
                <small>
                  来自 {entityById(peakVisit.scopeId)?.name} · t+
                  {peakVisit.time}s 最高来源
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
                <button disabled={!ready} onClick={returnPeakSource}>
                  ← 返回最高来源核对
                </button>
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
                  <button
                    aria-label="结束最高来源检视往返"
                    onClick={() => {
                      setPeakReview(null);
                      setPeakVisit(null);
                    }}
                  >
                    结束核对
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
                    来自 {entityById(sourceVisit.check.sourceId)?.name} ·{" "}
                    {sourceVisit.check.metric === "temperature"
                      ? "进风"
                      : "功耗"}
                    输入核对
                  </small>
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
                  <button disabled={!ready} onClick={returnSource}>
                    ← 返回输入核对
                  </button>
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
                    <button
                      aria-label="结束输入检视往返"
                      onClick={() => {
                        setSourceVisit(null);
                        setSourceCheck(null);
                        sourceReturnFocus.current = null;
                      }}
                    >
                      结束核对
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
                  当前从{rangeView === "front" ? "前" : "后"}
                  侧观察。括线指向{activeSegmentId ? "当前分段" : "核查范围"}
                  ，不随设备抽出移动；占用设备仍按完整跨度选择。
                </p>
                <RangeViewActions
                  active={rangeView}
                  ready={ready}
                  onView={requestRangeView}
                />
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
                <small>
                  门扇可用场景操作打开。未安装位置有前置盲板，不代表可分配容量。
                </small>
              </section>
            )}
            {maintenanceView && (
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
                <button disabled={!ready} onClick={returnMaintenanceView}>
                  ← 返回范围观察前视角
                </button>
              </section>
            )}
            {isSmokeFixture(selected) && (
              <SmokeInspection
                origin={smokeVisit?.id ?? null}
                selected={selected}
                ready={ready}
                returning={smokeReturning}
                onStart={() => {
                  setSmokeVisit({
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
                onPreview={pick}
                onLocate={focus}
                onReturn={() => {
                  if (!smokeVisit || !ready) return;
                  setSmokeReturning(true);
                  focus(smokeVisit.id);
                }}
                onEnd={() => {
                  setSmokeVisit(null);
                  setSmokeRestore(true);
                }}
              />
            )}
            {entranceView && (
              <EntranceViewActions
                inspection={entranceView}
                compact={review.analysis}
                ready={ready}
                onView={requestEntranceView}
                onPreview={pick}
              />
            )}
            {leakView && (
              <LeakViewActions
                inspection={leakView}
                compact={review.analysis}
                ready={ready}
                onView={requestLeakView}
                onPreview={pick}
              />
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
                <button disabled={!ready} onClick={() => requestCrossing(null)}>
                  ← 返回核对前视角
                </button>
              </section>
            )}
            {review.analysis ? (
              <>
                <div className="study-time-control">
                  <button onClick={() => dispatch({ type: "play" })}>
                    {state.playing ? "暂停" : "播放"}
                  </button>
                  <time>{clock(state.time)}</time>
                  <span>/ 02:00</span>
                  <small>
                    {state.playing ? "播放中" : "已暂停"} · 场景同步
                  </small>
                  <input
                    aria-label="共享模拟时间"
                    type="range"
                    min="0"
                    max="120"
                    value={state.time}
                    onChange={(e) =>
                      dispatch({ type: "seek", time: Number(e.target.value) })
                    }
                  />
                </div>
                {airflowInspector}
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
                    onObserve={() => requestEnvironmentView("observe")}
                    onRestoreView={() => requestEnvironmentView("return")}
                    time={state.time}
                    selected={selected}
                    ready={ready}
                    onMetric={setEnvironmentPairMetric}
                    onSeek={(time) => dispatch({ type: "seek", time })}
                    onPreview={pick}
                    onLocate={focus}
                    onReturn={returnEnvironmentPair}
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
                ) : fixture ? (
                  <FixtureDetails
                    fixture={fixture}
                    analysis
                    onPreview={pick}
                    onLocate={focus}
                  />
                ) : pairedInlet ? (
                  <InletPairAnalysis
                    key={`${pairedInlet.firstId}:${pairedInlet.secondId}`}
                    differenceReview={inletDifferenceReview}
                    onDifferenceReview={setInletDifferenceReview}
                    viewActive={!!inletView}
                    viewAvailable={
                      state.level === "room" && layer === "environment"
                    }
                    onObserve={() => requestInletView("observe")}
                    onRestoreView={() => requestInletView("return")}
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
                    onReturn={returnInletOverview}
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
                    onClose={() => control({ type: "analysis", value: false })}
                  />
                )}
              </>
            ) : (
              <>
                {airflowInspector}
                {slicePlaneInspector}
                {sliceInspector}
                {!!reading?.alarm && !component && (
                  <section className="study-alarm-detail">
                    <h2>进风温度异常</h2>
                    <p>
                      {reading.count > 1
                        ? `${reading.alarmCount} 台设备存在进风温度告警。`
                        : "设备进风温度持续超限。回看曲线与事件，检查异常发生过程。"}
                    </p>
                    <button
                      onClick={() => {
                        jumpToEvents.current = true;
                        analyze();
                      }}
                    >
                      回看告警过程
                    </button>
                  </section>
                )}
                {environment && fixture ? (
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
                    entranceViewActive={!!entranceView}
                    onInspectLeak={
                      layer === "overview" && state.level === "room"
                        ? () => requestLeakView("all")
                        : undefined
                    }
                    leakViewActive={!!leakView}
                    onPreview={pick}
                    onLocate={focus}
                    grilleRelations={
                      grilleRowById(fixture.id) && (
                        <GrilleBranches
                          key={fixture.id}
                          rowId={fixture.id}
                          ready={ready}
                          activeRack={grilleRack[fixture.id]}
                          restore={grilleReturnFocus}
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
                      onSelect={(id) =>
                        coolingVisit && id === coolingSource.id
                          ? returnCoolingRange()
                          : pick(id)
                      }
                      onLocateSource={() => pick(coolingSource.id, true)}
                      onViewAirflow={() => showAirflow(selected)}
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
                          <strong>
                            {temperature(reading.temperature)}
                            <small>°C</small>
                          </strong>
                          {(reading.count > 1 ||
                            reading.coverageTemperature !== 1) &&
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
                      <div>
                        <span>{reading.powerLabel}</span>
                        <strong>
                          {power(reading.power)}
                          <small>
                            {(reading.power ?? 0) >= 1000 ? "kW" : "W"}
                          </small>
                        </strong>
                        {(reading.count > 1 || reading.coveragePower !== 1) &&
                          (sources ? (
                            <button
                              className="reading-coverage-link"
                              aria-label="核对输入功耗来源"
                              onClick={() => openSourceCheck("power")}
                            >
                              有效覆盖 {reading.coveragePower}/{reading.count} ↗
                            </button>
                          ) : (
                            <small>
                              有效覆盖 {reading.coveragePower}/{reading.count}
                            </small>
                          ))}
                        {sources &&
                          availableSourceMetrics.includes("power") && (
                            <button
                              className="reading-coverage-link"
                              onClick={() => openSourceCheck("power")}
                            >
                              核对功耗预算 ↗
                            </button>
                          )}
                        {powerFacility && (
                          <small>关联设备汇总 · 非设施或支路计量</small>
                        )}
                      </div>
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
                        canObserve={
                          layer === "power" &&
                          powerViewPoints(state, selected, activePowerLink)
                            .length === 2
                        }
                        observing={powerViewActive}
                        paired={powerViewPaired}
                        onObserve={() => requestPowerView("observe")}
                        onObservePair={() => requestPowerView("observe-pair")}
                        onReturnView={() => requestPowerView("return")}
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
                              current ? { ...current, outlet: null } : null,
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
                        portRestore={portRestore}
                        onPortChange={(check) => {
                          setPortCheck(check);
                          setPortRestore(0);
                        }}
                        onPortLeave={(check, id, action, linkId) => {
                          if (!ready) return;
                          setPortCheck(check);
                          setPortRestore(0);
                          setPortVisit({
                            check,
                            level: state.level === "room" ? "room" : "rack",
                            query,
                            filter,
                            rackView,
                            nav,
                            onlyAlarms,
                            metric,
                          });
                          setNetworkLinkId(linkId);
                          if (action === "preview") pick(id);
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
                        canObserve={
                          networkViewPoints(state, selected, activeNetworkLink)
                            .length === 2
                        }
                        observing={networkViewActive}
                        onObserve={() => requestNetworkView("observe")}
                        onReturnView={() => requestNetworkView("return")}
                        ready={ready}
                        onSelect={pick}
                        onLocate={(id) => focus(id, { installation: true })}
                        onInspect={(id) => {
                          if (!activeNetworkLink) return;
                          control({
                            type: "inspect-network-endpoint",
                            linkId: activeNetworkLink,
                            deviceId: id,
                          });
                          setQuery("");
                          setFilter("all");
                          setPowerLinkId(null);
                          if (matchMedia("(max-width: 1099px)").matches)
                            setNav(false);
                        }}
                        onTrace={(id) => {
                          const link = networkLinkById(id);
                          if (
                            link &&
                            !networkContextIncludes(
                              selected,
                              state.deviceId,
                              id,
                            )
                          )
                            pick(link.source);
                          setNetworkLinkId(id);
                        }}
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
                        onSelect={(id) =>
                          coolingVisit && id === coolingSource.id
                            ? returnCoolingRange()
                            : pick(id)
                        }
                        onLocateSource={() => pick(coolingSource.id, true)}
                        onViewAirflow={() => showAirflow(selected)}
                      />
                    )}
                  </>
                ) : (
                  <p className="study-empty">设施布置示意，尚未接入遥测。</p>
                )}
                {!fixture && (
                  <details className="study-configuration">
                    <summary>配置与数据说明</summary>
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
                          宽度的预留示意，不是实测净距或工程校核。场景总览选中机柜时显示范围。
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
