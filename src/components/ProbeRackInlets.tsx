import { useEffect, useMemo, useRef, type RefObject } from "react";
import { unitLabel } from "../catalog";
import { coolingDeviceIds } from "../cooling";
import { coolingRackPeaks, probeAirflowForInput } from "../cooling-probe";
import type { EnvironmentRound } from "../environment-rounds";
import { sourceValue } from "../reading-sources";
import type { SpatialReading } from "../spatial";
import { useResultFocusFallback } from "../use-result-focus-fallback";
import { ConnectionSection } from "./ConnectionSection";
import { FocusedResultList } from "./FocusedResultList";

export type ProbeInputCheck = { rackId: string; included: boolean };

export function ProbeRackInlets({
  round,
  readings,
  ready,
  visitedDevice,
  check,
  restore,
  onCheck,
  onLocate,
  onAirflow,
}: {
  round: EnvironmentRound;
  readings: Map<string, SpatialReading>;
  ready: boolean;
  visitedDevice?: string;
  check: ProbeInputCheck | null;
  restore: RefObject<string | null>;
  onCheck: (check: ProbeInputCheck | null) => void;
  onLocate: (id: string, fromInputs: boolean) => void;
  onAirflow: (rackId: string, id: string) => void;
}) {
  const rows = useMemo(
    () => coolingRackPeaks(round, readings),
    [round, readings],
  );
  const probeId = round.probe.id;
  const checkedRack = check?.rackId;
  const airflowIds = useMemo(
    () =>
      new Set(
        checkedRack
          ? coolingDeviceIds(checkedRack).filter((id) =>
              probeAirflowForInput(probeId, checkedRack, id),
            )
          : [],
      ),
    [probeId, checkedRack],
  );
  const members = useRef<HTMLDivElement>(null);
  const activeFilter = useRef<HTMLButtonElement>(null);
  const watchResult = useResultFocusFallback(activeFilter);
  useEffect(() => {
    if (!ready || !restore.current) return;
    const button = members.current?.querySelector<HTMLButtonElement>(
      `[data-probe-input="${restore.current}"]`,
    );
    if (button) {
      button.focus({ preventScroll: true });
      button.scrollIntoView({ block: "nearest" });
      restore.current = null;
    }
  }, [ready, check, rows, restore]);
  return (
    <ConnectionSection
      className="probe-rack-inlets"
      title="同排各柜最高进风"
      summary={round.row.name + " · " + round.racks.length + " 柜"}
      active={!!visitedDevice || !!check}
    >
      {rows.map(({ rack, device, coverage, count, maximum, inputs }) => {
        const expanded = check?.rackId === rack.id;
        const visible = expanded
          ? inputs.filter((input) => input.included === check.included)
          : [];
        return (
          <div key={rack.id} className="probe-rack-inlet">
            <button
              className="probe-rack-coverage"
              aria-expanded={expanded}
              aria-label={`核对 ${rack.name} 进风输入，有效 ${coverage}/${count}`}
              onClick={() =>
                onCheck(
                  expanded
                    ? null
                    : { rackId: rack.id, included: coverage === count },
                )
              }
            >
              <strong>{rack.name}</strong>
              <small>
                有效 {coverage}/{count} {expanded ? "−" : "+"}
              </small>
            </button>
            {device && maximum !== null ? (
              <button
                disabled={!ready}
                onClick={() => onLocate(device.id, false)}
                aria-label={`定位 ${rack.name} ${device.name} ${unitLabel(device.id)} 安装位`}
              >
                <span>
                  {device.name} · {unitLabel(device.id)}
                </span>
                <b>{maximum.toFixed(1)} °C ↗</b>
              </button>
            ) : (
              <small>无有效进风</small>
            )}
            {expanded && (
              <div
                className="probe-inputs"
                ref={members}
                role="group"
                aria-label={rack.name + "进风输入"}
              >
                <div className="probe-input-filters">
                  {[true, false].map((included) => (
                    <button
                      key={String(included)}
                      ref={
                        included === check.included ? activeFilter : undefined
                      }
                      aria-pressed={included === check.included}
                      onClick={() => onCheck({ rackId: rack.id, included })}
                    >
                      {included
                        ? "已计入 " + coverage
                        : "未计入 " + (count - coverage)}
                    </button>
                  ))}
                </div>
                <FocusedResultList className="probe-input-list">
                  {visible.map((input) => (
                    <div className="probe-input-row" key={input.id}>
                      <button
                        ref={watchResult}
                        data-probe-input={input.id}
                        aria-current={input.id === visitedDevice || undefined}
                        disabled={!ready}
                        onClick={() => onLocate(input.id, true)}
                        aria-label={`定位 ${input.name} ${unitLabel(input.id)}，${input.included ? sourceValue(input.value, "temperature") : input.reason}`}
                        aria-describedby={
                          input.included
                            ? undefined
                            : "probe-input-detail-" + input.id
                        }
                      >
                        <strong>
                          {input.name} · {unitLabel(input.id)}
                        </strong>
                        <span>
                          {input.included
                            ? sourceValue(input.value, "temperature")
                            : input.reason}{" "}
                          ↗
                        </span>
                        {!input.included && (
                          <small id={"probe-input-detail-" + input.id}>
                            {input.detail}
                          </small>
                        )}
                      </button>
                      {airflowIds.has(input.id) && (
                        <button
                          ref={watchResult}
                          className="probe-input-airflow"
                          disabled={!ready}
                          onClick={() => onAirflow(rack.id, input.id)}
                          aria-label={`核对 ${input.name} 的气流支路`}
                        >
                          气流 ↗
                        </button>
                      )}
                    </div>
                  ))}
                  {!visible.length && (
                    <p>
                      {check.included
                        ? "当前没有有效进风输入。"
                        : "本柜配置设备均有有效进风。"}
                    </p>
                  )}
                </FocusedResultList>
              </div>
            )}
          </div>
        );
      })}
      <small>按本排制冷服务设备的模拟进风取最高值。墙面探头单独采样。</small>
    </ConnectionSection>
  );
}
