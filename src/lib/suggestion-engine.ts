import type { CharacterData, TileState, GuessEntry, TileColor } from "./solver-types";

function arrayOverlap(a: string[], b: string[]): number {
  if (!a || !b) return 0;
  return a.filter((x) => b.includes(x)).length;
}

function arrayMatch(a: string[], b: string[]): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((x) => b.includes(x)) && b.every((x) => a.includes(x));
}

export function filterCharacters(
  allChars: CharacterData[],
  guesses: GuessEntry[],
  excludeIds: string[]
): CharacterData[] {
  let candidates = allChars.filter((c) => !excludeIds.includes(c.id));

  for (const guess of guesses) {
    const char = guess.character;
    candidates = candidates.filter((c) => {
      for (const tile of guess.tiles) {
        if (tile.color === "none") continue;

        const charVal = tile.isArray
          ? (c as unknown as Record<string, unknown>)[tile.key] as string[]
          : (c as unknown as Record<string, unknown>)[tile.key];
        const guessVal = tile.value;

        if (tile.isArray) {
          const cArr = (charVal as string[]) || [];
          const gArr = (guessVal as string[]) || [];
          const overlap = arrayOverlap(cArr, gArr);
          if (tile.color === "exact" && !arrayMatch(cArr, gArr)) return false;
          if (tile.color === "partial" && overlap === 0) return false;
        } else if (tile.isNumeric) {
          const cNum = (charVal as number) || 0;
          const gNum = (guessVal as number) || 0;
          if (tile.color === "exact" && cNum !== gNum) return false;
          if (tile.color === "upper" && cNum <= gNum) return false;
          if (tile.color === "lower" && cNum >= gNum) return false;
        } else {
          if (tile.color === "exact" && charVal !== guessVal) return false;
          if (tile.color === "partial") {
            // For string fields, partial = same category but not exact (skip filter)
          }
        }
      }
      return true;
    });
  }

  return candidates;
}

interface SuggestionScore {
  char: CharacterData;
  score: number;
  reason: string[];
}

export function getSuggestions(
  candidates: CharacterData[],
  guesses: GuessEntry[],
  maxResults: number = 15
): SuggestionScore[] {
  if (candidates.length <= maxResults) {
    return candidates.map((c) => ({
      char: c,
      score: 0,
      reason: [],
    }));
  }

  const guessedIds = new Set(guesses.map((g) => g.character.id));
  const unguessed = candidates.filter((c) => !guessedIds.has(c.id));

  // Score each unguessed character by how much information it would provide
  const scored: SuggestionScore[] = unguessed.map((char) => {
    let score = 0;
    const reasons: string[] = [];

    // Prefer characters with unique attribute combinations
    const uniqueGenders = new Set(candidates.map((c) => c.gender)).size;
    const uniqueTypes = new Set(candidates.map((c) => c.type)).size;
    const uniqueOrigins = new Set(candidates.map((c) => c.origin)).size;

    // Bonus for diverse attributes
    if (uniqueGenders > 1 && !guesses.some((g) => g.character.gender === char.gender)) {
      score += 2;
      reasons.push("new gender");
    }
    if (uniqueTypes > 1 && !guesses.some((g) => g.character.type === char.type)) {
      score += 2;
      reasons.push("new type");
    }
    if (uniqueOrigins > 1 && !guesses.some((g) => g.character.origin === char.origin)) {
      score += 1;
      reasons.push("new origin");
    }

    // Bonus for partially matching (good for elimination)
    const speciesOverlap = arrayOverlap(
      char.species || [],
      guesses[guesses.length - 1]?.character.species || []
    );
    if (speciesOverlap > 0 && speciesOverlap < (char.species || []).length) {
      score += 3;
      reasons.push("partial species match");
    }

    const powerOverlap = arrayOverlap(
      char.powerTypes || [],
      guesses[guesses.length - 1]?.character.powerTypes || []
    );
    if (powerOverlap > 0 && powerOverlap < (char.powerTypes || []).length) {
      score += 3;
      reasons.push("partial powers match");
    }

    // Slight random tiebreaker
    score += Math.random() * 0.5;

    return { char, score, reason: reasons };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

export function getMatchInfo(
  candidates: CharacterData[],
  tile: TileState,
  guessValue: string | number | string[]
): { match: number; total: number } {
  let match = 0;
  const total = candidates.length;

  for (const c of candidates) {
    const cVal = tile.isArray
      ? (c as unknown as Record<string, unknown>)[tile.key] as string[]
      : (c as unknown as Record<string, unknown>)[tile.key];

    if (tile.isArray) {
      const cArr = (cVal as string[]) || [];
      const gArr = (guessValue as string[]) || [];
      const overlap = arrayOverlap(cArr, gArr);
      if (tile.color === "exact" && arrayMatch(cArr, gArr)) match++;
      else if (tile.color === "partial" && overlap > 0) match++;
      else if (tile.color === "none" && overlap === 0) match++;
    } else if (tile.isNumeric) {
      const cNum = (cVal as number) || 0;
      const gNum = (guessValue as number) || 0;
      if (tile.color === "exact" && cNum === gNum) match++;
      else if (tile.color === "upper" && cNum > gNum) match++;
      else if (tile.color === "lower" && cNum < gNum) match++;
    } else {
      if (tile.color === "exact" && cVal === guessValue) match++;
    }
  }

  return { match, total };
}
