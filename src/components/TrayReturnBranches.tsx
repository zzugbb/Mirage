import { trayReturnBranches } from "../tray-return-branches";

export function TrayReturnBranches({
  trayId,
  ready,
  onOpen,
}: {
  trayId: string;
  ready: boolean;
  onOpen: (deviceId: string) => void;
}) {
  const branches = trayReturnBranches(trayId);
  if (!branches.length) return null;
  return (
    <details className="fixture-relations tray-return-branches">
      <summary>
        经过本桥架的代表回风 <span>{branches.length}</span>
      </summary>
      <ul>
        {branches.map((branch) => {
          const rack = branch.rackName.split(" ")[0];
          const name = `${rack} ${branch.deviceName}`;
          return (
            <li key={branch.deviceId}>
              <div>
                <strong>{name}</strong>
                <small>
                  {branch.units} · {branch.sourceName} ·{" "}
                  {branch.crossings.length} 处交会
                </small>
              </div>
              <button
                disabled={!ready}
                aria-label={`核对 ${name} 回风`}
                onClick={() => onOpen(branch.deviceId)}
              >
                核对回风 ↗
              </button>
            </li>
          );
        })}
      </ul>
      <p>按各柜的代表支路与侧梁轴线的平面交点列出。</p>
    </details>
  );
}
