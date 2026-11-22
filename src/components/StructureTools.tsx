import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { AssemblyCheck } from "../assembly-pairs";

export type StructureTool =
  "fans" | "storage" | "memory" | AssemblyCheck["tool"];

/** 未开始的核对工具按需展开；明确结束后才恢复入口，不跟随回看抢焦点。 */
export function StructureTools({
  children,
  showSelection = false,
  assemblies,
  memory,
  fans,
  hasFanDuct,
  slots,
  ready,
  restore,
  onRestored,
  onStart,
}: {
  children?: React.ReactNode;
  showSelection?: boolean;
  assemblies: readonly AssemblyCheck[];
  memory: number;
  fans: number;
  hasFanDuct: boolean;
  slots: number;
  ready: boolean;
  restore: StructureTool | null;
  onRestored: () => void;
  onStart: (tool: StructureTool) => void;
}) {
  const [open, setOpen] = useState(!!restore || showSelection);
  const host = useRef<HTMLDetailsElement>(null);
  const pendingFocus = useRef<StructureTool | null>(restore);
  useEffect(() => {
    const release = () => {
      pendingFocus.current = null;
    };
    document.addEventListener("pointerdown", release, true);
    document.addEventListener("keydown", release, true);
    document.addEventListener("wheel", release, {
      capture: true,
      passive: true,
    });
    return () => {
      document.removeEventListener("pointerdown", release, true);
      document.removeEventListener("keydown", release, true);
      document.removeEventListener("wheel", release, true);
    };
  }, []);
  useLayoutEffect(() => {
    if (!restore) return;
    pendingFocus.current = restore;
    setOpen(true);
  }, [restore]);
  useLayoutEffect(() => {
    if (!ready || !open || !pendingFocus.current) return;
    const entry = host.current?.querySelector<HTMLButtonElement>(
      `[data-structure-tool="${pendingFocus.current}"]`,
    );
    if (!entry || entry.disabled) return;
    entry.focus({ preventScroll: true });
    entry.scrollIntoView({ block: "nearest" });
    if (restore) onRestored();
  }, [ready, open, restore]);
  return (
    <details
      className="structure-tools"
      ref={host}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        host.current?.querySelector("summary")?.focus({ preventScroll: true });
      }}
    >
      <summary>
        <strong>结构核对</strong>
        <small>
          {[
            ...assemblies.map((check) =>
              "summary" in check ? check.summary : check.name,
            ),
            memory ? "内存组" : "",
            fans ? "风扇组" : "",
            slots || children ? "盘位" : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </summary>
      <div role="group" aria-label="结构核对工具">
        {children}
        {assemblies.map((assembly) => (
          <button
            key={assembly.tool}
            data-structure-tool={assembly.tool}
            disabled={!ready}
            onClick={() => onStart(assembly.tool)}
          >
            <strong>
              {assembly.entry} <span>↗</span>
            </strong>
            <small>{assembly.detail}</small>
          </button>
        ))}
        {memory > 0 && (
          <button
            data-structure-tool="memory"
            disabled={!ready}
            onClick={() => onStart("memory")}
          >
            <strong>
              核对内存组 · {memory} 条 <span>↗</span>
            </strong>
            <small>按 DIMM 编号选条，可核对插槽与两端卡扣</small>
          </button>
        )}
        {fans > 0 && (
          <button
            data-structure-tool="fans"
            disabled={!ready}
            onClick={() => onStart("fans")}
            aria-label={`核对风扇组 · ${fans} 子件 ↗`}
          >
            <strong>
              核对风扇组 · {fans} 子件 <span>↗</span>
            </strong>
            <small>
              {hasFanDuct
                ? "观察前后侧、对照导风罩或单看风扇"
                : "整组前后侧观察、逐件检视与返回"}
            </small>
          </button>
        )}
        {slots > 0 && (
          <button
            data-structure-tool="storage"
            disabled={!ready}
            onClick={() => onStart("storage")}
            aria-label={`核对 ${slots} 个盘位 ↗`}
          >
            <strong>
              核对 {slots} 个盘位 <span>↗</span>
            </strong>
            <small>正面盘组、单盘检视与中板接点</small>
          </button>
        )}
        <p>沿用当前机型的维护子件与配置示意。</p>
      </div>
    </details>
  );
}
