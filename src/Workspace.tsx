import { grilleSeatInspection } from "./grille-seat";
import { GrilleSeatDetails } from "./components/GrilleSeatDetails";
import { grilleIntakeInspection } from "./grille-intake";
import { GrilleIntakeDetails } from "./components/GrilleIntakeDetails";
import { emergencyLight, entranceFixture } from "./entrance";
import { condensate, isCondensate } from "./condensate";
import { drainJointInspection } from "./condensate-joint";
import { CondensateDetails } from "./components/CondensateDetails";
import { coolingDrainIncludes, coolingDrainLink } from "./cooling-drain";
import { DrainJointDetails } from "./components/DrainJointDetails";
import { PanelRegisterDetails } from "./components/PanelRegisterDetails";
import { RacewayAxisDetails } from "./components/RacewayAxisDetails";
import {
  racewayById,
  racewayCornerInspection,
  racewayRegisterStart,
  panelEntryPlacement,
} from "./panel-raceway";
import { PatchPanelDetails } from "./components/PatchPanelDetails";
import { PanelRacewayDetails } from "./components/PanelRacewayDetails";
import { RacewayCornerDetails } from "./components/RacewayCornerDetails";
import { patchPanelById, portAtPanel, type PanelPort } from "./patch-panels";
import {
  frontServiceInspection,
  frontServiceDevices,
  type FrontServiceView,
} from "./front-service";
import type { ChassisDoorSelection } from "./components/ChassisDoorGap";
import { FrontServiceDetails } from "./components/FrontServiceDetails";
import { grilleDoorSweep } from "./grille-door-sweep";
import { AisleDoorDetails } from "./components/AisleDoorDetails";
import { RearServiceDetails } from "./components/RearServiceDetails";
import { rearServiceInspection } from "./rear-service";
import {
  opposedDoorGap,
  type AisleDoorPosition,
  type RearLeafSide,
} from "./aisle-door-gap";
import type { DoorReference } from "./door-sweep";
import { structureOptions } from "./structure-options";
import { FrontCageControls } from "./components/FrontCageControls";
import { switchCageSelection } from "./switch-cages";
import type { RearRowPose } from "./scene/rear-module-seats";
import type { LayerPose } from "./scene/assembly-layer";
import {
  assemblyChecks,
  isAsicBoardStage,
  layerForSelection,
  type AssemblyLayerVisit,
  assemblyMember,
  rearMemberLayer,
  controllerLayer,
  adapterMountLayer,
  processorLayer,
  switchRear,
  fanContactStages,
  type FanContactView,
  type AssemblyCheck,
} from "./assembly-pairs";
import {
  controllerPortsFor,
  controllerPortStages,
  storageAssembly,
} from "./storage-layout";
import { modelForDevice, subpartsForModel } from "./catalog";
import { CompactDriveBays } from "./components/CompactDriveBays";
import {
  compactBayForPart,
  compactDriveBays,
  compactStorageStations,
  verticalStorageStations,
} from "./compact-drive-bays";
import { useDismissibleMenu } from "./use-dismissible-menu";
import {
  StructureTools,
  type StructureTool,
} from "./components/StructureTools";
import { FanInspection } from "./components/FanInspection";
import {
  fanAssembly,
  activeFanInspection,
  type FanInspection as FanVisit,
} from "./fan-inspection";
import {
  StructureNavigation,
  StructureToolbar,
} from "./components/StructureNavigation";
import { StorageSlots } from "./components/StorageSlots";
import {
  activeStorageSlots,
  storageSlotEntry,
  returnStorageInspection,
  storageSlots,
  storageDriveGroup,
  type StorageSlotInspection,
} from "./storage-slots";
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
import { feederEnergyInterval } from "./feeder-energy";
import { PowerFeeders } from "./components/PowerFeeders";
import {
  initialFeeders,
  type FeederReference,
  type FeederSelection,
} from "./power-feeders";
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
import { SmokeLightDetails } from "./components/SmokeLightDetails";
import { SmokeMountDetails } from "./components/SmokeMountDetails";
import { smokeMountInspection } from "./smoke-mount";
import { EnvironmentRoundDetails } from "./components/EnvironmentRoundDetails";
import { environmentRoundFor } from "./environment-rounds";
import { FixtureRoster } from "./components/FixtureRoster";
import { fixtureRoster, type FixtureSource } from "./fixture-roster";
import { RoomLayout } from "./components/RoomLayout";
import { roomLayoutCrossings, type RoomLayoutScope } from "./room-layout";
import type { AirflowView, AirflowViewRequest } from "./airflow-view";
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
import { EntranceInspectionDetails } from "./components/EntranceInspectionDetails";
import {
  entranceViewIncludes,
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
  type LeakTarget,
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
import { RoofEntryDetails } from "./components/RoofEntryDetails";
import { LightHangerDetails } from "./components/LightHangerDetails";
import { TrayMountDetails } from "./components/TrayMountDetails";
import { LightRodDetails } from "./components/LightRodDetails";
import { RearWallCrossingDetails } from "./components/RearWallCrossingDetails";
import { rearWallCrossing } from "./rear-wall";
import { LightingRoundDetails } from "./components/LightingRoundDetails";
import {
  lightingRound,
  fixtureCrossing,
  trayEndSupport,
  trayMountInspection,
  racewayAxisInspection,
  lightHangerInspection,
  lightRodInspection,
  sectionLights,
  traySupportBay,
  traySupportStations,
  smokeTrayPlacement,
  smokeLightInspection,
  type FixtureCrossing,
  type CrossingViewCommand,
} from "./fixture-crossing";
import { nearestPduMount } from "./pdu-mounts";
import type { PowerViewCommand } from "./power-view";
import {
  emptyPeakProcess,
  peakScopeIds,
  type PeakProcessState,
} from "./peak-provenance";
import type { NetworkView, NetworkViewCommand } from "./network-view";
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
import { MaintenanceAisles } from "./components/MaintenanceAisles";
import { RoomSpaceComparison } from "./components/RoomSpaceComparison";
import {
  canInspectPart,
  closesPartInspection,
  isolatedPart,
  partInspectionSequence,
} from "./part-inspection";
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
import { outletAirflow } from "./outlet-airflow";
import { rackTrayRelations, trayRelations, trayRow } from "./cable-trays";
import {
  isLeakFixture,
  leakRelations,
  leakCable,
  leakController,
  nearbyCooling,
} from "./leak-detection";
import { FixtureDetails, FixtureRelations } from "./components/FixtureDetails";
import { TrayReturnBranches } from "./components/TrayReturnBranches";
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
  type MaintenanceAisle,
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
  type PowerLink,
} from "./power-config";
import {
  pduOutlet,
  pduInspectionIncludes,
  locatePduOutlet,
  type PduInspection,
} from "./pdu-outlets";
import { PowerConnections } from "./components/PowerConnections";
import { canShowNetworkPatch } from "./network-patch";
import { NetworkPowerInputs } from "./components/NetworkPowerInputs";
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
import { coolingProbeForDevice, probeAirflowForInput } from "./cooling-probe";
import { ProbeElevation } from "./components/ProbeElevation";
import { ProbeHeightDetails } from "./components/ProbeHeightDetails";
import { probeHeightScene } from "./probe-height-scene";
import { probeMountInspection } from "./probe-mount";
import { ProbeMountDetails } from "./components/ProbeMountDetails";
import {
  ProbeRackInlets,
  type ProbeInputCheck,
} from "./components/ProbeRackInlets";
import { CoolingProbeCheck } from "./components/CoolingProbeCheck";
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
type OutletAirflowOrigin = { inspection: PduInspection; linkId: string };
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

