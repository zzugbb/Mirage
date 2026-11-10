export function NetworkViewActions({
  active,
  ready,
  onObserve,
  onReturn,
}: {
  active: boolean;
  ready: boolean;
  onObserve: () => void;
  onReturn: () => void;
}) {
  return (
    <div
      className="network-view-actions"
      role="group"
      aria-label="连接两端观察"
    >
      <button disabled={!ready} aria-pressed={active} onClick={onObserve}>
        同框观察两端
      </button>
      {active && (
        <button disabled={!ready} onClick={onReturn}>
          返回观察前视角
        </button>
      )}
    </div>
  );
}
