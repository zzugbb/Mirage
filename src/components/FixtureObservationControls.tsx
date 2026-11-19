export function FixtureObservationControls<T extends string>({
  title,
  subject,
  views,
  value,
  ready,
  onView,
}: {
  title: string;
  subject: string;
  views: readonly { id: T; label: string }[];
  value: T;
  ready: boolean;
  onView: (view: T | null) => void;
}) {
  return (
    <section
      className="fixture-observation-controls"
      aria-label={`${subject}分段观察`}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !ready) return;
        event.preventDefault();
        event.stopPropagation();
        onView(null);
      }}
    >
      <label>
        {title}
        <select
          aria-label={`${subject}观察范围`}
          value={value}
          disabled={!ready}
          onChange={(event) => {
            const range = views.find(({ id }) => id === event.target.value);
            if (range) onView(range.id);
          }}
        >
          {views.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button disabled={!ready} onClick={() => onView(null)}>
        返回原视角
      </button>
    </section>
  );
}
