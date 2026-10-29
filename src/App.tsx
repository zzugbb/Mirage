import { useCallback, useEffect, useReducer } from "react";
import { createState, entityById, getPath, transition } from "./domain";
import type { Level } from "./domain";
import { Viewport } from "./components/Viewport";
import { ObjectTree } from "./components/ObjectTree";
import { Inspector } from "./components/Inspector";

export function App() {
  const [state, dispatch] = useReducer(transition, undefined, createState);
  useEffect(() => {
    if (!state.playing) return;
    const timer = window.setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => clearInterval(timer);
  }, [state.playing]);
  const select = useCallback(
    (id: string, enter = false) => {
      const entity = entityById(id);
      if (!entity) return;
      if (enter && ["room", "rack", "device"].includes(entity.kind))
        dispatch({ type: "navigate", level: entity.kind as Level });
      else if (
        (state.level === "device" &&
          entity.kind !== "device" &&
          entity.kind !== "part") ||
        (state.level === "rack" && entity.kind === "facility")
      ) {
        dispatch({
          type: "navigate",
          level: entity.kind === "rack" ? "rack" : "room",
        });
        dispatch({ type: "select", id });
      } else dispatch({ type: "select", id });
    },
    [state.level],
  );
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dispatch({ type: "back" });
        return;
      }
      if (
        (event.target as HTMLElement).matches(
          "input, textarea, select, [contenteditable=true]",
        )
      )
        return;
      if (event.key.toLowerCase() === "f") dispatch({ type: "focus" });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="./" aria-label="Mirage 浮城首页">
          <span className="brand-mark" aria-hidden="true" />
          <b>
            Mirage <span>浮城</span>
          </b>
        </a>
        <span className="header-divider" />
        <span className="header-current">空间探索</span>
        <div className="data-source">
          <i className="status-dot" />
          模拟数据<span>未连接真实设备</span>
        </div>
      </header>
      <div className="breadcrumb">
        <button onClick={() => dispatch({ type: "reset" })}>示意园区</button>
        {getPath(state).map((id, index) => (
          <span key={id}>
            {" "}
            /{" "}
            <button
              aria-current={
                index === getPath(state).length - 1 ? "page" : undefined
              }
              onClick={() =>
                entityById(id)!.kind === "part"
                  ? dispatch({ type: "select", id })
                  : dispatch({
                      type: "navigate",
                      level: entityById(id)!.kind as Level,
                    })
              }
            >
              {entityById(id)!.name}
            </button>
          </span>
        ))}
        {state.level !== "room" && (
          <button
            className="back-button"
            onClick={() => dispatch({ type: "back" })}
          >
            ← 返回上级
          </button>
        )}
      </div>
      <main>
        <ObjectTree state={state} onSelect={select} />
        <Viewport state={state} onSelect={select} />
        <Inspector state={state} dispatch={dispatch} />
      </main>
      <footer className="app-footer">
        <span>
          <i className="status-dot" />
          原创场景 · 授权模型 <span className="footer-muted">· 单位 m</span>
        </span>
        <span className="interaction-hint">
          拖动旋转 <b>·</b> 滚轮缩放 <b>·</b> 双击进入 <b>·</b> F 聚焦 / Esc
          返回
        </span>
        <span className="prototype-label">原型 0.1</span>
      </footer>
    </div>
  );
}
