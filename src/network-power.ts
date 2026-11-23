import { networkEndpoints } from "./network.ts";
import { powerLinksForContext } from "./power-trace.ts";

// 先取网络连接的两端，再按各自设备身份查供电，网络分支不筛选电源输入。
export function networkPowerEnds(linkId: string) {
  return networkEndpoints(linkId).map((end) => ({
    ...end,
    inputs: powerLinksForContext(end.deviceId, end.deviceId),
  }));
}
