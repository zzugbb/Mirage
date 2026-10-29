// 40° 垂直视场角的保守取景；窄屏由水平视野决定距离。
export function frameDistance(size: number, aspect: number, minimum: number) {
  return Math.max(minimum, (size * 1.55) / Math.min(1, Math.max(0.2, aspect)));
}
