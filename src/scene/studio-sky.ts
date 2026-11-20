import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };

const studio = definition.rendering.inspectionStudio;

// 原创远景：柜层是云海中的城市断面，设备层沿用同色导光线并放大为布线图。
export function createStudioSky(device: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 960;
  const ctx = canvas.getContext("2d")!;
  const wash = ctx.createLinearGradient(0, 0, 0, 960);
  const stops = device ? studio.deviceSky : studio.rackSky;
  [0, 0.46, 0.68, 1].forEach((at, i) => wash.addColorStop(at, stops[i]));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 1920, 960);
  type Point = [number, number];
  function path(points: Point[], stroke: string, fill?: string) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (fill) {
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  function mist(x: number, y: number, r: number, color: string) {
    const light = ctx.createRadialGradient(x, y, 0, x, y, r);
    light.addColorStop(0, color);
    light.addColorStop(1, "transparent");
    ctx.fillStyle = light;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  mist(220, 380, 630, "rgba(43,143,161,0.25)");
  mist(1710, 345, 580, "rgba(101,103,182,0.25)");
  // 保持中心留白。近远两岸轮廓大小不同，轮廓中的短窗灯给出尺度。
  let seed = 73;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  if (!device) {
    // 城廓的地平线留在柜体之后，远岸进入雾中。前景陆块由一束等高线托起。
    const coast = (x: number) =>
      417 + 21 * Math.sin(x / 184) + 13 * Math.sin(x / 75);
    for (const [start, end, scale] of studio.shorelines) {
      for (let x = start; x < end; x += 7) {
        const envelope = Math.pow(
          Math.sin((Math.PI * (x - start)) / (end - start)),
          1.4,
        );
        const base = coast(x),
          w = 6 + random() * 16,
          h = (4 + random() * 46) * envelope * scale;
        ctx.fillStyle = "#233e51";
        ctx.fillRect(x, base - h, w, h + 4);
        if (h > 15) {
          ctx.fillStyle = "#637c84";
          for (let wy = base - h + 4; wy < base - 3; wy += 5)
            if (random() > 0.41) ctx.fillRect(x + 2, wy, Math.min(w - 3, 8), 1);
        }
      }
      for (let k = 13; k >= 0; k--) {
        const top: Point[] = [],
          bottom: Point[] = [];
        const n = 90;
        for (let i = 0; i <= n; i++) {
          const t = i / n,
            x = start + (end - start) * t;
          const taper = Math.pow(Math.sin(t * Math.PI), 0.7);
          const y = coast(x) + k * (7 + 2.3 * Math.sin(x / 110)) * taper;
          top.push([x, y]);
          bottom.push([x, y + (3 + k * 0.13) * taper]);
        }
        path(
          [...top, ...bottom.reverse()],
          k % 5 === 0 ? "#3c6c80" : "#294758",
          k % 5 === 0 ? "#2b4d5d" : "#1f384c",
        );
      }
    }
    // 跨越远岸的引航弧比天际线浅，延伸到画面之外。
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(-20, 520 + k * 4);
      ctx.bezierCurveTo(345, 542 + k * 4, 535, 415 + k * 3, 766, 425 + k);
      ctx.strokeStyle = k === 0 ? "#37576c" : "#28475e";
      ctx.stroke();
    }
  } else {
    // 设备更靠近观察者，周边只显露蚀刻走线、焊盘与一小片点阵，中心供零件展开。
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side === -1 ? 0 : 1920, 0);
      ctx.scale(-side, 1);
      const base = side === -1 ? 479 : 359;
      for (let k = 0; k < 15; k++) {
        const y = base + k * 8,
          turn = 88 + k * 3,
          end = 306 + 23 * (k % 5);
        path(
          [
            [-10, y],
            [turn, y],
            [turn + 92, y - 86],
            [end, y - 86],
            [end + 42, y - 125],
          ],
          k % 5 === 0 ? "#426f80" : "#294959",
        );
        ctx.beginPath();
        ctx.arc(end + 42, y - 125, 3, 0, Math.PI * 2);
        ctx.strokeStyle = "#436779";
        ctx.stroke();
      }
      for (let x = 38; x < 330; x += 19)
        for (let y = base + 85; y < base + 187; y += 16) {
          if ((x + y) % 5 === 0) continue;
          ctx.fillStyle = "#304a5d";
          ctx.fillRect(x, y, 2, 2);
        }
      ctx.restore();
    }
  }
  for (let i = 0; i < 52; i++) {
    const x = random() * 1920,
      y = 210 + random() * 370;
    if (x > 630 && x < 1300) continue;
    ctx.fillStyle = i % 8 === 0 ? "#a7c9bc" : "#52738a";
    ctx.fillRect(x, y, i % 8 === 0 ? 3 : 1.5, 1.4);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
