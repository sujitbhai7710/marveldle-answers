import fs from "fs";
import path from "path";

const ANSWERS_FILE = path.join(process.cwd(), "data", "answers.json");

export interface StoredAnswers {
  [dateKey: string]: {
    date: string;
    dateId: string;
    comics: import("./marveldle").ComicsCharacter | null;
    mcu: import("./marveldle").MCUCharacter | null;
    solvedAt: string;
  };
}

function ensureDataDir(): void {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadAnswers(): StoredAnswers {
  ensureDataDir();
  try {
    if (fs.existsSync(ANSWERS_FILE)) {
      const data = fs.readFileSync(ANSWERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error loading answers:", e);
  }
  return {};
}

export function saveAnswers(answers: StoredAnswers): void {
  ensureDataDir();
  fs.writeFileSync(ANSWERS_FILE, JSON.stringify(answers, null, 2), "utf-8");
}

export function getAnswer(dateKey: string): StoredAnswers[string] | undefined {
  const answers = loadAnswers();
  return answers[dateKey];
}

export function setAnswer(dateKey: string, answer: StoredAnswers[string]): void {
  const answers = loadAnswers();
  answers[dateKey] = answer;
  saveAnswers(answers);
}

export function getAllAnswersSorted(): StoredAnswers[string][] {
  const answers = loadAnswers();
  return Object.entries(answers)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, v]) => v);
}
