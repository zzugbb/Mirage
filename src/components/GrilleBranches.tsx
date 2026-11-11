import { useLayoutEffect, useRef, type RefObject } from "react";
import { grilleBranches, type GrilleBranch } from "../grille-inspection";
import { unitLabel } from "../catalog";

export type GrilleReturnFocus = {
  rowId: string;
  rackId: string;
  scroll: number;
} | null;

export function GrilleBranches({
  rowId,
  ready,
  activeRack,
  restore,
  onPreview,
  onLocate,
  onAirflow,
}: {
  rowId: string;
  ready: boolean;
  activeRack?: string;
  restore: RefObject<GrilleReturnFocus>;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  onAirflow: (branch: GrilleBranch, scroll: number) => void;
}) {
  const host = useRef<HTMLDetailsElement>(null);
  useLayoutEffect(() => {
    const target = restore.current;
    if (!ready || target?.rowId !== rowId || !host.current) return;
    host.current.open = true;
    const panel = host.current.closest<HTMLElement>(".study-inspector");
    if (panel) panel.scrollTop = target.scroll;
    host.current
      .querySelector<HTMLButtonElement>(`[data-branch="${target.rackId}"]`)
      ?.focus({ preventScroll: true });
    restore.current = null;
  }, [rowId, ready, restore]);
  const branches = grilleBranches(rowId);
  return (
    <details
      className="fixture-relations grille-branches"
      ref={host}
      aria-label="格栅对应柜排"
    >
      <summary>
        对应柜排 <span>{branches.length}</span>
      </summary>
      <p>
        代表设备按既有配置高度选取，不按温度排名。最近格栅只对应示意落点，不表示独占供风。
      </p>
      {branches.map((branch) => (
        <div key={branch.rack.id}>
          <button
            aria-label={`预览${branch.rack.name}`}
            onClick={() => onPreview(branch.rack.id)}
          >
            <strong>{branch.rack.name}</strong>
            <small>柜前布置 · 格栅 {branch.grille.id.split("-").at(-1)}</small>
          </button>
          <button
            aria-label={`定位${branch.rack.name}`}
            onClick={() => onLocate(branch.rack.id)}
          >
            定位
          </button>
          <span className="grille-branch-device">
            代表设备 {branch.device.name} · {unitLabel(branch.device.id)}
          </span>
          <button
            className="grille-branch-open"
            data-branch={branch.rack.id}
            aria-pressed={activeRack === branch.rack.id}
            disabled={!ready}
            aria-label={`查看${branch.rack.name}代表气流`}
            onClick={() =>
              onAirflow(
                branch,
                host.current?.closest<HTMLElement>(".study-inspector")
                  ?.scrollTop ?? 0,
              )
            }
          >
            查看代表气流 ↗
          </button>
        </div>
      ))}
    </details>
  );
}
