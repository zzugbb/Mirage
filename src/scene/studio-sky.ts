import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };

const studio = definition.rendering.inspectionStudio;

// 原创远景：柜层以不对称长弧勾出景深，设备层以边缘走线衬托硬件。
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
  function mist(x: number, y: number, r: number, color: string) {
    const light = ctx.createRadialGradient(x, y, 0, x, y, r);
    light.addColorStop(0, color);
    light.addColorStop(1, "transparent");
    ctx.fillStyle = light;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  mist(220, 380, 630, "rgba(43,143,161,0.25)");
  mist(1710, 345, 580, "rgba(101,103,182,0.25)");
  if (!device) {
    for (const [i, arc] of studio.rackArcs.entries()) {
      const [x, y, cx, cy, dx, dy, endX, endY] = arc;
      const gradient = ctx.createLinearGradient(x, y, endX, endY);
      const tint = i === 3 ? "118,137,185" : "110,181,198";
      const alpha = i === 0 ? 0.53 : i === 1 ? 0.32 : 0.23;
      const nearLeft = x < 0;
      gradient.addColorStop(nearLeft ? 0 : 1, `rgba(${tint},${alpha * 0.6})`);
      gradient.addColorStop(0.42, `rgba(${tint},${alpha})`);
      gradient.addColorStop(nearLeft ? 1 : 0, `rgba(${tint},0)`);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(cx, cy, dx, dy, endX, endY);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = i === 0 ? 2.25 : 1.5;
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
        ctx.beginPath();
        ctx.moveTo(-10, y);
        ctx.lineTo(turn, y);
        ctx.lineTo(turn + 92, y - 86);
        ctx.lineTo(end, y - 86);
        ctx.lineTo(end + 42, y - 125);
        ctx.strokeStyle = k % 5 === 0 ? "#426f80" : "#294959";
        ctx.stroke();
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
    let seed = 73;
    const random = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 52; i++) {
      const x = random() * 1920,
        y = 210 + random() * 370;
      if (x > 630 && x < 1300) continue;
      ctx.fillStyle = i % 8 === 0 ? "#a7c9bc" : "#52738a";
      ctx.fillRect(x, y, i % 8 === 0 ? 3 : 1.5, 1.4);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
