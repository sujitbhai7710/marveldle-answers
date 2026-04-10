const MARVELDLE_API = "https://api.marveldle.com/api";
const HEADERS: Record<string, string> = {
  Origin: "https://marveldle.com",
  Referer: "https://marveldle.com/",
  userLanguage: "en",
};

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface CharacterBase {
  id: string;
  name: string;
  gender: string;
  type: string;
  species: string[];
  powerTypes: string[];
  origin: string;
  apparitionYear?: number;
  appearanceTypes?: string[];
}

interface GuessResult {
  id: string;
  gender: string;
  type: string;
  species: string;
  powerTypes: string;
  origin: string;
  apparitionYear: string;
  isExact: boolean;
  appearanceTypes?: string;
}

export interface SolveResult {
  date: string;
  dateId: string;
  comics: CharacterBase | null;
  mcu: CharacterBase | null;
  solvedAt: string;
}

export type LogCallback = (msg: string) => void;

async function apiFetch(url: string, sessionId: string) {
  const res = await fetch(url, { headers: { ...HEADERS, sessionId } });
  return res.json();
}

function matches(c: CharacterBase, gr: GuessResult, g: CharacterBase, mode: string): boolean {
  if (gr.gender !== "None") {
    if (gr.gender === "Exact" && c.gender !== g.gender) return false;
    if (gr.gender === "None" && c.gender === g.gender) return false;
  }
  if (gr.type !== "None") {
    if (gr.type === "Exact" && c.type !== g.type) return false;
    if (gr.type === "None" && c.type === g.type) return false;
  }
  if (gr.species !== "None") {
    const ov = (c.species || []).filter((s) => (g.species || []).includes(s));
    if (gr.species === "Exact" && ov.length !== (g.species || []).length) return false;
    if (gr.species === "None" && ov.length > 0) return false;
    if (gr.species === "Partial" && ov.length === 0) return false;
  }
  if (gr.powerTypes !== "None") {
    const ov = (c.powerTypes || []).filter((p) => (g.powerTypes || []).includes(p));
    if (gr.powerTypes === "Exact" && ov.length !== (g.powerTypes || []).length) return false;
    if (gr.powerTypes === "None" && ov.length > 0) return false;
    if (gr.powerTypes === "Partial" && ov.length === 0) return false;
  }
  if (gr.origin !== "None") {
    if (gr.origin === "Exact" && c.origin !== g.origin) return false;
    if (gr.origin === "None" && c.origin === g.origin) return false;
  }
  if (mode === "comics" && gr.apparitionYear && gr.apparitionYear !== "None") {
    const cy = c.apparitionYear || 0;
    const gy = g.apparitionYear || 0;
    if (gr.apparitionYear === "Upper" && cy <= gy) return false;
    if (gr.apparitionYear === "Lower" && cy >= gy) return false;
  }
  if (mode === "audiovisual" && gr.appearanceTypes && gr.appearanceTypes !== "None") {
    const ov = (c.appearanceTypes || []).filter((t) => (g.appearanceTypes || []).includes(t));
    if (gr.appearanceTypes === "Exact" && ov.length !== (g.appearanceTypes || []).length) return false;
    if (gr.appearanceTypes === "None" && ov.length > 0) return false;
    if (gr.appearanceTypes === "Partial" && ov.length === 0) return false;
  }
  return true;
}

async function solveMode(
  mode: "comics" | "audiovisual",
  dateId: string,
  sid: string,
  allChars: CharacterBase[],
  log: LogCallback
): Promise<CharacterBase | null> {
  let candidates = [...allChars];
  const tried = new Set();

  for (let attempt = 0; attempt < 30 && candidates.length > 1; attempt++) {
    const byGroup: CharacterBase[][] = [];
    const seen = new Set<string>();
    candidates.forEach((c) => {
      if (!tried.has(c.id)) {
        const key = c.type + "|" + c.gender;
        if (!seen.has(key)) { seen.add(key); byGroup.push([c]); }
      }
    });
    const pick = (byGroup.length > 0 ? byGroup : [candidates])[Math.floor(Math.random() * Math.min(10, candidates.length))][0];
    if (!pick) break;
    tried.add(pick.id);

    try {
      const gr: GuessResult = await apiFetch(
        `${MARVELDLE_API}/characters/${mode}/guess/${pick.id}?dateId=${encodeURIComponent(dateId)}`,
        sid
      );
      if (gr.isExact) {
        log(`${mode.toUpperCase()}: FOUND "${pick.name}" in ${attempt + 1} guesses!`);
        return pick;
      }
      const before = candidates.length;
      candidates = candidates.filter((c) => c.id !== pick.id && matches(c, gr, pick, mode));
      log(`${mode.toUpperCase()} #${attempt + 1}: ${pick.name} -> ${before} candidates left`);
      if (candidates.length === 0) {
        candidates = allChars.filter((c) => !tried.has(c.id));
      }
    } catch (e: unknown) {
      log(`${mode.toUpperCase()}: Network error - ${e instanceof Error ? e.message : String(e)}`);
      log(`${mode.toUpperCase()}: CORS blocked! Use server-side solver instead.`);
      return null;
    }
    await sleep(350);
  }

  for (const c of candidates.slice(0, 50)) {
    try {
      const gr: GuessResult = await apiFetch(
        `${MARVELDLE_API}/characters/${mode}/guess/${c.id}?dateId=${encodeURIComponent(dateId)}`,
        sid
      );
      if (gr.isExact) { log(`${mode.toUpperCase()}: Verified "${c.name}"!`); return c; }
    } catch {}
    await sleep(200);
  }
  return null;
}

export async function solveClientSide(log: LogCallback): Promise<SolveResult | null> {
  try {
    const sid = uuid();
    log("Creating session with Marveldle API...");

    const session = await apiFetch(`${MARVELDLE_API}/session`, sid);
    const sessionId = session.id || sid;
    log(`Session created: ${sessionId.slice(0, 8)}...`);

    const pickId: string = await fetch(`${MARVELDLE_API}/config/pick-id`, {
      headers: { ...HEADERS, sessionId },
    }).then((r) => r.text());
    log(`Today's date ID: ${pickId}`);

    const [comicsChars, mcuChars] = await Promise.all([
      apiFetch(`${MARVELDLE_API}/characters/comics`, sessionId),
      apiFetch(`${MARVELDLE_API}/characters/audiovisual`, sessionId),
    ]);
    log(`Fetched ${comicsChars.length} comics + ${mcuChars.length} MCU characters`);

    log("--- Solving Comics ---");
    const comics = await solveMode("comics", pickId, sessionId, comicsChars, log);

    log("--- Solving MCU ---");
    const mcu = await solveMode("audiovisual", pickId, sessionId, mcuChars, log);

    const today = new Date().toISOString().split("T")[0];
    const result: SolveResult = {
      date: today,
      dateId: pickId,
      comics: comics || null,
      mcu: mcu || null,
      solvedAt: new Date().toISOString(),
    };

    log(`\nDONE! Comics: ${comics?.name || "N/A"} | MCU: ${mcu?.name || "N/A"}`);
    return result;
  } catch (e: unknown) {
    log(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    log("CORS blocked by Marveldle API. Answers are updated via server-side cron job.");
    return null;
  }
}
