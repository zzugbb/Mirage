import { useEffect, useMemo, useRef } from "react";
import type { EnvironmentRound } from "../environment-rounds";
import { probeElevation } from "../probe-elevation";
import { ConnectionSection } from "./ConnectionSection";

export function ProbeElevation({
  round,
  ready,
  visited,
  onLocate,
}: {
  round: EnvironmentRound;
  ready: boolean;
  visited?: string;
  onLocate: (id: string) => void;
}) {
  const height = round.probe.position[1];
  const racks = useMemo(
    () => round.racks.flatMap((rack) => probeElevation(rack.id, height) ?? []),
    [round, height],
  );
  const returning = useRef(visited);
  const origin = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (ready && returning.current && origin.current) {
      origin.current.focus({ preventScroll: true });
      origin.current.scrollIntoView({ block: "nearest" });
      returning.current = undefined;
    }
  }, [ready, visited]);
  return (
    <ConnectionSection
      title="探头标高与机柜安装位"
      summary={height.toFixed(2) + " m · " + round.row.name}
      className="probe-elevation"
      active={!!visited}
    >
      <div className="probe-elevation-racks">
        {racks.map(({ layout, fraction, unit, segment }) => {
          const device = segment?.kind === "device" ? segment : null;
          return (
            <button
              key={layout.rack.id}
              disabled={!ready || !device}
              ref={device && device.id === visited ? origin : undefined}
              aria-current={device && device.id === visited ? true : undefined}
              aria-label={
                layout.rack.name +
                " · " +
                (segment ? "U" + unit + " · " + segment.name : "超出安装范围")
              }
              onClick={() => device && onLocate(device.id)}
            >
              <strong>{layout.rack.name.replace(" 机柜", "")}</strong>
              <span className="probe-elevation-column" aria-hidden="true">
                {layout.segments.map((s) => (
                  <i
                    key={s.id}
                    data-kind={s.kind}
                    data-aligned={s === segment || undefined}
                    style={{
                      height:
                        (100 * (s.last - s.first + 1)) / layout.units + "%",
                    }}
                  />
                ))}
                {segment && <b style={{ bottom: 100 * fraction + "%" }} />}
              </span>
              <span>{segment ? "U" + unit : "范围外"}</span>
              <small>{device ? device.name : (segment?.name ?? "—")}</small>
            </button>
          );
        })}
      </div>
      <small>
        横线为探头中心标高。点设备可定位同高安装位。监测范围待核实。
      </small>
    </ConnectionSection>
  );
}
