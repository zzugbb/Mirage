import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";

/** 同组说明互斥展开；外层工具使用独立组，避免展开内层时关闭入口。 */
export function TemperatureDisclosure({
  className,
  summaryClassName,
  summary,
  actions,
  children,
  onInteract,
  detailsRef,
  name = "temperature-context",
  reveal = false,
}: {
  className: string;
  name?: string;
  reveal?: boolean;
  summaryClassName?: string;
  summary: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  onInteract: () => void;
  detailsRef?: RefObject<HTMLDetailsElement | null>;
}) {
  const ownRef = useRef<HTMLDetailsElement>(null);
  const ref = detailsRef ?? ownRef;
  useEffect(() => {
    if (reveal && ref.current) ref.current.open = true;
  }, [reveal, ref]);
  return (
    <details
      ref={ref}
      name={name}
      className={className}
      onPointerDownCapture={onInteract}
      onKeyDown={(event) => {
        onInteract();
        if (event.key === "Escape" && ref.current?.open) {
          event.preventDefault();
          event.stopPropagation();
          ref.current.open = false;
          ref.current.querySelector("summary")?.focus({ preventScroll: true });
        }
      }}
    >
      <summary className={summaryClassName}>{summary}</summary>
      {actions}
      <div
        className="temperature-disclosure-body"
        tabIndex={0}
        aria-label="温度说明内容"
      >
        {children}
      </div>
    </details>
  );
}
