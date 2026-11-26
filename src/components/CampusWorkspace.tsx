import { useLayoutEffect, useRef, useState } from "react";
import {
  campusById,
  campusChildren,
  campusCoverage,
  campusFloorPlan,
  campusPath,
  campusPosition,
  campusRoomId,
  campusSitePlan,
} from "../campus-layout";
import type { SpatialReading } from "../spatial";
import { CampusScene, type CampusCamera } from "./CampusScene";
import "./campus-workspace.css";

const spaceKinds = {
  campus: "园区",
  building: "建筑",
  floor: "楼层",
  room: "机房",
  support: "辅助区域",
  outdoor: "室外设施",
} as const;

export function CampusWorkspace({
  scopeId,
  readings,
  onEnter,
}: {
  scopeId: string | null;
  readings: ReadonlyMap<string, SpatialReading>;
  onEnter: (id: string) => void;
}) {
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [panel, setPanel] = useState<"resources" | "details">("resources");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const previousScope = useRef<string | null>(null);
  const panelFocusFrame = useRef(0);
  const scopeFocus = useRef<{ row: HTMLButtonElement | null } | null>(null);
  const cameras = useRef(new Map<string, CampusCamera>());
  const scrollPositions = useRef(new Map<string, number>());
  const root = useRef<HTMLElement>(null);
  const switcher = useRef<HTMLDivElement>(null);
  const detailsSwitch = useRef<HTMLButtonElement>(null);
  const resources = useRef<HTMLElement>(null);
  const resourcesHeading = useRef<HTMLHeadingElement>(null);
  const details = useRef<HTMLElement>(null);
  const evidenceHeading = useRef<HTMLHeadingElement>(null);
  const definition = useRef<HTMLDetailsElement>(null);
  const focusEvidenceFor = useRef<string | null>(null);
  const scope = scopeId ? campusById(scopeId) : undefined;
  const children = scope ? campusChildren(scope.id) : [];
  const choices = scope?.kind === "campus" ? [scope, ...children] : children;
  const selected =
    choices.find((node) => node.id === selection[scope!.id]) ?? children[0];
  const target = selected ?? scope;
  const targetId = target?.id;

  useLayoutEffect(() => {
    const previous = previousScope.current;
    previousScope.current = scopeId;
    if (!scopeId) return;
    const fromChild = campusPath(previous ?? campusRoomId).find(
      ({ parent }) => parent === scopeId,
    );
    setPanel("resources");
    if (fromChild)
      setSelection((current) => ({ ...current, [scopeId]: fromChild.id }));
    const row = fromChild
      ? resources.current?.querySelector<HTMLButtonElement>(
          `[data-campus-resource="${fromChild.id}"]`,
        )
      : null;
    scopeFocus.current = { row: row ?? null };
    return () => {
      scopeFocus.current = null;
      cancelAnimationFrame(panelFocusFrame.current);
    };
  }, [scopeId]);

  useLayoutEffect(() => {
    if (!scopeId || !targetId) return;
    const panels = [
      [resources.current, `${scopeId}:resources`],
      [details.current, `${scopeId}:${targetId}`],
    ] as const;
    const cleanup = panels.map(([node, key]) => {
      if (!node) return;
      const remember = () => {
        if (node.clientHeight) scrollPositions.current.set(key, node.scrollTop);
      };
      if (node.clientHeight)
        node.scrollTop = scrollPositions.current.get(key) ?? 0;
      node.addEventListener("scroll", remember);
      return () => node.removeEventListener("scroll", remember);
    });
    return () => cleanup.forEach((remove) => remove?.());
  }, [scopeId, targetId, panel]);

  useLayoutEffect(() => {
    const pending = scopeFocus.current;
    if (!pending || panel !== "resources") return;
    const { row } = pending;
    if (row && row.dataset.campusResource !== targetId) return;
    scopeFocus.current = null;
    // 等资源栏及原选中项就绪，在下一次按键前交还焦点。
    row?.scrollIntoView({ block: "nearest" });
    (row ?? resourcesHeading.current)?.focus({ preventScroll: true });
  }, [scopeId, targetId, panel]);

  useLayoutEffect(() => {
    const next = focusEvidenceFor.current;
    focusEvidenceFor.current = null;
    const heading = evidenceHeading.current;
    if (
      next === targetId &&
      document.activeElement === document.body &&
      heading?.checkVisibility()
    )
      heading.focus({ preventScroll: true });
  }, [scopeId, targetId]);

  useLayoutEffect(() => {
    if (!scopeId || !targetId) return;
    const closeDefinition = (event: KeyboardEvent) => {
      const disclosure = definition.current;
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        !disclosure?.open ||
        !disclosure.checkVisibility()
      )
        return;
      event.preventDefault();
      setExpanded((current) => ({ ...current, [targetId]: false }));
      const active = document.activeElement;
      if (active === document.body || disclosure.contains(active))
        disclosure.querySelector("summary")?.focus();
    };
    // 点击空白画布后焦点可能回到文档，仍先处理当前可见的说明。
    window.addEventListener("keydown", closeDefinition, true);
    return () => window.removeEventListener("keydown", closeDefinition, true);
  }, [scopeId, targetId]);

  useLayoutEffect(() => {
    if (!scopeId) return;
    const narrow = window.matchMedia("(max-width: 1099px)");
    let last: Element | null = document.activeElement;
    const remember = (event: FocusEvent) => {
      last = event.target instanceof Element ? event.target : null;
    };
    const changed = () => {
      const active = document.activeElement;
      const target = active === document.body ? last : active;
      if (!target || !root.current?.contains(target)) return;
      if (narrow.matches && details.current?.contains(target)) {
        setPanel("details");
      } else if (narrow.matches && resources.current?.contains(target)) {
        setPanel("resources");
      } else if (!narrow.matches && switcher.current?.contains(target)) {
        (target === detailsSwitch.current ? details.current : resources.current)
          ?.querySelector<HTMLElement>("h2")
          ?.focus({ preventScroll: true });
      }
      if (target instanceof HTMLElement && target !== active) {
        requestAnimationFrame(() => {
          if (document.activeElement === document.body && target.isConnected)
            target.focus({ preventScroll: true });
        });
      }
    };
    document.addEventListener("focusin", remember);
    narrow.addEventListener("change", changed);
    return () => {
      document.removeEventListener("focusin", remember);
      narrow.removeEventListener("change", changed);
    };
  }, [scopeId]);

  if (!scope || !target) return null;
  const coverage = campusCoverage(target.id, readings);
  const floorPlan = campusFloorPlan(scope.id);
  const floorArea = floorPlan?.areas.find(({ id }) => id === target.id);
  const sitePlan = campusSitePlan(scope.id);
  const outdoor = sitePlan?.zones.find(({ id }) => id === target.id);
  const floorChildren =
    target.kind === "floor" ? campusChildren(target.id) : [];
  const choosePanel = (next: "resources" | "details") => {
    const origin = document.activeElement;
    cancelAnimationFrame(panelFocusFrame.current);
    setPanel(next);
    panelFocusFrame.current = requestAnimationFrame(() => {
      if (
        document.activeElement !== origin &&
        document.activeElement !== document.body
      )
        return;
      (next === "resources" ? resources.current : details.current)
        ?.querySelector<HTMLElement>("h2")
        ?.focus({ preventScroll: true });
    });
  };
  const choose = (id: string) =>
    setSelection((current) => ({ ...current, [scope.id]: id }));
  const chooseFromScene = (id: string) => {
    const active = document.activeElement;
    if (
      id !== target.id &&
      active?.closest(".campus-definition") &&
      details.current?.contains(active)
    )
      focusEvidenceFor.current = id;
    choose(id);
  };
  const position = campusPosition(target.id)!;
  return (
    <main
      className="campus-workspace"
      ref={root}
      data-campus-panel={panel}
      aria-label="园区空间工作区"
    >
      <aside ref={resources} className="campus-resources" aria-label="空间资源">
        <div className="study-panel-heading">
          <h2
            ref={resourcesHeading}
            tabIndex={-1}
            aria-describedby="campus-stage-title"
          >
            {spaceKinds[scope.kind]}资源
          </h2>
        </div>
        <div className="campus-resource-list">
          {choices.map((child) => (
            <div className="campus-resource-row" key={child.id}>
              <button
                type="button"
                className="campus-resource"
                data-campus-resource={child.id}
                aria-pressed={child.id === selected?.id}
                onClick={() => choose(child.id)}
              >
                <strong>
                  {child.id === scope.id ? "园区总览" : child.name}
                </strong>
                <small>
                  {spaceKinds[child.kind]}
                  {child.kind === "room" && " · 可巡检"}
                  {child.kind === "support" && " · 布置"}
                </small>
              </button>
              {(child.kind === "building" ||
                child.kind === "floor" ||
                child.kind === "room") && (
                <div className="study-row-actions">
                  <button
                    type="button"
                    aria-label={`进入${child.name}`}
                    onClick={() => onEnter(child.id)}
                  >
                    进入 <span aria-hidden="true">↗</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <section
        className="campus-stage"
        aria-label="空间场景"
        onPointerDownCapture={(event) => {
          if (
            event.button === 0 &&
            event.target instanceof HTMLCanvasElement &&
            details.current?.contains(document.activeElement)
          )
            event.preventDefault();
        }}
      >
        <CampusScene
          scope={scope}
          selectedId={target.id}
          onSelect={chooseFromScene}
          cameras={cameras.current}
        />
        <div className="campus-stage-heading">
          <h1 id="campus-stage-title">{scope.name}</h1>
          <span>
            {scope.kind === "building"
              ? "建筑剖面与分层 · 标高见依据"
              : "原创样板 · 米制坐标"}
          </span>
        </div>
        <div
          ref={switcher}
          className="campus-panel-switch"
          role="group"
          aria-label="空间侧栏"
        >
          <button
            aria-pressed={panel === "resources"}
            onClick={() => choosePanel("resources")}
          >
            资源
          </button>
          <button
            ref={detailsSwitch}
            aria-pressed={panel === "details"}
            onClick={() => choosePanel("details")}
          >
            依据
          </button>
        </div>
      </section>

      <aside ref={details} className="campus-inspector" aria-label="空间依据">
        <div className="study-panel-heading">
          <h2 ref={evidenceHeading} tabIndex={-1}>
            空间依据
          </h2>
        </div>
        <div className="campus-inspector-body">
          <h2>{target.name}</h2>
          <p>{target.description}</p>
          {coverage.rooms > 0 ? (
            <section
              className="campus-scope-readings"
              aria-label="登记机房运行汇总"
            >
              <header>
                <strong>模拟运行</strong>
                <small>
                  {coverage.rooms} 间机房 · {coverage.devices} 台登记
                </small>
              </header>
              <dl>
                <div>
                  <dt>最高设备进风</dt>
                  <dd>
                    {coverage.temperature === null
                      ? "—"
                      : `${coverage.temperature.toFixed(1)} °C`}
                  </dd>
                  <small>
                    有效 {coverage.inletDevices}/{coverage.devices} 台
                  </small>
                </div>
                <div>
                  <dt>已知整机输入</dt>
                  <dd>
                    {coverage.power === null
                      ? "—"
                      : `${(coverage.power / 1000).toFixed(2)} kW`}
                  </dd>
                  <small>
                    有效 {coverage.powerDevices}/{coverage.devices} 台
                  </small>
                </div>
              </dl>
            </section>
          ) : (
            <p className="campus-layout-only">
              登记布置 · 此范围无机房运行数据
            </p>
          )}
          {floorArea && floorPlan && (
            <section className="campus-access" aria-label="出入口与通道">
              <h3>出入口与通道</h3>
              <dl>
                <div>
                  <dt>{target.kind === "room" ? "后墙入口" : "通道侧入口"}</dt>
                  <dd>{floorArea.doorway.width.toFixed(2)} m</dd>
                </div>
                <div>
                  <dt>楼层通道宽度</dt>
                  <dd>{floorPlan.corridor.depth.toFixed(2)} m</dd>
                </div>
                <div>
                  <dt>入口至通道边</dt>
                  <dd>{floorArea.access.length.toFixed(2)} m</dd>
                </div>
              </dl>
              <p>
                {target.kind === "room"
                  ? "入口和机柜沿用机房配置，通道为样板布置。"
                  : floorArea.equipment.map(({ name }) => name).join(" · ")}
              </p>
            </section>
          )}
          {target.kind === "floor" && (
            <section className="campus-access" aria-label="楼层关系">
              <h3>楼层关系</h3>
              <dl>
                <div>
                  <dt>楼面标高</dt>
                  <dd>{position[1].toFixed(2)} m</dd>
                </div>
                <div>
                  <dt>配置层高</dt>
                  <dd>{target.size[1].toFixed(2)} m</dd>
                </div>
              </dl>
              <p>{floorChildren.map(({ name }) => name).join(" · ")}</p>
              <p>两层楼梯位置贯通，图中展开间距仅用于辨认楼层。</p>
            </section>
          )}
          {sitePlan && (
            <section className="campus-access" aria-label="场区通行">
              <h3>场区通行</h3>
              <dl>
                <div>
                  <dt>{outdoor ? "东侧服务道路" : "园区主路"}</dt>
                  <dd>
                    {(outdoor
                      ? sitePlan.serviceRoad.width
                      : sitePlan.mainRoad.depth
                    ).toFixed(2)}{" "}
                    m
                  </dd>
                </div>
                <div>
                  <dt>{outdoor ? "区域入口开口" : "首层步行入口"}</dt>
                  <dd>
                    {(
                      outdoor?.access.depth ?? sitePlan.entrance?.width
                    )?.toFixed(2) ?? "—"}{" "}
                    m
                  </dd>
                </div>
              </dl>
              <p>
                {outdoor
                  ? outdoor.status
                  : "主路侧步行铺面与 A 栋 01 层通道入口使用同一坐标。"}
              </p>
            </section>
          )}
          <details
            ref={definition}
            className="campus-definition"
            key={target.id}
            open={expanded[target.id] ?? false}
          >
            <summary
              onClick={(event) => {
                event.preventDefault();
                setExpanded((current) => ({
                  ...current,
                  [target.id]: !current[target.id],
                }));
              }}
            >
              尺寸与位置
            </summary>
            <dl>
              <div>
                <dt>平面尺寸</dt>
                <dd>
                  {target.size[0]} × {target.size[2]} m
                </dd>
              </div>
              <div>
                <dt>园区标高</dt>
                <dd>{position[1].toFixed(2)} m</dd>
              </div>
              <div>
                <dt>园区坐标 X / Z</dt>
                <dd>
                  {position[0].toFixed(2)} / {position[2].toFixed(2)} m
                </dd>
              </div>
            </dl>
          </details>
        </div>
      </aside>
    </main>
  );
}
