import {
  networkEndpoints,
  networkLinksFor,
  switchRole,
  type NetworkLink,
} from "../network";
import { deviceById } from "../installation";

export function NetworkBranchPicker({
  link,
  ready,
  onTrace,
}: {
  link: NetworkLink;
  ready: boolean;
  onTrace: (linkId: string) => void;
}) {
  return (
    <label>
      配置接入
      <select
        aria-label="当前设备的接入分支"
        value={link.id}
        disabled={!ready}
        onChange={(event) => onTrace(event.target.value)}
      >
        {networkLinksFor(link.source, link.source).map((branch) => (
          <option key={branch.id} value={branch.id}>
            {switchRole(branch.target)} · {branch.speedGbps} Gb/s
          </option>
        ))}
      </select>
    </label>
  );
}

export function NetworkTrace({
  link,
  deviceId,
  inside,
  showEndMark,
  ready,
  onPreview,
  onLocate,
  onInspect,
  onTrace,
}: {
  link: NetworkLink;
  deviceId: string | null;
  inside: string | null;
  showEndMark: boolean;
  ready: boolean;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  onInspect: (id: string) => void;
  onTrace: (id: string | null) => void;
}) {
  const ends = networkEndpoints(link.id);
  const current = ends.find((end) => end.deviceId === deviceId) ?? ends[0];
  return (
    <section className="network-trace" aria-label="当前网络连接">
      <header>
        <NetworkBranchPicker link={link} ready={ready} onTrace={onTrace} />
        {showEndMark && <button onClick={() => onTrace(null)}>结束标记</button>}
      </header>
      <div
        className="network-endpoint-picker"
        role="group"
        aria-label="预览连接端点"
      >
        {ends.map((end) => (
          <button
            key={end.side}
            aria-label={`预览端点 ${end.name}`}
            aria-pressed={end.side === current.side}
            onClick={() => onPreview(end.deviceId)}
            data-endpoint={end.deviceId}
          >
            <small>
              {end.ordinal} {end.side === "source" ? "设备端" : "交换机端"}
            </small>
            <strong>{end.name}</strong>
          </button>
        ))}
      </div>
      <p>
        {current.location} · {current.portLabel}
      </p>
      {inside && inside !== current.deviceId && (
        <p>当前展示台为 {deviceById(inside)?.name}</p>
      )}
      <div className="network-endpoint-actions">
        <button
          disabled={!ready}
          onClick={() => onLocate(current.deviceId)}
          aria-label={`定位安装位 ${current.name}`}
        >
          定位安装位
        </button>
        <button
          disabled={!ready}
          onClick={() => onInspect(current.deviceId)}
          aria-label={`查看 ${current.name} 的${current.partName}`}
        >
          查看{current.partName}
        </button>
      </div>
    </section>
  );
}
