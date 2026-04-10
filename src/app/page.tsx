"use client";

import { useState, useEffect, useCallback } from "react";
import { solveToday, getAllAnswersSorted, type DailyAnswer } from "@/lib/solver";

function CharacterCard({
  character,
  mode,
}: {
  character: DailyAnswer["comics"] | DailyAnswer["mcu"];
  mode: "Comics" | "MCU";
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (character?.id) {
      const seed = character.id.replace(/[^a-zA-Z0-9]/g, "");
      setImageUrl(`https://ik.imagekit.io/bernique/${seed}.jpg`);
    }
  }, [character?.id]);

  if (!character) return null;

  const modeColor =
    mode === "Comics"
      ? "from-purple-600 to-indigo-700"
      : "from-red-600 to-orange-600";

  const modeBg =
    mode === "Comics"
      ? "bg-purple-950/40 border-purple-500/30"
      : "bg-red-950/40 border-red-500/30";

  const modeBadge =
    mode === "Comics"
      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
      : "bg-red-500/20 text-red-300 border-red-500/30";

  return (
    <div
      className={`rounded-2xl border ${modeBg} p-5 backdrop-blur-sm hover:scale-[1.01] transition-all duration-300`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-24 h-24 rounded-xl bg-gradient-to-br ${modeColor} flex-shrink-0 flex items-center justify-center overflow-hidden shadow-lg`}
        >
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={character.name}
              className="w-full h-full object-cover rounded-xl"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-3xl font-bold text-white/80">
              {character.name.charAt(0)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${modeBadge}`}
            >
              {mode}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white truncate">
            {character.name}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {character.gender && (
              <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-md">
                {character.gender}
              </span>
            )}
            {character.type && (
              <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-md">
                {character.type}
              </span>
            )}
            {character.origin && character.origin !== "Unknown" && (
              <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-md">
                {character.origin}
              </span>
            )}
            {"apparitionYear" in character && character.apparitionYear && (
              <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-md">
                {character.apparitionYear}
              </span>
            )}
          </div>

          {"actorName" in character && character.actorName && (
            <p className="text-xs text-gray-400 mt-1.5">
              Actor:{" "}
              <span className="text-gray-200">{character.actorName}</span>
            </p>
          )}
          {"firstApparitionComicTitle" in character &&
            character.firstApparitionComicTitle && (
              <p className="text-xs text-gray-400 mt-1.5">
                First Comic:{" "}
                <span className="text-gray-200">
                  {character.firstApparitionComicTitle}
                </span>
              </p>
            )}

          {character.species && character.species.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {character.species.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="text-xs bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {character.powerTypes && character.powerTypes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {character.powerTypes.slice(0, 5).map((p) => (
                <span
                  key={p}
                  className="text-xs bg-blue-500/15 text-blue-300 px-1.5 py-0.5 rounded"
                >
                  {p}
                </span>
              ))}
            </div>
          )}

          {"affiliations" in character &&
            character.affiliations &&
            character.affiliations.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {character.affiliations.slice(0, 4).map((a) => (
                  <span
                    key={a}
                    className="text-xs bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded"
                  >
                    {a}
                  </span>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function AnswerCard({
  answer,
  isToday,
}: {
  answer: DailyAnswer;
  isToday?: boolean;
}) {
  const dateObj = new Date(answer.date + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className={`rounded-2xl border ${
        isToday
          ? "border-yellow-500/40 bg-yellow-950/20"
          : "border-gray-700/50 bg-gray-900/50"
      } p-6 backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          {isToday && (
            <span className="text-xs font-bold bg-yellow-500/20 text-yellow-300 px-2.5 py-1 rounded-full border border-yellow-500/30">
              TODAY
            </span>
          )}
          <h2 className="text-lg font-semibold text-white mt-1">
            {formattedDate}
          </h2>
        </div>
        <span className="text-xs text-gray-500">
          {new Date(answer.solvedAt).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {answer.comics && <CharacterCard character={answer.comics} mode="Comics" />}
        {answer.mcu && <CharacterCard character={answer.mcu} mode="MCU" />}
      </div>

      {!answer.comics && !answer.mcu && (
        <div className="text-center py-8 text-gray-500">
          <p>No answers available for this date.</p>
        </div>
      )}
    </div>
  );
}

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    function calculate() {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const utcNow = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
      const istNow = new Date(utcNow + istOffset);
      const tomorrow = new Date(istNow);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - istNow.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    }
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
        Next update in (IST)
      </p>
      <p className="text-2xl font-mono font-bold text-yellow-400">{timeLeft}</p>
    </div>
  );
}

export default function HomePage() {
  const [answers, setAnswers] = useState<DailyAnswer[]>([]);
  const [solving, setSolving] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const loadAnswers = useCallback(() => {
    const sorted = getAllAnswersSorted();
    setAnswers(sorted);
  }, []);

  useEffect(() => {
    loadAnswers();
  }, [loadAnswers]);

  const handleSolve = async () => {
    setSolving(true);
    setLogs([]);
    setShowLogs(true);

    const addLog = (msg: string) => {
      setLogs((prev) => [...prev, msg]);
    };

    try {
      addLog("Starting solver...");
      await solveToday(addLog);
      addLog("Done! Reloading answers...");
      loadAnswers();
    } catch (err) {
      addLog(`Error: ${err}`);
    } finally {
      setSolving(false);
    }
  };

  const todayKey = new Date().toISOString().split("T")[0];
  const todayAnswer = answers.find((a) => a.date === todayKey);
  const archiveAnswers = answers.filter((a) => a.date !== todayKey);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg">
              M
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                Marveldle Answers
              </h1>
              <p className="text-xs text-gray-500">
                Daily answers for Comics & MCU modes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {solving && (
              <span className="text-xs text-yellow-400 animate-pulse">
                Solving...
              </span>
            )}
            <button
              onClick={handleSolve}
              disabled={solving}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-purple-600 text-white text-sm font-semibold hover:from-red-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-red-500/20"
            >
              {solving ? "Solving..." : "Solve Today"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Countdown */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 p-4 rounded-2xl bg-gray-900/60 border border-gray-800/50">
          <CountdownTimer />
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>{answers.length} answers stored locally</span>
          </div>
        </div>

        {/* Solver Logs */}
        {showLogs && logs.length > 0 && (
          <div className="mb-6 rounded-2xl border border-gray-700/50 bg-gray-900/80 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Solver Log
              </span>
              <button
                onClick={() => setShowLogs(false)}
                className="text-xs text-gray-500 hover:text-white"
              >
                Hide
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto font-mono text-xs text-gray-400 space-y-0.5">
              {logs.map((log, i) => (
                <p key={i} className="leading-relaxed">
                  {log}
                </p>
              ))}
              {solving && (
                <p className="text-yellow-400 animate-pulse">Working...</p>
              )}
            </div>
          </div>
        )}

        {/* Today's Answer */}
        {todayAnswer && (
          <section className="mb-8">
            <AnswerCard answer={todayAnswer} isToday />
          </section>
        )}

        {/* No answer yet */}
        {!todayAnswer && !solving && (
          <div className="mb-8 text-center py-12 rounded-2xl border border-dashed border-gray-700/50 bg-gray-900/30">
            <div className="text-5xl mb-4">
              <span className="inline-block animate-bounce">🦸</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-300 mb-2">
              No answer yet for today
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Click &quot;Solve Today&quot; to fetch today&apos;s Marveldle
              answers for both Comics and MCU modes
            </p>
            <button
              onClick={handleSolve}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-purple-600 text-white font-semibold hover:from-red-500 hover:to-purple-500 transition-all shadow-lg"
            >
              Solve Now
            </button>
          </div>
        )}

        {/* Archive */}
        {archiveAnswers.length > 0 && (
          <section>
            <button
              onClick={() => setShowArchive(!showArchive)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors mb-4"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showArchive ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Archive ({archiveAnswers.length} answers)
            </button>

            {showArchive && (
              <div className="space-y-4">
                {archiveAnswers.map((answer) => (
                  <AnswerCard key={answer.date} answer={answer} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Info Section */}
        <section className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-5">
            <h3 className="text-sm font-bold text-purple-300 mb-2 flex items-center gap-2">
              <span className="text-base">📚</span> Comics Mode
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Based on Marvel Comics characters. Includes attributes like
              apparition year, first comic appearance, species, origin, power
              types, and affiliations.
            </p>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-5">
            <h3 className="text-sm font-bold text-red-300 mb-2 flex items-center gap-2">
              <span className="text-base">🎬</span> MCU Mode
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Based on Marvel Cinematic Universe characters. Includes attributes
              like actor name, appearance types (Movie/Series), affiliations,
              species, and power types.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="mt-6 rounded-2xl border border-gray-700/30 bg-gray-900/40 p-5">
          <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <span className="text-base">⚙️</span> How It Works
          </h3>
          <ol className="text-xs text-gray-500 space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>
              Click &quot;Solve Today&quot; to start the smart solver
            </li>
            <li>
              The solver creates a session with the Marveldle API and fetches
              all characters
            </li>
            <li>
              It uses the guess API strategically to eliminate candidates using
              similarity matching
            </li>
            <li>
              Results are stored in your browser&apos;s local storage and
              displayed on the page
            </li>
            <li>
              Historical answers are kept in the archive section below
            </li>
          </ol>
        </section>

        {/* Footer */}
        <footer className="mt-16 mb-8 text-center">
          <p className="text-xs text-gray-600">
            Fan-made tool. Not affiliated with Marveldle or Marvel.
          </p>
          <p className="text-xs text-gray-700 mt-1">
            Data sourced from the Marveldle API. Updated daily at midnight IST.
          </p>
        </footer>
      </main>
    </div>
  );
}
