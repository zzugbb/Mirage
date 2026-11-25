import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { AssemblyCheck } from "../assembly-pairs";

export type StructureTool =
  "cover" | "fans" | "storage" | "memory" | AssemblyCheck["tool"];

/** 未开始的核对工具按需展开；明确结束后才恢复入口，不跟随回看抢焦点。 */
export function StructureTools({
  children,
  showSelection = false,
  assemblies,
  cover,
  memory,
  fans,
  slots,
  ready,
  restore,
  onRestored,
  onStart,
}: {
  children?: React.ReactNode;
  showSelection?: boolean;
  assemblies: readonly AssemblyCheck[];
  cover?: "seated" | "open";
  memory: number;
  fans: number;
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
      </summary>
      <div role="group" aria-label="结构核对工具">
        {children}
        {assemblies.map((assembly) => (
          <button
            key={assembly.tool}
            data-structure-tool={assembly.tool}
            title={assembly.detail}
            disabled={!ready}
            onClick={() => onStart(assembly.tool)}
          >
            <strong>
              {assembly.entry} <span>↗</span>
            </strong>
          </button>
        ))}
        {cover && (
          <button
            data-structure-tool="cover"
            disabled={!ready}
            onClick={() => onStart("cover")}
          >
            <strong>
              {cover === "open" ? "合回机箱上盖" : "核对上盖安装位"}{" "}
              <span>↗</span>
            </strong>
          </button>
        )}
        {memory > 0 && (
          <button
            data-structure-tool="memory"
            disabled={!ready}
            onClick={() => onStart("memory")}
          >
            <strong>
              核对内存组 · {memory} 条 <span>↗</span>
            </strong>
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
          </button>
        )}
      </div>
    </details>
  );
}
