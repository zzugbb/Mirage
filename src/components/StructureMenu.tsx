import type { ReactNode } from "react";
import { useDismissibleMenu } from "../use-dismissible-menu";

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
  return (
    <StructureActionMenu
      label="结构操作"
      percent={showProgress ? Math.round(amount * 100) : undefined}
    >
      <label className="review-explode-label">
        展开比例
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
    </StructureActionMenu>
  );
}

export function StructureActionMenu({
  label,
  percent,
  children,
}: {
  label: string;
  percent?: number;
  children: ReactNode;
}) {
  const menu = useDismissibleMenu();
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
        {label}
        {percent !== undefined && <span>{percent}%</span>}
      </summary>
      <div>{children}</div>
    </details>
  );
}
