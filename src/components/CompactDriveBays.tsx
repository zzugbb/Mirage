import { compactBayForPart, compactDriveBays } from "../compact-drive-bays";

export function CompactDriveBays({
  selected,
  ready,
  onFocus,
}: {
  selected: string;
  ready: boolean;
  onFocus: (id: string) => void;
}) {
  const current = compactBayForPart(selected);
  const member =
    current?.disk.id === selected || selected === "drives-01" ? "disk" : "tray";
  return (
    <section className="compact-bay-check" aria-label="M1 前置盘位核查">
      <header>
        <strong>前置盘位 · 柜前观察</strong>
        <select
          aria-label="盘位核查部件"
          value={member}
          onChange={(e) =>
            ready &&
            onFocus(
              (current ?? compactDriveBays[0])[
                e.target.value === "disk" ? "disk" : "tray"
              ].id,
            )
          }
        >
          <option value="tray">托架</option>
          <option value="disk">固态硬盘</option>
        </select>
      </header>
      <div
        className="compact-bay-grid"
        role="group"
        aria-label="柜前左侧两列盘位"
      >
        {compactDriveBays.map((bay) => (
          <button
            key={bay.number}
            aria-label={bay.position + " " + bay[member].slot}
            aria-pressed={selected === bay[member].id}
            aria-disabled={!ready}
            onClick={() => ready && onFocus(bay[member].id)}
          >
            {bay[member].slot}
          </button>
        ))}
      </div>
      <p>
        {current
          ? current.position +
            " · " +
            current.tray.slot +
            " ↔ " +
            current.disk.slot
          : "选一个盘位查看对应部件"}
      </p>
      <small>托架按外观模型定位，SSD、盘内板与尾端接口为原创装配示意。</small>
    </section>
  );
}
