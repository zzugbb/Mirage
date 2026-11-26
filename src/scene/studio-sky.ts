import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { createLinearBackdrop } from "./rendering.ts";

const studio = definition.rendering.inspectionStudio;
const channel = new THREE.Color();
const linearChannel = Uint16Array.from({ length: 256 }, (_, value) =>
  THREE.DataUtils.toHalfFloat(
    channel.setRGB(value / 255, 0, 0, THREE.SRGBColorSpace).r,
  ),
);

// 原创远景：柜层以不对称长弧勾出景深，设备层以边缘走线衬托硬件。
export function createStudioSky(device: boolean, subdued: boolean) {
  const canvas = document.createElement("canvas");
  const designWidth = 1920;
  const designHeight = 960;
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(canvas.width / designWidth, canvas.height / designHeight);
  const wash = ctx.createLinearGradient(0, 0, 0, designHeight);
  const stops = device ? studio.deviceSky : studio.rackSky;
  [0, 0.46, 0.68, 1].forEach((at, i) => wash.addColorStop(at, stops[i]));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, designWidth, designHeight);
  function mist(x: number, y: number, r: number, color: string) {
    const light = ctx.createRadialGradient(x, y, 0, x, y, r);
    light.addColorStop(0, color);
    light.addColorStop(1, "transparent");
    ctx.fillStyle = light;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  mist(105, 395, 510, "rgba(47,132,146,0.19)");
  mist(1840, 360, 510, "rgba(91,120,161,0.16)");
  ctx.globalAlpha = subdued ? 0.42 : 0.72;
  if (!device) {
    for (const [i, arc] of studio.rackArcs.entries()) {
      const [x, y, cx, cy, dx, dy, endX, endY] = arc;
      const horizontalScale = x < 0 ? 0.84 : 1;
      const gradient = ctx.createLinearGradient(
        x * horizontalScale,
        y,
        endX * horizontalScale,
        endY,
      );
      const tint = i === 3 ? "118,137,185" : "110,181,198";
      const alpha = i === 0 ? 0.53 : i === 1 ? 0.32 : 0.23;
      const nearLeft = x < 0;
      gradient.addColorStop(nearLeft ? 0 : 1, `rgba(${tint},${alpha * 0.6})`);
      gradient.addColorStop(0.42, `rgba(${tint},${alpha})`);
      gradient.addColorStop(nearLeft ? 1 : 0, `rgba(${tint},0)`);
      ctx.beginPath();
      ctx.moveTo(x * horizontalScale, y);
      ctx.bezierCurveTo(
        cx * horizontalScale,
        cy,
        dx * horizontalScale,
        dy,
        endX * horizontalScale,
        endY,
      );
      ctx.strokeStyle = gradient;
      ctx.lineWidth = i === 0 ? 2.25 : 1.5;
      ctx.stroke();
    }
  } else {
    // 同一束刻线疏密有别，少数焊盘留在外侧，中央的机箱与标签保持清晰。
    for (const bank of studio.deviceTraces) {
      ctx.save();
      if (bank.fromRight) {
        ctx.translate(designWidth, 0);
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
  const { width, height } = canvas;
  const source = ctx.getImageData(0, 0, width, height).data;
  const pixels = new Uint16Array(source.length);
  for (let y = 0; y < height; y++) {
    let read = y * width * 4;
    let write = (height - 1 - y) * width * 4;
    for (let x = 0; x < width; x++) {
      pixels[write++] = linearChannel[source[read++]];
      pixels[write++] = linearChannel[source[read++]];
      pixels[write++] = linearChannel[source[read++]];
      read++;
      pixels[write++] = linearChannel[255];
    }
  }
  return createLinearBackdrop(pixels, width, height);
}
