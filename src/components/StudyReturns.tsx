import { useDismissibleMenu } from "../use-dismissible-menu";

export type StudyReturn = {
  group: string;
  label: string;
  caption?: string;
  disabled: boolean;
  onReturn: () => void;
  escapeReturns?: boolean;
  end?: { label: string; disabled?: boolean; onClick: () => void };
};

export function StudyReturns({ actions }: { actions: StudyReturn[] }) {
  const menu = useDismissibleMenu();
  const [primary, ...otherActions] = actions;
  if (!primary) return null;
  const end = primary.end;
  const close = () => {
    if (menu.current) menu.current.open = false;
  };
  return (
    <div className="study-return-controls">
      <div
        className="study-task-return"
        role="group"
        aria-label={primary.group}
        onKeyDown={(event) => {
          if (
            event.key !== "Escape" ||
            !primary.escapeReturns ||
            primary.disabled
          )
            return;
          event.preventDefault();
          event.stopPropagation();
          primary.onReturn();
        }}
      >
        <button
          type="button"
          title={primary.label}
          aria-label={primary.caption ? primary.label : undefined}
          disabled={primary.disabled}
          onClick={() => {
            close();
            primary.onReturn();
          }}
        >
          {primary.caption ?? primary.label}
        </button>
      </div>
      {(otherActions.length > 0 || end) && (
        <details
          className="study-return-options"
          ref={menu}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !menu.current?.open) return;
            event.preventDefault();
            event.stopPropagation();
            close();
            menu.current.querySelector("summary")?.focus();
          }}
        >
          <summary aria-label="返回选项" title="返回选项">
            更多
          </summary>
          <div className="study-return-list">
            {otherActions.map((action) => (
              <button
                type="button"
                key={action.group}
                disabled={action.disabled}
                onClick={() => {
                  close();
                  action.onReturn();
                }}
              >
                {action.label}
              </button>
            ))}
            {end && (
              <button
                type="button"
                className="study-end-return"
                title={end.label}
                disabled={end.disabled}
                onClick={() => {
                  close();
                  end.onClick();
                }}
              >
                结束当前核对
              </button>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
