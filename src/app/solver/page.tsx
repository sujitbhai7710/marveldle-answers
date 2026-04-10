"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import CharacterCard from "@/components/CharacterCard";
import { solveClientSide, type SolveResult } from "@/lib/solver-client";
import type { CharacterInfo } from "@/lib/data";

export default function SolverPage() {
  const [solving, setSolving] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<SolveResult | null>(null);

  const handleSolve = async () => {
    setSolving(true);
    setLogs([]);
    setResult(null);

    const addLog = (msg: string) => {
      setLogs((prev) => [...prev, msg]);
    };

    const sol = await solveClientSide(addLog);

    if (sol) {
      setResult(sol);
    }

    addLog("\n---");
    addLog("Note: Due to CORS, the client-side solver may not work.");
    addLog("Answers are auto-updated via server-side cron job at midnight IST.");
    addLog("Check the Home or Today page for the latest pre-solved answers.");

    setSolving(false);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="pt-2 mb-6">
          <h2 className="text-xl font-bold text-white">Live Solver</h2>
          <p className="text-xs text-gray-500 mt-1">
            Attempts to solve today&apos;s Marveldle by guessing characters through the API.
            May not work due to CORS restrictions.
          </p>
        </div>

        {/* Solve Button */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleSolve}
            disabled={solving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-red-600 text-white text-sm font-semibold hover:from-purple-500 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {solving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Solving...
              </span>
            ) : (
              "Start Solving"
            )}
          </button>
          {solving && <span className="text-xs text-yellow-400 animate-pulse">Running elimination solver...</span>}
        </div>

        {/* Result */}
        {result && (result.comics || result.mcu) && (
          <div className="rounded-2xl border border-green-500/30 bg-green-950/10 p-5 mb-6">
            <h3 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-green-500" />
              Result
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.comics && (
                <CharacterCard character={result.comics as CharacterInfo} mode="Comics" />
              )}
              {result.mcu && (
                <CharacterCard character={result.mcu as CharacterInfo} mode="MCU" />
              )}
            </div>
          </div>
        )}

        {/* Log */}
        {logs.length > 0 && (
          <div className="rounded-xl border border-gray-800/50 bg-gray-900/80 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-800/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Solver Log</span>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-gray-600 hover:text-gray-400"
              >
                Clear
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto font-mono text-[11px] leading-relaxed text-gray-400">
              {logs.map((log, i) => (
                <p key={i} className={log.startsWith("ERROR") || log.includes("CORS") ? "text-red-400" : log.includes("FOUND") ? "text-green-400 font-bold" : ""}>
                  {log}
                </p>
              ))}
              {solving && (
                <p className="text-yellow-400 animate-pulse mt-2">● Working...</p>
              )}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="mt-6 rounded-xl border border-gray-800/30 bg-gray-900/30 p-5">
          <h3 className="text-sm font-bold text-gray-300 mb-3">How the Solver Works</h3>
          <ol className="text-xs text-gray-500 space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>Creates a fresh session with the Marveldle API</li>
            <li>Fetches all {458} Comics and {338} MCU characters</li>
            <li>Strategically guesses characters from different categories</li>
            <li>Uses similarity responses (Exact/Partial/None/Upper/Lower) to eliminate candidates</li>
            <li>Narrows down to the exact answer through elimination</li>
            <li>Typically finds the answer in 3-15 guesses per mode</li>
          </ol>
          <p className="text-xs text-amber-400/70 mt-3">
            Note: Client-side solving may be blocked by CORS. Daily answers are reliably updated
            via the server-side cron job that commits to the JSON data file.
          </p>
        </div>

        <footer className="mt-12 mb-6 text-center">
          <p className="text-[10px] text-gray-700">Fan-made tool. Not affiliated with Marveldle or Marvel.</p>
        </footer>
      </main>
    </div>
  );
}
