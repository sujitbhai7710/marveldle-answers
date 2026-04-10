export interface ComicsCharacter {
  apparitionYear: number;
  basicClueTranslations: Record<string, string> | null;
  firstApparitionComicTitle: string;
  id: string;
  name: string;
  gender: string;
  type: string;
  powerTypes: string[];
  species: string[];
  origin: string;
  keywords: string[];
  quoteTranslations: Record<string, string> | null;
  gameInfo: {
    id: string;
    canDailyClassicGuessPick: boolean;
    canUse: boolean;
  };
  characterCategories: Category[] | null;
}

export interface MCUCharacter {
  appearanceTypes: string[];
  affiliations: string[];
  appearances: string[] | null;
  actorName: string;
  id: string;
  name: string;
  gender: string;
  type: string;
  powerTypes: string[];
  species: string[];
  origin: string;
  keywords: string[];
  quoteTranslations: Record<string, string> | null;
  gameInfo: {
    id: string;
    canDailyClassicGuessPick: boolean;
    canUse: boolean;
  };
  characterCategories: Category[] | null;
}

export interface Category {
  id: string;
  classification: string;
  type: {
    id: string;
    name: string;
    color: string;
    classification: string;
  };
  translations: Array<{
    id: string;
    content: string;
    languageCode: string;
  }>;
}

export interface GuessResult {
  id: string;
  gender: string;
  type: string;
  species: string;
  powerTypes: string;
  origin: string;
  apparitionYear: string;
  isExact: boolean;
  appearanceTypes?: string;
  affiliations?: string;
  appearances?: string;
  actorName?: string;
}

export interface CharacterBase {
  id: string;
  name: string;
  gender: string;
  type: string;
  species: string[];
  powerTypes: string[];
  origin: string;
}

export const MARVELDLE_API = "https://api.marveldle.com/api";
const HEADERS = {
  Origin: "https://marveldle.com",
  Referer: "https://marveldle.com/",
  "userLanguage": "en",
};

function createSessionId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getSession(): Promise<{ id: string } & Record<string, unknown>> {
  const sid = createSessionId();
  const res = await fetch(`${MARVELDLE_API}/session`, {
    headers: { ...HEADERS, sessionId: sid },
  });
  const data = await res.json();
  return { id: data.id || sid, ...data };
}

export async function getLastPickId(sessionId: string): Promise<string> {
  const res = await fetch(`${MARVELDLE_API}/config/pick-id`, {
    headers: { ...HEADERS, sessionId },
  });
  return await res.text();
}

export async function getPickDates(sessionId: string): Promise<string[]> {
  const res = await fetch(`${MARVELDLE_API}/config/pick-dates`, {
    headers: { ...HEADERS, sessionId },
  });
  return await res.json();
}

export async function guessCharacter(
  mode: "comics" | "audiovisual",
  characterId: string,
  dateId: string,
  sessionId: string
): Promise<GuessResult> {
  const url = `${MARVELDLE_API}/characters/${mode}/guess/${characterId}?dateId=${encodeURIComponent(dateId)}`;
  const res = await fetch(url, {
    headers: { ...HEADERS, sessionId },
  });
  return await res.json();
}

export async function getYesterdayCharacter(
  mode: "comics" | "audiovisual",
  sessionId: string
): Promise<ComicsCharacter | MCUCharacter> {
  const res = await fetch(`${MARVELDLE_API}/characters/${mode}/yesterday`, {
    headers: { ...HEADERS, sessionId },
  });
  return await res.json();
}

export async function getAllCharacters(
  mode: "comics" | "audiovisual",
  sessionId: string
): Promise<ComicsCharacter[] | MCUCharacter[]> {
  const res = await fetch(`${MARVELDLE_API}/characters/${mode}`, {
    headers: { ...HEADERS, sessionId },
  });
  return await res.json();
}
