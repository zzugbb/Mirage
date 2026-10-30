import { tourSteps } from "../tour";
import type { Experience, ExperienceAction } from "../tour";
import type { SceneFeedback } from "../mechanics";
export function TourControls({
  experience,
  feedback,
  hidden,
  dispatch,
}: {
  experience: Experience;
  feedback: SceneFeedback | null;
  hidden: boolean;
  dispatch: React.Dispatch<ExperienceAction>;
}) {
  const { tour } = experience,
    running = tour.mode === "playing",
    manual = tour.mode === "manual";
  return (
    <div className="tour-compact" aria-label="演示巡游">
      <span className={running && !hidden ? "tour-live" : ""}>
        {manual ? "自由探索" : tourSteps[tour.step].title}
      </span>
      <button
        title={feedback?.phase}
        aria-label={manual ? "开始巡游" : running ? "暂停巡游" : "继续巡游"}
        onClick={() =>
          dispatch({ type: running ? "tour-pause" : "tour-resume" })
        }
      >
        {running ? "Ⅱ" : "▷"}
        <span>{running ? "暂停巡游" : "自动巡游"}</span>
      </button>
      {!manual && (
        <button
          className="takeover-compact"
          onClick={() => dispatch({ type: "takeover" })}
        >
          自由探索
        </button>
      )}
    </div>
  );
}
