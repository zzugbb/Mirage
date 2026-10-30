import { subparts } from "./domain.ts";

/** 覆盖清单表达本原型的已知边界，不代表某台真实服务器的实际配置。 */
export const componentCoverage = [
  {
    name: "机箱上盖",
    quantity: "1",
    coverage: "独立模型",
    partIds: ["lid-01"],
    note: "可单独选择、展开。",
  },
  {
    name: "主板",
    quantity: "1",
    coverage: "独立模型",
    partIds: ["board-01"],
    note: "主板总成，板上芯片未独立拆分。",
  },
  {
    name: "处理器散热器",
    quantity: "2",
    coverage: "独立模型",
    partIds: ["cpu-01", "cpu-02"],
    note: "当前 CPU 槽位标签映射的是散热器。",
  },
  {
    name: "处理器芯片",
    quantity: "假设 2 路",
    coverage: "逻辑条目",
    partIds: [],
    note: "仅用于示意配置和功耗分配，芯片封装未独立建模。",
  },
  {
    name: "内存",
    quantity: "16 条",
    coverage: "模组与独立子件",
    partIds: [
      "memory-01",
      ...subparts.filter((p) => p.parent === "memory-01").map((p) => p.id),
    ],
    note: "16 条内存可独立选择；演示编号不代表真实槽位，无独立测温。",
  },
  {
    name: "风扇",
    quantity: "4 个",
    coverage: "模组与独立子件",
    partIds: [
      "fans-01",
      ...subparts.filter((p) => p.parent === "fans-01").map((p) => p.id),
    ],
    note: "4 个风扇可独立选择；无独立转速或告警数据。",
  },
  {
    name: "存储盘位",
    quantity: "8 盘位",
    coverage: "模组与独立子件",
    partIds: [
      "storage-01",
      ...subparts.filter((p) => p.parent === "storage-01").map((p) => p.id),
    ],
    note: "8 个盘位构件可独立选择，不推定已安装八块磁盘。",
  },
  {
    name: "磁盘与背板",
    quantity: "配置未定义",
    coverage: "未独立登记",
    partIds: [],
    note: "没有磁盘实例、容量、健康或独立背板映射。",
  },
  {
    name: "电源",
    quantity: "2 个",
    coverage: "独立模型",
    partIds: ["psu-01", "psu-02"],
    note: "仅结构示意，不推断真实冗余能力。",
  },
  {
    name: "网卡 / RAID / GPU",
    quantity: "配置未定义",
    coverage: "未独立登记",
    partIds: [],
    note: "不假定已安装，不生成数量、功耗或告警。",
  },
  {
    name: "线缆 / 接口 / 传感器",
    quantity: "配置未定义",
    coverage: "未独立登记",
    partIds: [],
    note: "当前仅有设备进风温度模拟测点，没有真实传感器。",
  },
] as const;
