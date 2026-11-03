export type ScrubPointer = {
  pointerId: number;
  clientX: number;
  clientY: number;
};
export type TrendScrub = {
  pointerId: number;
  startX: number;
  startY: number;
  phase: "pending" | "dragging" | "scrolling";
  lastTime: number | null;
};

/** 触摸先判断方向，纵向手势交还页面；鼠标和笔按下即回看。 */
export function beginTrendScrub(
  pointer: ScrubPointer,
  touch: boolean,
  time: number,
): TrendScrub {
  return {
    pointerId: pointer.pointerId,
    startX: pointer.clientX,
    startY: pointer.clientY,
    phase: touch ? "pending" : "dragging",
    lastTime: touch ? null : time,
  };
}

export function moveTrendScrub(
  scrub: TrendScrub,
  pointer: ScrubPointer,
  time: number,
  ending = false,
): { scrub: TrendScrub; seek: number | null } {
  if (pointer.pointerId !== scrub.pointerId) return { scrub, seek: null };
  let phase = scrub.phase;
  if (phase === "pending") {
    const dx = Math.abs(pointer.clientX - scrub.startX),
      dy = Math.abs(pointer.clientY - scrub.startY);
    if (Math.max(dx, dy) >= 6) phase = dx > dy ? "dragging" : "scrolling";
    else if (ending) phase = "dragging";
  }
  const seek = phase === "dragging" && time !== scrub.lastTime ? time : null;
  return {
    scrub: { ...scrub, phase, lastTime: seek ?? scrub.lastTime },
    seek,
  };
}
