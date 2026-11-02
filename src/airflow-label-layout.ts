type Rect = { left: number; top: number; right: number; bottom: number };

/** 在场景内就近放置端点标签，保留控件与已接受标签的间隔。放不下时由可访问路径说明承接。 */
export function placeFlowLabel(
  x: number,
  y: number,
  width: number,
  height: number,
  bounds: Rect,
  blocked: Rect[],
) {
  if (
    width > bounds.right - bounds.left - 16 ||
    height > bounds.bottom - bounds.top - 16
  )
    return null;
  for (const gap of [14, 42, 78, 120]) {
    for (const [candidateLeft, candidateTop] of [
      [x + gap, y - height / 2],
      [x - width - gap, y - height / 2],
      [x - width / 2, y - height - gap],
      [x - width / 2, y + gap],
      [x + gap, y - height - gap],
      [x - width - gap, y - height - gap],
      [x + gap, y + gap],
      [x - width - gap, y + gap],
    ]) {
      const left = Math.max(
        bounds.left + 8,
        Math.min(bounds.right - width - 8, candidateLeft),
      );
      const top = Math.max(
        bounds.top + 8,
        Math.min(bounds.bottom - height - 8, candidateTop),
      );
      const rect = { left, top, right: left + width, bottom: top + height };
      if (
        left < bounds.left + 8 ||
        top < bounds.top + 8 ||
        rect.right > bounds.right - 8 ||
        rect.bottom > bounds.bottom - 8
      )
        continue;
      if (
        blocked.some(
          (r) =>
            left < r.right + 8 &&
            rect.right > r.left - 8 &&
            top < r.bottom + 8 &&
            rect.bottom > r.top - 8,
        )
      )
        continue;
      return rect;
    }
  }
  return null;
}
