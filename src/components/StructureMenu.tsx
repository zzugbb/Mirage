import { useEffect, useRef, type ReactNode } from "react";

export function StructureMenu({
  amount,
  onChange,
  showProgress = false,
  children,
}: {
  amount: number;
  onChange: (amount: number) => void;
  showProgress?: boolean;
  children: ReactNode;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismissOutside = (event: Event) => {
      if (
        menu.current?.open &&
        event.target instanceof Node &&
        !menu.current.contains(event.target)
      )
        menu.current.open = false;
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    document.addEventListener("focusin", dismissOutside, true);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside, true);
      document.removeEventListener("focusin", dismissOutside, true);
    };
  }, []);
  return (
    <details
      ref={menu}
      className="review-explode-settings structure-task-menu"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !event.currentTarget.open) return;
        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }}
    >
      <summary>
        结构操作
        {showProgress && amount > 0 && ` · ${Math.round(amount * 100)}%`}
      </summary>
      <div>
        <label className="review-explode-label">
          展开{" "}
          <input
            aria-label="部件展开进度"
            type="range"
            min="0"
            max="100"
            value={amount * 100}
            onChange={(e) => onChange(Number(e.target.value) / 100)}
          />
          <output>{Math.round(amount * 100)}%</output>
        </label>
        {children}
      </div>
    </details>
  );
}
