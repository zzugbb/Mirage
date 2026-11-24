import { useState } from "react";
import { networkEndpoints, networkLinksFor } from "../network";

export function OutletNetworkBranches({
  deviceId,
  ready,
  onOpen,
}: {
  deviceId: string;
  ready: boolean;
  onOpen: (branchId: string) => void;
}) {
  const branches = networkLinksFor(deviceId, deviceId);
  const [chosen, setChosen] = useState("");
  const branch = branches.find((link) => link.id === chosen) ?? branches[0];
  if (!branch) return null;

  return (
    <details className="pdu-outlet-boundary">
      <summary>同一整机的网络接入</summary>
      <label className="pdu-outlet-search">
        配置网络分支
        <select
          value={branch.id}
          onChange={(event) => setChosen(event.target.value)}
        >
          {branches.map((link) => {
            const [source, target] = networkEndpoints(link.id);
            return (
              <option key={link.id} value={link.id}>
                {source.name} {source.portLabel} → {target.name}{" "}
                {target.portLabel}
              </option>
            );
          })}
        </select>
      </label>
      <button disabled={!ready} onClick={() => onOpen(branch.id)}>
        核对所选分支 ↗
      </button>
    </details>
  );
}
