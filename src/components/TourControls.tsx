import { presentationKey } from "../domain";
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
  const { tour, scene } = experience;
  const step = tourSteps[tour.step];
  const manual = tour.mode === "manual";
  const running = tour.mode === "playing";
  const waiting =
    !feedback?.settled ||
    feedback.key !== presentationKey(scene) ||
    feedback.phase !== step.phase;
  const status = manual
    ? "自由探索"
    : hidden
      ? "后台暂停"
      : running
        ? waiting
          ? "转场中"
          : "自动巡游"
        : "巡游已暂停";
  return (
    <section className="tour-bar" aria-label="演示巡游">
      <div className="tour-identity">
        <span
          className={`tour-signal ${running && !hidden ? "running" : ""}`}
        />
        <span>{status}</span>
        <small>{manual ? "手动接管" : `第 ${tour.cycle + 1} 轮`}</small>
      </div>
      <div className="tour-chapter">
        <span className="tour-number">
          {String(tour.step + 1).padStart(2, "0")}
          <small> / {String(tourSteps.length).padStart(2, "0")}</small>
        </span>
        <div>
          <strong>{manual ? "由你探索" : step.title}</strong>
          <p>
            {manual
              ? "旋转、选择或深入设备；开始巡游可回到自动展示。"
              : step.description}
          </p>
        </div>
      </div>
      <div className="tour-actions">
        <button
          className="tour-play"
          aria-label={manual ? "开始巡游" : running ? "暂停巡游" : "继续巡游"}
          onClick={() =>
            dispatch({ type: running ? "tour-pause" : "tour-resume" })
          }
        >
          <span aria-hidden="true">{running ? "Ⅱ" : "▷"}</span>
          {manual ? "开始巡游" : running ? "暂停巡游" : "继续巡游"}
        </button>
        {!manual && (
          <button
            className="tour-takeover"
            onClick={() => dispatch({ type: "takeover" })}
          >
            自由探索
          </button>
        )}
        <button
          className="tour-restart"
          aria-label="重新开始巡游"
          title="重新开始巡游"
          onClick={() => dispatch({ type: "tour-restart" })}
        >
          ↺
        </button>
      </div>
      <div
        className={`tour-track ${manual ? "manual" : ""}`}
        aria-hidden={manual}
        role="progressbar"
        aria-label="当前巡游章节停留进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((tour.elapsed / step.duration) * 100)}
        aria-valuetext={`${status}，${tour.step + 1}/${tourSteps.length}，${step.title}`}
      >
        {tourSteps.map((chapter, index) => (
          <span
            key={chapter.title}
            className={
              index === tour.step
                ? "current"
                : index < tour.step
                  ? "complete"
                  : ""
            }
            style={
              {
                "--tour-fill": `${index < tour.step ? 100 : index === tour.step ? (tour.elapsed / step.duration) * 100 : 0}%`,
              } as React.CSSProperties
            }
          >
            <i />
          </span>
        ))}
      </div>
    </section>
  );
}
