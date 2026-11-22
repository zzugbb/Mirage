import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

// 列从机前左侧起算，表示装配位置。网络接入清单另外维护逻辑端口。
export const switchCageBanks = definition.switchAssembly.frontCages.map(
  (bank) => ({
    ...bank,
    inserts: (["upper", "lower"] as const).flatMap((row) =>
      Array.from({ length: bank.columns }, (_, index) => ({
        id: [bank.id, row, index + 1].join("-"),
        cageId: [bank.id, row, index + 1, "cage"].join("-"),
        row,
        column: index + 1,
        label:
          (row === "upper" ? "上排" : "下排") + " · 第 " + (index + 1) + " 列",
      })),
    ),
  }),
);

export function switchCageSelection(scopeId?: string) {
  for (const bank of switchCageBanks) {
    const insert = bank.inserts.find(
      (item) => item.id === scopeId || item.cageId === scopeId,
    );
    if (bank.id === scopeId || insert)
      return { bank, insert, showCage: !!insert && insert.cageId === scopeId };
  }
  return { bank: undefined, insert: undefined, showCage: false };
}
