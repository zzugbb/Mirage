import { entities, parts } from "../domain";
import type { AppState } from "../domain";

export function ObjectTree({
  state,
  onSelect,
}: {
  state: AppState;
  onSelect: (id: string, enter?: boolean) => void;
}) {
  return (
    <aside className="object-panel">
      <div className="panel-title">
        场景对象 <span>05</span>
      </div>
      <p className="panel-caption">原创场景 · 授权模型</p>
      <nav className="object-scroll" aria-label="场景对象">
        {entities
          .filter((entity) => entity.kind !== "part")
          .map((entity) => (
            <button
              key={entity.id}
              className={`tree-row depth-${entity.kind === "device" ? 2 : entity.kind === "room" ? 0 : 1}`}
              aria-pressed={state.selected === entity.id}
              onClick={() => onSelect(entity.id)}
              onDoubleClick={() => onSelect(entity.id, true)}
            >
              <span
                className={`entity-icon ${entity.kind}`}
                aria-hidden="true"
              />
              {entity.name}
              {entity.kind === "rack" && <small>42U</small>}
            </button>
          ))}
        {state.level === "device" && (
          <div className="part-tree">
            <div className="part-tree-title">
              设备部件 <span>09</span>
            </div>
            {parts.map((part, index) => (
              <button
                key={part.id}
                className="tree-row part-row"
                aria-pressed={state.selected === part.id}
                onClick={() => onSelect(part.id)}
              >
                <span className="part-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {part.name}
                <small>{part.slot.split("-")[0]}</small>
              </button>
            ))}
          </div>
        )}
      </nav>
      <div className="navigator-foot">
        <div className="mini-orbit" aria-hidden="true">
          <span />
        </div>
        <p>
          现实的投影
          <br />
          <strong>可探索的世界。</strong>
        </p>
      </div>
    </aside>
  );
}
