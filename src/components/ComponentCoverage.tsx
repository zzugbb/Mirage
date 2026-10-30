import { componentCoverage } from "../equipment";
import type { Action } from "../domain";

export function ComponentCoverage({
  dispatch,
}: {
  dispatch: React.Dispatch<Action>;
}) {
  return (
    <details className="component-coverage">
      <summary>
        部件覆盖清单 <span>9 个模组 · 28 个子件</span>
      </summary>
      <p>
        三维模组数不等于实际部件数。左侧导航可选择各子件，未登记条目不会生成独立模型、传感器或告警。
      </p>
      <ul>
        {componentCoverage.map((item) => (
          <li key={item.name}>
            <div>
              <strong>{item.name}</strong>
              <span>{item.quantity}</span>
            </div>
            <small>{item.coverage}</small>
            <p>{item.note}</p>
            {item.partIds.length > 0 && (
              <div className="coverage-select">
                {item.partIds
                  .slice(0, item.partIds.length > 2 ? 1 : 2)
                  .map((id, index) => (
                    <button
                      key={id}
                      onClick={() => dispatch({ type: "select", id })}
                    >
                      选择{item.partIds.length > 1 ? ` ${index + 1}` : "模组"}
                    </button>
                  ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
