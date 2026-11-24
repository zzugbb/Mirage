import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

const { size, leftWallColumns } = definition.room;
const [roomWidth, , roomDepth] = size;
const edge = roomDepth / 2 - leftWallColumns.endInset;
export const leftWallId = "shell-left-wall";
export const leftWallColumnSize = leftWallColumns.size;
export const leftWallColumnCenters = [
  -edge,
  ...leftWallColumns.interiorZ,
  edge,
].map((z) => [-roomWidth / 2, leftWallColumns.centerHeight, z]);
