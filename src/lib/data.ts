export interface CharacterInfo {
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

export interface DailyAnswer {
  date: string;
  dateId: string;
  comics: CharacterInfo | null;
  mcu: CharacterInfo | null;
  solvedAt: string;
}

export interface AnswersData {
  [dateKey: string]: DailyAnswer;
}

const BASE_PATH = "/marveldle-answers";

export async function fetchAnswers(): Promise<AnswersData> {
  try {
    const res = await fetch(`${BASE_PATH}/data/answers.json`);
    if (!res.ok) throw new Error("Failed to fetch answers");
    return await res.json();
  } catch (e) {
    console.error("Failed to load answers:", e);
    return {};
  }
}

export function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getSortedAnswers(answers: AnswersData): DailyAnswer[] {
  return Object.entries(answers)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, v]) => v);
}
