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
    // 同一束刻线疏密有别，少数焊盘留在外侧，中央的机箱与标签保持清晰。
    for (const bank of studio.deviceTraces) {
      ctx.save();
      if (bank.fromRight) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 0; i < bank.count; i++) {
        const y = bank.height + i * bank.pitch;
        const elbow = bank.elbow + i * 5,
          shelf = Math.max(elbow + bank.rise + 52, bank.span - (i % 3) * 44);
        const tip = shelf + 25;
        const tint = bank.fromRight ? "130,154,193" : "103,169,184";
        const gradient = ctx.createLinearGradient(0, 0, tip, 0);
        gradient.addColorStop(0, `rgba(${tint},.10)`);
        gradient.addColorStop(
          0.43,
          `rgba(${tint},${i % 3 === 0 ? 0.52 : 0.29})`,
        );
        gradient.addColorStop(1, `rgba(${tint},.08)`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = i % 3 === 0 ? 2.4 : 1.65;
        ctx.beginPath();
        ctx.moveTo(-6, y);
        ctx.bezierCurveTo(
          elbow * 0.8,
          y + bank.pitch * 0.65,
          elbow + bank.rise * 0.45,
          y - bank.rise,
          elbow + bank.rise + 35,
          y - bank.rise,
        );
        ctx.lineTo(shelf, y - bank.rise);
        ctx.quadraticCurveTo(
          shelf + 3,
          y - bank.rise,
          shelf + 6,
          y - bank.rise - 5,
        );
        ctx.lineTo(tip, y - bank.rise - 25);
        ctx.stroke();
        if (i % 3 === 0) {
          ctx.strokeStyle = `rgba(${tint},.34)`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(tip + 2, y - bank.rise - 27, 3.1, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
