import * as THREE from "three";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";

/** 文字精灵不是实体遮蔽物。仅在 AO 通道暂时隐藏，保留正常绘制和深度遮挡。 */
export function withoutAnnotationOccluders<T>(
  scene: THREE.Scene,
  render: () => T,
): T {
  const hidden: THREE.Sprite[] = [];
  scene.traverse((object) => {
    if (object instanceof THREE.Sprite && object.visible) {
      hidden.push(object);
      object.visible = false;
    }
  });
  try {
    return render();
  } finally {
    for (const sprite of hidden) sprite.visible = true;
  }
}

/** 正常颜色已由前置 RenderPass 绘制；不修改第三方内部可见性缓存。 */
export class AnnotationAwareGTAOPass extends GTAOPass {
  override render(...args: Parameters<GTAOPass["render"]>) {
    withoutAnnotationOccluders(this.scene, () => super.render(...args));
  }
}
