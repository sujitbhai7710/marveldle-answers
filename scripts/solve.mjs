const BASE = "https://api.marveldle.com/api";
const HEADERS = {
  Origin: "https://marveldle.com",
  Referer: "https://marveldle.com/",
  "userLanguage": "en",
};

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function createSession() {
  const sid = uuid();
  const res = await fetch(`${BASE}/session`, { headers: { ...HEADERS, sessionId: sid } });
  const data = await res.json();
  return data.id || sid;
}

async function getLastPickId(sid) {
  const res = await fetch(`${BASE}/config/pick-id`, { headers: { ...HEADERS, sessionId: sid } });
  return await res.text();
}

async function getPickDates(sid) {
  const res = await fetch(`${BASE}/config/pick-dates`, { headers: { ...HEADERS, sessionId: sid } });
  return await res.json();
}

async function getAllCharacters(mode, sid) {
  const res = await fetch(`${BASE}/characters/${mode}`, { headers: { ...HEADERS, sessionId: sid } });
  return await res.json();
}

async function getYesterday(mode, sid) {
  const res = await fetch(`${BASE}/characters/${mode}/yesterday`, { headers: { ...HEADERS, sessionId: sid } });
  return await res.json();
}

async function guessChar(mode, charId, dateId, sid) {
  const url = `${BASE}/characters/${mode}/guess/${charId}?dateId=${encodeURIComponent(dateId)}`;
  const res = await fetch(url, { headers: { ...HEADERS, sessionId: sid } });
  return await res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function matchesConstraint(char, gr, guessed, mode) {
  if (gr.gender !== "None") {
    if (gr.gender === "Exact" && char.gender !== guessed.gender) return false;
    if (gr.gender === "None" && char.gender === guessed.gender) return false;
  }
  if (gr.type !== "None") {
    if (gr.type === "Exact" && char.type !== guessed.type) return false;
    if (gr.type === "None" && char.type === guessed.type) return false;
  }
  if (gr.species !== "None") {
    const overlap = (char.species || []).filter((s) => (guessed.species || []).includes(s));
    if (gr.species === "Exact" && overlap.length !== (guessed.species || []).length) return false;
    if (gr.species === "None" && overlap.length > 0) return false;
    if (gr.species === "Partial" && overlap.length === 0) return false;
  }
  if (gr.powerTypes !== "None") {
    const overlap = (char.powerTypes || []).filter((p) => (guessed.powerTypes || []).includes(p));
    if (gr.powerTypes === "Exact" && overlap.length !== (guessed.powerTypes || []).length) return false;
    if (gr.powerTypes === "None" && overlap.length > 0) return false;
    if (gr.powerTypes === "Partial" && overlap.length === 0) return false;
  }
  if (gr.origin !== "None") {
    if (gr.origin === "Exact" && char.origin !== guessed.origin) return false;
    if (gr.origin === "None" && char.origin === guessed.origin) return false;
  }
  if (mode === "comics" && gr.apparitionYear && gr.apparitionYear !== "None") {
    const cy = char.apparitionYear || 0;
    const gy = guessed.apparitionYear || 0;
    if (gr.apparitionYear === "Upper" && cy <= gy) return false;
    if (gr.apparitionYear === "Lower" && cy >= gy) return false;
  }
  if (mode === "audiovisual" && gr.appearanceTypes && gr.appearanceTypes !== "None") {
    const overlap = (char.appearanceTypes || []).filter((t) => (guessed.appearanceTypes || []).includes(t));
    if (gr.appearanceTypes === "Exact" && overlap.length !== (guessed.appearanceTypes || []).length) return false;
    if (gr.appearanceTypes === "None" && overlap.length > 0) return false;
    if (gr.appearanceTypes === "Partial" && overlap.length === 0) return false;
  }
  return true;
}

async function solveMode(mode, dateId, sid, allChars) {
  let candidates = [...allChars];
  let attempts = 0;
  const maxAttempts = 30;

  // Try diverse characters first to get max info
  const tried = new Set();

  while (candidates.length > 1 && attempts < maxAttempts) {
    // Pick from diverse types/genders
    let pick = null;
    const byType = {};
    candidates.forEach((c) => {
      if (!tried.has(c.id)) {
        const key = c.type + "|" + c.gender;
        if (!byType[key]) byType[key] = [];
        byType[key].push(c);
      }
    });
    const groups = Object.values(byType);
    if (groups.length > 0) {
      pick = groups[Math.floor(Math.random() * groups.length)][0];
    } else {
      pick = candidates[Math.floor(Math.random() * candidates.length)];
    }

    if (!pick) break;
    tried.add(pick.id);

    try {
      const gr = await guessChar(mode, pick.id, dateId, sid);
      if (gr.isExact) {
        console.log(`  [${mode}] FOUND: ${pick.name} (${pick.id}) in ${attempts + 1} guesses`);
        return pick;
      }
      const before = candidates.length;
      candidates = candidates.filter((c) => c.id !== pick.id && matchesConstraint(c, gr, pick, mode));
      console.log(`  [${mode}] Guess #${attempts + 1}: ${pick.name} -> ${before} -> ${candidates.length}`);
      if (candidates.length === 0) {
        console.log(`  [${mode}] Reset - too many filtered`);
        candidates = allChars.filter((c) => !tried.has(c.id));
      }
    } catch (e) {
      console.error(`  [${mode}] Error: ${e.message}`);
    }
    attempts++;
    await sleep(350);
  }

  // Brute force remaining
  console.log(`  [${mode}] Trying ${Math.min(candidates.length, 100)} remaining candidates...`);
  for (const c of candidates.slice(0, 100)) {
    try {
      const gr = await guessChar(mode, c.id, dateId, sid);
      if (gr.isExact) {
        console.log(`  [${mode}] FOUND: ${c.name} (${c.id})`);
        return c;
      }
    } catch (e) {}
    await sleep(200);
  }
  return null;
}

async function solveForDate(dateId, dateKey) {
  const sid = await createSession();
  console.log(`[solve] Date: ${dateKey} (${dateId}), Session: ${sid}`);

  const [comicsChars, mcuChars] = await Promise.all([
    getAllCharacters("comics", sid),
    getAllCharacters("audiovisual", sid),
  ]);
  console.log(`[solve] Got ${comicsChars.length} comics, ${mcuChars.length} MCU characters`);

  const [comics, mcu] = await Promise.all([
    solveMode("comics", dateId, sid, comicsChars),
    solveMode("audiovisual", dateId, sid, mcuChars),
  ]);

  return {
    date: dateKey,
    dateId,
    comics: comics ? { id: comics.id, name: comics.name, gender: comics.gender, type: comics.type, species: comics.species, powerTypes: comics.powerTypes, origin: comics.origin, apparitionYear: comics.apparitionYear, firstApparitionComicTitle: comics.firstApparitionComicTitle, keywords: comics.keywords } : null,
    mcu: mcu ? { id: mcu.id, name: mcu.name, gender: mcu.gender, type: mcu.type, species: mcu.species, powerTypes: mcu.powerTypes, origin: mcu.origin, actorName: mcu.actorName, appearanceTypes: mcu.appearanceTypes, affiliations: mcu.affiliations, keywords: mcu.keywords } : null,
    solvedAt: new Date().toISOString(),
  };
}

async function main() {
  const action = process.argv[2] || "today";

  if (action === "today") {
    const sid = await createSession();
    const dateId = await getLastPickId(sid);
    const today = new Date().toISOString().split("T")[0];
    console.log(`=== Solving for today: ${today} (${dateId}) ===`);

    const result = await solveForDate(dateId, today);
    const fs = await import("fs");
    const path = await import("path");

    // Load existing answers
    const answersFile = path.join(process.cwd(), "public", "data", "answers.json");
    let answers = {};
    try {
      answers = JSON.parse(fs.readFileSync(answersFile, "utf-8"));
    } catch {}

    answers[today] = result;
    fs.writeFileSync(answersFile, JSON.stringify(answers, null, 2));
    console.log(`\n=== Saved to ${answersFile} ===`);
    console.log(`Comics: ${result.comics?.name || "N/A"}`);
    console.log(`MCU: ${result.mcu?.name || "N/A"}`);
  } else if (action === "date") {
    const dateId = process.argv[3];
    const dateKey = process.argv[4];
    if (!dateId || !dateKey) {
      console.error("Usage: node scripts/solve.mjs date <dateId> <dateKey>");
      process.exit(1);
    }
    const result = await solveForDate(dateId, dateKey);
    const fs = await import("fs");
    const path = await import("path");
    const answersFile = path.join(process.cwd(), "public", "data", "answers.json");
    let answers = {};
    try { answers = JSON.parse(fs.readFileSync(answersFile, "utf-8")); } catch {}
    answers[dateKey] = result;
    fs.writeFileSync(answersFile, JSON.stringify(answers, null, 2));
    console.log(`\nSaved ${dateKey}: Comics=${result.comics?.name}, MCU=${result.mcu?.name}`);
  } else if (action === "yesterday") {
    const sid = await createSession();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = yesterday.toISOString().split("T")[0];
    console.log(`=== Fetching yesterday's answers: ${dateKey} ===`);

    const [comics, mcu] = await Promise.all([
      getYesterday("comics", sid),
      getYesterday("audiovisual", sid),
    ]);

    const result = {
      date: dateKey,
      dateId: "yesterday",
      comics: { id: comics.id, name: comics.name, gender: comics.gender, type: comics.type, species: comics.species, powerTypes: comics.powerTypes, origin: comics.origin, apparitionYear: comics.apparitionYear, firstApparitionComicTitle: comics.firstApparitionComicTitle, keywords: comics.keywords },
      mcu: { id: mcu.id, name: mcu.name, gender: mcu.gender, type: mcu.type, species: mcu.species, powerTypes: mcu.powerTypes, origin: mcu.origin, actorName: mcu.actorName, appearanceTypes: mcu.appearanceTypes, affiliations: mcu.affiliations, keywords: mcu.keywords },
      solvedAt: new Date().toISOString(),
    };

    const fs = await import("fs");
    const path = await import("path");
    const answersFile = path.join(process.cwd(), "public", "data", "answers.json");
    let answers = {};
    try { answers = JSON.parse(fs.readFileSync(answersFile, "utf-8")); } catch {}
    answers[dateKey] = result;
    fs.writeFileSync(answersFile, JSON.stringify(answers, null, 2));
    console.log(`Saved: Comics=${comics.name}, MCU=${mcu.name}`);
  }
}

main().catch(console.error);
