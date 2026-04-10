import {
  getSession,
  getLastPickId,
  getPickDates,
  guessCharacter,
  getAllCharacters,
  getYesterdayCharacter,
  sleep,
  type ComicsCharacter,
  type MCUCharacter,
  type GuessResult,
} from "./marveldle";
import { loadAnswers, setAnswer, type StoredAnswers } from "./store";

interface CharacterBase {
  id: string;
  name: string;
  gender: string;
  type: string;
  species: string[];
  powerTypes: string[];
  origin: string;
}

// Comics-specific attributes for guessing
function getComicsAttributes(char: CharacterBase & { apparitionYear?: number }): Record<string, string | number | string[]> {
  return {
    gender: char.gender,
    type: char.type,
    species: char.species || [],
    powerTypes: char.powerTypes || [],
    origin: char.origin,
    apparitionYear: (char as ComicsCharacter).apparitionYear || 0,
  };
}

// MCU-specific attributes for guessing
function getMCUAttributes(char: CharacterBase & { appearanceTypes?: string[]; affiliations?: string[]; actorName?: string }): Record<string, string | number | string[]> {
  return {
    gender: char.gender,
    type: char.type,
    species: char.species || [],
    powerTypes: char.powerTypes || [],
    origin: char.origin,
    appearanceTypes: (char as MCUCharacter).appearanceTypes || [],
    affiliations: (char as MCUCharacter).affiliations || [],
    actorName: (char as MCUCharacter).actorName || "",
  };
}

type MatchStatus = "Exact" | "Partial" | "None" | "Upper" | "Lower";

function matchesConstraint(
  character: CharacterBase,
  guessResult: GuessResult,
  guessedChar: CharacterBase,
  mode: "comics" | "audiovisual"
): boolean {
  // gender must match
  if (guessResult.gender !== "None") {
    if (guessResult.gender === "Exact" && character.gender !== guessedChar.gender) return false;
    if (guessResult.gender === "None" && character.gender === guessedChar.gender) return false;
  }

  // type must match
  if (guessResult.type !== "None") {
    if (guessResult.type === "Exact" && character.type !== guessedChar.type) return false;
    if (guessResult.type === "None" && character.type === guessedChar.type) return false;
  }

  // species
  if (guessResult.species !== "None") {
    const charSpecies = character.species || [];
    const guessSpecies = guessedChar.species || [];
    const overlap = charSpecies.filter((s) => guessSpecies.includes(s));
    if (guessResult.species === "Exact" && overlap.length !== guessSpecies.length) return false;
    if (guessResult.species === "None" && overlap.length > 0) return false;
    if (guessResult.species === "Partial" && overlap.length === 0) return false;
  }

  // powerTypes
  if (guessResult.powerTypes !== "None") {
    const charPowers = character.powerTypes || [];
    const guessPowers = guessedChar.powerTypes || [];
    const overlap = charPowers.filter((p) => guessPowers.includes(p));
    if (guessResult.powerTypes === "Exact" && overlap.length !== guessPowers.length) return false;
    if (guessResult.powerTypes === "None" && overlap.length > 0) return false;
    if (guessResult.powerTypes === "Partial" && overlap.length === 0) return false;
  }

  // origin
  if (guessResult.origin !== "None") {
    if (guessResult.origin === "Exact" && character.origin !== guessedChar.origin) return false;
    if (guessResult.origin === "None" && character.origin === guessedChar.origin) return false;
  }

  // apparitionYear (comics only)
  if (mode === "comics" && guessResult.apparitionYear && guessResult.apparitionYear !== "None") {
    const charYear = (character as ComicsCharacter).apparitionYear || 0;
    const guessYear = (guessedChar as ComicsCharacter).apparitionYear || 0;
    if (guessResult.apparitionYear === "Upper" && charYear <= guessYear) return false;
    if (guessResult.apparitionYear === "Lower" && charYear >= guessYear) return false;
  }

  // MCU-specific fields
  if (mode === "audiovisual") {
    if (guessResult.appearanceTypes && guessResult.appearanceTypes !== "None") {
      const charTypes = (character as MCUCharacter).appearanceTypes || [];
      const guessTypes = (guessedChar as MCUCharacter).appearanceTypes || [];
      const overlap = charTypes.filter((t) => guessTypes.includes(t));
      if (guessResult.appearanceTypes === "Exact" && overlap.length !== guessTypes.length) return false;
      if (guessResult.appearanceTypes === "None" && overlap.length > 0) return false;
      if (guessResult.appearanceTypes === "Partial" && overlap.length === 0) return false;
    }
  }

  return true;
}

function filterCandidates(
  candidates: CharacterBase[],
  guessResult: GuessResult,
  guessedChar: CharacterBase,
  mode: "comics" | "audiovisual"
): CharacterBase[] {
  if (guessResult.isExact) return candidates; // found it

  return candidates.filter((c) => {
    if (c.id === guessedChar.id) return false; // skip the guessed character itself
    return matchesConstraint(c, guessResult, guessedChar, mode);
  });
}

