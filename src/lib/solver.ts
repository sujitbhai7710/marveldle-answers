import {
  getSession,
  getLastPickId,
  getPickDates,
  guessCharacter,
  getAllCharacters,
  sleep,
  type CharacterBase,
  type GuessResult,
  type ComicsCharacter,
  type MCUCharacter,
} from "./marveldle";

// LocalStorage-based persistence for GitHub Pages (static hosting)
const STORAGE_KEY = "marveldle_answers_v2";

export interface DailyAnswer {
  date: string;
  dateId: string;
  comics: CharacterBase & {
    apparitionYear?: number;
    firstApparitionComicTitle?: string;
  } | null;
  mcu: CharacterBase & {
    actorName?: string;
    appearanceTypes?: string[];
    affiliations?: string[];
  } | null;
  solvedAt: string;
}

export interface StoredAnswers {
  [dateKey: string]: DailyAnswer;
}

function loadFromStorage(): StoredAnswers {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load from localStorage:", e);
  }
  return {};
}

function saveToStorage(answers: StoredAnswers): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

export function getAnswer(dateKey: string): DailyAnswer | undefined {
  const answers = loadFromStorage();
  return answers[dateKey];
}

export function setAnswer(dateKey: string, answer: DailyAnswer): void {
  const answers = loadFromStorage();
  answers[dateKey] = answer;
  saveToStorage(answers);
}

export function getAllAnswersSorted(): DailyAnswer[] {
  const answers = loadFromStorage();
  return Object.entries(answers)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, v]) => v);
}

function matchesConstraint(
  character: CharacterBase,
  guessResult: GuessResult,
  guessedChar: CharacterBase,
  mode: "comics" | "audiovisual"
): boolean {
  // Gender
  if (guessResult.gender !== "None") {
    if (guessResult.gender === "Exact" && character.gender !== guessedChar.gender) return false;
    if (guessResult.gender === "None" && character.gender === guessedChar.gender) return false;
  }

  // Type
  if (guessResult.type !== "None") {
    if (guessResult.type === "Exact" && character.type !== guessedChar.type) return false;
    if (guessResult.type === "None" && character.type === guessedChar.type) return false;
  }

  // Species
  if (guessResult.species !== "None") {
    const charSp = character.species || [];
    const guessSp = guessedChar.species || [];
    const overlap = charSp.filter((s) => guessSp.includes(s));
    if (guessResult.species === "Exact" && overlap.length !== guessSp.length) return false;
    if (guessResult.species === "None" && overlap.length > 0) return false;
    if (guessResult.species === "Partial" && overlap.length === 0) return false;
  }

  // PowerTypes
  if (guessResult.powerTypes !== "None") {
    const charPw = character.powerTypes || [];
    const guessPw = guessedChar.powerTypes || [];
    const overlap = charPw.filter((p) => guessPw.includes(p));
    if (guessResult.powerTypes === "Exact" && overlap.length !== guessPw.length) return false;
    if (guessResult.powerTypes === "None" && overlap.length > 0) return false;
    if (guessResult.powerTypes === "Partial" && overlap.length === 0) return false;
  }

  // Origin
  if (guessResult.origin !== "None") {
    if (guessResult.origin === "Exact" && character.origin !== guessedChar.origin) return false;
    if (guessResult.origin === "None" && character.origin === guessedChar.origin) return false;
  }

  // ApparitionYear (comics only)
  if (mode === "comics" && guessResult.apparitionYear && guessResult.apparitionYear !== "None") {
    const charYear = (character as ComicsCharacter).apparitionYear || 0;
    const guessYear = (guessedChar as ComicsCharacter).apparitionYear || 0;
    if (guessResult.apparitionYear === "Upper" && charYear <= guessYear) return false;
    if (guessResult.apparitionYear === "Lower" && charYear >= guessYear) return false;
  }

  // MCU-specific: appearanceTypes
  if (mode === "audiovisual" && guessResult.appearanceTypes && guessResult.appearanceTypes !== "None") {
    const charTypes = (character as MCUCharacter).appearanceTypes || [];
    const guessTypes = (guessedChar as MCUCharacter).appearanceTypes || [];
    const overlap = charTypes.filter((t) => guessTypes.includes(t));
    if (guessResult.appearanceTypes === "Exact" && overlap.length !== guessTypes.length) return false;
    if (guessResult.appearanceTypes === "None" && overlap.length > 0) return false;
    if (guessResult.appearanceTypes === "Partial" && overlap.length === 0) return false;
  }

  return true;
}