type PanelRegisterOrigin = {
  selected: string;
  initial: PanelPort | null;
  camera: TaskViewMemory | null;
  scroll: number;
};

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
  const fanShaft =
    activeFanVisit?.mode === "single" ? activeFanVisit.shaft : undefined;
  const fanDuct = activeFanVisit
    ? fanAssembly(state.deviceId)?.duct
    : undefined;
  const compareFanDuct =
    activeFanVisit?.mode === "group" && activeFanVisit.side === "duct";
  const [memoryDevice, setMemoryDevice] = useState<string | null>(null);
  const [socketPose, setSocketPose] = useState<LayerPose>();
  const deviceModel = modelForDevice(state.deviceId);
  const dimms = useMemo(
    () =>
      deviceModel.memoryLayout
        ? subpartsForModel(deviceModel).filter(
            (part) => part.parent === "memory-01",
          )
        : [],
    [deviceModel],
  );
  const selectedDimm = dimms.find((part) => part.id === selected);
  const options = useMemo(
    () =>
      state.level === "device"
        ? structureOptions(state.deviceId, selected)
        : undefined,
    [state.level, state.deviceId, selected],
  );
  const memoryContext = !!options?.memory;
  const activeMemory =
    memoryDevice === state.deviceId &&
    memoryContext &&
    canInspectPart(state) &&
    selected !== state.deviceId;
  useEffect(() => {
    if (memoryDevice && !activeMemory) setMemoryDevice(null);
    if (!activeMemory || !selectedDimm) setSocketPose(undefined);
  }, [memoryDevice, activeMemory, selectedDimm]);
  const dimmPose = activeMemory && selectedDimm ? socketPose : undefined;
  const [pairVisit, setPairVisit] = useState<{
    deviceId: string;
    tool: AssemblyCheck["tool"];
    layer?: AssemblyLayerVisit;
    processorSlot?: string;
    fanContact?: { view: FanContactView; fanId: string };
    storagePath?: { stationId: string; origin: string; pose: LayerPose };
    powerBayPose?: RearRowPose;
    rearRow?: { supplyId: string; pose: RearRowPose; fromPair: boolean };
  } | null>(null);
  const pairTools = options?.assemblies ?? [];
  const pathVisit =
    pairVisit?.deviceId === state.deviceId && state.level === "device"
      ? pairVisit.storagePath
      : undefined;
  const storageStations = deviceModel.storageHarness
    ? verticalStorageStations
    : compactStorageStations;
  const station =
    pathVisit &&
    storageStations.find(
      (item) =>
        item.id === pathVisit.stationId && item.members.includes(selected),
    );
  const pathContact =
    station && station.id !== "route" && station.id !== "mount";
  const contactVisit = pairVisit?.fanContact;
  const contactFan =
    contactVisit &&
    switchRear.fans.find(
      (fan) =>
        fan.id === (selected === "net-board" ? contactVisit.fanId : selected),
    );
  const requestedFanStage = fanContactStages.find(
    (stage) => stage.id === contactVisit?.view,
  );
  // 从资源栏直接选风扇时回到本槽两侧的接合视图，板侧近看始终归控制主板。
  const fanStage =
    requestedFanStage?.boardOnly && selected !== "net-board"
      ? fanContactStages.find((stage) => stage.id === "fan-contact")
      : requestedFanStage;
  const processorBoardSlot =
    pairVisit?.layer?.pose && selected === "board-01"
      ? pairVisit.processorSlot
      : undefined;
  const assembly =
    pairVisit?.deviceId === state.deviceId
      ? (station || contactFan || processorBoardSlot
          ? assemblyChecks(state.deviceId)
          : pairTools
        ).find((check) => check.tool === pairVisit.tool)
      : undefined;
  const additionalParts =
    assembly && "additionalParts" in assembly
      ? assembly.additionalParts
      : undefined;
  const rearLayout = assembly && "rear" in assembly ? assembly.rear : undefined;
  const rearRow = rearLayout && pairVisit?.rearRow;
  const rearLayer = rearRow
    ? rearMemberLayer(rearLayout, contactFan?.id ?? selected)
    : undefined;
  const setLayerScope = (id?: string) =>
    setPairVisit((current) =>
      current?.layer
        ? { ...current, layer: { ...current.layer, scopeId: id } }
        : current,
    );
  const activePair = canInspectPart(state)
    ? assembly?.pairs.find(
        ({ primary, companion }) =>
          !!station ||
          !!contactFan ||
          primary.id === processorBoardSlot ||
          selected === primary.id ||
          selected === companion.id ||
          additionalParts?.some((part) => selected === part.id) ||
          (!!rearRow &&
            rearLayout.members.some((part) => part.id === selected)),
      )
    : undefined;
  const rearMount =
    (assembly?.tool === "rear-interfaces" ||
      assembly?.tool === "expansion-bay") &&
    (selected === "nic-01" || selected === "riser-01");
  const selectedLayer = rearMount
    ? adapterMountLayer
    : (rearLayer ??
      (assembly &&
      "layer" in assembly &&
      activePair &&
      ("partId" in assembly.layer
        ? assembly.layer.partId === selected
        : assembly.layer.members === "both" ||
          activePair[assembly.layer.members].id === selected)
        ? assembly.layer
        : undefined));
  // 同类槽位共用装配定义。跨类选件在绘制工具栏和场景之前回到新件的初始安装位。
  const selectedVisit = layerForSelection(pairVisit?.layer, selectedLayer);
  if (pairVisit && pairVisit.layer !== selectedVisit) {
    setPairVisit({
      ...pairVisit,
      layer: selectedVisit,
      processorSlot: undefined,
      fanContact: undefined,
    });
  }
  const cageSelection =
    assembly?.tool === "switch-front"
      ? switchCageSelection(pairVisit?.layer?.scopeId)
      : undefined;
  const stagedLayer =
    selectedLayer && "stages" in selectedLayer ? selectedLayer : undefined;
  const inspectingSupply = rearLayout?.supplies.some(
    (supply) => supply.id === selected,
  );
  const stage = stagedLayer?.stages.find(
    (item) => item.id === (pairVisit?.layer?.scopeId ?? ""),
  );
  const processorInspection = selectedLayer === processorLayer;
  const processorStage =
    pairVisit?.layer?.scopeId === "processor-sink" ||
    selected === activePair?.companion.id
      ? "processor-sink"
      : "processor-seat";
  const controllerInspection = selectedLayer === controllerLayer;
  const portOptions = controllerInspection
    ? controllerPortsFor(selected).map((port, index) => ({
        port,
        stages: controllerPortStages(index),
      }))
    : [];
  const portStage = portOptions
    .flatMap((option) => option.stages)
    .find((item) => item.id === pairVisit?.layer?.scopeId);
  const inspectingCooler =
    controllerInspection && pairVisit?.layer?.scopeId === "controller-cooler";
  const powerBayPose =
    assembly && "powerBays" in assembly ? pairVisit?.powerBayPose : undefined;
  const layerPose = selectedVisit?.pose;
  const layerEntry = useRef<HTMLButtonElement>(null);
  const pathEntry = useRef<HTMLButtonElement>(null);
  const returningToLayer = useRef<false | "layer" | "path">(false);
  const setLayerPose = (pose?: LayerPose) => {
    setPairVisit(
      (current) =>
        current && {
          ...current,
          layer:
            pose && selectedLayer
              ? {
                  definition: selectedLayer,
                  pose,
                  scopeId: current.layer?.scopeId,
                }
              : undefined,
          processorSlot:
            pose && processorInspection ? activePair?.primary.id : undefined,
          fanContact: pose ? current.fanContact : undefined,
        },
    );
  };
  const companionPartIds = useMemo(() => {
    if (station) return pathContact ? [] : station.members.slice(1);
    if (layerPose) return [];
    if (rearRow) return rearLayout.companions;
    if (activePair)
      return additionalParts
        ? [activePair.companion.id, ...additionalParts.map((part) => part.id)]
        : [activePair.companion.id];
    return compareFanDuct && fanDuct ? [fanDuct.id] : [];
  }, [
    station,
    pathContact,
    activePair,
    additionalParts,
    compareFanDuct,
    fanDuct,
    layerPose,
    rearRow,
    rearLayout,
  ]);
  useEffect(() => {
    if (pairVisit && !activePair) setPairVisit(null);
    else if (
      processorInspection &&
      layerPose &&
      activePair &&
      pairVisit?.processorSlot !== activePair.primary.id
    )
      setPairVisit(
        (current) =>
          current && { ...current, processorSlot: activePair.primary.id },
      );
    else if (
      contactVisit &&
      (contactVisit.fanId !== contactFan?.id ||
        contactVisit.view !== fanStage?.id)
    )
      setPairVisit(
        (current) =>
          current && {
            ...current,
            fanContact:
              contactFan && fanStage
                ? { view: fanStage.id, fanId: contactFan.id }
                : undefined,
          },
      );
    else if (pathVisit && !station)
      setPairVisit(
        (current) => current && { ...current, storagePath: undefined },
      );
    else if (
      pairVisit?.layer?.pose &&
      assembly?.tool === "switch-board" &&
      selected === "net-board" &&
      !isAsicBoardStage(pairVisit.layer?.scopeId)
    )
      setLayerScope("asic-lands");
  }, [
    pairVisit,
    activePair,
    selectedLayer,
    assembly,
    selected,
    pathVisit,
    station,
    contactVisit,
    fanStage,
    contactFan,
    layerPose,
    processorInspection,
  ]);
  const [structureReturn, setStructureReturn] = useState<{
    deviceId: string;
    tool: StructureTool;
  } | null>(null);
  useEffect(() => {
    if (
      structureReturn &&
      (state.level !== "device" ||
        state.deviceId !== structureReturn.deviceId ||
        (selected !== structureReturn.deviceId &&
          structureReturn.tool !== "cover"))
    )
      setStructureReturn(null);
  }, [structureReturn, state.level, state.deviceId, selected]);
  const isolatedPartId = activeMemory
    ? dimmPose
      ? selected
      : "memory-01"
    : station
      ? station.members[0]
      : activePair
        ? layerPose
          ? selected
          : activePair.primary.id
        : activeFanVisit && !activeFanVisit.pending
          ? activeFanVisit.mode === "group"
            ? fanAssembly(state.deviceId)!.group.id
            : activeFanVisit.fanId
          : activeStorageVisit && !activeStorageVisit.pending
            ? activeStorageVisit.mode === "group"
              ? storageDriveGroup
              : activeStorageVisit.mode === "board"
                ? "sto-midplane"
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
    outlet?: OutletAirflowOrigin;
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
    if (!activeStorageVisit && !activeFanVisit && !activePair && !activeMemory)
      return;
    const medium = matchMedia("(max-width: 1099px)");
    const adapt = () => {
      if (medium.matches) setNav(false);
    };
    adapt();
    medium.addEventListener("change", adapt);
    return () => medium.removeEventListener("change", adapt);
  }, [
    activeStorageVisit?.deviceId,
    activeFanVisit?.deviceId,
    activePair,
    activeMemory,
  ]);
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
  const [coolingDrainVisit, setCoolingDrainVisit] = useState<{
    link: NonNullable<ReturnType<typeof coolingDrainLink>>;
    revision: number;
  } | null>(null);
  const activeCoolingDrain =
    coolingDrainVisit &&
    coolingDrainVisit.revision === revision &&
    coolingDrainVisit.link.deviceId === coolingVisit?.deviceId &&
    layer === "overview" &&
    state.level === "room" &&
    coolingDrainIncludes(selected)
      ? coolingDrainVisit.link
      : null;
  useEffect(() => {
    if (coolingDrainVisit && !activeCoolingDrain) setCoolingDrainVisit(null);
  }, [coolingDrainVisit, activeCoolingDrain]);
  const coolingProbe = useMemo(
    () =>
      coolingVisit?.deviceId
        ? coolingProbeForDevice(coolingVisit.deviceId)
        : null,
    [coolingVisit?.deviceId],
  );
  const atCoolingProbe =
    layer === "overview" &&
    !!coolingProbe &&
    coolingVisit?.locatedEndpoint?.id === selected &&
    selected === coolingProbe.probe.id;
  const locatedCoolingDevice =
    layer === "airflow" && coolingVisit?.locatedEndpoint?.id === selected
      ? coolingVisit.locatedEndpoint.deviceId
      : null;
  useEffect(() => {
    if (
      coolingVisit &&
      !locatedCoolingDevice &&
      !atCoolingProbe &&
      !activeCoolingDrain &&
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
    atCoolingProbe,
    activeCoolingDrain,
  ]);
  const [doorReference, setDoorReference] = useState<AisleDoorPosition>("peak");
  const [maintenanceView, setMaintenanceView] =
    useState<MaintenanceInspection | null>(null);
  const [rearLeafSide, setRearLeafSide] = useState<RearLeafSide>("right");
  const doorGap = useMemo(
    () =>
      maintenanceView?.sweeps
        ? opposedDoorGap(maintenanceView.sweeps, doorReference, rearLeafSide)
        : null,
    [maintenanceView, doorReference, rearLeafSide],
  );
  const [grilleDoorReference, setGrilleDoorReference] =
    useState<DoorReference | null>(null);
  const grilleSweep = useMemo(
    () =>
      maintenanceView?.aisle && maintenanceView.overlap && grilleDoorReference
        ? grilleDoorSweep(
            maintenanceView.aisle,
            maintenanceView.overlap.grille,
            grilleDoorReference,
          )
        : null,
    [maintenanceView, grilleDoorReference],
  );
  useEffect(() => {
    if (!maintenanceView?.overlap) setGrilleDoorReference(null);
  }, [maintenanceView?.overlap]);
  const [entranceView, setEntranceView] = useState<EntranceInspection | null>(
    null,
  );
  const [entranceViewCommand, setEntranceViewCommand] =
    useState<EntranceViewCommand | null>(null);
  const requestEntranceView = (view: EntranceView | null, sample?: number) => {
    takeover();
    setEntranceViewCommand((current) => ({
      view,
      sample,
      revision: (current?.revision ?? 0) + 1,
    }));
  };
  const [panelInspection, setPanelInspection] = useState<{
    fixtureId: string;
    origin: PanelPort;
    register?: PanelRegisterOrigin;
    entryView?: boolean;
  } | null>(null);
  const inspectionOrigin =
    panelInspection?.fixtureId === selected &&
    state.level === "room" &&
    layer === "overview"
      ? panelInspection.origin
      : null;
  const register = inspectionOrigin ? panelInspection?.register : undefined;
  const [registerReturn, setRegisterReturn] =
    useState<PanelRegisterOrigin | null>(null);
  const entryView = !!register && !!panelInspection?.entryView;
  const panelPort =
    entryView && inspectionOrigin
      ? portAtPanel(
          inspectionOrigin,
          panelEntryPlacement(selected)?.panel.id ?? selected,
        )
      : inspectionOrigin?.panelId === selected
        ? inspectionOrigin
        : null;
  useEffect(() => {
    if (panelInspection && !inspectionOrigin) setPanelInspection(null);
  }, [panelInspection, inspectionOrigin]);
  const [drainSegment, setDrainSegment] = useState<{
    id: string;
    segment: number;
  } | null>(null);
  useEffect(() => {
    setDrainSegment((current) => (current?.id === selected ? current : null));
  }, [selected]);
  const [leakView, setLeakView] = useState<LeakInspection | null>(null);
  const [leakViewCommand, setLeakViewCommand] =
    useState<LeakViewCommand | null>(null);
  const requestLeakView = (view: LeakView | null, target?: LeakTarget) => {
    takeover();
    setLeakViewCommand((current) => ({
      view,
      target,
      revision: (current?.revision ?? 0) + 1,
    }));
  };
  const [crossing, setCrossing] = useState<FixtureCrossing | null>(null);
  const smokeTrayEdges = crossing?.kind === "smoke-tray" && crossing.gap;
  const crossingOverview =
    crossing?.kind === "roof-entry" || crossing?.kind === "roof-pdu"
      ? crossing.overview
      : crossing;
  const crossingOriginId =
    crossingOverview?.kind === "lighting-round" ||
    crossingOverview?.kind === "light-rod"
      ? crossingOverview.source.id
      : crossingOverview?.id;
  const [crossingCommand, setCrossingCommand] =
    useState<CrossingViewCommand | null>(null);
  const crossingEntry = useRef<{ element: HTMLElement; scroll: number } | null>(
    null,
  );
  const crossingReturning = useRef(false);
  const crossingInspectPending = useRef<
    boolean | HTMLSelectElement | HTMLButtonElement | HTMLInputElement
  >(false);
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
    const control = document.activeElement;
    crossingInspectPending.current =
      ((pair?.kind === "grille-seat" && crossing?.kind === "grille-seat") ||
        (pair?.kind === "smoke-mount" && crossing?.kind === "smoke-mount") ||
        (pair?.kind === "smoke-tray" && crossing?.kind === "smoke-tray") ||
        (pair?.kind === "smoke-light" && crossing?.kind === "smoke-light") ||
        (pair?.kind === "tray-support" && crossing?.kind === "tray-support") ||
        (pair?.kind === "tray-mount" && crossing?.kind === "tray-mount") ||
        (pair?.kind === "light-hanger" && crossing?.kind === "light-hanger") ||
        (pair?.kind === "probe-height" && crossing?.kind === "probe-height") ||
        (pair?.kind === "probe-mount" && crossing?.kind === "probe-mount") ||
        (pair?.kind === "raceway-corner" &&
          crossing?.kind === "raceway-corner") ||
        (pair?.kind === "raceway-axis" && crossing?.kind === "raceway-axis") ||
        (pair?.kind === "light-rod" && crossing?.kind === "light-rod") ||
        (pair?.kind === "tray-bay" && crossing?.kind === "tray-bay") ||
        (pair?.kind === "roof-pdu" && crossing?.kind === "roof-pdu") ||
        (pair?.kind === "drain-joint" && crossing?.kind === "drain-joint")) &&
      (control instanceof HTMLSelectElement ||
        (pair?.kind === "raceway-axis" &&
          control instanceof HTMLInputElement) ||
        ((pair?.kind === "grille-seat" ||
          pair?.kind === "light-hanger" ||
          pair?.kind === "roof-pdu" ||
          pair?.kind === "smoke-mount" ||
          pair?.kind === "raceway-axis" ||
          pair?.kind === "probe-mount") &&
          control instanceof HTMLButtonElement)) &&
      control.closest(".crossing-details")
        ? control
        : !!pair;
    takeover();
    setCrossingCommand((current) => ({
      pair,
      revision: (current?.revision ?? 0) + 1,
    }));
  };
  const [networkView, setNetworkView] = useState<NetworkView | null>(null);
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
  const initialPduMount =
    state.level === "rack" &&
    layer === "power" &&
    pduById(selected)?.rackId === rackForDevice(state.deviceId).id
      ? nearestPduMount(
          pduInspection?.pduId === selected ? pduInspection.outlet : null,
        )
      : null;
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
  const [showFixtureRoster, setShowFixtureRoster] = useState(false);
  const [fixtureSource, setFixtureSource] = useState<FixtureSource>("all");
  const [fixtureQuery, setFixtureQuery] = useState("");
  const fixtureScroll = useRef(0);
  const fixtureRestore = useRef<string | null>(null);
  const layoutScroll = useRef(0);
  const [layoutRestore, setLayoutRestore] = useState(0);
  const [layoutVisit, setLayoutVisit] = useState<{
    id: string;
    resourceList?: { query: string; filter: ResourceFilter; scroll: number };
    roster?: { source: FixtureSource; query: string; scroll: number };
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
  const [feederReference, setFeederReference] =
    useState<FeederReference | null>(null);
  useEffect(() => {
    setFeederReference(null);
  }, [state.replayCycle]);
  const feederScroll = useRef(0);
  const focusFeederRoute = useRef(false);
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
    feeder?: {
      selection: FeederSelection;
      inspection: PduInspection | null;
      linkId: string;
      focusKey: string;
      scroll: number;
    };
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
    powerBranchId?: string;
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

  const [outletNetworkVisit, setOutletNetworkVisit] = useState<{
    outlet: PduInspection;
    input: PowerLink;
    branchId: string;
  } | null>(null);
  const outletBranch = networkLinkById(outletNetworkVisit?.branchId ?? null);
  const visitedPowerBranch = networkLinkById(
    networkMapVisit?.powerBranchId ?? outletNetworkVisit?.branchId ?? null,
  );
  const tracedInput = powerLinkById(activePowerLink);
  const inspectingNetworkPower =
    layer === "power" &&
    visitedPowerBranch &&
    tracedInput &&
    networkContextIncludes(
      tracedInput.deviceId,
      tracedInput.deviceId,
      visitedPowerBranch.id,
    );
  const outletNetworkActive =
    outletBranch &&
    ((layer === "overview" && networkTrace?.id === outletBranch.id) ||
      (inspectingNetworkPower && visitedPowerBranch?.id === outletBranch.id));
  const supplyBranch = inspectingNetworkPower
    ? visitedPowerBranch
    : (networkMapVisit || outletNetworkActive) && (!portCheck || portOwnsTrace)
      ? networkTrace
      : undefined;
  const [pendingNetworkOutlet, setPendingNetworkOutlet] = useState<
    string | null
  >(null);
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
  const [spaceMode, setSpaceMode] = useState<"units" | "aisles">("units");
  const [aisleQuery, setAisleQuery] = useState("");
  const [aisleCommand, setAisleCommand] = useState<{
    rackId: string | null;
    grilleId?: string;
  } | null>(null);
  const [aisleVisit, setAisleVisit] = useState<{
    aisle: MaintenanceAisle;
    service?: MaintenanceAisle;
    openPduOnArrival?: string;
    frontService?: MaintenanceAisle["front"];
    frontView?: FrontServiceView;
    doorSelection?: ChassisDoorSelection;
    layer: typeof layer;
    metric: "power" | "temperature";
    resourceQuery: string;
    filter: typeof filter;
    onlyAlarms: boolean;
    rackId: string;
    scroll: number;
    query: string;
    inspector: boolean;
    camera: TaskViewMemory | null;
  } | null>(null);
  const [aisleReturn, setAisleReturn] = useState<typeof aisleVisit>(null);
  const [aisleReturning, setAisleReturning] = useState(false);
  const frontArea = aisleVisit?.frontService;
  const frontService = useMemo(
    () =>
      frontArea &&
      state.level === "rack" &&
      layer === "overview" &&
      rackForDevice(state.deviceId).id === frontArea.rackId
        ? frontServiceInspection(
            frontArea,
            selected,
            state.trayExtended && selected === state.deviceId,
            aisleVisit?.frontView,
          )
        : null,
    [
      frontArea,
      aisleVisit?.frontView,
      state.level,
      layer,
      state.deviceId,
      state.trayExtended,
      selected,
    ],
  );
  const shownFront =
    aisleVisit &&
    maintenanceView?.areas.find(
      (area) =>
        area.kind === "front" &&
        maintenanceAisle(area.rackId)?.front.rackId === area.rackId,
    );
  const firstFrontDevice = shownFront && frontServiceDevices(shownFront)[0];
  const rearService = useMemo(() => {
    if (
      !aisleVisit?.service ||
      state.level !== "rack" ||
      rackForDevice(state.deviceId).id !== aisleVisit.service.rear.rackId ||
      layer !== "power" ||
      pduInspection?.pduId !== selected
    )
      return null;
    return rearServiceInspection(
      aisleVisit.service,
      selected,
      pduInspection.outlet,
    );
  }, [
    aisleVisit,
    state.level,
    state.deviceId,
    layer,
    selected,
    pduInspection?.pduId,
    pduInspection?.outlet,
  ]);
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
  const roomAisles =
    state.level === "room" &&
    navigationView === "space" &&
    spaceMode === "aisles";
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
  const showingCoolingRange =
    selected === coolingSource.id &&
    inspector &&
    coolingRangeOpen &&
    !review.analysis;
  const serviceRack = showingCoolingRange ? coolingRangeState.rackId : null;
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
  const [airflowViewRequest, setAirflowViewRequest] =
    useState<AirflowViewRequest | null>(null);
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
  const round =
    state.level === "room" && layer === "overview"
      ? environmentRoundFor(selected)
      : undefined;
  const [openRound, setOpenRound] = useState<string | null>(null);
  useEffect(() => {
    if (openRound && openRound !== round?.row.id) setOpenRound(null);
  }, [round, openRound]);
  const [probeRackDevice, setProbeRackDevice] = useState<{
    id: string;
    fromHeight: boolean;
  } | null>(null);
  const [probeInputCheck, setProbeInputCheck] =
    useState<ProbeInputCheck | null>(null);
  const probeInputRestore = useRef<string | null>(null);
  const [probeAirflowDevice, setProbeAirflowDevice] = useState<string | null>(
    null,
  );
  const probeAirflow = useMemo(
    () =>
      probeAirflowDevice &&
      probeAirflowDevice === airflowSelection &&
      probeAirflowDevice === airflowDevice
        ? coolingProbeForDevice(probeAirflowDevice)
        : null,
    [probeAirflowDevice, airflowSelection, airflowDevice],
  );
  useEffect(() => {
    if (probeAirflowDevice && (!probeAirflow || layoutReturning))
      setProbeAirflowDevice(null);
  }, [probeAirflowDevice, probeAirflow, layoutReturning]);
  const rackProbe = useMemo(
    () => (probeRackDevice ? coolingProbeForDevice(probeRackDevice.id) : null),
    [probeRackDevice],
  );
  useEffect(() => {
    if (
      rackProbe &&
      (layoutReturning ||
        layer !== "overview" ||
        (selected !== rackProbe.device.id && selected !== rackProbe.probe.id))
    )
      setProbeRackDevice(null);
  }, [rackProbe, selected, layer, layoutReturning]);
  useEffect(() => {
    if (
      probeInputCheck &&
      (layoutReturning ||
        !(
          (round?.probe.id === selected &&
            round.row.rackIds.includes(probeInputCheck.rackId)) ||
          rackProbe?.device.rackId === probeInputCheck.rackId
        ))
    ) {
      setProbeInputCheck(null);
      probeInputRestore.current = null;
    }
  }, [probeInputCheck, selected, round, rackProbe, layoutReturning]);
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
    if (!registerReturn || !ready) return;
    if (registerReturn.selected === selected) {
      const entry = document.querySelector<HTMLButtonElement>(
        "[data-start-panel-register]",
      );
      entry?.focus({ preventScroll: true });
      const panel = entry?.closest<HTMLElement>(".study-inspector");
      if (panel) panel.scrollTop = registerReturn.scroll;
    }
    setRegisterReturn(null);
  }, [registerReturn, ready, selected]);
  useLayoutEffect(() => {
    if (
      !(
        selectedLayer ||
        (activeMemory && selectedDimm) ||
        rearLayout ||
        returningToLayer.current === "path"
      ) ||
      (rearRow && !rearLayer) ||
      layerPose ||
      dimmPose
    )
      returningToLayer.current = false;
    if (!returningToLayer.current) return;
    // 镜头归位时操作条会短暂禁用；就位后恢复焦点，用户接管后停止恢复。
    if (ready)
      (returningToLayer.current === "path"
        ? pathEntry
        : layerEntry
      ).current?.focus({ preventScroll: true });
    const release = () => {
      returningToLayer.current = false;
    };
    document.addEventListener("pointerdown", release, true);
    document.addEventListener("keydown", release, true);
    return () => {
      document.removeEventListener("pointerdown", release, true);
      document.removeEventListener("keydown", release, true);
    };
  }, [
    selectedLayer,
    layerPose,
    activeMemory,
    selectedDimm,
    dimmPose,
    rearRow,
    rearLayer,
    rearLayout,
    pathVisit,
    assembly,
    ready,
  ]);
  useEffect(() => {
    if (!pendingNetworkOutlet) return;
    if (!inspectingNetworkPower || pendingNetworkOutlet !== activePowerLink) {
      setPendingNetworkOutlet(null);
      return;
    }
    if (!ready || review.pendingId || state.level !== "rack") return;
    setPendingNetworkOutlet(null);
    requestPowerView("observe");
  }, [
    pendingNetworkOutlet,
    inspectingNetworkPower,
    activePowerLink,
    ready,
    review.pendingId,
    state.level,
  ]);
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
    } else if (selected === fanDuct?.id && !compareFanDuct) {
      setFanVisit({
        ...fanVisit,
        mode: "group",
        side: "duct",
        shaft: undefined,
      });
      setFanViewRevision((n) => n + 1);
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
      setFanVisit({ ...fanVisit, mode: "group", shaft: undefined });
      setFanViewRevision((n) => n + 1);
    }
  }, [
    fanVisit,
    activeFanVisit,
    fanDuct,
    compareFanDuct,
    ready,
    state,
    selected,
  ]);
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
      (storageVisit.mode !== "group" || storageVisit.diskId !== null) &&
      (selected === state.deviceId || selected === storageDriveGroup)
    ) {
      setStorageVisit({
        deviceId: state.deviceId,
        mode: "group",
        diskId: null,
        pending: false,
      });
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
    if (ready && outletNetworkVisit && !outletNetworkActive)
      setOutletNetworkVisit(null);
  }, [ready, outletNetworkVisit, outletNetworkActive]);
  useEffect(() => {
    if (
      powerOverviewVisit &&
      !powerOverviewReturning &&
      !outletNetworkActive &&
      !airflowOrigin?.outlet &&
      ready &&
      !powerOverviewIncludes(powerOverviewVisit.id, selected, state.deviceId)
    )
      setPowerOverviewVisit(null);
  }, [
    powerOverviewVisit,
    powerOverviewReturning,
    airflowOrigin?.outlet,
    outletNetworkActive,
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
      setPduInspection(origin.inspection);
      setFeederRestore(origin.focusKey);
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
    setShowFixtureRoster(!!layoutVisit.roster);
    if (layoutVisit.roster) {
      setLayoutScope("fixtures");
      setFixtureQuery(layoutVisit.roster.query);
      setFixtureSource(layoutVisit.roster.source);
      fixtureScroll.current = layoutVisit.roster.scroll;
      fixtureRestore.current = layoutVisit.id;
    }
    setOpenRound(null);
    if (layoutVisit.resourceList) {
      const origin = layoutVisit.resourceList;
      setQuery(origin.query);
      setFilter(origin.filter);
      roomSearchFocus.current = {
        ...origin,
        id: layoutVisit.id,
        inspector: layoutVisit.origin.inspector,
      };
    }
    setLayoutQuery(layoutVisit.query);
    control({ type: "layer", layer: layoutVisit.layer });
    control({ type: "analysis", value: false });
    setMetric(layoutVisit.metric);
    setRackView(layoutVisit.resourceList ? "list" : "layout");
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
    if (
      !focusFeederRoute.current ||
      selected !== powerSettings.sourceId ||
      !ready ||
      powerViewPaired ||
      !activePowerLink
    )
      return;
    const route = inspectorRef.current?.querySelector<HTMLElement>(
      ".power-feeder-route",
    );
    const button = route?.querySelector<HTMLButtonElement>(
      "[aria-pressed='true']",
    );
    if (!button) return;
    focusFeederRoute.current = false;
    route?.scrollIntoView({ block: "nearest" });
    button.focus({ preventScroll: true });
  }, [selected, ready, powerViewPaired, activePowerLink]);
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
      const list = row.parentElement!;
      list.scrollTop = pduInspection.scroll;
      const bounds = list.getBoundingClientRect();
      const button = row.getBoundingClientRect();
      if (button.bottom <= bounds.top || button.top >= bounds.bottom)
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
    setSpaceMode("units");
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
      rackView !== "network" &&
      !inspectingNetworkPower
    )
      setNetworkMapVisit(null);
  }, [
    networkMapReturning,
    networkMapVisit,
    state.level,
    ready,
    rackView,
    inspectingNetworkPower,
  ]);
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
    const pending = crossingInspectPending.current;
    if (!pending || !crossing || !ready) return;
    if (typeof pending !== "boolean" && pending.isConnected) {
      if (
        document.activeElement === document.body ||
        document.activeElement === pending
      )
        pending.focus({ preventScroll: true });
      crossingInspectPending.current = false;
      return;
    }
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
    inspector: boolean;
    scroll: number;
  } | null>(null);
  const roomSearchFocus = useRef<typeof roomSearchOrigin.current>(null);
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
    control({ type: "analysis", value: false });
    setRackView("list");
    skipNavigationSearch.current = !nav;
    setNav(true);
    setInspector(
      origin.inspector && !matchMedia("(max-width: 1099px)").matches,
    );
    roomSearchFocus.current = origin;
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
    const origin = roomSearchFocus.current;
    if (!origin || !nav || !ready || selected !== origin.id) return;
    const row = navigationRef.current?.querySelector<HTMLButtonElement>(
      ".study-resource.selected .study-resource-text",
    );
    if (row?.getClientRects().length) {
      const list = row.closest<HTMLElement>(".study-resource-list");
      roomSearchFocus.current = null;
      row.focus({ preventScroll: true });
      if (list) list.scrollTop = origin.scroll;
    }
  }, [selected, nav, ready, query, filter, layoutRestore]);
  const compactServer =
    state.level === "device" &&
    modelForDevice(state.deviceId).id === "server-1u";
  const compactBayContext =
    compactServer &&
    (selected === state.deviceId ||
      selected === "storage-01" ||
      selected === "drives-01" ||
      !!compactBayForPart(selected));
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
  const dispatchStructure = (action: Action) => {
    if (closesPartInspection(action)) partSequenceFocus.current = "isolate";
    dispatch(action);
  };
  const takeover = useCallback(() => control({ type: "takeover" }), []);
  const rememberRoomSearch = useCallback(
    (id: string) => {
      if (
        roomResourceList &&
        (query.trim() || filter !== "all") &&
        deviceById(id) &&
        rows.some((row) => row.id === id)
      ) {
        roomSearchOrigin.current = {
          id,
          query,
          filter,
          inspector,
          scroll:
            navigationRef.current?.querySelector(".study-resource-list")
              ?.scrollTop ?? 0,
        };
        setRackView("installation");
      }
    },
    [roomResourceList, query, filter, rows, inspector],
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
  const showEntranceView = (view: EntranceView | null) => {
    if (view === "heads" || view === "head-boundary") {
      if (selected !== emergencyLight.id) pick(emergencyLight.id);
    } else if (view && !entranceViewIncludes(selected, view)) {
      pick(entranceFixture.id);
    }
    requestEntranceView(view);
  };
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
  const inspectPanelPort = (port: PanelPort) => {
    focus(port.panelId);
    control({ type: "analysis", value: false });
    setPanelInspection({
      fixtureId: port.panelId,
      origin:
        entryView &&
        inspectionOrigin &&
        panelPort?.panelId === port.panelId &&
        panelPort.port === port.port
          ? inspectionOrigin
          : port,
      register,
      entryView,
    });
  };
  const openCondensateSensing = (
    fromJoint: number,
    segment: number,
    standId?: string,
  ) => {
    pick(condensate.sensingCableId);
    requestLeakView("floor", { fromJoint, segment: segment - 1, standId });
  };
  const analyzeCondensateSource = () => {
    focus(condensate.sourceId);
    analyze();
  };
  const condensateDetails = layer === "overview" &&
    state.level === "room" &&
    crossing?.kind !== "drain-joint" &&
    (isCondensate(selected) ||
      selected === condensate.sourceId ||
      selected === condensate.sensingCableId) && (
      <CondensateDetails
        segment={
          drainSegment?.id === selected ? drainSegment.segment : undefined
        }
        onSegment={(segment) => setDrainSegment({ id: selected, segment })}
        id={selected}
        ready={ready}
        onLocate={focus}
        onHistory={analyzeCondensateSource}
        onSense={openCondensateSensing}
        onInspectJoint={() =>
          requestCrossing(
            drainJointInspection(
              selected === condensate.receiver.id ? "mouth" : "cabinet",
            ),
          )
        }
      />
    );
  const captureLayoutOrigin = () => ({
    camera: captureTaskView.current?.("room") ?? null,
    inspector,
    scroll: layoutScroll.current,
  });
  const openFixtureRoster = () => {
    takeover();
    setShowFixtureRoster(true);
    setLayoutVisit(null);
    setLayoutReturning(false);
    fixtureRestore.current = null;
  };
  const rememberLayoutSelection = (
    id: string,
    roster?: NonNullable<typeof layoutVisit>["roster"],
  ) => {
    const powerCabinet = id === powerSettings.sourceId;
    if (
      !layoutVisit?.resourceList &&
      layoutVisit?.id === id &&
      layoutVisit.query === layoutQuery &&
      layoutVisit.roster?.source === roster?.source &&
      layoutVisit.roster?.query === roster?.query
    )
      return;
    setLayoutVisit({
      id,
      layer,
      metric,
      query: layoutQuery,
      origin: captureLayoutOrigin(),
      roster,
      power: powerCabinet
        ? { linkId: powerLinkId, inspection: pduInspection }
        : undefined,
    });
    setLayoutReturning(false);
    setLayoutRestore(0);
  };
  const inspectAisle = (aisle: MaintenanceAisle, scroll: number) => {
    if (!ready) return;
    const rackId = aisle.front.rackId;
    if (aisleVisit?.aisle.id !== aisle.id || aisleVisit.query !== aisleQuery)
      setAisleVisit({
        aisle,
        layer,
        metric,
        resourceQuery: query,
        filter,
        onlyAlarms,
        rackId,
        scroll,
        query: aisleQuery,
        inspector,
        camera: captureTaskView.current?.("room") ?? null,
      });
    setAisleReturn(null);
    setLayoutVisit(null);
    setNetworkMapVisit(null);
    setNetworkLinkId(null);
    control({ type: "analysis", value: false });
    pick(rackId);
    setAisleCommand({ rackId });
  };
  const openFrontDevice = (area: MaintenanceAisle["front"], id: string) => {
    if (!ready || !aisleVisit || !frontServiceInspection(area, id, false))
      return;
    setAisleVisit({ ...aisleVisit, service: undefined, frontService: area });
    if (state.level === "room") {
      setQuery("");
      setFilter("all");
      setOnlyAlarms(false);
    }
    control({ type: "locate-installation", id });
    if (state.level === "room") dispatch({ type: "door", open: true });
    control({ type: "layer", layer: "overview" });
    control({ type: "analysis", value: false });
    setInspector(true);
    if (matchMedia("(max-width: 1099px)").matches) setNav(false);
  };
  const openRearSocket = (
    aisle: MaintenanceAisle,
    id: string,
    outlet: number,
  ) => {
    const row = pduOutlet(id, outlet);
    if (
      !ready ||
      !aisleVisit ||
      !row ||
      pduById(id)?.rackId !== aisle.rear.rackId
    )
      return;
    const crossingRacks =
      state.level === "rack" &&
      rackForDevice(state.deviceId).id !== aisle.rear.rackId;
    setAisleVisit({
      ...aisleVisit,
      frontService: undefined,
      service: aisle,
      openPduOnArrival: crossingRacks ? id : undefined,
    });
    if (state.level === "room") {
      setQuery("");
      setFilter("all");
      setOnlyAlarms(false);
    }
    if (selected !== id || state.level !== "rack") focus(id);
    control({ type: "layer", layer: "power" });
    control({ type: "analysis", value: false });
    if (!crossingRacks) dispatch({ type: "rear-door", open: true });
    setPduInspection({ pduId: id, outlet, query: "", scroll: 0 });
    setPowerLinkId(row.link?.id ?? null);
  };
  useEffect(() => {
    const target = aisleVisit?.openPduOnArrival;
    if (!target || !ready) return;
    setAisleVisit(
      (visit) => visit && { ...visit, openPduOnArrival: undefined },
    );
    if (
      selected === target &&
      state.level === "rack" &&
      rackForDevice(state.deviceId).id === aisleVisit.service?.rear.rackId
    )
      dispatch({ type: "rear-door", open: true });
  }, [aisleVisit, ready, selected, state.level, state.deviceId, dispatch]);
  const returnToAisles = () => {
    if (!aisleVisit || !ready) return;
    setAisleReturning(true);
    if (state.level !== "room")
      control({ type: "open-resource", id: "room-01" });
  };
  useEffect(() => {
    if (!aisleReturning || !aisleVisit || !ready || state.level !== "room")
      return;
    setAisleCommand({ rackId: null });
    setAisleQuery(aisleVisit.query);
    setAisleReturn(aisleVisit);
    setAisleVisit(null);
    setAisleReturning(false);
    if (aisleVisit.service || aisleVisit.frontService) {
      setPduInspection(null);
      setPowerLinkId(null);
      setRackView("space");
      setSpaceMode("aisles");
      setQuery(aisleVisit.resourceQuery);
      setFilter(aisleVisit.filter);
      setOnlyAlarms(aisleVisit.onlyAlarms);
      setMetric(aisleVisit.metric);
      control({ type: "layer", layer: aisleVisit.layer });
    }
    selectObject(aisleVisit.rackId);
    control({ type: "analysis", value: false });
    setInspector(
      aisleVisit.inspector && !matchMedia("(max-width: 1099px)").matches,
    );
    skipNavigationSearch.current = !nav;
    setNav(true);
  }, [aisleReturning, aisleVisit, ready, state.level]);
  useEffect(() => {
    if (!aisleVisit || aisleReturning || !ready) return;
    if (
      aisleVisit.service &&
      pduInspection &&
      pduById(pduInspection.pduId)?.rackId === aisleVisit.service.rear.rackId &&
      pduInspectionIncludes(pduInspection, selected, state.deviceId)
    )
      return;
    if (
      aisleVisit.frontService &&
      state.level !== "room" &&
      rackForDevice(state.deviceId).id === aisleVisit.frontService.rackId &&
      (deviceById(selected)?.rackId === aisleVisit.frontService.rackId ||
        (state.level === "device" && entityById(selected)?.kind === "part"))
    )
      return;
    if (!roomAisles || !rackById(selected)) {
      setAisleVisit(null);
      setAisleCommand({ rackId: null });
    }
  }, [
    aisleVisit,
    aisleReturning,
    ready,
    roomAisles,
    state.level,
    selected,
    pduInspection,
    state.deviceId,
  ]);
  const rememberFacilityList = (id: string, scroll: number) => {
    setLayoutVisit({
      id,
      layer,
      metric,
      query: layoutQuery,
      origin: captureLayoutOrigin(),
      resourceList: { query, filter, scroll },
      power:
        id === powerSettings.sourceId
          ? { linkId: powerLinkId, inspection: pduInspection }
          : undefined,
    });
    setLayoutReturning(false);
  };
  const locateFacilityFromList = (id: string, button: HTMLButtonElement) => {
    rememberFacilityList(
      id,
      button.closest(".study-resource-list")?.scrollTop ?? 0,
    );
    setOpenRound(null);
    control({ type: "analysis", value: false });
    focus(id);
  };
  const inspectFixtureRow = (id: string) => {
    if (!ready) return;
    rememberLayoutSelection(id, {
      source: fixtureSource,
      query: fixtureQuery,
      scroll: fixtureScroll.current,
    });
    control({ type: "analysis", value: false });
    focus(id);
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
    action: "installation" | "internal" | "analysis" | "details" | "feeder",
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
                  inspection: pduInspection,
                  linkId: feederLinkId,
                  focusKey: action === "feeder" ? id : feederLinkId,
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
    if (action === "feeder") {
      focusFeederRoute.current = true;
      setFeederRestore(null);
      focus(powerSettings.sourceId);
    } else if (action === "details" || action === "analysis") {
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
    if (tool === "cover") {
      if (!options?.cover) return;
      setInspectionDevice(null);
      const open = !state.coverOpen || state.explosion > 0;
      pick(options.cover.id);
      setStructureReturn({ deviceId: state.deviceId, tool });
      if (state.explosion > 0) dispatch({ type: "explode", amount: 0 });
      dispatch({ type: "cover", open });
      return;
    }
    if (tool === "memory") {
      if (!memoryContext) return;
      setInspectionDevice(null);
      setMemoryDevice(state.deviceId);
      control({ type: "analysis", value: false });
      if (!canInspectPart(state)) dispatch({ type: "explode", amount: 0.6 });
      focus(selectedDimm?.id ?? dimms[0].id);
      return;
    }
    if (tool !== "fans" && tool !== "storage") {
      const check = pairTools.find((item) => item.tool === tool);
      if (!check) return;
      setInspectionDevice(null);
      const member = assemblyMember(check, selected);
      const startRow =
        "rear" in check &&
        (tool === "storage-power" ||
          !check.rear.supplies.some((part) => part.id === selected));
      setPairVisit({
        deviceId: state.deviceId,
        tool,
        powerBayPose: "powerBays" in check ? "seated" : undefined,
        rearRow: startRow
          ? {
              supplyId: check.pairs[0].primary.id,
              pose: "seated",
              fromPair: false,
            }
          : undefined,
      });
      control({ type: "analysis", value: false });
      // 从装配态开始时给两件留出观察间距，已有展开比例由用户掌控。
      if (!canInspectPart(state))
        dispatch({ type: "explode", amount: check.startExplosion });
      focus(member?.id ?? check.pairs[0].primary.id);
      return;
    }
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
        side: selected === assembly.duct?.id ? "duct" : "front",
        pending: true,
      });
      control({
        type: "pick",
        id: selected === assembly.duct?.id ? selected : fanId,
      });
      control({ type: "analysis", value: false });
      if (!canInspectPart(state))
        dispatch({ type: "explode", amount: assembly.duct ? 0.3 : 1 });
      setInspector(true);
      if (matchMedia("(max-width: 1099px)").matches) setNav(false);
    } else {
      const entry = storageSlotEntry(state.deviceId, selected);
      if (!entry) return;
      takeover();
      setInspectionDevice(null);
      setFanVisit(null);
      setStorageVisit({
        deviceId: state.deviceId,
        mode: entry.mode,
        diskId: entry.diskId,
        pending: true,
      });
      control({ type: "pick", id: entry.selected });
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
    setFanVisit({ ...activeFanVisit, mode: "group", shaft: undefined });
    control({ type: "analysis", value: false });
    setFanViewRevision((n) => n + 1);
    setFanFocusRevision((n) => n + 1);
  };
  const returnStorageGroup = () => {
    if (!activeStorageVisit || !ready) return;
    setInspector(true);
    if (matchMedia("(max-width: 1099px)").matches) setNav(false);
    const next = returnStorageInspection(activeStorageVisit, selected);
    setStorageVisit(next.visit);
    if (next.selected !== selected)
      control({ type: "pick", id: next.selected });
    control({ type: "analysis", value: false });
    setStorageViewRevision((n) => n + 1);
    setStorageFocusRevision((n) => n + 1);
  };
  const structureVisit = activeFanVisit ?? activeStorageVisit;
  const finishStructureCheck = () => {
    if (!ready || !(structureVisit || activePair || activeMemory)) return;
    if (inspector)
      setStructureReturn({
        deviceId: state.deviceId,
        tool: activeMemory
          ? "memory"
          : activePair && assembly
            ? assembly.tool
            : activeFanVisit
              ? "fans"
              : "storage",
      });
    else partSequenceFocus.current = "heading";
    control({ type: "analysis", value: false });
    setMemoryDevice(null);
    setPairVisit(null);
    setStorageVisit(null);
    setFanVisit(null);
    setInspectionDevice(null);
    control({ type: "finish-part-inspection" });
  };
  const showRearSupplies = () => {
    if (!rearRow || !rearLayout) return;
    returningToLayer.current = "layer";
    pick(
      rearLayout.supplies.some((part) => part.id === selected)
        ? selected
        : rearRow.supplyId,
    );
    setPairVisit((current) => current && { ...current, rearRow: undefined });
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
  const openOutletNetwork = (
    outlet: PduInspection,
    input: PowerLink,
    branchId: string,
  ) => {
    if (
      !ready ||
      !networkContextIncludes(input.deviceId, input.deviceId, branchId)
    )
      return;
    setOutletNetworkVisit({ outlet, input, branchId });
    setNetworkMapVisit(null);
    setPortCheck(null);
    setPortVisit(null);
    setPowerLinkId(null);
    control({ type: "analysis", value: false });
    control({ type: "layer", layer: "overview" });
    focus(input.deviceId, { installation: true });
    setNetworkLinkId(branchId);
    networkControlFocus.current = "branch";
  };
  const returnOutletNetwork = () => {
    if (!ready || !outletNetworkVisit) return;
    const { input, outlet } = outletNetworkVisit;
    setOutletNetworkVisit(null);
    setPendingNetworkOutlet(null);
    setNetworkLinkId(null);
    setPortCheck(null);
    setPortVisit(null);
    setPduReturning(true);
    control({ type: "analysis", value: false });
    control({ type: "layer", layer: "power" });
    focus(input.pduId);
    setPduInspection(outlet);
    setPowerLinkId(input.id);
    if (powerViewPaired) requestPowerView("observe");
  };
  const changeNetworkTrace = (id: string | null) => {
    const link = networkLinkById(id);
    if (link && !networkContextIncludes(selected, state.deviceId, id))
      pick(
        patchActive && selected === networkTrace?.target
          ? link.target
          : link.source,
      );
    setOutletNetworkVisit((current) => {
      if (!current || !link) return null;
      const previous = networkLinkById(current.branchId);
      return link.source === previous?.source ||
        networkContextIncludes(
          current.input.deviceId,
          current.input.deviceId,
          link.id,
        )
        ? { ...current, branchId: link.id }
        : null;
    });
    setNetworkLinkId(id);
    if (!id) setNetworkMapVisit(null);
  };
  const locateNetworkInput = (input: PowerLink) => {
    if (!supplyBranch || !ready) return;
    setNetworkMapVisit(
      (visit) => visit && { ...visit, powerBranchId: supplyBranch.id },
    );
    setPortCheck(null);
    setPortVisit(null);
    if (state.level !== "rack" || selected !== input.pduId) focus(input.pduId);
    control({ type: "layer", layer: "power" });
    control({ type: "analysis", value: false });
    dispatch({ type: "rear-door", open: true });
    setPowerLinkId(input.id);
    setPduInspection({
      pduId: input.pduId,
      outlet: input.outlet,
      query: "",
      scroll: 0,
    });
    setPendingNetworkOutlet(input.id);
  };
  const returnNetworkMap = () => {
    if (networkMapVisit?.powerBranchId) {
      setPowerLinkId(null);
      setPduInspection(null);
      setPendingNetworkOutlet(null);
    }
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
        if (!airflowOrigin.outlet) {
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
    if (airflowOrigin.outlet) {
      setPduInspection(airflowOrigin.outlet.inspection);
      setPowerLinkId(airflowOrigin.outlet.linkId);
      setPduReturning(true);
    }
    control({
      type: "return-airflow-origin",
      pose: airflowOrigin.pose,
      layer: airflowOrigin.layer,
      selected: airflowOrigin.selected,
      analysis: airflowOrigin.analysis,
    });
  };
  const showAirflow = (
    id: string,
    entry?: "scene" | "details",
    outlet?: OutletAirflowOrigin,
  ) => {
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
        outlet,
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
    setInspector(!rememberCloseUp || !!outlet);
    if (
      (!rememberCloseUp || outlet) &&
      matchMedia("(max-width: 1099px)").matches
    )
      setNav(false);
  };
  const openOutletAirflow = (inspection: PduInspection) => {
    if (!ready || state.level !== "rack" || selected !== inspection.pduId)
      return;
    const linked = outletAirflow(inspection.pduId, inspection.outlet);
    if (!linked) return;
    setAirflowResponse(null);
    control({ type: "analysis", value: false });
    showAirflow(linked.route.deviceId, "details", {
      inspection,
      linkId: linked.input.id,
    });
    setAirflowViewRequest({ view: "intake", deviceId: linked.route.deviceId });
  };
  const openTrayReturnBranch = (trayId: string, deviceId: string) => {
    if (!ready) return;
    if (!layoutVisit) {
      if (roomResourceList)
        rememberFacilityList(
          trayId,
          navigationRef.current?.querySelector(".study-resource-list")
            ?.scrollTop ?? 0,
        );
      else rememberLayoutSelection(trayId);
    }
    setAirflowResponse(null);
    control({ type: "analysis", value: false });
    showAirflow(deviceId);
    setAirflowViewRequest({ view: "return-tray", deviceId });
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
    setAirflowVisit(null);
    setAirflowResponse(null);
    coolingRangeRestore.current = origin.position;
    setCoolingRangeState({
      ...origin.range,
      selectedDeviceId: origin.deviceId ?? undefined,
    });
    setRackView(origin.rackView);
    setCoolingReturning(true);
    // 已选中制冷柜时仍要等这次镜头归位，避免名单恢复焦点后又被禁用。
    if (state.level === "room" && selected === coolingSource.id)
      focus(coolingSource.id);
    else pick(coolingSource.id, state.level !== "room");
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
    setFeederReference(null);
    setFeederRestore(null);
    feederScroll.current = 0;
    setPowerQuery("");
    setPowerFilter("all");
    powerScroll.current = 0;
    setPowerRestore(0);
    setPowerOverviewVisit(null);
    setOutletNetworkVisit(null);
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
    setShowFixtureRoster(false);
    setOpenRound(null);
    setFixtureQuery("");
    setFixtureSource("all");
    fixtureScroll.current = 0;
    fixtureRestore.current = null;
    setLayoutCrossing(null);
    layoutScroll.current = 0;
    setLayoutRestore(0);
    setLayoutVisit(null);
    setLayoutReturning(false);
    setSliceCheck(null);
    setPduInspection(null);
    setPduReturning(false);
    setMemoryDevice(null);
    setPairVisit(null);
    setInspectionDevice(null);
    setEnvironmentComparisonOpen(false);
    setEnvironmentPairVisit(null);
    setGrilleVisit(null);
    setGrilleReturning(false);
    setGrilleRack({});
    setProbeRackDevice(null);
    setProbeInputCheck(null);
    probeInputRestore.current = null;
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
    setSpaceMode("units");
    setAisleQuery("");
    setAisleReturning(false);
    setAisleVisit(null);
    setAisleReturn(null);
    setAisleCommand(null);
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
    setPanelInspection(null);
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
  const coolingProbeCheck = coolingVisit &&
    coolingProbe &&
    !coolingReturning &&
    state.level === "room" &&
    (atCoolingProbe ||
      (layer === "airflow" && airflowSelection === coolingProbe.device.id)) && (
      <CoolingProbeCheck
        context={coolingProbe}
        reading={spatial.readings.get(coolingProbe.device.id)!}
        time={state.time}
        active={atCoolingProbe}
        actionLabel={
          atCoolingProbe
            ? "返回 " + coolingProbe.device.name + " 气流"
            : "定位同排" + coolingProbe.probe.name
        }
        ready={ready}
        onLocate={() => {
          if (atCoolingProbe) {
            showAirflow(coolingProbe.device.id);
            return;
          }
          setCoolingVisit({
            ...coolingVisit,
            locatedEndpoint: {
              id: coolingProbe.probe.id,
              deviceId: coolingProbe.device.id,
            },
          });
          setAirflowResponse(null);
          focus(coolingProbe.probe.id);
          control({ type: "layer", layer: "overview" });
          control({ type: "analysis", value: false });
        }}
      />
    );
  function locateProbeDevice(id: string, source: "inputs" | "peak" | "height") {
    if (source !== "inputs") setProbeInputCheck(null);
    setProbeRackDevice({ id, fromHeight: source === "height" });
    if (layoutVisit?.resourceList) {
      setQuery("");
      setFilter("all");
    }
    control({ type: "analysis", value: false });
    focus(id, { installation: true });
    dispatch({ type: "door", open: true });
  }
  const openProbeAirflow = (rackId: string, id: string) => {
    if (!ready || state.level !== "room" || layer !== "overview") return;
    const linked = probeAirflowForInput(selected, rackId, id);
    if (!linked) return;
    if (!layoutVisit) {
      if (roomResourceList)
        rememberFacilityList(
          linked.probe.id,
          navigationRef.current?.querySelector(".study-resource-list")
            ?.scrollTop ?? 0,
        );
      else rememberLayoutSelection(linked.probe.id);
    }
    setProbeAirflowDevice(linked.route.deviceId);
    setAirflowResponse(null);
    control({ type: "analysis", value: false });
    showAirflow(linked.route.deviceId);
    setAirflowViewRequest({ view: "intake", deviceId: linked.route.deviceId });
  };
  const probeRackInspection =
    !coolingVisit &&
    !layoutReturning &&
    layer === "overview" &&
    (round && selected === round.probe.id ? (
      <>
        <ProbeRackInlets
          round={round}
          readings={spatial.readings}
          ready={ready}
          visitedDevice={
            !probeRackDevice?.fromHeight && rackProbe?.probe.id === selected
              ? rackProbe.device.id
              : undefined
          }
          check={probeInputCheck}
          restore={probeInputRestore}
          onCheck={setProbeInputCheck}
          onLocate={(id, fromInputs) =>
            locateProbeDevice(id, fromInputs ? "inputs" : "peak")
          }
          onAirflow={openProbeAirflow}
        />
        <ProbeElevation
          round={round}
          ready={ready}
          inspecting={crossing?.kind === "probe-height"}
          visited={
            probeRackDevice?.fromHeight && rackProbe?.probe.id === selected
              ? rackProbe.device.id
              : undefined
          }
          onLocate={(id) => locateProbeDevice(id, "height")}
          onInspect={
            state.level === "room" && !review.analysis
              ? () => requestCrossing(probeHeightScene(round.probe.id))
              : undefined
          }
        />
      </>
    ) : rackProbe &&
      (state.level === "rack" || state.level === "device") &&
      selected === rackProbe.device.id ? (
      <CoolingProbeCheck
        context={rackProbe}
        reading={spatial.readings.get(selected)!}
        time={state.time}
        active
        ready={ready}
        onSeekSample={(time) => {
          control({ type: "analysis", value: true });
          dispatch({ type: "seek", time });
        }}
        actionLabel={"返回" + rackProbe.probe.name}
        onLocate={() => {
          control({ type: "analysis", value: false });
          if (probeInputCheck) {
            setProbeInputCheck({
              rackId: rackProbe.device.rackId,
              included: currentTemperature !== null,
            });
            probeInputRestore.current = selected;
          }
          focus(rackProbe.probe.id);
        }}
      />
    ) : null);
  const probeAirflowComparison = probeAirflow && (
    <CoolingProbeCheck
      context={probeAirflow}
      reading={spatial.readings.get(probeAirflow.device.id)!}
      time={state.time}
      active={false}
      ready={ready}
    />
  );
  const currentAirflowRoute = airflow?.routes[0];
  const terminalDrainLink =
    airflowStageView === "terminals" &&
    currentAirflowRoute &&
    !airflowOrigin &&
    airflowSelection === currentAirflowRoute.deviceId &&
    coolingVisit?.deviceId === currentAirflowRoute.deviceId
      ? coolingDrainLink(currentAirflowRoute)
      : null;
  const openCoolingDrain = () => {
    if (!ready || !terminalDrainLink) return;
    setCoolingDrainVisit({ link: terminalDrainLink, revision });
    setAirflowResponse(null);
    control({ type: "analysis", value: false });
    control({ type: "layer", layer: "overview" });
    pick(terminalDrainLink.sourceId);
    requestCrossing(drainJointInspection("cabinet"));
  };
  const returnCoolingDrainAirflow = () => {
    if (!ready || !coolingVisit || !activeCoolingDrain) return;
    const { deviceId, sourceId } = activeCoolingDrain;
    setCoolingDrainVisit(null);
    control({ type: "analysis", value: false });
    showAirflow(deviceId);
    pick(sourceId);
    setCoolingVisit({
      ...coolingVisit,
      locatedEndpoint: { id: sourceId, deviceId },
    });
    setAirflowViewRequest({ view: "terminals", deviceId });
    setAirflowExplanation("summary");
  };
  const airflowInspector = airflow && (
    <AirflowDetails
      view={airflowStageView}
      snapshot={airflow}
      selected={selected}
      ready={ready}
      endpointKind={airflowEndpoint}
      onRead={setAirflowEndpoint}
      onDrain={terminalDrainLink ? openCoolingDrain : undefined}
      onTerminals={(view) => {
        const route = airflow.routes[0];
        if (!route || !ready) return;
        if (selected !== route.sourceId)
          previewAirflowEndpoint(route, route.sourceId);
        setAirflowViewRequest({ view, deviceId: route.deviceId });
      }}
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

  const roundDetails = round && !smokeVisit && (
    <EnvironmentRoundDetails
      round={round}
      hidden={!!crossing}
      selected={selected}
      time={state.time}
      open={openRound === round.row.id}
      ready={ready}
      onToggle={() =>
        setOpenRound(openRound === round.row.id ? null : round.row.id)
      }
      onLocate={focus}
      onCompare={() => requestCrossing(smokeTrayPlacement(round))}
      onSmokeMount={() => requestCrossing(smokeMountInspection(round))}
    />
  );
  const layoutReturnName = layoutVisit
    ? (layoutVisit.grille?.name ??
      layoutVisit.crossing?.name ??
      deviceById(layoutVisit.id)?.name ??
      rackById(layoutVisit.id)?.name ??
      entityById(layoutVisit.id)?.name)
    : undefined;
  const returnLayoutVisit = () => {
    if (!layoutVisit) return;
    setPanelInspection(null);
    setLayoutReturning(true);
    if (layoutVisit.id === coolingSource.id && coolingVisit) {
      setCoolingVisit(null);
      setAirflowVisit(null);
      setAirflowResponse(null);
    }
    if (layoutVisit.id === powerSettings.sourceId) {
      setPowerOverviewVisit(null);
      setFeederRestore(null);
    }
    // 先退出当前设施核对，再恢复布置图选择。
    if (
      state.level !== "room" ||
      layoutScope === "fixtures" ||
      layoutScope === "wall" ||
      !!layoutVisit.resourceList ||
      entranceView
    )
      control({ type: "open-resource", id: "room-01" });
  };
  const returnCrossing = () => {
    if (crossing?.kind === "drain-joint" && activeCoolingDrain)
      returnCoolingDrainAirflow();
    else if (crossing?.kind === "rear-wall" && layoutVisit) returnLayoutVisit();
    else requestCrossing(null);
  };
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
              {airflowOrigin.outlet
                ? `${pduName(airflowOrigin.outlet.inspection.pduId)} · 插座 ${String(airflowOrigin.outlet.inspection.outlet).padStart(2, "0")}`
                : airflowOrigin.pose.level === "rack"
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
                  onClick={returnLayoutVisit}
                >
                  ← 返回
                  {layoutVisit.resourceList
                    ? "机房名单"
                    : layoutVisit.roster
                      ? "设施名单"
                      : "布置图"}{" "}
                  · {layoutReturnName}
                </button>
                <button
                  aria-label="结束布置导览往返"
                  disabled={layoutReturning}
                  onClick={() => {
                    if (crossing?.kind === "rear-wall") requestCrossing(null);
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
        {outletNetworkActive && outletNetworkVisit && (
          <div
            className="study-task-return"
            role="group"
            aria-label="插座与网络往返"
          >
            <button disabled={!ready} onClick={returnOutletNetwork}>
              ← 返回原插座 · {pduName(outletNetworkVisit.input.pduId)} ·{" "}
              {String(outletNetworkVisit.input.outlet).padStart(2, "0")}
            </button>
            <button
              aria-label="结束插座与网络往返"
              onClick={() => setOutletNetworkVisit(null)}
            >
              ×
            </button>
          </div>
        )}
        {!outletNetworkActive &&
          !airflowOrigin?.outlet &&
          pduInspection?.outlet != null &&
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
              onClick={
                activeCoolingDrain
                  ? returnCoolingDrainAirflow
                  : returnCoolingRange
              }
            >
              {activeCoolingDrain ? (
                <>
                  ← 返回 {deviceById(activeCoolingDrain.deviceId)?.name}{" "}
                  气流端点
                </>
              ) : (
                <>
                  ← 返回服务范围 · {rackById(coolingVisit.rackId)?.name}
                  {coolingVisit.deviceId &&
                    " / " + deviceById(coolingVisit.deviceId)?.name}
                </>
              )}
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
                setOutletNetworkVisit(null);
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
        {aisleVisit && (
          <div className="study-task-return">
            <button
              disabled={!ready || aisleReturning}
              onClick={returnToAisles}
            >
              ← 返回通道名单 · {aisleVisit.aisle.front.rackName.split(" ")[0]} /{" "}
              {aisleVisit.aisle.rear.rackName.split(" ")[0]}
            </button>
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
                  {item === "room-01" &&
                  state.level !== "room" &&
                  roomSearchOrigin.current
                    ? "← 返回机房名单 · " +
                      deviceById(roomSearchOrigin.current.id)!.name
                    : (entityById(item)?.name ?? item)}
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
                      setShowFixtureRoster(false);
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
          {state.level === "room" && navigationView === "space" && (
            <div className="space-mode" role="group" aria-label="空间核查范围">
              <button
                aria-pressed={spaceMode === "units"}
                onClick={() => setSpaceMode("units")}
              >
                安装 U 位
              </button>
              <button
                aria-pressed={spaceMode === "aisles"}
                onClick={() => setSpaceMode("aisles")}
              >
                排间通道
              </button>
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
                data-range-open={showingCoolingRange}
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
              reference={feederReference}
              onReference={setFeederReference}
              onSeek={(time) => dispatch({ type: "seek", time })}
              selection={feeders}
              readings={spatial.readings}
              time={state.time}
              visible={nav}
              ready={ready}
              scroll={feederScroll}
              restoreKey={feederRestore}
              selected={
                powerOverviewVisit?.feeder ? powerOverviewVisit.id : selected
              }
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
              onTrace={(link, fromName) => {
                inspectPowerOverview(
                  link.deviceId,
                  fromName ? "feeder" : "installation",
                  link.id,
                );
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
          ) : state.level === "room" &&
            navigationView === "layout" &&
            showFixtureRoster ? (
            <FixtureRoster
              source={fixtureSource}
              query={fixtureQuery}
              time={state.time}
              selected={selected}
              visible={nav}
              ready={ready}
              restore={fixtureRestore}
              scroll={fixtureScroll}
              onQuery={setFixtureQuery}
              onSource={setFixtureSource}
              onInspect={inspectFixtureRow}
              onMap={() => {
                setShowFixtureRoster(false);
                setLayoutVisit(null);
                setLayoutReturning(false);
                setLayoutRestore(0);
              }}
            />
          ) : state.level === "room" && navigationView === "layout" ? (
            <RoomLayout
              selected={selected}
              deviceId={state.deviceId}
              query={layoutQuery}
              scope={layoutScope}
              onOpenFixtureRoster={openFixtureRoster}
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
              onInspectWall={(origin, target) => {
                rememberLayoutSelection(origin);
                focus(target);
              }}
              onCompareWall={(id) => {
                const pair = rearWallCrossing(id);
                if (!pair || !ready) return;
                if (crossing?.kind !== "rear-wall") rememberLayoutSelection(id);
                pick(id);
                control({ type: "analysis", value: false });
                requestCrossing(pair);
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
                if (
                  layoutVisit?.crossing?.id !== id ||
                  layoutVisit.query !== layoutQuery
                )
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
                if (crossing?.kind === "rear-wall") requestCrossing(null);
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
          ) : roomAisles ? (
            <MaintenanceAisles
              query={aisleQuery}
              onQuery={setAisleQuery}
              selected={selected}
              ready={ready}
              visible={nav}
              restore={aisleReturn}
              onRestored={() => setAisleReturn(null)}
              onInspect={inspectAisle}
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
                                    : isLeakFixture(row.id) ||
                                        isCoolingSource(row.id) ||
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
                              onClick={(event) => {
                                if (
                                  roomResourceList &&
                                  (patchPanelById(row.id) ||
                                    racewayById(row.id) ||
                                    isCondensate(row.id) ||
                                    grilleRowById(row.id) ||
                                    trayRow(row.id) ||
                                    entranceViewIncludes(row.id) ||
                                    environmentRoundFor(row.id) ||
                                    fixtureById(row.id)?.kind ===
                                      "ceiling-light" ||
                                    isLeakFixture(row.id) ||
                                    isCoolingSource(row.id) ||
                                    row.id === powerSettings.sourceId)
                                ) {
                                  locateFacilityFromList(
                                    row.id,
                                    event.currentTarget,
                                  );
                                } else if (unitQuery) {
                                  focus(row.id, {
                                    installation: true,
                                    showDetails: false,
                                  });
                                } else if (locateOnly) {
                                  selectObject(row.id, true);
                                } else {
                                  focus(row.id, { showDetails: false });
                                }
                              }}
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
              registerReturn ||
              aisleReturn ||
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
            fanViewSide={
              activeFanVisit?.side === "duct"
                ? "iso"
                : (activeFanVisit?.side ?? "front")
            }
            storageViewRevision={storageViewRevision}
            storageBoardDisk={
              activeStorageVisit?.mode === "board"
                ? activeStorageVisit.diskId
                : undefined
            }
            compactStoragePose={
              station
                ? station.id !== "mount"
                  ? "installed"
                  : pathVisit?.pose === "separated"
                    ? "mount-raised"
                    : "mount-seated"
                : undefined
            }
            layerPose={
              fanShaft
                ? fanShaft.open
                  ? "separated"
                  : "seated"
                : pathContact
                  ? pathVisit?.pose
                  : activeStorageVisit?.mode === "tray"
                    ? "separated"
                    : activeStorageVisit?.mode === "disk"
                      ? "seated"
                      : layerPose
            }
            layerScopeId={
              rearMount && layerPose
                ? "rear-seat"
                : fanShaft
                  ? fanShaft.stage + ":" + fanShaft.rotor
                  : (activeStorageVisit?.mode === "tray" ||
                        activeStorageVisit?.mode === "disk") &&
                      activeStorageVisit.trayStage !== "drive"
                    ? activeStorageVisit.trayStage
                    : processorInspection && layerPose && activePair
                      ? processorStage + ":" + activePair.primary.id
                      : contactFan && fanStage
                        ? fanStage.id + ":" + contactFan.id
                        : pathContact
                          ? station.id
                          : layerPose &&
                              (assembly?.tool === "switch-front" ||
                                stagedLayer ||
                                controllerInspection)
                            ? pairVisit?.layer?.scopeId
                            : undefined
            }
            dimmPose={dimmPose}
            rearRowPose={
              activePair && !layerPose
                ? (powerBayPose ?? rearRow?.pose)
                : undefined
            }
            storageContact={activeStorageVisit?.mode === "contact"}
            storageConnectorPose={
              activeStorageVisit?.mode === "contact"
                ? activeStorageVisit.connectorPose
                : undefined
            }
            companionPartIds={companionPartIds}
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
            airflowViewRequest={airflowViewRequest}
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
            initialPduMount={initialPduMount}
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
            aisleCommand={aisleCommand}
            aisleRosterVisible={roomAisles && nav}
            onReturnToAisles={aisleVisit ? returnToAisles : undefined}
            frontService={review.pendingId ? null : frontService}
            rearService={rearService}
            maintenanceView={maintenanceView}
            grilleSweep={grilleSweep}
            doorReference={doorReference}
            doorGap={doorGap}
            onMaintenanceViewChange={setMaintenanceView}
            entranceView={entranceView}
            entranceViewCommand={entranceViewCommand}
            onEntranceViewChange={setEntranceView}
            onEntranceView={showEntranceView}
            leakView={leakView}
            panelPort={panelPort}
            onInspectPanelPort={inspectPanelPort}
            leakViewCommand={leakViewCommand}
            onLeakViewChange={setLeakView}
            onLeakView={requestLeakView}
            crossing={crossing}
            crossingCommand={crossingCommand}
            onCrossingChange={setCrossing}
            onReturnCrossing={returnCrossing}
            onPowerViewChange={setPowerViewActive}
            onPowerView={requestPowerView}
            networkViewCommand={networkViewCommand}
            networkView={networkView}
            onNetworkViewChange={setNetworkView}
            onNetworkView={requestNetworkView}
            onGuideBranch={(id, guide) => {
              setPortCheck(null);
              changeNetworkTrace(id);
              requestNetworkView(guide);
            }}
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
              !airflowOrigin.outlet &&
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
              ) : activeMemory ? (
                <StructureToolbar
                  label={dimmPose ? "内存槽位核查" : "内存组核查"}
                  state={state}
                  dispatch={dispatchStructure}
                  disabled={!ready}
                  destination={dimmPose ? "内存组" : "完整结构"}
                  onBack={
                    dimmPose
                      ? () => {
                          returningToLayer.current = "layer";
                          setSocketPose(undefined);
                        }
                      : finishStructureCheck
                  }
                >
                  <div className="structure-check-scope assembly-layer-scope">
                    <select
                      aria-label="内存条编号"
                      disabled={!ready}
                      value={selected}
                      onChange={(event) => pick(event.target.value)}
                    >
                      {!dimmPose && <option value="memory-01">整组内存</option>}
                      {dimms.map((dimm) => (
                        <option key={dimm.id} value={dimm.id}>
                          {dimm.slot}
                        </option>
                      ))}
                    </select>
                    {dimmPose ? (
                      <button
                        disabled={!ready}
                        autoFocus
                        onClick={() =>
                          setSocketPose(
                            dimmPose === "separated" ? "seated" : "separated",
                          )
                        }
                      >
                        {dimmPose === "separated" ? "放回插槽" : "抬起内存条"}
                      </button>
                    ) : (
                      selectedDimm && (
                        <button
                          ref={layerEntry}
                          disabled={!ready}
                          onClick={() => setSocketPose("separated")}
                        >
                          核对插槽
                        </button>
                      )
                    )}
                  </div>
                </StructureToolbar>
              ) : station && pathVisit ? (
                <StructureToolbar
                  label="存储通路核查"
                  state={state}
                  dispatch={dispatchStructure}
                  disabled={!ready}
                  destination={assembly!.name}
                  onBack={() => {
                    returningToLayer.current = "path";
                    setPairVisit(
                      (current) =>
                        current && { ...current, storagePath: undefined },
                    );
                    pick(pathVisit.origin);
                  }}
                >
                  <div className="structure-check-scope assembly-layer-scope">
                    <select
                      aria-label="通路位置"
                      value={station.id}
                      disabled={!ready}
                      autoFocus
                      onChange={(event) => {
                        const next = storageStations.find(
                          (item) => item.id === event.target.value,
                        )!;
                        setPairVisit(
                          (current) =>
                            current && {
                              ...current,
                              storagePath: { ...pathVisit, stationId: next.id },
                            },
                        );
                        pick(next.members[0]);
                      }}
                    >
                      {storageStations.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    {station.members.length > 1 && (
                      <select
                        aria-label="通路部件"
                        value={selected}
                        disabled={!ready}
                        onChange={(event) => pick(event.target.value)}
                      >
                        {station.members.map((id) => (
                          <option key={id} value={id}>
                            {entityById(id)?.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {station.id !== "route" && (
                      <button
                        disabled={!ready}
                        onClick={() =>
                          setPairVisit(
                            (current) =>
                              current && {
                                ...current,
                                storagePath: {
                                  ...pathVisit,
                                  pose:
                                    pathVisit.pose === "seated"
                                      ? "separated"
                                      : "seated",
                                },
                              },
                          )
                        }
                      >
                        {station.actions?.[pathVisit.pose] ??
                          (pathVisit.pose === "seated"
                            ? "分开接头"
                            : "接合复位")}
                      </button>
                    )}
                  </div>
                </StructureToolbar>
              ) : layerPose && selectedLayer && assembly ? (
                <StructureToolbar
                  label={selectedLayer.label + "核查"}
                  state={state}
                  dispatch={dispatchStructure}
                  disabled={!ready}
                  destination={rearRow ? "机后排布" : assembly.name}
                  onBack={() => {
                    returningToLayer.current = "layer";
                    if (processorBoardSlot && activePair)
                      pick(activePair.primary.id);
                    if (contactFan && selected !== contactFan.id)
                      pick(contactFan.id);
                    setLayerPose();
                  }}
                >
                  <div
                    className="structure-check-scope assembly-layer-scope"
                    role="group"
                    aria-label={
                      cageSelection?.insert
                        ? "笼内承片姿态"
                        : selectedLayer.scope
                    }
                  >
                    {cageSelection && (
                      <FrontCageControls
                        selection={cageSelection}
                        onChange={setLayerScope}
                        disabled={!ready}
                      />
                    )}
                    {powerBayPose && activePair && (
                      <select
                        aria-label="核查电源"
                        disabled={!ready}
                        value={selected}
                        onChange={(e) => pick(e.target.value)}
                      >
                        {[activePair.primary, activePair.companion].map(
                          (p, i) => (
                            <option key={p.id} value={p.id}>
                              {assembly.labels[i]} · {p.slot}
                            </option>
                          ),
                        )}
                      </select>
                    )}
                    {rearLayout &&
                      (stagedLayer ||
                        (rearLayer && "fanContacts" in rearLayer)) && (
                        <select
                          aria-label={
                            inspectingSupply ? "核查电源" : "核查风扇"
                          }
                          disabled={!ready}
                          value={contactFan?.id ?? selected}
                          onChange={(event) => {
                            const id = event.target.value;
                            if (fanStage?.boardOnly)
                              setPairVisit(
                                (current) =>
                                  current && {
                                    ...current,
                                    fanContact: {
                                      view: fanStage.id,
                                      fanId: id,
                                    },
                                  },
                              );
                            else pick(id);
                          }}
                        >
                          {(inspectingSupply
                            ? rearLayout.supplies
                            : rearLayout.fans
                          ).map((part) => (
                            <option key={part.id} value={part.id}>
                              {part.slot}
                            </option>
                          ))}
                        </select>
                      )}
                    {(assembly.tool === "compact-drive" ||
                      assembly.tool === "drive-tray") &&
                      activePair && (
                        <select
                          aria-label="核查硬盘"
                          disabled={!ready}
                          value={selected}
                          onChange={(event) => pick(event.target.value)}
                        >
                          {assembly.pairs.map(({ companion }) => (
                            <option key={companion.id} value={companion.id}>
                              {companion.slot}
                            </option>
                          ))}
                        </select>
                      )}
                    {stagedLayer && (
                      <select
                        aria-label={stagedLayer.stageLabel}
                        disabled={!ready}
                        value={stage?.id ?? ""}
                        onChange={(event) => {
                          const next = event.target.value || undefined;
                          if (
                            assembly.tool === "switch-board" &&
                            activePair &&
                            !isAsicBoardStage(next) &&
                            selected !== activePair.companion.id
                          )
                            pick(activePair.companion.id);
                          setLayerScope(next);
                        }}
                      >
                        {stagedLayer.stages.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {rearLayer && "fanContacts" in rearLayer && (
                      <select
                        aria-label="风扇核查位置"
                        disabled={!ready}
                        value={fanStage?.id ?? "rotor"}
                        onChange={(event) => {
                          const next = fanContactStages.find(
                            (stage) => stage.id === event.target.value,
                          );
                          const fanId = contactFan?.id ?? selected;
                          const owner = next?.boardOnly ? "net-board" : fanId;
                          if (selected !== owner) pick(owner);
                          setPairVisit((current) =>
                            current?.layer
                              ? {
                                  ...current,
                                  layer: { ...current.layer, pose: "seated" },
                                  fanContact: next
                                    ? { view: next.id, fanId }
                                    : undefined,
                                }
                              : current,
                          );
                        }}
                      >
                        <option value="rotor">叶轮与轴座</option>
                        {fanContactStages.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {processorInspection && activePair && (
                      <>
                        <select
                          aria-label="核查处理器槽位"
                          disabled={!ready}
                          value={activePair.primary.id}
                          onChange={(event) => {
                            const next = assembly.pairs.find(
                              (pair) => pair.primary.id === event.target.value,
                            );
                            if (next)
                              pick(
                                selected === activePair.companion.id
                                  ? next.companion.id
                                  : next.primary.id,
                              );
                          }}
                        >
                          {assembly.pairs.map((pair) => (
                            <option
                              key={pair.primary.id}
                              value={pair.primary.id}
                            >
                              {pair.primary.slot}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label="处理器核查位置"
                          disabled={!ready}
                          value={processorStage}
                          onChange={(event) => {
                            const stage = event.target.value;
                            pick(
                              stage === "processor-sink"
                                ? activePair.companion.id
                                : activePair.primary.id,
                            );
                            setLayerScope(stage);
                          }}
                        >
                          <option value="processor-seat">封装与座框</option>
                          <option value="processor-sink">散热器接触面</option>
                        </select>
                      </>
                    )}
                    {controllerInspection && activePair && (
                      <>
                        <select
                          aria-label="核查控制器"
                          disabled={!ready}
                          value={selected}
                          onChange={(event) => pick(event.target.value)}
                        >
                          {(
                            rearLayout?.controllers ?? [
                              activePair.primary,
                              activePair.companion,
                            ]
                          ).map((part) => (
                            <option key={part.id} value={part.id}>
                              {part.slot}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label="控制器核查位置"
                          disabled={!ready}
                          value={pairVisit?.layer?.scopeId ?? ""}
                          onChange={(event) =>
                            setLayerScope(event.target.value || undefined)
                          }
                        >
                          <option value="">板卡与托盘</option>
                          <optgroup label="机后所见 · 板角与支柱">
                            {storageAssembly.controllerMount.corners.map(
                              (corner) => (
                                <option key={corner.id} value={corner.id}>
                                  {corner.label}
                                </option>
                              ),
                            )}
                          </optgroup>
                          {portOptions.map(({ port, stages }) => (
                            <optgroup key={port.port} label={port.name}>
                              {stages.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {port.name} · {item.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                          <option value="controller-cooler">
                            芯片与散热器
                          </option>
                        </select>
                      </>
                    )}
                    {(["seated", "separated"] as const).map((pose) => (
                      <button
                        key={pose}
                        disabled={!ready}
                        aria-pressed={pose === layerPose}
                        autoFocus={pose === "separated"}
                        onClick={() => setLayerPose(pose)}
                      >
                        {processorInspection &&
                        processorStage === "processor-sink"
                          ? pose === "seated"
                            ? "贴合封装"
                            : "抬起散热器"
                          : inspectingCooler
                            ? pose === "seated"
                              ? "贴合芯片"
                              : "抬起散热器"
                            : fanStage
                              ? fanStage[pose]
                              : cageSelection?.insert
                                ? pose === "seated"
                                  ? "推回承片"
                                  : "抽出承片"
                                : (portStage ?? stage ?? selectedLayer)[pose]}
                      </button>
                    ))}
                  </div>
                </StructureToolbar>
              ) : rearRow && activePair ? (
                <StructureToolbar
                  label="机后排布核查"
                  state={state}
                  dispatch={dispatchStructure}
                  disabled={!ready}
                  destination={rearRow.fromPair ? "双电源" : "完整结构"}
                  onBack={
                    rearRow.fromPair ? showRearSupplies : finishStructureCheck
                  }
                  menuActions={
                    !rearRow.fromPair && (
                      <button disabled={!ready} onClick={showRearSupplies}>
                        只看双电源
                      </button>
                    )
                  }
                >
                  <div className="structure-check-scope assembly-layer-scope">
                    <select
                      aria-label="机后模块"
                      value={selected}
                      disabled={!ready}
                      autoFocus
                      onChange={(event) => pick(event.target.value)}
                    >
                      {rearLayout.members.map((part) => (
                        <option key={part.id} value={part.id}>
                          {part.slot}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={!ready}
                      onClick={() =>
                        setPairVisit((current) =>
                          current?.rearRow
                            ? {
                                ...current,
                                rearRow: {
                                  ...current.rearRow,
                                  pose:
                                    current.rearRow.pose === "seated"
                                      ? "withdrawn"
                                      : "seated",
                                },
                              }
                            : current,
                        )
                      }
                    >
                      {rearRow.pose === "seated" ? "抽出模块" : "放回槽位"}
                    </button>
                    {rearLayer && (
                      <button
                        ref={layerEntry}
                        disabled={!ready}
                        onClick={() => setLayerPose("separated")}
                      >
                        {rearLayer.entry}
                      </button>
                    )}
                  </div>
                </StructureToolbar>
              ) : activePair && assembly ? (
                <StructureToolbar
                  label={assembly.name + "核查"}
                  state={state}
                  dispatch={dispatchStructure}
                  disabled={!ready}
                  destination="完整结构"
                  onBack={finishStructureCheck}
                >
                  <div
                    className={
                      selectedLayer || rearLayout || powerBayPose
                        ? "structure-check-scope assembly-layer-scope"
                        : "structure-check-scope"
                    }
                  >
                    {"slotLabel" in assembly && (
                      <select
                        aria-label={assembly.slotLabel}
                        value={activePair.primary.id}
                        disabled={!ready}
                        onChange={(event) => {
                          const next = assembly.pairs.find(
                            (pair) => pair.primary.id === event.target.value,
                          );
                          if (next)
                            pick(
                              selected === activePair.companion.id
                                ? next.companion.id
                                : next.primary.id,
                            );
                        }}
                      >
                        {assembly.pairs.map(({ primary }) => (
                          <option key={primary.id} value={primary.id}>
                            {primary.slot}
                          </option>
                        ))}
                      </select>
                    )}
                    {"additionalParts" in assembly ? (
                      <select
                        aria-label={assembly.memberLabel}
                        value={selected}
                        disabled={!ready}
                        onChange={(event) => pick(event.target.value)}
                      >
                        {[
                          activePair.primary,
                          activePair.companion,
                          ...assembly.additionalParts,
                        ].map((part) => (
                          <option key={part.id} value={part.id}>
                            {part.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div
                        role="group"
                        aria-label={assembly.name + "部件"}
                        className="fan-view-sides"
                      >
                        {[activePair.primary, activePair.companion].map(
                          (part, index) => (
                            <button
                              key={part.id}
                              disabled={!ready}
                              aria-label={
                                assembly.tool === "server-power"
                                  ? assembly.labels[index] + " · " + part.name
                                  : part.name
                              }
                              aria-pressed={selected === part.id}
                              onClick={() => pick(part.id)}
                            >
                              {assembly.labels[index]}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                    {(compactServer || deviceModel.storageHarness) &&
                      [
                        "storage-harness",
                        "compact-drive",
                        "drive-tray",
                        "controller-mount",
                      ].includes(assembly.tool) && (
                        <button
                          ref={pathEntry}
                          disabled={!ready}
                          onClick={() => {
                            const start =
                              assembly.tool === "compact-drive" ||
                              assembly.tool === "drive-tray"
                                ? activePair.companion.id
                                : assembly.tool === "controller-mount"
                                  ? "controller-plug"
                                  : "route";
                            const next = storageStations.find(
                              (item) => item.id === start,
                            )!;
                            if (!next.members.includes(selected))
                              pick(next.members[0]);
                            setPairVisit(
                              (current) =>
                                current && {
                                  ...current,
                                  storagePath: {
                                    origin: selected,
                                    stationId: start,
                                    pose: "separated",
                                  },
                                },
                            );
                          }}
                        >
                          核对存储通路
                        </button>
                      )}
                    {powerBayPose && (
                      <button
                        disabled={!ready}
                        onClick={() =>
                          setPairVisit(
                            (current) =>
                              current && {
                                ...current,
                                powerBayPose:
                                  current.powerBayPose === "seated"
                                    ? "withdrawn"
                                    : "seated",
                              },
                          )
                        }
                      >
                        {powerBayPose === "seated" ? "抽出电源" : "推回槽位"}
                      </button>
                    )}
                    {rearLayout && (
                      <button
                        ref={layerEntry}
                        disabled={!ready}
                        onClick={() =>
                          setPairVisit(
                            (current) =>
                              current && {
                                ...current,
                                rearRow: {
                                  supplyId: selected,
                                  pose: "seated",
                                  fromPair: true,
                                },
                              },
                          )
                        }
                      >
                        查看机后排布
                      </button>
                    )}
                    {selectedLayer && (
                      <button
                        ref={layerEntry}
                        disabled={!ready}
                        onClick={() => {
                          setLayerPose(
                            powerBayPose === "seated" ? "seated" : "separated",
                          );
                          if (powerBayPose) setLayerScope("bay-contact");
                          if (
                            assembly.tool === "switch-board" &&
                            selected === activePair.primary.id
                          )
                            setLayerScope("asic-lands");
                          if (processorInspection)
                            setLayerScope(
                              selected === activePair.companion.id
                                ? "processor-sink"
                                : "processor-seat",
                            );
                        }}
                      >
                        {rearMount
                          ? "核对安装位"
                          : processorInspection
                            ? "核对安装面"
                            : powerBayPose
                              ? "核对电源接合"
                              : "分层查看"}
                      </button>
                    )}
                  </div>
                </StructureToolbar>
              ) : structureVisit ? (
                <StructureNavigation
                  visit={structureVisit}
                  state={state}
                  analysis={review.analysis}
                  ready={ready}
                  dispatch={dispatchStructure}
                  onFront={() => {
                    takeover();
                    setStorageViewRevision((n) => n + 1);
                  }}
                  onTrayStage={(trayStage) => {
                    if (!ready || !activeStorageVisit) return;
                    setStorageVisit({
                      ...activeStorageVisit,
                      mode: "disk",
                      trayStage,
                    });
                    setStorageViewRevision((n) => n + 1);
                  }}
                  onToggleDrive={() => {
                    if (!ready || !activeStorageVisit) return;
                    if (activeStorageVisit.mode === "contact") {
                      if (!activeStorageVisit.connectorPose)
                        setStorageViewRevision((n) => n + 1);
                      setStorageVisit({
                        ...activeStorageVisit,
                        connectorPose:
                          activeStorageVisit.connectorPose === "separated"
                            ? "seated"
                            : "separated",
                      });
                      return;
                    }
                    setStorageVisit({
                      ...activeStorageVisit,
                      mode:
                        activeStorageVisit.mode === "disk" ? "tray" : "disk",
                    });
                  }}
                  onGroup={activeFanVisit ? returnFanGroup : returnStorageGroup}
                  onFinish={finishStructureCheck}
                  onShaft={(shaft) => {
                    if (activeFanVisit && ready)
                      setFanVisit({ ...activeFanVisit, shaft });
                  }}
                  onSide={(side) => {
                    if (!activeFanVisit || !ready) return;
                    takeover();
                    if (side === "duct" && fanDuct) pick(fanDuct.id);
                    else if (selected === fanDuct?.id)
                      pick(activeFanVisit.fanId);
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
                  dispatch={dispatchStructure}
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
                  onDeviceStructure={(action) => {
                    partSequenceFocus.current = "isolate";
                    dispatch(action);
                  }}
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
                    : compactBayContext && !review.analysis
                      ? `bays:${state.deviceId}`
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
                      "— 仅布置 · " +
                      (fixtureRoster.find((row) => row.fixture.id === selected)
                        ?.signal ?? "未接入数据")
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
            {supplyBranch && !review.analysis && state.level !== "device" && (
              <NetworkPowerInputs
                branch={supplyBranch}
                activeInput={inspectingNetworkPower ? activePowerLink : null}
                ready={ready}
                onLocate={locateNetworkInput}
              />
            )}
            {activeFanVisit && !review.analysis && (
              <FanInspection
                deviceId={state.deviceId}
                visit={activeFanVisit}
                selected={selected}
                ready={ready}
                focusRevision={fanFocusRevision}
                onSelect={(id) => {
                  setFanFocusRevision((n) => n + 1);
                  pick(id);
                }}
                onInspect={(id) => {
                  if (!activeFanVisit || !ready) return;
                  setFanFocusRevision((n) => n + 1);
                  setFanVisit({
                    ...activeFanVisit,
                    mode: "single",
                    fanId: id,
                    shaft: undefined,
                  });
                  pick(id);
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
                    trayStage: undefined,
                    diskId: id,
                  });
                  setStorageViewRevision((n) => n + 1);
                  pick(id);
                }}
                onContact={(id) => {
                  if (!activeStorageVisit || !ready) return;
                  takeover();
                  setStorageFocusRevision((n) => n + 1);
                  setStorageVisit({
                    ...activeStorageVisit,
                    mode: "contact",
                    connectorPose: undefined,
                    diskId: id,
                  });
                  pick(id);
                  setStorageViewRevision((n) => n + 1);
                }}
                onBoard={() => {
                  takeover();
                  setStorageVisit({ ...activeStorageVisit, mode: "board" });
                  pick(activeStorageVisit.diskId ?? "sto-midplane");
                  setStorageViewRevision((n) => n + 1);
                  setStorageFocusRevision((n) => n + 1);
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
            {frontService && !review.analysis && (
              <FrontServiceDetails
                inspection={frontService}
                doorSelection={aisleVisit?.doorSelection}
                onDoorSelection={(doorSelection) =>
                  setAisleVisit((visit) => visit && { ...visit, doorSelection })
                }
                onLocatePdu={(aisle, id) => openRearSocket(aisle, id, 1)}
                onView={(frontView) =>
                  setAisleVisit((visit) => visit && { ...visit, frontView })
                }
                ready={ready}
                trayAvailable={
                  !state.trayExtended || state.deviceId === selected
                }
                doorOpen={state.doorOpen}
                onSelect={(id) => openFrontDevice(frontService.area, id)}
                onOpenDoor={() => dispatch({ type: "door", open: true })}
                onExtract={() =>
                  control({ type: "extract-resource", id: selected })
                }
              />
            )}
            {rearService && aisleVisit?.service && !review.analysis && (
              <RearServiceDetails
                inspection={rearService}
                ready={ready}
                showSweep={state.rearDoorOpen && !powerViewActive}
                onSelect={(id, outlet) =>
                  openRearSocket(aisleVisit.service!, id, outlet)
                }
                onInspect={(link) =>
                  control({ type: "inspect-power-input", linkId: link.id })
                }
              />
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
                {shownFront &&
                  firstFrontDevice &&
                  (maintenanceView.view === "front" ||
                    (maintenanceView.view === "aisle" &&
                      !maintenanceView.overlap)) && (
                    <button
                      disabled={!ready}
                      onClick={() =>
                        openFrontDevice(shownFront, firstFrontDevice.id)
                      }
                    >
                      核对 {shownFront.rackName.split(" ")[0]} 柜前设备行程 ↗
                    </button>
                  )}
                {maintenanceView.aisle && (
                  <p>
                    柜面间距 {maintenanceView.aisle.faceDistance.toFixed(2)} m ·{" "}
                    {reserveGapText(maintenanceView.aisle.gap)}
                  </p>
                )}
                {maintenanceView.sweeps && maintenanceView.aisle && doorGap && (
                  <AisleDoorDetails
                    sweeps={maintenanceView.sweeps}
                    position={doorReference}
                    gap={doorGap}
                    onPosition={setDoorReference}
                    onSide={setRearLeafSide}
                    ready={ready}
                    onOpenPdu={
                      aisleVisit
                        ? (id) => openRearSocket(maintenanceView.aisle!, id, 1)
                        : undefined
                    }
                  />
                )}
                {maintenanceView.aisle && !maintenanceView.sweeps && (
                  <label className="aisle-grille-check">
                    {maintenanceView.aisle.front.rackName.split(" ")[0]}{" "}
                    柜前格栅
                    <select
                      aria-label="核对柜前格栅"
                      disabled={!ready}
                      value={maintenanceView.overlap?.grille.id ?? ""}
                      onChange={(e) =>
                        setAisleCommand({
                          rackId: selected,
                          grilleId: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        整组通道 · {maintenanceView.grilles.length} 块相交
                      </option>
                      {maintenanceView.grilles.map(
                        ({ grille, name, contained }) => (
                          <option key={grille.id} value={grille.id}>
                            {name} · {contained ? "完全在内" : "部分相交"}
                          </option>
                        ),
                      )}
                    </select>
                    {maintenanceView.overlap && !grilleSweep && (
                      <span>
                        高亮面为面框落在柜前预留内的部分，宽{" "}
                        {maintenanceView.overlap.overlapWidth.toFixed(2)} m × 深{" "}
                        {maintenanceView.overlap.overlapDepth.toFixed(2)}{" "}
                        m。格栅无独立风量采样。
                      </span>
                    )}
                  </label>
                )}
                {maintenanceView.overlap && maintenanceView.aisle && (
                  <div className="aisle-door-check">
                    <label>
                      柜前门扇与格栅
                      <select
                        disabled={!ready}
                        value={grilleDoorReference ?? ""}
                        onChange={(e) =>
                          setGrilleDoorReference(
                            e.target.value === "open"
                              ? "open"
                              : e.target.value === "peak"
                                ? "peak"
                                : null,
                          )
                        }
                      >
                        <option value="">只看维护预留</option>
                        <option value="peak">从闭合扫至最大进深</option>
                        <option value="open">从闭合扫至配置全开</option>
                      </select>
                    </label>
                    {grilleSweep && (
                      <p aria-live="polite">
                        <b>
                          {maintenanceView.aisle.front.rackName.split(" ")[0]}{" "}
                          前门 · 0–{grilleSweep.angle}°
                        </b>
                        <br />
                        {grilleSweep.area
                          ? `扫过面框约 ${(grilleSweep.area * 10000).toFixed(1)} cm²，橙色为重叠部分。`
                          : "扫掠与所选面框没有面积重叠。"}
                        面积按门扇地面投影估算，未计门厚、安装高差及实际净距。
                      </p>
                    )}
                  </div>
                )}
                <p>
                  地面轮廓仅表示配置预留，不是实测净距、人员作业条件或通行结论。未包含全部建筑障碍物。
                </p>
              </section>
            )}
            {!review.analysis && !environment && roundDetails}
            {isSmokeFixture(selected) && !smokeVisit && !crossing && (
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
            {!crossing &&
              !review.analysis &&
              state.level === "room" &&
              layer === "overview" &&
              layoutVisit?.crossing &&
              (selected === layoutVisit.crossing.lightId ||
                selected === layoutVisit.crossing.trayId ||
                trayRelations(layoutVisit.crossing.trayId).some(
                  (r) => r.id === selected,
                )) && (
                <div className="lighting-resume">
                  <button
                    disabled={!ready}
                    onClick={() => {
                      const origin = layoutVisit.crossing!;
                      pick(origin.lightId);
                      requestCrossing(
                        fixtureCrossing(origin.lightId, origin.trayId),
                      );
                    }}
                  >
                    核对{layoutVisit.crossing.name} ↗
                  </button>
                </div>
              )}
            {crossing &&
              !(
                review.analysis &&
                (crossing.kind === "grille-seat" ||
                  crossing.kind === "grille-intake" ||
                  crossing.kind === "smoke-mount" ||
                  crossing.kind === "tray-bay" ||
                  crossing.kind === "light-hanger" ||
                  crossing.kind === "probe-height" ||
                  crossing.kind === "probe-mount" ||
                  crossing.kind === "raceway-corner" ||
                  crossing.kind === "raceway-axis" ||
                  crossing.kind === "light-rod" ||
                  crossing.kind === "tray-support" ||
                  crossing.kind === "tray-mount" ||
                  crossing.kind === "lighting-round" ||
                  crossing.kind === "roof-entry" ||
                  crossing.kind === "roof-pdu" ||
                  crossing.kind === "drain-joint" ||
                  crossing.kind === "rear-wall")
              ) && (
                <section
                  className="crossing-details"
                  aria-label={crossing.title}
                  tabIndex={-1}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && ready) {
                      event.preventDefault();
                      event.stopPropagation();
                      returnCrossing();
                    }
                  }}
                >
                  <strong>{crossing.title} · 配置</strong>
                  {crossing.kind === "smoke-tray" && !review.analysis && (
                    <label className="smoke-tray-reference">
                      量取基准
                      <select
                        disabled={!ready}
                        value={crossing.reference}
                        onChange={(event) =>
                          requestCrossing(
                            smokeTrayPlacement(
                              crossing.round,
                              event.target.value === "edges" ? "edges" : "axis",
                            ),
                          )
                        }
                      >
                        <option value="axis">中心与轴线</option>
                        <option value="edges">圆壳与近侧梁</option>
                      </select>
                    </label>
                  )}
                  {crossing.kind !== "grille-seat" &&
                    crossing.kind !== "grille-intake" &&
                    crossing.kind !== "smoke-mount" &&
                    crossing.kind !== "lighting-round" &&
                    crossing.kind !== "tray-support" &&
                    crossing.kind !== "tray-mount" &&
                    crossing.kind !== "tray-bay" &&
                    crossing.kind !== "light-hanger" &&
                    crossing.kind !== "probe-height" &&
                    crossing.kind !== "probe-mount" &&
                    crossing.kind !== "raceway-corner" &&
                    crossing.kind !== "raceway-axis" &&
                    crossing.kind !== "light-rod" &&
                    crossing.kind !== "roof-entry" &&
                    crossing.kind !== "roof-pdu" &&
                    crossing.kind !== "drain-joint" &&
                    crossing.kind !== "rear-wall" && (
                      <>
                        <div>
                          <button onClick={() => pick(crossing.upper.id)}>
                            ① {crossing.upper.name}
                          </button>
                          <span>
                            {crossing.upper.surface}{" "}
                            {crossing.points[0].y.toFixed(
                              smokeTrayEdges ? 4 : 3,
                            )}{" "}
                            m
                          </span>
                        </div>
                        <div>
                          <button onClick={() => pick(crossing.lower.id)}>
                            ② {crossing.lower.name}
                          </button>
                          <span>
                            {crossing.lower.surface}{" "}
                            {crossing.points[1].y.toFixed(
                              smokeTrayEdges ? 4 : 3,
                            )}{" "}
                            m
                          </span>
                        </div>
                        <p>
                          {crossing.upper.surface}比{crossing.lower.surface}
                          {crossing.difference >= 0 ? "高" : "低"}{" "}
                          <b>
                            {smokeTrayEdges
                              ? `${(Math.abs(crossing.difference) * 1000).toFixed(1)} mm`
                              : `${Math.abs(crossing.difference).toFixed(2)} m`}
                          </b>
                          。
                          {smokeTrayEdges && (
                            <>
                              水平投影间距{" "}
                              <b>
                                {(smokeTrayEdges.horizontal * 1000).toFixed(1)}{" "}
                                mm
                              </b>
                              。
                            </>
                          )}
                          {crossing.boundary}
                        </p>
                      </>
                    )}
                  {crossing.kind === "drain-joint" && (
                    <DrainJointDetails
                      inspection={crossing}
                      selected={selected}
                      ready={ready}
                      onStage={(stage) => {
                        if (
                          stage === "receiver" &&
                          selected !== condensate.receiver.id
                        )
                          pick(condensate.receiver.id);
                        requestCrossing(drainJointInspection(stage));
                      }}
                      onPreview={pick}
                      onSense={openCondensateSensing}
                      onHistory={analyzeCondensateSource}
                      coolingLink={activeCoolingDrain ?? undefined}
                    />
                  )}
                  {crossing.kind === "rear-wall" && (
                    <RearWallCrossingDetails
                      pair={crossing}
                      selected={selected}
                      ready={ready}
                      onSelect={pick}
                      onHistory={(id) => {
                        focus(id);
                        analyze();
                      }}
                    />
                  )}
                  {crossing.kind === "grille-seat" && (
                    <GrilleSeatDetails
                      seat={crossing}
                      ready={ready}
                      onIntake={() =>
                        requestCrossing(grilleIntakeInspection(crossing))
                      }
                      onView={(index, removed, reference, rackId) =>
                        requestCrossing(
                          grilleSeatInspection(
                            crossing.row.id,
                            index,
                            removed,
                            reference,
                            rackId,
                          ),
                        )
                      }
                      onHistory={(id) => {
                        focus(id);
                        analyze();
                      }}
                    />
                  )}
                  {crossing.kind === "grille-intake" && (
                    <GrilleIntakeDetails
                      check={crossing}
                      ready={ready}
                      onSeat={() => requestCrossing(crossing.seat)}
                      onLocate={(id) => {
                        focus(id, { installation: true });
                        dispatch({ type: "door", open: true });
                      }}
                    />
                  )}
                  {!review.analysis && crossing.kind === "tray-support" && (
                    <div className="roof-entry-details">
                      <label>
                        {crossing.upper.name}端部
                        <select
                          aria-label="桥架端部"
                          disabled={!ready}
                          value={crossing.side}
                          onChange={(e) =>
                            requestCrossing(
                              trayEndSupport(
                                crossing.upper.id,
                                e.target.value === "1" ? 1 : -1,
                              ),
                            )
                          }
                        >
                          <option value="-1">−X 端</option>
                          <option value="1">+X 端</option>
                        </select>
                      </label>
                      <p>
                        沿桥架长轴，端帽外端距最近横托外边{" "}
                        <b>{(crossing.horizontal * 1000).toFixed(1)} mm</b>
                        ，距该组吊杆轴线 {(crossing.toAxis * 1000).toFixed(
                          1,
                        )}{" "}
                        mm。
                      </p>
                      <button
                        disabled={!ready}
                        onClick={() =>
                          requestCrossing(
                            traySupportBay(
                              crossing.upper.id,
                              crossing.side === -1
                                ? 0
                                : traySupportStations.length - 2,
                            ),
                          )
                        }
                      >
                        核对相邻横托跨距 ↗
                      </button>
                      <p>
                        同排相邻端柜为{crossing.rack.name}
                        。尺寸取自支吊布置，现场锚固、承载和施工净距待核实。
                      </p>
                      <button
                        disabled={!ready}
                        onClick={() =>
                          requestCrossing(
                            fixtureCrossing(
                              crossing.upper.id,
                              crossing.rack.id,
                            ),
                          )
                        }
                      >
                        核对{crossing.rack.name}柜顶 ↗
                      </button>
                      <button
                        disabled={!ready}
                        onClick={() => {
                          focus(crossing.rack.id);
                          analyze();
                        }}
                      >
                        回看{crossing.rack.name}设备汇总 ↗
                      </button>
                    </div>
                  )}
                  {!review.analysis && crossing.kind === "tray-bay" && (
                    <div className="roof-entry-details">
                      <label>
                        支吊跨段
                        <select
                          aria-label="支吊跨段"
                          disabled={!ready}
                          value={crossing.index}
                          onChange={(e) =>
                            requestCrossing(
                              traySupportBay(
                                crossing.upper.id,
                                Number(e.target.value),
                              ),
                            )
                          }
                        >
                          {traySupportStations.slice(1).map((station, i) => (
                            <option key={station} value={i}>
                              横托 {i + 1} 至 {i + 2}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p>
                        两横托中心沿 X 轴相距{" "}
                        <b>{crossing.horizontal.toFixed(3)} m</b>。横托按机房 X
                        坐标从小到大编号。
                      </p>
                      <p>
                        本排有 {crossing.racks.length}{" "}
                        台机柜的中心落在此跨。可继续核对柜顶板和进线口。
                      </p>
                      {crossing.racks.map((rack) => (
                        <button
                          key={rack.id}
                          disabled={!ready}
                          onClick={() =>
                            requestCrossing(
                              fixtureCrossing(crossing.upper.id, rack.id),
                            )
                          }
                        >
                          核对{rack.name}柜顶 ↗
                        </button>
                      ))}
                      <small>样板布置。现场锚固、承载与敷线待核实。</small>
                    </div>
                  )}
                  {!review.analysis &&
                    (crossing.kind === "tray-bay" ||
                      crossing.kind === "tray-support") && (
                      <button
                        disabled={!ready}
                        onClick={() =>
                          requestCrossing(trayMountInspection(crossing))
                        }
                      >
                        核对吊杆顶板安装 ↗
                      </button>
                    )}
                  {!review.analysis && crossing.kind === "tray-mount" && (
                    <TrayMountDetails
                      mount={crossing}
                      ready={ready}
                      onMount={(station, side) =>
                        requestCrossing(
                          trayMountInspection(crossing.source, station, side),
                        )
                      }
                      onReturn={() => requestCrossing(crossing.source)}
                    />
                  )}
                  {!review.analysis &&
                    (crossing.kind === "tray-bay" ||
                      crossing.kind === "tray-support") &&
                    sectionLights(crossing).map((light) => {
                      const next = lightRodInspection(
                        light.id,
                        crossing.upper.id,
                      );
                      return (
                        next && (
                          <button
                            key={light.id}
                            disabled={!ready}
                            onClick={() => requestCrossing(next)}
                          >
                            核对{light.name}与吊杆 ↗
                          </button>
                        )
                      );
                    })}
                  {crossing.kind === "light-hanger" && (
                    <LightHangerDetails
                      hanger={crossing}
                      ready={ready}
                      onSide={(side) =>
                        requestCrossing(
                          lightHangerInspection(
                            crossing.light.id,
                            side,
                            crossing.mount ? "mount" : "hanger",
                          ),
                        )
                      }
                      onMount={() =>
                        requestCrossing(
                          lightHangerInspection(
                            crossing.light.id,
                            crossing.side,
                            crossing.mount ? "hanger" : "mount",
                          ),
                        )
                      }
                      onCrossing={() => {
                        if (crossing.nearestCrossing)
                          requestCrossing(crossing.nearestCrossing);
                      }}
                    />
                  )}
                  {crossing.kind === "probe-height" && (
                    <ProbeHeightDetails
                      check={crossing}
                      ready={ready}
                      onRack={(id) =>
                        requestCrossing(
                          probeHeightScene(crossing.round.probe.id, id),
                        )
                      }
                      onLocate={(id) => locateProbeDevice(id, "height")}
                      onHistory={() => {
                        focus(crossing.round.probe.id);
                        analyze();
                      }}
                    />
                  )}
                  {crossing.kind === "probe-mount" && (
                    <ProbeMountDetails
                      check={crossing}
                      ready={ready}
                      onToggle={() =>
                        requestCrossing(
                          probeMountInspection(crossing.id, !crossing.opened),
                        )
                      }
                      onHeight={() =>
                        requestCrossing(probeHeightScene(crossing.id))
                      }
                    />
                  )}
                  {crossing.kind === "raceway-corner" && (
                    <RacewayCornerDetails
                      check={crossing}
                      ready={ready}
                      onEnd={(id) =>
                        requestCrossing(
                          racewayCornerInspection(
                            id,
                            crossing.opened,
                            crossing.joint,
                          ),
                        )
                      }
                      onJoint={(joint) => {
                        if (joint === "turn" && patchPanelById(selected)) {
                          pick(crossing.drop.id);
                          if (inspectionOrigin)
                            setPanelInspection({
                              fixtureId: crossing.drop.id,
                              origin: inspectionOrigin,
                              register,
                              entryView,
                            });
                        }
                        requestCrossing(
                          racewayCornerInspection(
                            crossing.drop.id,
                            crossing.opened,
                            joint,
                          ),
                        );
                      }}
                      onCover={(opened) =>
                        requestCrossing(
                          racewayCornerInspection(
                            crossing.drop.id,
                            opened,
                            crossing.joint,
                          ),
                        )
                      }
                      onPanel={() => {
                        const start =
                          inspectionOrigin ??
                          racewayRegisterStart(crossing.drop.id);
                        const endpoint =
                          start && portAtPanel(start, crossing.panel.id);
                        if (endpoint) inspectPanelPort(endpoint);
                        else focus(crossing.panel.id);
                      }}
                    />
                  )}
                  {!review.analysis && crossing.kind === "light-rod" && (
                    <LightRodDetails
                      pair={crossing}
                      ready={ready}
                      onStation={(station) =>
                        requestCrossing(
                          lightRodInspection(
                            crossing.upper.id,
                            crossing.lower.id,
                            station,
                          ),
                        )
                      }
                      onCrossing={() => requestCrossing(crossing.source)}
                      onSection={() => {
                        pick(crossing.lower.id);
                        requestCrossing(crossing.section);
                      }}
                      onHistory={(id) => {
                        focus(id);
                        analyze();
                      }}
                    />
                  )}
                  {!review.analysis &&
                    crossing.kind === "light-tray" &&
                    (() => {
                      const next = lightRodInspection(
                        crossing.light.id,
                        crossing.tray.id,
                      );
                      const hanger = ([-1, 1] as const)
                        .map((side) =>
                          lightHangerInspection(crossing.light.id, side),
                        )
                        .find(
                          (item) => item?.nearestCrossing?.id === crossing.id,
                        );
                      return (
                        <>
                          {hanger && (
                            <button
                              disabled={!ready}
                              onClick={() => requestCrossing(hanger)}
                            >
                              核对相邻端的顶灯吊点 ↗
                            </button>
                          )}
                          {next && (
                            <button
                              disabled={!ready}
                              onClick={() => requestCrossing(next)}
                            >
                              核对灯壳与相邻吊杆 ↗
                            </button>
                          )}
                        </>
                      );
                    })()}
                  {crossing.kind === "smoke-mount" && (
                    <SmokeMountDetails
                      pair={crossing}
                      ready={ready}
                      onToggle={() =>
                        requestCrossing(
                          smokeMountInspection(
                            crossing.round,
                            !crossing.opened,
                          ),
                        )
                      }
                      onTray={() =>
                        requestCrossing(smokeTrayPlacement(crossing.round))
                      }
                    />
                  )}
                  {!review.analysis && crossing.kind === "smoke-tray" && (
                    <>
                      <button
                        disabled={!ready}
                        onClick={() => {
                          const next = smokeLightInspection(crossing.round);
                          if (next) requestCrossing(next);
                        }}
                      >
                        沿本排桥架核对顶灯 ↗
                      </button>
                      <button
                        disabled={!ready}
                        onClick={() => {
                          focus(crossing.round.probe.id);
                          analyze();
                        }}
                      >
                        回看{crossing.round.probe.name} ↗
                      </button>
                    </>
                  )}
                  {!review.analysis && crossing.kind === "smoke-light" && (
                    <SmokeLightDetails
                      pair={crossing}
                      ready={ready}
                      onInspect={(id, view) => {
                        const next = smokeLightInspection(
                          crossing.round,
                          id,
                          view,
                        );
                        if (!next) return;
                        if (selected === crossing.light.id && selected !== id)
                          pick(crossing.round.points[0].id);
                        requestCrossing(next);
                      }}
                      onProbe={() => {
                        focus(crossing.round.points[2].id);
                        analyze();
                      }}
                    />
                  )}
                  {!review.analysis &&
                    (crossing.kind === "lighting-round" ||
                      crossing.kind === "light-tray") && (
                      <LightingRoundDetails
                        pair={crossing}
                        ready={ready}
                        onLocate={focus}
                        onHistory={(id) => {
                          focus(id);
                          analyze();
                        }}
                        onRack={(id) => {
                          const source =
                            crossing.kind === "light-tray"
                              ? crossing
                              : crossing.source;
                          const next = lightingRound(
                            source.light.id,
                            source.tray.id,
                            id,
                          );
                          if (next) {
                            pick(source.tray.id);
                            requestCrossing(next);
                          }
                        }}
                        onSource={() => {
                          if (crossing.kind === "lighting-round") {
                            pick(crossing.source.light.id);
                            requestCrossing(crossing.source);
                          }
                        }}
                      />
                    )}
                  {!review.analysis &&
                    (crossing.kind === "lighting-round" ||
                      crossing.kind === "rack-tray" ||
                      crossing.kind === "roof-entry" ||
                      crossing.kind === "roof-pdu") && (
                      <RoofEntryDetails
                        crossing={crossing}
                        ready={ready}
                        onInspect={requestCrossing}
                        onLocate={focus}
                        onHistory={(id) => {
                          focus(id);
                          analyze();
                        }}
                      />
                    )}
                  {crossing.kind === "raceway-axis" && (
                    <RacewayAxisDetails
                      inspection={crossing}
                      ready={ready}
                      onPosition={(base, station) =>
                        requestCrossing(
                          racewayAxisInspection(
                            crossing.origin,
                            crossing.sourceId,
                            base,
                            station,
                          ),
                        )
                      }
                    />
                  )}
                  {crossing.kind !== "rear-wall" &&
                    layoutVisit?.crossing?.id !== crossingOriginId && (
                      <button
                        disabled={!ready}
                        onClick={() => requestCrossing(null)}
                      >
                        ←{" "}
                        {crossing.kind === "raceway-axis"
                          ? "返回箱顶与横槽"
                          : "返回核对前视角"}
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
                {probeRackInspection}
                {atCoolingProbe && coolingProbeCheck}
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
                {probeAirflowComparison}
              </>
            ) : (
              <>
                {probeRackInspection}
                {coolingProbeCheck}
                {airflowInspector}
                {probeAirflowComparison}
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
                ) : entranceView &&
                  entranceViewIncludes(selected, entranceView.view) ? (
                  <EntranceInspectionDetails
                    inspection={entranceView}
                    selectedId={selected}
                    onPreview={pick}
                    onLocate={focus}
                    ready={ready}
                    onView={showEntranceView}
                    onSample={(index) =>
                      requestEntranceView(entranceView.view, index)
                    }
                    onHistory={(id) => {
                      focus(id);
                      analyze();
                    }}
                  />
                ) : leakView ? (
                  <LeakInspectionDetails
                    inspection={leakView}
                    onPosition={(target) => requestLeakView("floor", target)}
                    onRoute={(target) => requestLeakView("route", target)}
                    onFitting={(target) => requestLeakView("fitting", target)}
                    onHistory={() => {
                      pick(activeCoolingDrain?.sourceId ?? nearbyCooling.id);
                      analyze();
                    }}
                    selectedId={selected}
                    onPreview={pick}
                    onLocate={focus}
                    onDrainFixture={(id, segment) => {
                      setDrainSegment({ id, segment });
                      focus(id);
                    }}
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
                    mountAction={
                      layer === "overview" &&
                      state.level === "room" && (
                        <div className="probe-height-entry" hidden={!!crossing}>
                          <button
                            disabled={!ready}
                            onClick={() =>
                              requestCrossing(probeMountInspection(fixture.id))
                            }
                          >
                            核对探头安装 ↗
                          </button>
                        </div>
                      )
                    }
                  />
                ) : fixture ? (
                  <FixtureDetails
                    fixture={fixture}
                    inspectingHanger={crossing?.kind === "light-hanger"}
                    returnBranches={
                      fixture.kind === "cable-tray" &&
                      layer === "overview" &&
                      state.level === "room" && (
                        <TrayReturnBranches
                          key={fixture.id}
                          trayId={fixture.id}
                          ready={ready}
                          onOpen={(id) => openTrayReturnBranch(fixture.id, id)}
                        />
                      )
                    }
                    onInspectHangers={
                      fixture.kind === "ceiling-light" &&
                      layer === "overview" &&
                      state.level === "room"
                        ? () =>
                            requestCrossing(lightHangerInspection(fixture.id))
                        : undefined
                    }
                    onInspectSupport={
                      layer === "overview" && state.level === "room"
                        ? (side) =>
                            requestCrossing(trayEndSupport(fixture.id, side))
                        : undefined
                    }
                    onInspectEntrance={
                      layer === "overview" && state.level === "room"
                        ? () =>
                            requestEntranceView(
                              fixture.kind === "exit-sign"
                                ? "lintel"
                                : fixture.kind === "emergency-light"
                                  ? "lights"
                                  : "all",
                            )
                        : undefined
                    }
                    onInspectLeak={
                      layer === "overview" && state.level === "room"
                        ? () => requestLeakView("all")
                        : undefined
                    }
                    onInspectLeakOutlet={
                      fixture.id === leakController.id &&
                      layer === "overview" &&
                      state.level === "room"
                        ? () =>
                            requestLeakView("fitting", {
                              fitting: "controller",
                              outlet: true,
                            })
                        : undefined
                    }
                    onPreview={pick}
                    onLocate={focus}
                    condensateDetails={condensateDetails}
                    racewayDetails={
                      layer === "overview" &&
                      state.level === "room" &&
                      (register && inspectionOrigin ? (
                        <PanelRegisterDetails
                          target={inspectionOrigin}
                          selected={selected}
                          ready={ready}
                          entryView={entryView}
                          hidden={crossing?.kind === "raceway-axis"}
                          onAxis={() =>
                            requestCrossing(
                              racewayAxisInspection(inspectionOrigin, selected),
                            )
                          }
                          onEntryView={(id, enabled) => {
                            focus(id);
                            setPanelInspection({
                              fixtureId: id,
                              origin: inspectionOrigin,
                              register,
                              entryView: enabled,
                            });
                          }}
                          onLocate={inspectPanelPort}
                          onChoose={(port) => {
                            if (!entryView && patchPanelById(selected))
                              inspectPanelPort(port);
                            else
                              setPanelInspection({
                                fixtureId: selected,
                                origin: port,
                                register,
                                entryView,
                              });
                          }}
                          onHistory={(id) => {
                            focus(id);
                            analyze();
                          }}
                          onExit={() => {
                            setRegisterReturn(register);
                            if (register.camera) pick(register.selected);
                            else focus(register.selected);
                            setPanelInspection(
                              register.initial
                                ? {
                                    fixtureId: register.selected,
                                    origin: register.initial,
                                  }
                                : null,
                            );
                          }}
                        />
                      ) : (
                        <PanelRacewayDetails
                          onRegister={(entry) => {
                            const start =
                              inspectionOrigin ??
                              racewayRegisterStart(selected);
                            if (start)
                              setPanelInspection({
                                fixtureId: selected,
                                origin: start,
                                register: {
                                  selected,
                                  initial: inspectionOrigin,
                                  camera:
                                    captureTaskView.current?.("room") ?? null,
                                  scroll:
                                    entry.closest<HTMLElement>(
                                      ".study-inspector",
                                    )?.scrollTop ?? 0,
                                },
                              });
                          }}
                          fixture={fixture}
                          origin={inspectionOrigin}
                          ready={ready}
                          inspectingCorner={crossing?.kind === "raceway-corner"}
                          onCorner={
                            racewayById(fixture.id)
                              ? () =>
                                  requestCrossing(
                                    racewayCornerInspection(fixture.id),
                                  )
                              : undefined
                          }
                          onPanelInlet={
                            panelEntryPlacement(fixture.id)
                              ? () =>
                                  requestCrossing(
                                    racewayCornerInspection(
                                      fixture.id,
                                      false,
                                      "panel",
                                    ),
                                  )
                              : undefined
                          }
                          onLocate={(id) => {
                            const port =
                              inspectionOrigin &&
                              portAtPanel(inspectionOrigin, id);
                            if (port) {
                              inspectPanelPort(port);
                            } else {
                              setPanelInspection(
                                inspectionOrigin && racewayById(id)
                                  ? { fixtureId: id, origin: inspectionOrigin }
                                  : null,
                              );
                              focus(id);
                            }
                          }}
                        />
                      ))
                    }
                    panelPorts={
                      fixture.kind === "patch-panel" &&
                      !register &&
                      layer === "overview" &&
                      state.level === "room" && (
                        <PatchPanelDetails
                          id={fixture.id}
                          target={panelPort}
                          ready={ready}
                          onInspect={inspectPanelPort}
                          onHistory={(id) => {
                            focus(id);
                            analyze();
                          }}
                        />
                      )
                    }
                    grilleRelations={
                      grilleRowById(fixture.id) && (
                        <>
                          {layer === "overview" && state.level === "room" && (
                            <div
                              className="entrance-view-entry"
                              hidden={!!crossing}
                            >
                              <button
                                disabled={!ready}
                                onClick={() =>
                                  requestCrossing(
                                    grilleSeatInspection(fixture.id, 0),
                                  )
                                }
                              >
                                逐块核对格栅安装 ↗
                              </button>
                            </div>
                          )}
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
                        </>
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
                    {condensateDetails}
                    <FixtureRelations
                      title="邻近检漏设施"
                      relations={leakRelations(selected)}
                      onPreview={pick}
                      onLocate={focus}
                    >
                      {layer === "overview" &&
                        state.level === "room" &&
                        selected === nearbyCooling.id && (
                          <div className="leak-view-entry">
                            <button
                              disabled={!ready}
                              onClick={() => requestLeakView("floor")}
                            >
                              核对{leakCable.location} ↗
                            </button>
                          </div>
                        )}
                    </FixtureRelations>
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
                      !activePair &&
                      !activeMemory &&
                      !activeFanVisit &&
                      !activeStorageVisit &&
                      (memoryContext ||
                        pairTools.length > 0 ||
                        compactBayContext ||
                        options?.cover ||
                        !!options?.fans ||
                        !!options?.slots) && (
                        <StructureTools
                          assemblies={pairTools}
                          cover={
                            options?.cover
                              ? state.coverOpen && state.explosion === 0
                                ? "open"
                                : "seated"
                              : undefined
                          }
                          memory={options?.memory ?? 0}
                          key={`${revision}:${state.deviceId}:${compactBayContext ? "bays" : selected}`}
                          showSelection={
                            (compactBayContext &&
                              selected !== state.deviceId) ||
                            (state.coverOpen && options?.cover?.id === selected)
                          }
                          hasFanDuct={!!deviceModel.fanDuctLayout}
                          fans={options?.fans ?? 0}
                          slots={options?.slots ?? 0}
                          ready={ready}
                          restore={
                            structureReturn?.deviceId === state.deviceId
                              ? structureReturn.tool
                              : null
                          }
                          onRestored={() => setStructureReturn(null)}
                          onStart={startStructureTool}
                        >
                          {compactBayContext && (
                            <CompactDriveBays
                              selected={selected}
                              ready={ready}
                              onFocus={(id) => focus(id)}
                            />
                          )}
                        </StructureTools>
                      )}
                    {sourceInspector}
                    {selected === powerSettings.sourceId &&
                      layer === "overview" &&
                      state.level === "room" && (
                        <div className="entrance-view-entry">
                          <button
                            disabled={!ready}
                            onClick={() => requestEntranceView("cabinet")}
                          >
                            核对门扇与配电柜 ↗
                          </button>
                        </div>
                      )}
                    {(layer === "power" || powerFacility) && (
                      <PowerConnections
                        interval={
                          powerOverviewVisit?.feeder &&
                          feederReference?.showEnergy
                            ? feederEnergyInterval(
                                feederReference.time,
                                state.time,
                              )
                            : null
                        }
                        paired={powerViewPaired}
                        onAnalyzeDevice={(id, at) => {
                          if (at !== undefined)
                            dispatch({ type: "seek", time: at });
                          if (layoutVisit?.resourceList) {
                            setQuery("");
                            setFilter("all");
                          }
                          focus(id, { installation: true });
                          setMetric("power");
                          analyze();
                        }}
                        onInspectMount={
                          initialPduMount === null
                            ? undefined
                            : () => requestPowerView({ mount: initialPduMount })
                        }
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
                        onOutletNetwork={openOutletNetwork}
                        onOutletAirflow={openOutletAirflow}
                        onLocateOutlet={(link) => {
                          if (
                            state.level === "room" &&
                            layoutVisit?.resourceList
                          ) {
                            setQuery("");
                            setFilter("all");
                            setOnlyAlarms(false);
                          }
                          setPduReturning(true);
                          focus(link.pduId);
                          setPduInspection((current) =>
                            locatePduOutlet(current, link),
                          );
                          if (powerViewPaired) requestPowerView("observe");
                          setPowerLinkId(link.id);
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
                        onLocate={(id) => {
                          if (id === powerSettings.sourceId && activePowerLink)
                            focusFeederRoute.current = true;
                          focus(id, {
                            installation: entityById(id)?.kind === "device",
                          });
                        }}
                        onViewPower={
                          layer === "power" || state.level === "room"
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
                    <p>
                      {compactServer && selected === "storage-01"
                        ? `前置 ${compactDriveBays.length} 个托架，硬盘与背板分别建模。`
                        : processorInspection
                          ? compactServer
                            ? "双路编号与归属来自 M1 配置。精模的封装上表面、座框、固定柱和散热器取自贡献模型，封装背面、简模与拆装行程为原创装配示意。时间分析沿用当前部件模拟值。"
                            : "双路编号与归属来自 M2 配置。精模沿用贡献散热器，封装和座框按当前模型的散热器底面定位，内部接合与抬起行程为装配示意。读数来自部件模型。"
                          : layerPose && rearLayer
                            ? rearLayer.description
                            : powerBayPose
                              ? "输入 A、B 与电源槽位取自机型配置。精模插片沿用贡献外观；简模插片、固定座、内部剖视和行程为原创装配示意。读数来自模拟，支路未计量。"
                              : rearRow
                                ? "模块编号及 A/B 归属来自本机型配置。托边、限位与抽出行程为装配示意，时间分析沿用所选部件的模型读数。"
                                : dimmPose
                                  ? "槽位按本机型的内存条编号与模型位置对应。槽体、卡扣和抬起间距为装配示意，读数沿用内存条模型。"
                                  : memoryContext && selected === "memory-01"
                                    ? `本机型配置 ${dimms.length} 条内存，可逐条检视。`
                                    : assembly?.tool === "drive-tray"
                                      ? "八个竖装盘位按托架编号与模型位置对应。盘内板、四柱、导热件和盘尾触面为原创装配示意，读数沿用硬盘模型。"
                                      : assembly?.tool === "rtc-mount"
                                        ? compactServer
                                          ? "M1 的 RTC 身份来自配置。电池座按贡献主板空余板面定位，固定座、触片和拆装行程为原创示意。电池电压和电量未接入。"
                                          : "RTC 位置取自主板外观。电池座、触片与抬起间距为装配示意，电池电压和电量未接入。"
                                        : assembly?.tool === "expansion-bay"
                                          ? "机后面板分区按 M2 配置定位。网卡装在 01 架，02 架为空架。管理接口板、罩脚与贯通孔、支架及行程为装配示意。A/B 两路逻辑接入归属双口网卡。"
                                          : assembly?.tool === "rear-interfaces"
                                            ? "网卡与上方转接架的精细外观来自贡献模型。核对安装位时，两件分别对照按原外廓绘制的机后孔缘。管理面板按 M1 配置定位。接口板、导轨、屏蔽罩四脚、板孔及绝缘座为原创装配示意。A/B 两路逻辑接入归属网卡，部件读数来自模拟。"
                                            : assembly?.tool ===
                                                "storage-harness"
                                              ? compactServer
                                                ? "盘位、背板和控制卡按 M1 配置与模型定位。盘尾承接架、接触片、SAS 插头及侧边走向为原创装配示意。时间分析沿用所选部件的模型读数。"
                                                : "背板接触区按八块硬盘的位置对齐。插头和线束绕行是内部装配示意，读数沿用部件模型。"
                                              : assembly?.tool ===
                                                  "storage-controllers"
                                                ? controllerLayer.description
                                                : entity.description}
                    </p>
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
            {(review.analysis || environment) && roundDetails}
          </aside>
        )}
      </main>
    </div>
  );
}
