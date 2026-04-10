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

/**
 * EXACT Marveldle color codes extracted from the game's Angular JS bundle.
 *
 * .exact  -> background-color: green;          (#008000)
 * .partial-> background-color: #ff8c00;         (Dark Orange)
 * .none   -> background-color: brown;           (#A52A2A)
 * .upper  -> background-color: purple;          (#800080)  + up-arrow overlay  (Comics Year only)
 * .lower  -> background-color: #4e5aff;         (Bright Blue) + down-arrow overlay (Comics Year only)
 *
 * All tiles use white text (#FFFFFF), 1px solid white border, and inset box-shadow.
 */
export const TILE_COLORS: {
  value: TileColor;
  bgHex: string;
  label: string;
  symbol: string;
  description: string;
  cssClass?: string;
}[] = [
  { value: "none",    bgHex: "#A52A2A", label: "None",     symbol: "\u2715", description: "No match at all" },
  { value: "exact",   bgHex: "#008000", label: "Exact",    symbol: "\u2713", description: "Exact match" },
  { value: "partial", bgHex: "#FF8C00", label: "Partial",  symbol: "\u25D0", description: "Some items match, but not all" },
  { value: "upper",   bgHex: "#800080", label: "Higher",   symbol: "\u2191", description: "Answer year is higher (Comics only)" },
  { value: "lower",   bgHex: "#4E5AFF", label: "Lower",    symbol: "\u2193", description: "Answer year is lower (Comics only)" },
];

/** Get color hex for a given TileColor */
export function getColorHex(color: TileColor): string {
  const found = TILE_COLORS.find((c) => c.value === color);
  return found ? found.bgHex : "#A52A2A";
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
