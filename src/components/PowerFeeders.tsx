import { useLayoutEffect, useMemo, useRef } from "react";
import { pdus, pduName, pduById, type PowerLink } from "../power-config";
import { feederConnections, type FeederSelection } from "../power-feeders";

export function PowerFeeders({
  selection,
  onChange,
  onTrace,
  ready,
  restoreLink,
  visible,
  scroll,
}: {
  selection: FeederSelection;
  onChange: (value: FeederSelection) => void;
  onTrace: (link: PowerLink) => void;
  ready: boolean;
  restoreLink: string | null;
  visible: boolean;
  scroll: React.RefObject<number>;
}) {
  const { first, second, group, query } = selection;
  const result = useMemo(() => feederConnections(selection), [selection]);
  const host = useRef<HTMLDivElement>(null);
  const restorePending = useRef(true);
  useLayoutEffect(() => {
    restorePending.current = true;
  }, [visible, restoreLink]);
  useLayoutEffect(() => {
    if (
      !ready ||
      !visible ||
      !host.current ||
      !restoreLink ||
      !restorePending.current
    )
      return;
    restorePending.current = false;
    host.current.scrollTop = scroll.current;
    const button = host.current.querySelector<HTMLButtonElement>(
      `[data-feeder-link="${restoreLink}"]`,
    );
    button?.focus({ preventScroll: true });
    button?.scrollIntoView({ block: "nearest" });
  }, [restoreLink, visible, ready, scroll]);
  const options = (exclude?: string) =>
    pdus
      .filter((p) => p.id !== exclude)
      .map((p) => (
        <option key={p.id} value={p.id}>
          {p.sourcePort} · {pduName(p.id)}
        </option>
      ));
  return (
    <section
      className="power-overview feeder-overview"
      aria-label="配电出线核查"
    >
      <div
        className="power-overview-scroll"
        ref={host}
        onScroll={(e) => {
          if (visible) scroll.current = e.currentTarget.scrollTop;
        }}
      >
        <label>
          主查出线
          <select
            value={first}
            onChange={(e) =>
              onChange({
                ...selection,
                first: e.target.value,
                second: second === e.target.value ? "" : second,
                group: "all",
              })
            }
          >
            {options()}
          </select>
        </label>
        <label>
          对照出线
          <select
            value={second}
            onChange={(e) =>
              onChange({ ...selection, second: e.target.value, group: "all" })
            }
          >
            <option value="">单条核查</option>
            {options(first)}
          </select>
        </label>
        <h3>
          关联设备{" "}
          <small>
            {result.devices} 台 · {result.inputs} 个输入
          </small>
        </h3>
        {second && (
          <div className="feeder-groups" role="group" aria-label="出线关联范围">
            {(
              [
                ["all", "全部", result.devices],
                [
                  "first",
                  "仅 " + pduById(first)!.sourcePort,
                  result.counts.first,
                ],
                ["both", "两路共有", result.counts.both],
                [
                  "second",
                  "仅 " + pduById(second)!.sourcePort,
                  result.counts.second,
                ],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                aria-pressed={value === group}
                onClick={() => onChange({ ...selection, group: value })}
              >
                {label} · {count}
              </button>
            ))}
          </div>
        )}
        <input
          aria-label="出线核查查找设备"
          placeholder="查找机柜或设备编号"
          value={query}
          onChange={(e) => onChange({ ...selection, query: e.target.value })}
        />
        <p>点输入可进柜查看。出线与插座未计量，A/B 上游独立性待核实。</p>
        {result.matching.map(({ device, rack, units, links }) => (
          <div key={device.id} className="feeder-device">
            <div>
              <strong>{device.name}</strong>
              <small>
                {rack.name} · {units}
              </small>
            </div>
            {links.map((link) => (
              <button
                key={link.id}
                data-feeder-link={link.id}
                aria-current={restoreLink === link.id ? "true" : undefined}
                disabled={!ready}
                aria-label={`进柜查看 ${device.name} 输入 ${link.inlet}，${pduById(link.pduId)!.sourcePort} 插座 ${link.outlet}`}
                onClick={() => onTrace(link)}
              >
                <span>
                  {pduById(link.pduId)!.sourcePort} · 插座{" "}
                  {String(link.outlet).padStart(2, "0")}
                </span>
                <b>输入 {link.inlet} ↗</b>
              </button>
            ))}
          </div>
        ))}
        {!result.matching.length && (
          <p role="status">
            {query ? "当前范围没有匹配的设备。" : "此范围没有关联设备。"}
          </p>
        )}
      </div>
    </section>
  );
}
