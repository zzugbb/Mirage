import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/** 关系按需展开，摘要保持可发现；追踪对端时自动接续展开状态。 */
export function ConnectionSection({
  title,
  summary,
  className,
  active = false,
  onInteract,
  children,
}: {
  title: string;
  summary: string;
  className: string;
  active?: boolean;
  onInteract?: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (active && ref.current) ref.current.open = true;
  }, [active]);
  return (
    <details
      ref={ref}
      className={`connection-section ${className}`}
      onPointerDownCapture={onInteract}
      onKeyDownCapture={onInteract}
    >
      <summary>
        <span>{title}</span>
        <small>{summary}</small>
      </summary>
      <div className="connection-content" aria-label={title}>
        {children}
      </div>
    </details>
  );
}
