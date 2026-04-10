export interface CharacterData {
  id: string;
  name: string;
  gender: string;
  type: string;
  species: string[];
  powerTypes: string[];
  origin: string;
  keywords: string[];
  apparitionYear?: number;
  firstApparitionComicTitle?: string;
  actorName?: string;
  appearanceTypes?: string[];
  affiliations?: string[];
}

export type TileColor = "none" | "exact" | "partial" | "upper" | "lower";

export interface TileState {
  key: string;
  label: string;
  value: string | number | string[];
  color: TileColor;
  isArray?: boolean;
  isNumeric?: boolean;
}

export interface GuessEntry {
  character: CharacterData;
  tiles: TileState[];
}

export const BP = "/marveldle-answers";

export async function loadCharacters(mode: "comics" | "mcu"): Promise<CharacterData[]> {
  const res = await fetch(`${BP}/data/${mode}.json`);
  if (!res.ok) throw new Error("Failed to load characters");
  return await res.json();
}

export function getComicsTiles(c: CharacterData): TileState[] {
  return [
    { key: "gender", label: "Gender", value: c.gender, color: "none" },
    { key: "type", label: "Type", value: c.type, color: "none" },
    { key: "species", label: "Species", value: c.species || [], color: "none", isArray: true },
    { key: "powerTypes", label: "Powers", value: c.powerTypes || [], color: "none", isArray: true },
    { key: "origin", label: "Origin", value: c.origin, color: "none" },
    { key: "apparitionYear", label: "Year", value: c.apparitionYear || 0, color: "none", isNumeric: true },
  ];
}

export function getMCUTiles(c: CharacterData): TileState[] {
  return [
    { key: "gender", label: "Gender", value: c.gender, color: "none" },
    { key: "type", label: "Type", value: c.type, color: "none" },
    { key: "species", label: "Species", value: c.species || [], color: "none", isArray: true },
    { key: "powerTypes", label: "Powers", value: c.powerTypes || [], color: "none", isArray: true },
    { key: "origin", label: "Origin", value: c.origin, color: "none" },
    { key: "appearanceTypes", label: "Appearances", value: c.appearanceTypes || [], color: "none", isArray: true },
    { key: "affiliations", label: "Teams", value: c.affiliations || [], color: "none", isArray: true },
  ];
}

export const TILE_COLORS: { value: TileColor; bg: string; border: string; text: string; label: string; symbol: string }[] = [
  { value: "none", bg: "bg-gray-700", border: "border-gray-600", text: "text-gray-300", label: "None", symbol: "✕" },
  { value: "partial", bg: "bg-yellow-600", border: "border-yellow-500", text: "text-white", label: "Partial", symbol: "◐" },
  { value: "exact", bg: "bg-green-600", border: "border-green-500", text: "text-white", label: "Exact", symbol: "✓" },
  { value: "upper", bg: "bg-blue-600", border: "border-blue-500", text: "text-white", label: "Upper", symbol: "↑" },
  { value: "lower", bg: "bg-blue-600", border: "border-blue-500", text: "text-white", label: "Lower", symbol: "↓" },
];

export function cycleColor(current: TileColor): TileColor {
  const order: TileColor[] = ["none", "exact", "partial", "none"];
  const numericOrder: TileColor[] = ["none", "exact", "upper", "lower", "none"];
  return current;
  // We'll handle cycling in the component based on isNumeric
}

export function cycleTileColor(tile: TileState): TileColor {
  if (tile.isNumeric) {
    const order: TileColor[] = ["none", "exact", "upper", "lower"];
    const idx = order.indexOf(tile.color);
    return order[(idx + 1) % order.length];
  }
  const order: TileColor[] = ["none", "exact", "partial"];
  const idx = order.indexOf(tile.color);
  return order[(idx + 1) % order.length];
}
