import { useEffect, useRef, useState, type RefObject } from "react";
import type { SceneEngine, View } from "./scene/engine";
import type { AirflowRoute } from "./airflow";
import type { AirflowView } from "./airflow-view";
import { initialSliceControls } from "./temperature-slice";

/** 气流观察与可选叠片独立于温度工作区；场景、时间和结构仍由同一引擎维护。 */
export function useAirflowWorkspace({
  engine,
  scope,
  resetKey,
  onTakeover,
  onView,
  onStopOrbit,
}: {
  engine: RefObject<SceneEngine | null>;
  scope: string;
  resetKey: string;
  onTakeover: () => void;
  onView: (view: View) => void;
  onStopOrbit: () => void;
}) {
  const [view, setView] = useState<AirflowView | null>(null);
  const [sliceEnabled, setSliceEnabled] = useState(false);
  const [sliceControls, setSliceControls] = useState(initialSliceControls);
  useEffect(() => setSliceControls(initialSliceControls()), [resetKey]);
  const panel = useRef<HTMLElement>(null);
  const focus = useRef<"view" | "return" | null>(null);
  useEffect(() => {
    engine.current?.clearAirflowView();
    setSliceEnabled(false);
  }, [scope]);
  useEffect(() => {
    if (!focus.current) return;
    let frame = 0;
    const restore = () => {
      const selector = panel.current?.querySelector<HTMLSelectElement>(
        'select[aria-label="气流观察范围"]',
      );
      if (!selector) {
        focus.current = null;
        return;
      }
      if (engine.current?.moving || selector.disabled) {
        frame = requestAnimationFrame(restore);
        return;
      }
      focus.current = null;
      selector.focus({ preventScroll: true });
    };
    frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [view]);
  return {
    view,
    setView,
    sliceEnabled,
    setSliceEnabled,
    sliceControls,
    setSliceControls,
    panel,
    observe(route: AirflowRoute, next: AirflowView) {
      onTakeover();
      onStopOrbit();
      focus.current = "view";
      engine.current?.observeAirflow(route, next);
      if (engine.current) onView(engine.current.currentView);
    },
    restore() {
      onTakeover();
      focus.current = "return";
      engine.current?.restoreAirflowView();
      if (engine.current) onView(engine.current.currentView);
    },
  };
}
