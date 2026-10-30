import { modelForDevice, partsForDevice, subpartsForDevice } from "../catalog";
import type { Action } from "../domain";
export function ComponentCoverage({
  deviceId,
  dispatch,
}: {
  deviceId: string;
  dispatch: React.Dispatch<Action>;
}) {
  const model = modelForDevice(deviceId),
    parts = partsForDevice(deviceId),
    children = subpartsForDevice(deviceId);
  return (
    <details className="component-coverage">
      <summary>
        配置与部件 <span>{parts.length + children.length} 项</span>
      </summary>
      <ul>
        {parts.map((part) => (
          <li key={part.id}>
            <button
              className="bom-row"
              onClick={() => dispatch({ type: "select", id: part.id })}
            >
              <strong>{part.name}</strong>
              <span>
                {children.filter((child) => child.parent === part.id).length ||
                  1}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p>未安装：{model.uninstalled.join("、")}</p>
      <dl className="spatial-facts">
        <div>
          <dt>网络</dt>
          <dd>{model.network}</dd>
        </div>
        <div>
          <dt>存储</dt>
          <dd>{model.storage}</dd>
        </div>
      </dl>
    </details>
  );
}