async function solveMode(
  mode: "comics" | "audiovisual",
  dateId: string,
  sessionId: string,
  onLog?: (msg: string) => void
): Promise<CharacterBase | null> {
  const log = onLog || (() => {});

  log(`Fetching ${mode} character list...`);
  const allChars = (await getAllCharacters(mode, sessionId)) as CharacterBase[];
  log(`Got ${allChars.length} ${mode} characters`);

  let candidates = [...allChars];
  let attempts = 0;
  const maxAttempts = 25;

  while (candidates.length > 1 && attempts < maxAttempts) {
    const idx = Math.floor(Math.random() * Math.min(candidates.length, 15));
    const guessChar = candidates[idx];

    try {
      const result = await guessCharacter(mode, guessChar.id, dateId, sessionId);

      if (result.isExact) {
        log(`${mode}: Found "${guessChar.name}" in ${attempts + 1} guesses!`);
        return guessChar;
      }

      const before = candidates.length;
      candidates = candidates.filter((c) => {
        if (c.id === guessChar.id) return false;
        return matchesConstraint(c, result, guessChar, mode);
      });
      log(`Guess #${attempts + 1}: ${guessChar.name} (${before} -> ${candidates.length})`);

      if (candidates.length === 0) {
        log("No candidates left, resetting...");
        candidates = allChars.filter((c) => c.id !== guessChar.id);
      }
    } catch (err) {
      log(`Error guessing ${guessChar.id}: ${err}`);
    }

    attempts++;
    await sleep(350);
  }

  // Try remaining one-by-one
  if (candidates.length <= 1) {
    for (const c of candidates.length === 1 ? candidates : allChars.filter((c) => !candidates.includes(c)).slice(0, 30)) {
      try {
        const result = await guessCharacter(mode, c.id, dateId, sessionId);
        if (result.isExact) {
          log(`${mode}: Verified "${c.name}"!`);
          return c;
        }
      } catch (err) {
        log(`Error: ${err}`);
      }
      await sleep(250);
    }
  }

  log(`${mode}: Could not solve after ${attempts} attempts`);
  return null;
}

export async function solveToday(
  onLog?: (msg: string) => void
): Promise<{ comics: CharacterBase | null; mcu: CharacterBase | null; dateId: string; dateKey: string }> {
  const log = onLog || (() => {});

  // Check if already solved today
  const today = new Date().toISOString().split("T")[0];
  const existing = getAnswer(today);
  if (existing && existing.comics && existing.mcu) {
    log("Already solved today!");
    return {
      comics: existing.comics,
      mcu: existing.mcu,
      dateId: existing.dateId,
      dateKey: today,
    };
  }

  log("Creating session...");
  const session = await getSession();
  const sessionId = session.id;

  log("Getting current date ID...");
  const dateId = await getLastPickId(sessionId);
  log(`Date ID: ${dateId}`);

  // Solve both modes in parallel
  const [comics, mcu] = await Promise.all([
    solveMode("comics", dateId, sessionId, (m) => log(`[Comics] ${m}`)),
    solveMode("audiovisual", dateId, sessionId, (m) => log(`[MCU] ${m}`)),
  ]);

  // Store results
  const answer: DailyAnswer = {
    date: today,
    dateId,
    comics: comics ? {
      ...comics,
      apparitionYear: (comics as ComicsCharacter).apparitionYear,
      firstApparitionComicTitle: (comics as ComicsCharacter).firstApparitionComicTitle,
    } : null,
    mcu: mcu ? {
      ...mcu,
      actorName: (mcu as MCUCharacter).actorName,
      appearanceTypes: (mcu as MCUCharacter).appearanceTypes,
      affiliations: (mcu as MCUCharacter).affiliations,
    } : null,
    solvedAt: new Date().toISOString(),
  };

  setAnswer(today, answer);
  log("Answer saved!");

  return { comics, mcu, dateId, dateKey: today };
}