export async function solveDaily(
  mode: "comics" | "audiovisual",
  dateId: string
): Promise<CharacterBase | null> {
  // Create a fresh session
  const session = await getSession();
  const sessionId = session.id;

  // Get all characters for this mode
  const allChars = (await getAllCharacters(mode, sessionId)) as CharacterBase[];

  let candidates = [...allChars];
  let attempts = 0;
  const maxAttempts = 20; // Safety limit

  console.log(`[Solve ${mode}] Starting with ${candidates.length} candidates for dateId: ${dateId}`);

  while (candidates.length > 1 && attempts < maxAttempts) {
    // Pick a strategic character to guess
    // Prefer characters from different types/genders to maximize information
    const guessChar = candidates[Math.floor(Math.random() * Math.min(candidates.length, 10))];

    try {
      const result = await guessCharacter(mode, guessChar.id, dateId, sessionId);

      if (result.isExact) {
        console.log(`[Solve ${mode}] Found answer: ${guessChar.name} (${guessChar.id}) in ${attempts + 1} attempts`);
        return guessChar;
      }

      // Filter candidates based on guess result
      const beforeCount = candidates.length;
      candidates = filterCandidates(candidates, result, guessChar, mode);
      console.log(`[Solve ${mode}] Guess #${attempts + 1}: ${guessChar.name} -> ${beforeCount} -> ${candidates.length} candidates`);

      if (candidates.length === 0) {
        console.log(`[Solve ${mode}] No candidates left! Backing off constraints.`);
        candidates = [...allChars].filter((c) => c.id !== guessChar.id);
      }
    } catch (err) {
      console.error(`[Solve ${mode}] Error guessing ${guessChar.id}:`, err);
    }

    attempts++;
    await sleep(300); // Rate limit
  }

  // If we narrowed to 1 candidate, verify it
  if (candidates.length === 1) {
    const finalGuess = candidates[0];
    try {
      const result = await guessCharacter(mode, finalGuess.id, dateId, sessionId);
      if (result.isExact) {
        console.log(`[Solve ${mode}] Verified answer: ${finalGuess.name} (${finalGuess.id})`);
        return finalGuess;
      }
    } catch (err) {
      console.error(`[Solve ${mode}] Error verifying:`, err);
    }
  }

  // Last resort: try all remaining candidates
  console.log(`[Solve ${mode}] Trying remaining ${candidates.length} candidates individually...`);
  for (const candidate of candidates.slice(0, 50)) {
    try {
      const result = await guessCharacter(mode, candidate.id, dateId, sessionId);
      if (result.isExact) {
        console.log(`[Solve ${mode}] Found answer: ${candidate.name} (${candidate.id})`);
        return candidate;
      }
    } catch (err) {
      console.error(`[Solve ${mode}] Error:`, err);
    }
    await sleep(200);
  }

  console.log(`[Solve ${mode}] Could not find answer after ${attempts} attempts`);
  return null;
}

export async function solveForDate(
  dateId: string,
  dateKey: string
): Promise<{ comics: CharacterBase | null; mcu: CharacterBase | null }> {
  // Check if already solved
  const existing = loadAnswers();
  if (existing[dateKey]) {
    console.log(`[Solve] Already solved for ${dateKey}`);
    return {
      comics: existing[dateKey].comics,
      mcu: existing[dateKey].mcu,
    };
  }

  console.log(`[Solve] Solving for ${dateKey} (${dateId})...`);

  // Get fresh session
  const session = await getSession();
  const sessionId = session.id;

  // Get yesterday's answers as fallback
  let yesterdayComics: ComicsCharacter | null = null;
  let yesterdayMCU: MCUCharacter | null = null;
  try {
    yesterdayComics = (await getYesterdayCharacter("comics", sessionId)) as ComicsCharacter;
    yesterdayMCU = (await getYesterdayCharacter("audiovisual", sessionId)) as MCUCharacter;
  } catch (e) {
    console.log("Could not fetch yesterday's answers");
  }

  // Solve both modes
  const [comicsAnswer, mcuAnswer] = await Promise.all([
    solveDaily("comics", dateId),
    solveDaily("audiovisual", dateId),
  ]);

  // Store results
  const answer = {
    date: dateKey,
    dateId,
    comics: comicsAnswer ? comicsAnswer as unknown as ComicsCharacter : null,
    mcu: mcuAnswer ? mcuAnswer as unknown as MCUCharacter : null,
    solvedAt: new Date().toISOString(),
  };

  setAnswer(dateKey, answer as StoredAnswers[string]);
  console.log(`[Solve] Saved answer for ${dateKey}`);

  return { comics: comicsAnswer, mcu: mcuAnswer };
}

export async function solveToday(): Promise<{ comics: CharacterBase | null; mcu: CharacterBase | null }> {
  const session = await getSession();
  const sessionId = session.id;
  const dateId = await getLastPickId(sessionId);

  const today = new Date();
  const dateKey = today.toISOString().split("T")[0];

  return solveForDate(dateId, dateKey);
}
