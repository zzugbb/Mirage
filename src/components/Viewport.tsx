import { useEffect, useRef, useState } from 'react';
import { SceneEngine } from '../scene/engine';
import type { AppState } from '../domain';
import type { View } from '../scene/engine';

export function Viewport({ state, onSelect }: { state: AppState; onSelect: (id: string, enter?: boolean) => void }) {
  const host = useRef<HTMLDivElement>(null); const engine = useRef<SceneEngine | null>(null);
  const latestSelect = useRef(onSelect); latestSelect.current = onSelect;
  const [error, setError] = useState(''); const [revision, setRevision] = useState(0); const [view, setView] = useState<View>('iso');
  const initial = useRef(state);
  useEffect(() => {
    let active: SceneEngine | null = null;
    try { active = new SceneEngine(host.current!, initial.current, (id, enter) => latestSelect.current(id, enter), setError); engine.current = active; }
    catch { setError('三维场景启动失败。请确认浏览器支持 WebGL 2，并已开启硬件加速。'); }
    return () => { active?.dispose(); engine.current = null; };
  }, [revision]);
  useEffect(() => { engine.current?.update(state); }, [state]);
  useEffect(() => { setView('iso'); }, [state.level, state.focusRevision]);
  const setCamera = (next: View) => { setView(next); engine.current?.view(next); };
  return <section className="viewport" aria-label="三维工作区">
    <div className="canvas-host" ref={host} />
    <div className="scene-heading"><span className="overline">空间与结构探索</span><h1>{state.level === 'room' ? '01号机房' : state.level === 'rack' ? 'A01 机柜' : 'SRV-01'}</h1><p>{state.level === 'room' ? '从空间，深入每一个细节。' : state.level === 'rack' ? '42U · 一台代表性设备' : '2U 通用服务器 · 原创结构示意'}</p></div>
    <div className="view-switch" aria-label="标准视角">{([['iso', '等轴'], ['top', '俯视'], ['front', '前视'], ['right', '右视']] as const).map(([key, label]) => <button key={key} aria-pressed={view === key} onClick={() => setCamera(key)}>{label}</button>)}</div>
    <div className="scene-index"><span>{state.level === 'room' ? '01' : state.level === 'rack' ? '02' : '03'}</span><small>/{state.level === 'room' ? '机房空间' : state.level === 'rack' ? '机柜结构' : '设备结构'}</small></div>
    <div className="axis" aria-hidden="true"><i className="axis-y">Y</i><i className="axis-x">X</i><i className="axis-z">Z</i></div>
    <div className="canvas-toolbar"><button onClick={() => engine.current?.view('iso', true)}><span className="tool-symbol">⌖</span>聚焦选择</button><span className="divider" /><button onClick={() => engine.current?.zoom(0.8)} aria-label="放大">＋</button><button onClick={() => engine.current?.zoom(1.25)} aria-label="缩小">−</button><span className="divider" /><button onClick={() => setCamera('iso')}><span className="tool-symbol">↺</span>复位视角</button></div>
    {error && <div className="scene-error" role="alert"><h2>场景暂不可用</h2><p>{error}</p><button onClick={() => { setError(''); initial.current = state; setRevision(value => value + 1); }}>重新加载</button></div>}
  </section>;
}
